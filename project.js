const fs = require('node:fs');
const path = require('node:path');
const { execute, parse } = require('./engine');

function inside(root, filename) {
  const relative = path.relative(root, filename);
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function findProject(start) {
  let directory = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(directory, 'zuno.json'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return null;
    directory = parent;
  }
}

function resolveProject(input, cwd = process.cwd()) {
  const target = path.resolve(cwd, input || '.');
  if (!fs.existsSync(target)) throw new Error('File or folder not found: ' + target);
  const directory = fs.statSync(target).isDirectory() ? target : path.dirname(target);
  const project = findProject(directory);
  const root = fs.realpathSync(project || directory);
  let entry = fs.statSync(target).isDirectory() ? target : fs.realpathSync(target);
  if (fs.statSync(target).isDirectory()) {
    let config = { entry: 'main.zuno' };
    if (project) {
      try { config = JSON.parse(fs.readFileSync(path.join(project, 'zuno.json'), 'utf8')); }
      catch { throw new Error('Cannot read zuno.json. Use valid JSON with an entry field.'); }
      if (!config || typeof config.entry !== 'string' || !config.entry.endsWith('.zuno')) {
        throw new Error('zuno.json needs an entry ending in .zuno.');
      }
    }
    entry = path.resolve(root, config.entry);
  }
  if (!inside(root, entry)) throw new Error('Entry must stay in the project directory.');
  return { root, entry };
}

function compileProject(input, cwd) {
  const { root, entry } = resolveProject(input, cwd);
  const files = new Map();
  const visiting = [];
  const modules = [];
  const sourceLines = [];
  const locations = [];
  const originals = new Map();
  const label = filename => path.relative(root, filename) || path.basename(filename);

  function load(filename, importedAt) {
    let resolved;
    try { resolved = fs.realpathSync(filename); }
    catch { throw new Error((importedAt ? label(importedAt.file) + ':' + importedAt.line + ': ' : '') + 'File not found: ' + label(filename)); }
    if (!inside(root, resolved)) throw new Error('Imports must stay in the project directory: ' + label(filename));
    if (visiting.includes(resolved)) throw new Error('Circular module import: ' + [...visiting, resolved].map(label).join(' -> '));
    if (files.has(resolved)) return files.get(resolved);
    if (files.size >= 100) throw new Error('Too many module files (maximum 100 including the entry).');
    if (!resolved.endsWith('.zuno')) throw new Error('Module files must end in .zuno: ' + label(resolved));
    if (fs.statSync(resolved).size > 400000) throw new Error('Source file is too large: ' + label(resolved));
    const text = fs.readFileSync(resolved, 'utf8').replace(/^\uFEFF/, '');
    originals.set(resolved, text.split(/\r?\n/));
    const record = { name: '__file' + files.size, file: resolved, lines: [] };
    files.set(resolved, record);
    visiting.push(resolved);
    for (const [index, line] of originals.get(resolved).entries()) {
      const match = line.match(/^([ \t]*)import[ \t]+"([^"\r\n]+)"[ \t]+as[ \t]+([A-Za-z_]\w*)[ \t]*;[ \t]*(?:\/\/.*)?$/);
      if (match) {
        const dependency = load(path.resolve(path.dirname(resolved), match[2]), { file: resolved, line: index + 1 });
        record.lines.push(match[1] + 'import ' + dependency.name + ' as ' + match[3] + ';');
      } else if (/^[ \t]*import[ \t]+"/.test(line)) {
        throw new Error(label(resolved) + ':' + (index + 1) + ': Put each file import on its own line: import "./file.zuno" as name;');
      } else record.lines.push(line);
    }
    visiting.pop();
    modules.push(record);
    return record;
  }

  const main = load(entry);
  for (const record of modules) {
    if (record !== main) { sourceLines.push('module ' + record.name + ' {'); locations.push(null); }
    record.lines.forEach((line, index) => {
      sourceLines.push(line);
      locations.push({ file: record.file, line: index + 1 });
    });
    if (record !== main) { sourceLines.push('}'); locations.push({ file: record.file, line: record.lines.length }); }
  }
  const source = sourceLines.join('\n');
  if (source.length > 100000) throw new Error('Combined project exceeds 100000 characters.');
  return { source, locations, originals, root, entry: main.file, files: files.size };
}

function formatError(error, project) {
  const match = error.message.match(/^Line (\d+), column (\d+): ([\s\S]*)$/);
  const location = match && project?.locations[Number(match[1]) - 1];
  if (!location) return error.message;
  const column = Number(match[2]);
  const line = project.originals.get(location.file)[location.line - 1] || '';
  return location.file + ':' + location.line + ':' + column + ': ' + match[3] + '\n  ' + line + '\n  ' + ' '.repeat(Math.max(0, column - 1)) + '^';
}

function runProject(input, check = false, cwd) {
  const project = compileProject(input, cwd);
  try {
    if (check) { parse(project.source); return { project, output: ['Syntax OK'] }; }
    return { project, output: execute(project.source) };
  } catch (error) { throw new Error(formatError(error, project)); }
}

module.exports = { compileProject, resolveProject, runProject };
