function compileSources(entry, read, resolve, label = file => file) {
  const files = new Map();
  const visiting = [];
  const modules = [];
  const sourceLines = [];
  const locations = [];
  const originals = new Map();
  function load(filename, importedAt) {
    if (visiting.includes(filename)) throw new Error('Circular module import: ' + [...visiting, filename].map(label).join(' -> '));
    if (files.has(filename)) return files.get(filename);
    if (files.size >= 100) throw new Error('Too many module files (maximum 100 including the entry).');
    let text;
    try { text = read(filename); }
    catch (error) { throw new Error((importedAt ? label(importedAt.file) + ':' + importedAt.line + ': ' : '') + error.message); }
    if (text.length > 100000) throw new Error('Source file is too large: ' + label(filename));
    originals.set(filename, text.replace(/^\uFEFF/, '').split(/\r?\n/));
    const record = { name: '__file' + files.size, file: filename, lines: [] };
    files.set(filename, record);
    visiting.push(filename);
    for (const [index, line] of originals.get(filename).entries()) {
      const match = line.match(/^([ \t]*)import[ \t]+"([^"\r\n]+)"[ \t]+as[ \t]+([A-Za-z_]\w*)[ \t]*;[ \t]*(?:\/\/.*)?$/);
      if (match) {
        let target;
        try { target = resolve(filename, match[2]); }
        catch (error) { throw new Error(label(filename) + ':' + (index + 1) + ': ' + error.message); }
        const dependency = load(target, { file: filename, line: index + 1 });
        record.lines.push(match[1] + 'import ' + dependency.name + ' as ' + match[3] + ';');
      } else if (/^[ \t]*import[ \t]+"/.test(line)) throw new Error(label(filename) + ':' + (index + 1) + ': Put each file import on its own line: import "./file.zuno" as name;');
      else record.lines.push(line);
    }
    visiting.pop();
    modules.push(record);
    return record;
  }
  const main = load(entry);
  for (const record of modules) {
    if (record !== main) { sourceLines.push('module ' + record.name + ' {'); locations.push(null); }
    record.lines.forEach((line, index) => { sourceLines.push(line); locations.push({ file: record.file, line: index + 1 }); });
    if (record !== main) { sourceLines.push('}'); locations.push({ file: record.file, line: record.lines.length }); }
  }
  const source = sourceLines.join('\n');
  if (source.length > 100000) throw new Error('Combined project exceeds 100000 characters.');
  return { source, locations, originals, entry: main.file, files: files.size };
}

function formatError(error, project) {
  const match = error.message.match(/^Line (\d+), column (\d+): ([\s\S]*)$/);
  const location = match && project?.locations[Number(match[1]) - 1];
  if (!location) return error.message;
  const column = Number(match[2]);
  const line = project.originals.get(location.file)[location.line - 1] || '';
  return location.file + ':' + location.line + ':' + column + ': ' + match[3] + '\n  ' + line + '\n  ' + ' '.repeat(Math.max(0, column - 1)) + '^';
}

module.exports = { compileSources, formatError };
