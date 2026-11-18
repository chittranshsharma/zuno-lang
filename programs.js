const titleInput = document.querySelector('#program-title');
const folderInput = document.querySelector('#program-folder');
const programList = document.querySelector('#saved-programs');
const folderTree = document.querySelector('#folder-tree');
const programStatus = document.querySelector('#program-status');
const updateButton = document.querySelector('#update-program');
const deleteButton = document.querySelector('#delete-program');
const saveDetails = document.querySelector('.save-details');
const editorState = document.querySelector('#editor-state');
let programs = [];
let savedCode = null;
const folderStates = new Map();
const treeIcons = {
  file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>',
  folder: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 10h18"/></svg>'
};

function updateEditorState() {
  editorState.textContent = code.value === savedCode ? 'Saved' : code.value ? 'Unsaved changes' : 'New file';
}
code.addEventListener('input', updateEditorState);
updateEditorState();

async function readResult(response) {
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Open Lingua through npm start to use saved programs.');
  }
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function showError(error) {
  const message = error instanceof TypeError ? 'Cannot reach the server. Run npm start and open localhost:3000.' : error.message;
  programStatus.textContent = message;
  return message;
}

document.querySelector('#refresh-programs').addEventListener('click', loadPrograms);
document.querySelector('#new-program').addEventListener('click', () => {
  saveDetails.open = true;
  programList.value = '';
  titleInput.value = '';
  document.querySelector('#editor-filename').textContent = 'untitled.lingua';
  code.value = '';
  code.dispatchEvent(new Event('input'));
  savedCode = null;
  updateEditorState();
  showTree();
  updateButton.disabled = true;
  deleteButton.disabled = true;
  programStatus.textContent = 'New program ready. Add a title and click Save new.';
  titleInput.focus();
});
document.querySelector('#new-folder').addEventListener('click', () => {
  saveDetails.open = true;
  const folder = prompt('Folder name or path, such as College/Maths:');
  if (folder === null) return;
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder.trim())) return programStatus.textContent = 'Use simple folder names separated by /.';
  folderInput.value = folder.trim();
  programStatus.textContent = 'Folder selected. Save a program to show it in the Explorer.';
});
function selectProgram(id) {
  const selected = programs.find(program => program._id === id);
  programList.value = id;
  updateButton.disabled = !selected;
  deleteButton.disabled = !selected;
  if (!selected) return;
  document.querySelector('#editor-filename').textContent = selected.title + '.lingua';
  saveDetails.open = true;
  titleInput.value = selected.title;
  folderInput.value = selected.folder || 'General';
  code.value = selected.code;
  savedCode = selected.code;
  code.dispatchEvent(new Event('input'));
  showTree();
  programStatus.textContent = 'Program loaded.';
}

function drawFolders(parent, folder, path = '') {
  Object.keys(folder).sort((a, b) => Number(Boolean(folder[a].program)) - Number(Boolean(folder[b].program)) || (folder[a].program?.title || a).localeCompare(folder[b].program?.title || b, undefined, { numeric: true })).forEach(name => {
    const item = folder[name];
    if (item.program) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tree-file';
      button.innerHTML = treeIcons.file;
      const label = document.createElement('span');
      label.textContent = item.program.title + '.lingua';
      button.append(label);
      if (item.program._id === programList.value) button.setAttribute('aria-current', 'true');
      button.addEventListener('click', () => {
        selectProgram(item.program._id);
        folderTree.querySelector('[aria-current="true"]')?.focus();
      });
      parent.append(button);
    } else {
      const key = path + '/' + name;
      const section = document.createElement('div');
      section.className = 'tree-folder';
      const trigger = document.createElement('button');
      trigger.type = 'button';
      trigger.className = 'tree-folder-trigger';
      trigger.innerHTML = '<span class="tree-chevron" aria-hidden="true">›</span>' + treeIcons.folder;
      const label = document.createElement('span');
      label.textContent = name;
      trigger.append(label);
      const body = document.createElement('div');
      body.className = 'tree-children';
      body.id = 'folder-' + encodeURIComponent(key);
      trigger.setAttribute('aria-controls', body.id);
      function setOpen(open) {
        folderStates.set(key, open);
        trigger.setAttribute('aria-expanded', String(open));
        body.hidden = !open;
        if (open && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
          body.getAnimations().forEach(animation => animation.cancel());
          body.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.22,1,.36,1)' });
        }
      }
      drawFolders(body, item, key);
      trigger.setAttribute('aria-expanded', String(folderStates.get(key) !== false));
      body.hidden = folderStates.get(key) === false;
      trigger.addEventListener('click', () => setOpen(body.hidden));
      section.append(trigger, body);
      parent.append(section);
    }
  });
}
document.querySelector('#collapse-folders').addEventListener('click', () => {
  const expanded = folderTree.querySelector('[aria-expanded="true"]');
  for (const trigger of folderTree.querySelectorAll('.tree-folder-trigger')) {
    if (trigger.getAttribute('aria-expanded') === String(Boolean(expanded))) trigger.click();
  }
  document.querySelector('#collapse-folders').textContent = expanded ? 'Expand all' : 'Collapse all';
});

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
    const selectedId = programList.value;
    const response = await fetch('/api/programs');
    const result = await readResult(response);
    programs = result;
    programList.replaceChildren(new Option('Select a program', ''));
    programs.forEach(program => programList.add(new Option(program.title, program._id)));
    if (programs.some(program => program._id === selectedId)) programList.value = selectedId;
    showTree();
  } catch (error) { folderTree.textContent = showError(error); }
}

async function saveProgram(method, id) {
  const title = titleInput.value.trim();
  const source = code.value.trim();
  const folder = folderInput.value.trim() || 'General';
  if (!title || !source) return programStatus.textContent = 'Add a title and code first.';
  if (source.length > 5000) return programStatus.textContent = 'Keep code under 5000 characters.';
  if (!/^[\w -]+(?:\/[\w -]+)*$/.test(folder)) return programStatus.textContent = 'Use folder names separated by /.';
  try {
    const response = await fetch(id ? '/api/programs/' + id : '/api/programs', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, code: source, folder })
    });
    const result = await readResult(response);
    await loadPrograms();
    selectProgram(result._id);
    programStatus.textContent = id ? 'Program updated.' : 'Program saved.';
  } catch (error) { showError(error); saveDetails.open = true; }
}

document.querySelector('#save-program').addEventListener('click', () => saveProgram('POST'));
updateButton.addEventListener('click', () => saveProgram('PUT', programList.value));
programList.addEventListener('change', () => selectProgram(programList.value));
deleteButton.addEventListener('click', async () => {
  if (!programList.value || !confirm('Delete this program?')) return;
  try {
    const response = await fetch('/api/programs/' + programList.value, { method: 'DELETE' });
    const result = await readResult(response);
    await loadPrograms();
    titleInput.value = '';
    folderInput.value = 'General';
    savedCode = null;
    updateEditorState();
    updateButton.disabled = true;
    deleteButton.disabled = true;
    programStatus.textContent = 'Program deleted.';
  } catch (error) { showError(error); saveDetails.open = true; }
});
loadPrograms();
