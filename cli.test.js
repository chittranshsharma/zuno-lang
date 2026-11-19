const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
test('CLI loads nested modules once and rejects cycles and escapes', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zuno-test-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'math.zuno'),'cook twice(x) { yeet x * 2; }');
  fs.writeFileSync(path.join(root,'helper.zuno'),'import "./math.zuno" as m;\ncook answer() { yeet m.twice(21); }');
  fs.writeFileSync(path.join(root,'main.zuno'),'import "./helper.zuno" as h;\nimport "./math.zuno" as m;\nyap(h.answer()); yap(m.twice(2));');
  const run=()=>spawnSync(process.execPath,['cli.js',path.join(root,'main.zuno')],{encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr);assert.equal(result.stdout.trim(),'42\n4');
  fs.writeFileSync(path.join(root,'math.zuno'),'import "./main.zuno" as entry;');
  result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/Circular/);
  fs.writeFileSync(path.join(root,'main.zuno'),'import "../outside.zuno" as x;');
  result=run();assert.notEqual(result.status,0);
});

test('CLI version, project creation, run and check work locally', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zuno-local-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const call=(...args)=>spawnSync(process.execPath,['cli.js',...args],{encoding:'utf8'});
  assert.match(call('--version').stdout,/Zuno/);
  assert.match(call('--help').stdout,/zuno init/);
  const project=path.join(root,'app');
  assert.equal(call('init',project).status,0);
  const main=path.join(project,'main.zuno');
  assert.equal(call('run',main).stdout.trim(),'Welcome, Zuno');
  assert.equal(call('check',main).stdout.trim(),'Syntax OK');
  assert.notEqual(call('init',project).status,0);
  assert.match(fs.readFileSync(main,'utf8'),/Welcome/);
  assert.ok(fs.existsSync(path.join(project,'.vscode','tasks.json')));
});
