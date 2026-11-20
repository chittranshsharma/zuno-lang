#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { runProject } = require('./project');
const args = process.argv.slice(2);
const version = require('./package.json').version;
const help = 'Zuno ' + version + '\n  zuno [run|check] [file.zuno|folder]\n  zuno init [folder]\n  zuno --version\n\nIn a project, run/check use the entry in zuno.json.\nWithout a project file, the default entry is main.zuno.';

function init(folder) {
  const target = path.resolve(folder || 'zuno-app');
  if (fs.existsSync(target)) throw new Error('Target already exists. Choose a new directory.');
  fs.mkdirSync(path.join(target, 'src'), { recursive: true });
  fs.mkdirSync(path.join(target, '.vscode'));
  fs.writeFileSync(path.join(target, 'zuno.json'), JSON.stringify({ name: path.basename(target), entry: 'src/main.zuno' }, null, 2) + '\n');
  fs.writeFileSync(path.join(target, 'src', 'greeting.zuno'), 'cook greet(name) {\n  yeet "Welcome, " + name;\n}\n');
  fs.writeFileSync(path.join(target, 'src', 'main.zuno'), 'import "./greeting.zuno" as greeting;\nyap(greeting.greet("Zuno"));\n');
  fs.writeFileSync(path.join(target, 'README.md'), '# ' + path.basename(target) + '\n\nRun `zuno run` or `zuno check` from this folder.\n\nThe entry file is set in zuno.json. Import other .zuno files on their own line.\n');
  const task = action => ({ label: 'Zuno: ' + action + ' project', type: 'shell', command: 'zuno', args: [action, { value: '${workspaceFolder}', quoting: 'strong' }], group: action === 'run' ? { kind: 'build', isDefault: true } : undefined, problemMatcher: { owner: 'zuno', fileLocation: 'absolute', pattern: { regexp: '^(.+):(\\d+):(\\d+): (.*)$', file: 1, line: 2, column: 3, message: 4 } } });
  fs.writeFileSync(path.join(target, '.vscode', 'tasks.json'), JSON.stringify({ version: '2.0.0', tasks: ['run', 'check'].map(task) }, null, 2) + '\n');
  console.log('Created ' + target + '\nNext: cd "' + target + '"\nThen: zuno run');
}

try {
  if (['--version', '-v'].includes(args[0])) console.log('Zuno ' + version);
  else if (['--help', '-h'].includes(args[0])) console.log(help);
  else if (args[0] === 'init') {
    if (args.length > 2) throw new Error('Usage: zuno init [folder]');
    init(args[1]);
  } else {
    const command = ['run', 'check', '--check'].includes(args[0]) ? args.shift() : 'run';
    if (args.length > 1 || args[0]?.startsWith('-')) throw new Error(help);
    runProject(args[0], command !== 'run').output.forEach(line => console.log(line));
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
