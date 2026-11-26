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
  const { compileSources } = require('./source-compiler');
  const label = filename => path.relative(root, filename) || path.basename(filename);
  const canonical = filename => {
    let resolved;
    try { resolved = fs.realpathSync(filename); }
    catch { throw new Error('File not found: ' + label(filename)); }
    if (!inside(root, resolved)) throw new Error('Imports must stay in the project directory: ' + label(filename));
    if (!resolved.endsWith('.zuno')) throw new Error('Module files must end in .zuno: ' + label(resolved));
    return resolved;
  };
  const project = compileSources(canonical(entry), filename => {
    if (fs.statSync(filename).size > 400000) throw new Error('Source file is too large: ' + label(filename));
    return fs.readFileSync(filename, 'utf8');
  }, (from, target) => canonical(path.resolve(path.dirname(from), target)), label);
  return { ...project, root };
}

const { formatError } = require('./source-compiler');

function runProject(input, check = false, cwd) {
  const project = compileProject(input, cwd);
  try {
    if (check) { parse(project.source); return { project, output: ['Syntax OK'] }; }
    return { project, output: execute(project.source) };
  } catch (error) { throw new Error(formatError(error, project)); }
}

module.exports = { compileProject, resolveProject, runProject };
