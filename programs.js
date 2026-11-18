const titleInput = document.querySelector('#program-title');
const folderInput = document.querySelector('#program-folder');
const programList = document.querySelector('#saved-programs');
const folderTree = document.querySelector('#folder-tree');
const programStatus = document.querySelector('#program-status');
const updateButton = document.querySelector('#update-program');
const deleteButton = document.querySelector('#delete-program');
let programs = [];

document.querySelector('#refresh-programs').addEventListener('click', loadPrograms);
document.querySelector('#new-program').addEventListener('click', () => {
  programList.value = '';
  titleInput.value = '';
  code.value = '';
  code.dispatchEvent(new Event('input'));
  updateButton.disabled = true;
  deleteButton.disabled = true;
  programStatus.textContent = 'New program ready. Add a title and click Save new.';
  titleInput.focus();
});
document.querySelector('#new-folder').addEventListener('click', () => {
  const folder = prompt('Folder name or path, such as College/Maths:');
  if (folder === null) return;
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder.trim())) return programStatus.textContent = 'Use simple folder names separated by /.';
  folderInput.value = folder.trim();
  programStatus.textContent = 'Folder selected. Save a program to show it in the Explorer.';
});
document.querySelector('#copy-shared').addEventListener('click', () => {
  programList.value = '';
  titleInput.value = 'My copy';
  folderInput.value = 'General';
  updateButton.disabled = true;
  deleteButton.disabled = true;
  document.querySelector('#shared-notice').hidden = true;
  programStatus.textContent = 'Your copy is ready. Change the title and click Save new.';
  titleInput.focus();
});

function selectProgram(id) {
  const selected = programs.find(program => program._id === id);
  programList.value = id;
  updateButton.disabled = !selected;
  deleteButton.disabled = !selected;
  if (!selected) return;
  titleInput.value = selected.title;
  folderInput.value = selected.folder || 'General';
  code.value = selected.code;
  code.dispatchEvent(new Event('input'));
  programStatus.textContent = 'Program loaded.';
}

function drawFolders(parent, folder) {
  Object.keys(folder).sort().forEach(name => {
    const item = folder[name];
    if (item.program) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = item.program.title + '.lingua';
      button.addEventListener('click', () => selectProgram(item.program._id));
      parent.append(button);
    } else {
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      summary.textContent = name;
      details.append(summary);
      drawFolders(details, item);
      parent.append(details);
    }
  });
}

function showTree() {
  const tree = Object.create(null);
  programs.forEach(program => {
    let folder = tree;
    (program.folder || 'General').split('/').forEach(name => {
      folder[name] ||= Object.create(null);
      folder = folder[name];
    });
    folder[program._id] = { program };
  });
  folderTree.replaceChildren();
  if (!programs.length) folderTree.textContent = 'No saved programs yet.';
  else drawFolders(folderTree, tree);
}

async function loadPrograms() {
  try {
    const response = await fetch('/api/programs');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    programs = result;
    programList.replaceChildren(new Option('Select a program', ''));
    programs.forEach(program => programList.add(new Option(program.title, program._id)));
    showTree();
  } catch (error) { programStatus.textContent = error.message; folderTree.textContent = error.message; }
}

async function saveProgram(method, id) {
  const title = titleInput.value.trim();
  const source = code.value.trim();
  const folder = folderInput.value.trim() || 'General';
  if (!title || !source) return programStatus.textContent = 'Add a title and code first.';
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder)) return programStatus.textContent = 'Use folder names separated by /.';
  try {
    const response = await fetch(id ? '/api/programs/' + id : '/api/programs', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, code: source, folder })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await loadPrograms();
    selectProgram(result._id);
    programStatus.textContent = id ? 'Program updated.' : 'Program saved.';
  } catch (error) { programStatus.textContent = error.message; }
}

document.querySelector('#save-program').addEventListener('click', () => saveProgram('POST'));
updateButton.addEventListener('click', () => saveProgram('PUT', programList.value));
programList.addEventListener('change', () => selectProgram(programList.value));
deleteButton.addEventListener('click', async () => {
  if (!programList.value || !confirm('Delete this program?')) return;
  try {
    const response = await fetch('/api/programs/' + programList.value, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await loadPrograms();
    titleInput.value = '';
    folderInput.value = 'General';
    updateButton.disabled = true;
    deleteButton.disabled = true;
    programStatus.textContent = 'Program deleted.';
  } catch (error) { programStatus.textContent = error.message; }
});
loadPrograms();
