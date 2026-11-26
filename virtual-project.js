const { compileSources, formatError } = require('./source-compiler');
const { execute, parse } = require('./engine');

function normalize(filename) {
  if (typeof filename !== 'string' || filename.startsWith('/') || filename.includes('\\') || filename.includes(':')) throw new Error('Use a relative .zuno path.');
  const parts = [];
  for (const part of filename.split('/')) {
    if (part === '.' || !part) continue;
    if (part === '..') { if (!parts.length) throw new Error('Imports must stay in the project directory.'); parts.pop(); }
    else parts.push(part);
  }
  const result = parts.join('/');
  if (!result.endsWith('.zuno')) throw new Error('Module files must end in .zuno.');
  return result;
}

function runVirtual(files, entry, check = false) {
  if (!Array.isArray(files) || files.length > 100) throw new Error('Use at most 100 source files.');
  const sources = new Map();
  for (const file of files) {
    const name = normalize(file.path);
    if (sources.has(name)) throw new Error('Duplicate project path: ' + name);
    if (typeof file.code !== 'string' || file.code.length > 100000) throw new Error('Source file is too large: ' + name);
    sources.set(name, file.code);
  }
  const project = compileSources(normalize(entry), file => {
    if (!sources.has(file)) throw new Error('File not found: ' + file + '. Open it in a tab first.');
    return sources.get(file);
  }, (from, target) => {
    if (target.startsWith('/') || target.includes(':') || target.includes('\\')) throw new Error('Use relative file imports.');
    return normalize(from.split('/').slice(0, -1).concat(target).join('/'));
  });
  try { return check ? (parse(project.source), ['Syntax OK']) : execute(project.source); }
  catch (error) { throw new Error(formatError(error, project)); }
}

function testVirtual(files) {
  const tests = files.filter(file => file.path.endsWith('.test.zuno')).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  if (!tests.length) throw new Error('Open a *.test.zuno file that uses assert(condition, message).');
  const results = tests.map(file => {
    try { return { file: file.path, passed: true, output: runVirtual(files, file.path) }; }
    catch (error) { return { file: file.path, passed: false, error: error.message }; }
  });
  return { results, passed: results.filter(result => result.passed).length, failed: results.filter(result => !result.passed).length };
}

module.exports = { runVirtual, testVirtual };
