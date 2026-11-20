const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('editor commands use bundled runtime, project folder, saved documents, and problem matcher', async () => {
  const commands = new Map();
  const tasks = [];
  const folder = { uri: { fsPath: path.resolve('project with spaces') } };
  let saveAll = true;
  const document = { languageId: 'zuno', uri: { fsPath: path.join(folder.uri.fsPath, 'src', 'main.zuno') }, isDirty: true, save: async () => true };
  const vscode = {
    commands: { registerCommand: (name, callback) => { commands.set(name, callback); return {}; } },
    window: { activeTextEditor: { document }, showInformationMessage: () => {} },
    workspace: { workspaceFolders: [folder], getWorkspaceFolder: () => folder, saveAll: async () => saveAll, getConfiguration: () => ({ get: () => 'node' }) },
    ProcessExecution: class { constructor(command, args) { this.command = command; this.args = args; } },
    Task: class { constructor(definition, scope, name, source, execution) { this.execution = execution; } },
    TaskScope: { Workspace: 1 }, tasks: { executeTask: async task => tasks.push(task) }
  };
  const context = { module: { exports: {} }, require: name => name === 'vscode' ? vscode : require(name) };
  vm.runInNewContext(fs.readFileSync('editor-extension/extension.js', 'utf8'), context);
  context.module.exports.activate({ extensionPath: '/extension', subscriptions: [] });
  await commands.get('zuno.run')();
  assert.equal(tasks[0].execution.args[2], document.uri.fsPath);
  assert.equal(tasks[0].execution.args[0], path.join('/extension', 'runtime', 'cli.js'));
  await commands.get('zuno.checkProject')();
  assert.equal(tasks[1].execution.args[1], 'check');
  assert.equal(tasks[1].execution.args[2], folder.uri.fsPath);
  assert.equal(tasks[1].problemMatchers[0], '$zuno');
  saveAll = false;
  await commands.get('zuno.runProject')();
  assert.equal(tasks.length, 2);
  document.save = async () => false;
  await commands.get('zuno.run')();
  assert.equal(tasks.length, 2);
  const manifest = JSON.parse(fs.readFileSync('editor-extension/package.json', 'utf8'));
  const matcher = new RegExp(manifest.contributes.problemMatchers[0].pattern.regexp);
  const error = matcher.exec(document.uri.fsPath + ':4:2: Unknown variable');
  assert.equal(error[1], document.uri.fsPath);
  assert.equal(error[2], '4');
});
