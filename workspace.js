const draftKey = 'zuno.workspace.draft';
const runStatus = document.querySelector('#run-status');
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
