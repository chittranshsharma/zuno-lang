const fs = require('node:fs');
const path = require('node:path');
const { resolveProject } = require('./project');

function sourceFiles(input, suffix = '.zuno', cwd = process.cwd()) {
  const target = path.resolve(cwd, input || '.');
  if (!fs.existsSync(target)) throw new Error('File or folder not found: ' + target);
  if (fs.statSync(target).isFile()) {
    if (!target.endsWith(suffix)) throw new Error('Expected a ' + suffix + ' file.');
    return [fs.realpathSync(target)];
  }
  const { root } = resolveProject(target);
  const files = [];
  let directories = 0;
  function walk(directory) {
    if (++directories > 200) throw new Error('Project exceeds 200 directories.');
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      if (entry.name.startsWith('.') || ['node_modules', 'dist', 'output', 'vendor', 'public'].includes(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!fs.existsSync(path.join(filename, 'zuno.json'))) walk(filename);
      } else if (entry.isFile() && entry.name.endsWith(suffix)) {
        if (files.length >= 100) throw new Error('Project exceeds 100 source files.');
        files.push(filename);
      }
    }
  }
  walk(root);
  return files;
}

module.exports = { sourceFiles };
