#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { runProject } = require('./project');
const args = process.argv.slice(2);
const version = require('./package.json').version;
const help = 'Zuno ' + version + '\n  zuno [run|check] [file.zuno|folder]\n  zuno format [file.zuno|folder] [--check]\n  zuno test [file.test.zuno|folder]\n  zuno init [folder]\n  zuno --version\n\nIn a project, run/check use the entry in zuno.json.\nWithout a project file, the default entry is main.zuno.';

function init(folder) {
  const target = path.resolve(folder || 'zuno-app');
  if (fs.existsSync(target)) throw new Error('Target already exists. Choose a new directory.');
  fs.mkdirSync(path.join(target, 'src'), { recursive: true });
  fs.mkdirSync(path.join(target, '.vscode'));
  fs.writeFileSync(path.join(target, 'zuno.json'), JSON.stringify({ name: path.basename(target), entry: 'src/main.zuno' }, null, 2) + '\n');
  fs.writeFileSync(path.join(target, 'src', 'greeting.zuno'), 'cook greet(name) {\n  yeet "Welcome, " + name;\n}\n');
  fs.writeFileSync(path.join(target, 'src', 'main.zuno'), 'import "./greeting.zuno" as greeting;\nyap(greeting.greet("Zuno"));\n');
  fs.writeFileSync(path.join(target, 'src', 'greeting.test.zuno'), 'import "./greeting.zuno" as greeting;\nassert(greeting.greet("Zuno") == "Welcome, Zuno", "greets by name");\n');
  fs.writeFileSync(path.join(target, 'README.md'), '# ' + path.basename(target) + '\n\nRun `zuno run`, `zuno check`, or `zuno test` from this folder. Format with `zuno format`; use `zuno format --check` in CI.\n\nThe entry file is set in zuno.json. Import other .zuno files on their own line. Tests end in .test.zuno and use assert(condition, message).\n');
  const task = action => ({ label: 'Zuno: ' + action + ' project', type: 'shell', command: 'zuno', args: [action, { value: '${workspaceFolder}', quoting: 'strong' }], group: action === 'run' ? { kind: 'build', isDefault: true } : undefined, problemMatcher: { owner: 'zuno', fileLocation: 'absolute', pattern: { regexp: '^(.+):(\\d+):(\\d+): (.*)$', file: 1, line: 2, column: 3, message: 4 } } });
  fs.writeFileSync(path.join(target, '.vscode', 'tasks.json'), JSON.stringify({ version: '2.0.0', tasks: ['run', 'check', 'test'].map(task) }, null, 2) + '\n');
  console.log('Created ' + target + '\nNext: cd "' + target + '"\nThen: zuno run');
}

try {
  if (['--version', '-v'].includes(args[0])) console.log('Zuno ' + version);
  else if (['--help', '-h'].includes(args[0])) console.log(help);
  else if (args[0] === 'init') {
    if (args.length > 2) throw new Error('Usage: zuno init [folder]');
    init(args[1]);
  } else if (args[0] === 'test') {
    if (args.length > 2 || args[1]?.startsWith('-')) throw new Error(help);
    const report = require('./test-runner').testProject(args[1]);
    for (const result of report.results) {
      console.log((result.passed ? 'PASS ' : 'FAIL ') + result.file);
      if (result.error) console.error(result.error);
      for (const line of result.output || []) console.log('  ' + line);
    }
    console.log(report.passed + ' passed, ' + report.failed + ' failed');
    if (report.failed) process.exitCode = 1;
  } else if (args[0] === 'format') {
    const check = args.includes('--check');
    const inputs = args.slice(1).filter(arg => arg !== '--check');
    if (inputs.length > 1 || inputs[0]?.startsWith('-')) throw new Error(help);
    const { format } = require('./formatter');
    const files = require('./workspace-files').sourceFiles(inputs[0]);
    const changes = files.map(file => {
      if (fs.statSync(file).size > 400000) throw new Error('Source file is too large: ' + file);
      const source = fs.readFileSync(file, 'utf8');
      try { return { file, source, formatted: format(source) }; }
      catch (error) { throw new Error(file + ': ' + error.message); }
    }).filter(item => item.source !== item.formatted);
    for (const item of changes) {
      if (!check) fs.writeFileSync(item.file, item.formatted);
      console.log((check ? 'Needs formatting: ' : 'Formatted: ') + item.file);
    }
    console.log(changes.length + (check ? ' files need formatting' : ' files formatted'));
    if (check && changes.length) process.exitCode = 1;
  } else {
    const command = ['run', 'check', '--check'].includes(args[0]) ? args.shift() : 'run';
    if (args.length > 1 || args[0]?.startsWith('-')) throw new Error(help);
    runProject(args[0], command !== 'run').output.forEach(line => console.log(line));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
