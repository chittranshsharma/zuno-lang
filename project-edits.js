function validateFiles(files) {
  if (!Array.isArray(files) || !files.length || files.length > 8) throw new Error('Select between 1 and 8 files.');
  const ids = new Set();
  const paths = new Set();
  let size = 0;
  for (const file of files) {
    if (!file || typeof file.id !== 'string' || !file.id || file.id.length > 100 || ids.has(file.id)) throw new Error('File IDs must be unique.');
    if (typeof file.path !== 'string' || file.path.length > 160 || !/^[\w .-]+(?:\/[\w .-]+)*\.zuno$/.test(file.path) || file.path.split('/').some(part => part === '.' || part === '..') || paths.has(file.path.toLowerCase())) throw new Error('Use unique relative .zuno paths without parent directories.');
    if (typeof file.code !== 'string' || file.code.length > 5000) throw new Error('Each selected file must fit within 5,000 characters.');
    ids.add(file.id);
    paths.add(file.path.toLowerCase());
    size += file.code.length;
  }
  if (size > 20000) throw new Error('Selected files exceed 20,000 characters.');
  return files.map(({ id, path, code }) => ({ id, path, code }));
}

function prepareEdits(files, response) {
  validateFiles(files);
  const data = typeof response === 'string' ? JSON.parse(response.replace(/^\s*```(?:json)?\s*\n/, '').replace(/\n```\s*$/, '')) : response;
  if (!data || !Array.isArray(data.edits) || !data.edits.length || data.edits.length > files.length) throw new Error('The assistant did not return a valid edit list.');
  const seen = new Set();
  const changes = data.edits.map(edit => {
    const file = files.find(file => file.id === edit.id);
    if (!file || seen.has(edit.id)) throw new Error('Edits must refer to selected files exactly once.');
    if (typeof edit.code !== 'string' || edit.code.length > 5000) throw new Error('Replacement files must fit within 5,000 characters.');
    seen.add(edit.id);
    return { ...file, before: file.code, after: edit.code };
  }).filter(change => change.before !== change.after);
  if (!changes.length) throw new Error('No source changes were proposed.');
  return changes;
}

function assertFresh(snapshot, current) {
  for (const original of snapshot) {
    const live = current.find(file => file.id === original.id);
    if (!live || live.path !== original.path || live.code !== original.code || live.version !== original.version) throw new Error('A selected file changed or closed. Request a fresh review.');
  }
}

module.exports = { validateFiles, prepareEdits, assertFresh };
