const vscode = require('vscode');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

async function wait(check) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Editor language feature did not become ready.');
}

async function run() {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zuno-editor-')));
  const uri = vscode.Uri.file(path.join(directory, 'main.zuno'));
  const helper = vscode.Uri.file(path.join(directory, 'helper.zuno'));
  const source = 'import "./helper.zuno" as h;\nvibe amount = 4;\nyap(h.double(amount));';
  fs.writeFileSync(path.join(directory, 'zuno.json'), '{"entry":"main.zuno"}');
  fs.writeFileSync(uri.fsPath, source);
  fs.writeFileSync(helper.fsPath, 'cook double(value) { yeet value * 2; }');
  const extension = vscode.extensions.getExtension('zuno-local.zuno-tools');
  assert.ok(extension);
  await extension.activate();
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  assert.equal(document.languageId, 'zuno');
  const completion = await wait(async () => {
    const result = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', uri, new vscode.Position(2, 6));
    return result?.items.some(item => item.label === 'double') && result;
  });
  assert.ok(completion.items.some(item => item.detail === 'double(value)'));
  const definition = await vscode.commands.executeCommand('vscode.executeDefinitionProvider', uri, new vscode.Position(2, 9));
  assert.equal((definition[0].uri || definition[0].targetUri).fsPath.toLowerCase(), helper.fsPath.toLowerCase());
  const hover = await vscode.commands.executeCommand('vscode.executeHoverProvider', uri, new vscode.Position(2, 9));
  assert.match(hover[0].contents.map(item => item.value).join(''), /double\(value\)/);
  const signature = await vscode.commands.executeCommand('vscode.executeSignatureHelpProvider', uri, new vscode.Position(2, 13), '(');
  assert.equal(signature.signatures[0].label, 'double(value)');
  const original = document.getText();
  await vscode.commands.executeCommand('editor.action.formatDocument');
  await wait(() => document.getText() !== original);
  assert.equal(document.getText(), original + '\n');
  await vscode.commands.executeCommand('undo');
  await wait(() => document.getText() === original);
  const rename = await vscode.commands.executeCommand('vscode.executeDocumentRenameProvider', uri, new vscode.Position(2, 9), 'twice');
  assert.equal(rename.entries().length, 2);
  assert.equal(await vscode.workspace.applyEdit(rename), true);
  assert.match(document.getText(), /h\.twice/);
  const helperDocument = await vscode.workspace.openTextDocument(helper);
  assert.match(helperDocument.getText(), /cook twice/);
  const broken = new vscode.WorkspaceEdit();
  broken.replace(uri, new vscode.Range(1, 0, 1, 16), 'vibe amount = missing;');
  assert.equal(await vscode.workspace.applyEdit(broken), true);
  await wait(() => vscode.languages.getDiagnostics(uri).some(item => item.message === 'Unknown variable: missing'));
  const repaired = new vscode.WorkspaceEdit();
  repaired.replace(uri, new vscode.Range(1, 0, 1, 22), 'vibe amount = 4;');
  assert.equal(await vscode.workspace.applyEdit(repaired), true);
  await wait(() => vscode.languages.getDiagnostics(uri).length === 0);
  fs.writeFileSync(path.join(directory, 'main.test.zuno'), 'assert(1 + 1 == 2, "addition");');
  const result = require('node:child_process').execFileSync(process.execPath, [path.join(extension.extensionPath, 'runtime', 'cli.js'), 'test', directory], { encoding: 'utf8', env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' } });
  assert.match(result, /1 passed, 0 failed/);
  assert.ok((await vscode.commands.getCommands()).includes('zuno.testProject'));
  const libraryDocument = await vscode.workspace.openTextDocument({ language:'zuno', content:'import arrays as a;\ncook double(x) { yeet x*2; }\nvibe values=a.map([1,2],double);\neach x in values { dip; }' });
  await vscode.window.showTextDocument(libraryDocument);
  await wait(async () => {
    const items = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', libraryDocument.uri, new vscode.Position(2, 14));
    return items?.items.some(item => item.label === 'map');
  });
  const libraryHover = await vscode.commands.executeCommand('vscode.executeHoverProvider', libraryDocument.uri, new vscode.Position(2, 16));
  assert.match(libraryHover[0].contents.map(item => item.value).join(''), /shallow snapshot/);
  await wait(() => vscode.languages.getDiagnostics(libraryDocument.uri).length === 0);
  console.log('ZUNO_EDITOR_SMOKE_PASSED: hover, signatures, format and undo, tests, completion, cross-file definition, rename, and live diagnostics.');
  if (process.env.ZUNO_SMOKE_REPORT) fs.writeFileSync(process.env.ZUNO_SMOKE_REPORT, JSON.stringify({ passed: true, version: extension.packageJSON.version }));
}

module.exports = { run };
