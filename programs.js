const titleInput = document.querySelector('#program-title');
const programList = document.querySelector('#saved-programs');
const programStatus = document.querySelector('#program-status');
const updateButton = document.querySelector('#update-program');
const deleteButton = document.querySelector('#delete-program');
let programs = [];

async function loadPrograms() {
  try {
    const response = await fetch('/api/programs');
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    programs = result;
    programList.replaceChildren(new Option('Select a program', ''));
    programs.forEach(program => programList.add(new Option(program.title, program._id)));
  } catch (error) { programStatus.textContent = error.message; }
}

async function saveProgram(method, id) {
  const title = titleInput.value.trim();
  const source = code.value.trim();
  if (!title || !source) return programStatus.textContent = 'Add a title and code first.';
  try {
    const response = await fetch(id ? '/api/programs/' + id : '/api/programs', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, code: source })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await loadPrograms();
    programList.value = result._id;
    updateButton.disabled = false;
    deleteButton.disabled = false;
    programStatus.textContent = id ? 'Program updated.' : 'Program saved.';
  } catch (error) { programStatus.textContent = error.message; }
}

document.querySelector('#save-program').addEventListener('click', () => saveProgram('POST'));
updateButton.addEventListener('click', () => saveProgram('PUT', programList.value));
programList.addEventListener('change', () => {
  const selected = programs.find(program => program._id === programList.value);
  updateButton.disabled = !selected;
  deleteButton.disabled = !selected;
  if (selected) { titleInput.value = selected.title; code.value = selected.code; programStatus.textContent = 'Program loaded.'; }
});
deleteButton.addEventListener('click', async () => {
  if (!programList.value || !confirm('Delete this program?')) return;
  try {
    const response = await fetch('/api/programs/' + programList.value, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    await loadPrograms();
    titleInput.value = '';
    updateButton.disabled = true;
    deleteButton.disabled = true;
    programStatus.textContent = 'Program deleted.';
  } catch (error) { programStatus.textContent = error.message; }
});
loadPrograms();
