const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { createMessageConnection, StreamMessageReader, StreamMessageWriter } = require('vscode-jsonrpc/node');
const { URI } = require('vscode-uri');

async function verifyServer(server) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zuno-protocol-')));
  const main = URI.file(path.join(root, 'main.zuno')).toString();
  const helper = URI.file(path.join(root, 'helper.zuno')).toString();
  fs.writeFileSync(path.join(root, 'zuno.json'), '{"entry":"main.zuno"}');
  fs.writeFileSync(path.join(root, 'helper.zuno'), 'cook double(value) { yeet value * 2; }');
  const source = 'import "./helper.zuno" as h;\nvibe local = 2;\nyap(h.double(local));\ngrind fr {}';
  fs.writeFileSync(path.join(root, 'main.zuno'), source);
  const child = spawn(process.execPath, [server, '--stdio'], { stdio: ['pipe', 'pipe', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk; });
  const connection = createMessageConnection(new StreamMessageReader(child.stdout), new StreamMessageWriter(child.stdin));
  const diagnostics = new Map();
  connection.onNotification('textDocument/publishDiagnostics', params => diagnostics.set(params.uri, params));
  connection.listen();
  const request = (method, params) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out: ' + method + ' ' + stderr)), 10000);
    connection.sendRequest(method, params).then(resolve, reject).finally(() => clearTimeout(timer));
  });
  const wait = async (version, match) => {
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      const result = diagnostics.get(main);
      if (result?.version === version && match(result.diagnostics)) return result.diagnostics;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error('Timed out waiting for diagnostics: ' + JSON.stringify([...diagnostics]) + stderr);
  };
  try {
    const initialized = await request('initialize', { processId: process.pid, rootUri: URI.file(root).toString(), capabilities: { workspace: { workspaceEdit: { documentChanges: true } } } });
    assert.equal(initialized.capabilities.renameProvider.prepareProvider, true);
    assert.equal(initialized.capabilities.hoverProvider, true);
    assert.equal(initialized.capabilities.documentFormattingProvider, true);
    await connection.sendNotification('initialized', {});
    await connection.sendNotification('textDocument/didOpen', { textDocument: { uri: main, languageId: 'zuno', version: 1, text: source } });
    await wait(1, items => items.length === 0);
    const at = { textDocument: { uri: main }, position: { line: 2, character: 8 } };
    const completion = await request('textDocument/completion', { ...at, position: { line: 2, character: 6 } });
    assert.ok(completion.some(item => item.label === 'double'));
    assert.equal((await request('textDocument/definition', at)).uri, helper);
    assert.match((await request('textDocument/hover', at)).contents.value, /double\(value\)/);
    const signature = await request('textDocument/signatureHelp', { ...at, position: { line: 2, character: 13 } });
    assert.equal(signature.signatures[0].label, 'double(value)');
    const formatted = await request('textDocument/formatting', { textDocument: { uri: main }, options: { tabSize: 2, insertSpaces: true } });
    assert.equal(formatted.length, 1);
    assert.match(formatted[0].newText, /grind fr \{\n\}/);
    assert.equal((await request('textDocument/rename', { ...at, newName: 'twice' })).documentChanges.length, 2);
    await assert.rejects(request('textDocument/rename', { ...at, newName: 'fr' }), /keyword/);
    await connection.sendNotification('textDocument/didOpen', { textDocument: { uri: helper, languageId: 'zuno', version: 1, text: 'cook triple(value) { yeet value * 3; }' } });
    await connection.sendNotification('textDocument/didChange', { textDocument: { uri: main, version: 2 }, contentChanges: [{ text: source.replace('double', 'triple') }] });
    await wait(2, items => items.length === 0);
    assert.ok((await request('textDocument/completion', { ...at, position: { line: 2, character: 6 } })).some(item => item.label === 'triple'));
    await connection.sendNotification('textDocument/didChange', { textDocument: { uri: main, version: 3 }, contentChanges: [{ range: { start: { line: 1, character: 0 }, end: { line: 1, character: 15 } }, text: 'vibe local = missing;' }] });
    const errors = await wait(3, items => items.some(item => item.message.includes('Unknown variable: missing')));
    assert.equal(errors.find(item => item.message.includes('missing')).range.start.line, 1);
    await connection.sendNotification('textDocument/didChange', { textDocument: { uri: main, version: 4 }, contentChanges: [{ text: source.replace('double', 'triple') }] });
    await wait(4, items => items.length === 0);
    await connection.sendNotification('textDocument/didClose', { textDocument: { uri: helper } });
    await wait(4, items => items.some(item => item.message.includes('Unknown member: triple')));
    fs.writeFileSync(path.join(root, 'helper.zuno'), 'cook triple(value) { yeet value * 3; }');
    await connection.sendNotification('workspace/didChangeWatchedFiles', { changes: [{ uri: helper, type: 2 }] });
    await wait(4, items => items.length === 0);
    await connection.sendNotification('textDocument/didChange', { textDocument: { uri: main, version: 5 }, contentChanges: [{ text: 'vibe broken = ;' }] });
    await wait(5, items => items.some(item => item.message.includes('Expected an expression')));
    await assert.rejects(request('textDocument/formatting', { textDocument: { uri: main }, options: { tabSize: 2, insertSpaces: true } }), /Cannot format/);
    await connection.sendNotification('textDocument/didChange', { textDocument: { uri: main, version: 6 }, contentChanges: [{ text: source.replace('double', 'triple') }] });
    await wait(6, items => items.length === 0);
    const exit = new Promise(resolve => child.once('exit', resolve));
    await request('shutdown', null);
    await connection.sendNotification('exit');
    await Promise.race([exit, new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Server did not exit.')), 5000); timer.unref(); })]);
  } finally {
    connection.dispose();
    child.kill();
    fs.rmSync(root, { recursive: true, force: true });
  }
}

if (require.main === module) verifyServer(path.resolve(process.argv[2] || 'language-server/server.js')).then(() => console.log('LSP protocol smoke passed.'), error => { console.error(error); process.exitCode = 1; });
module.exports = { verifyServer };
