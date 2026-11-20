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
  const main=path.join(project,'src','main.zuno');
  assert.equal(call('run',main).stdout.trim(),'Welcome, Zuno');
  assert.equal(call('check',main).stdout.trim(),'Syntax OK');
  assert.notEqual(call('init',project).status,0);
  assert.match(fs.readFileSync(main,'utf8'),/greeting/);
  assert.ok(fs.existsSync(path.join(project,'.vscode','tasks.json')));
});

test('projects discover entries and resolve sibling imports with original error positions', t => {
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'zuno-project-')));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'src'));
  fs.mkdirSync(path.join(root,'lib'));
  fs.writeFileSync(path.join(root,'zuno.json'),JSON.stringify({entry:'src/main.zuno'}));
  fs.writeFileSync(path.join(root,'src','main.zuno'),'import "../lib/helper.zuno" as h;\nyap(h.answer());');
  fs.writeFileSync(path.join(root,'lib','helper.zuno'),'\ncook answer() {\n  yeet 42;\n}');
  const cli=path.resolve('cli.js');
  const call=(cwd,...args)=>spawnSync(process.execPath,[cli,...args],{cwd,encoding:'utf8'});
  assert.equal(call(root,'run').stdout.trim(),'42');
  assert.equal(call(path.join(root,'src'),'run').stdout.trim(),'42');
  assert.equal(call(root,'check').stdout.trim(),'Syntax OK');
  fs.writeFileSync(path.join(root,'lib','helper.zuno'),'\ncook answer() {\n  yeet missing;\n}');
  let result=call(root,'run');
  assert.equal(result.status,1);
  assert.ok(result.stderr.includes(path.join(root,'lib','helper.zuno')+':3:8:'),result.stderr);
  assert.match(result.stderr,/yeet missing;\n {9}\^/);
  fs.writeFileSync(path.join(root,'lib','helper.zuno'),'cook answer() {\n yeet ;\n}');
  result=call(root,'check');
  assert.equal(result.status,1);
  assert.ok(result.stderr.includes(path.join(root,'lib','helper.zuno')+':2:7:'),result.stderr);
  fs.writeFileSync(path.join(root,'zuno.json'),'{oops');
  assert.match(call(root,'run').stderr,/valid JSON/);
  fs.writeFileSync(path.join(root,'zuno.json'),JSON.stringify({entry:'../outside.zuno'}));
  assert.match(call(root,'run').stderr,/Entry must stay/);
});

test('file imports are isolated, checked without execution, and loaded once', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'zuno-import-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'main.zuno'),'import "./helper.zuno" as h;\nimport "./helper.zuno" as other;\nyap(h.answer());');
  fs.writeFileSync(path.join(root,'helper.zuno'),'yap("loaded");\ncook answer() { yeet 4; }');
  const call=(...args)=>spawnSync(process.execPath,[path.resolve('cli.js'),...args,root],{encoding:'utf8'});
  assert.equal(call('run').stdout.trim(),'loaded\n4');
  assert.equal(call('check').stdout.trim(),'Syntax OK');
  fs.writeFileSync(path.join(root,'main.zuno'),'import "./helper.zuno" as h; yap(1);');
  assert.match(call('check').stderr,/own line/);
  fs.writeFileSync(path.join(root,'main.zuno'),'import "../missing.zuno" as h;');
  assert.match(call('run').stderr,/main.zuno:1: File not found/);
});
