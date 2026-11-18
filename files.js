const fileStatus = document.querySelector('#file-status');
const fileInput = document.querySelector('#import-file');

document.querySelector('#export-code').addEventListener('click', () => {
  if (!code.value.trim()) return fileStatus.textContent = 'Write some code first.';
  if (code.value.length > 5000) return fileStatus.textContent = 'Keep code under 5000 characters to export it.';
  const file = new Blob([code.value], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = 'program.lingua';
  link.click();
  URL.revokeObjectURL(link.href);
  fileStatus.textContent = 'File downloaded.';
});

document.querySelector('#import-code').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!/\.(lingua|txt)$/i.test(file.name) || file.size > 20000) {
    fileStatus.textContent = 'Choose a .lingua or .txt file under 20 KB.';
    fileInput.value = '';
    return;
  }
  const importedCode = await file.text();
  if (importedCode.length > 5000) {
    fileStatus.textContent = 'This file is too long. Choose one under 5000 characters.';
    fileInput.value = '';
    return;
  }
  code.value = importedCode;
  code.dispatchEvent(new Event('input'));
  output.textContent = 'File loaded. Press Run to see the output.';
  fileStatus.textContent = file.name + ' imported.';
  fileInput.value = '';
});
