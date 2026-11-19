const fileStatus = document.querySelector('#file-status');
const fileInput = document.querySelector('#import-file');

document.querySelector('#export-code').addEventListener('click', () => {
  if (!code.value.trim()) return fileStatus.textContent = 'Write some code first.';
  if (code.value.length > 5000) return fileStatus.textContent = 'Keep code under 5000 characters to export it.';
  const file = new Blob([code.value], { type: 'text/plain' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = document.querySelector('#editor-filename').textContent.replace(/[^a-zA-Z0-9_. -]/g,'_') || 'program.zuno';
  link.click();
  URL.revokeObjectURL(link.href);
  fileStatus.textContent = 'File downloaded.';
});

document.querySelector('#import-code').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', async () => {
  const file = fileInput.files[0];
  if (!file) return;
  if (!/\.(zuno|txt)$/i.test(file.name) || file.size > 20000) {
    fileStatus.textContent = 'Choose a .zuno or .txt file under 20 KB.';
    fileInput.value = '';
    return;
  }
  const importedCode = await file.text();
  if (importedCode.length > 5000) {
    fileStatus.textContent = 'This file is too long. Choose one under 5000 characters.';
    fileInput.value = '';
    return;
  }
  if(globalThis.ZunoWorkspace)globalThis.ZunoWorkspace.open({name:file.name.replace(/\.txt$/i,'.zuno'),code:importedCode,savedCode:null,title:''});
  else code.value = importedCode;
  code.dispatchEvent(new Event('input'));
  output.textContent = 'File loaded. Press Run to see the output.';
  fileStatus.textContent = file.name + ' imported.';
  fileInput.value = '';
});
