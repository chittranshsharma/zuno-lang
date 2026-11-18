const draftKey = 'lingua.workspace.draft';
const runStatus = document.querySelector('#run-status');
try {
  const draft = localStorage.getItem(draftKey);
  if (draft !== null) {
    code.value = draft;
    code.dispatchEvent(new Event('input'));
    runStatus.textContent = 'Local draft restored';
  }
} catch {}
code.addEventListener('input', () => {
  try { localStorage.setItem(draftKey, code.value); }
  catch { runStatus.textContent = 'Draft storage unavailable. Export your code to keep a copy.'; }
});
code.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  event.preventDefault();
  const start = code.selectionStart;
  const end = code.selectionEnd;
  code.setRangeText('  ', start, end, 'end');
  code.dispatchEvent(new Event('input'));
});
document.querySelector('#clear-output').addEventListener('click', () => {
  output.textContent = 'Ready to run.';
  runStatus.textContent = 'Output cleared';
});
