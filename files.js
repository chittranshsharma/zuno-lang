const fileStatus = document.querySelector('#file-status');
const fileInput = document.querySelector('#import-file');

document.querySelector('#export-code').addEventListener('click', () => {
  if (!code.value.trim()) return fileStatus.textContent = 'Write some code first.';
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
  if (!/\.(lingua|txt)$/i.test(file.name) || file.size > 10000) {
    fileStatus.textContent = 'Choose a .lingua or .txt file under 10 KB.';
    fileInput.value = '';
    return;
  }
  code.value = await file.text();
  code.dispatchEvent(new Event('input'));
  output.textContent = 'File loaded. Press Run to see the output.';
  fileStatus.textContent = file.name + ' imported.';
  fileInput.value = '';
});

document.querySelector('#share-code').addEventListener('click', async () => {
  if (!code.value.trim()) return fileStatus.textContent = 'Write some code first.';
  if (code.value.length > 2000) return fileStatus.textContent = 'Use Export file for code longer than 2000 characters.';
  const link = new URL('playground.html', location.href);
  link.hash = 'code=' + encodeURIComponent(code.value);
  try {
    await navigator.clipboard.writeText(link.href);
    fileStatus.textContent = 'Share link copied. Anyone with the link can view the code.';
  } catch (error) {
    prompt('Copy this link:', link.href);
    fileStatus.textContent = 'Share link ready.';
  }
});

if (location.hash.startsWith('#code=')) {
  try {
    const sharedCode = decodeURIComponent(location.hash.slice(6));
    if (sharedCode.length <= 2000) {
      code.value = sharedCode;
      code.dispatchEvent(new Event('input'));
      output.textContent = 'Shared code loaded. Press Run to see the output.';
      fileStatus.textContent = 'You opened a shared program.';
    }
  } catch (error) { fileStatus.textContent = 'This share link could not be opened.'; }
}
