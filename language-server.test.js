const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { URI } = require('vscode-uri');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { Analysis } = require('./language-server/analysis');

function fixture(t, files) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zuno-lsp-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, 'zuno.json'), JSON.stringify({ entry: 'main.zuno' }));
  for (const [name, text] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), { recursive: true });
    fs.writeFileSync(path.join(root, name), text);
  }
  const uri = name => URI.file(path.join(root, name)).toString();
  const open = new Map();
  const edit = (name, text, version = 1) => { const document = TextDocument.create(uri(name), 'zuno', version, text); open.set(document.uri, document); return document; };
  const analysis = name => new Analysis(uri(name), open);
  const position = (name, text, occurrence = 0) => {
    const source = open.get(uri(name)) || TextDocument.create(uri(name), 'zuno', 0, fs.readFileSync(path.join(root, name), 'utf8'));
    let offset = -1;
    for (let i = 0; i <= occurrence; i++) offset = source.getText().indexOf(text, offset + 1);
    assert.notEqual(offset, -1);
    return source.positionAt(offset + 1);
  };
  return { root, uri, open, edit, analysis, position };
}

test('hover and signatures resolve imports, constructors, builtins and unsaved nested calls', t => {
  const f = fixture(t, {
    'main.zuno': 'import "./helper.zuno" as h;\nimport strings as s;\nclass Box { cook init(value) { this.value = value; } }\nvibe box = Box(1);\nyap(h.add(1, len([1, 2])));',
    'helper.zuno': 'cook add(left, right) { yeet left + right; }'
  });
  let a = f.analysis('main.zuno');
  assert.match(a.hover(f.uri('main.zuno'), f.position('main.zuno', 'add')).contents.value, /add\(left, right\)/);
  assert.match(a.hover(f.uri('main.zuno'), f.position('main.zuno', 'Box(1)')).contents.value, /Box\(value\)/);
  const signature = (source, suffix) => {
    const document = f.edit('main.zuno', source);
    a = f.analysis('main.zuno');
    return a.signatureHelp(document.uri, document.positionAt(suffix ? source.indexOf(suffix) + suffix.length : source.length));
  };
  const prefix = 'import "./helper.zuno" as h;\nimport strings as s;\n';
  assert.equal(signature(prefix + 'h.add(1, ').activeParameter, 1);
  assert.equal(signature(prefix + 'h.add(1, len([1, 2]), ', 'len(').signatures[0].label, 'len(value)');
  assert.equal(signature(prefix + 'h.add(len([1, 2]), ').activeParameter, 1);
  assert.equal(signature(prefix + 's.replace("a,b", "a", ').activeParameter, 2);
  assert.equal(signature(prefix + 'h.add(unknown('), null);
  assert.equal(signature(prefix + 'h.add("unfinished'), null);
  assert.equal(signature(prefix + 'h.add(1, // comment'), null);
  f.edit('helper.zuno', 'cook add(first, second, third) { yeet first; }');
  assert.equal(signature(prefix + 'h.add(').signatures[0].label, 'add(first, second, third)');
});

test('new collection helpers and loop controls have editor support', t => {
  const f = fixture(t, { 'main.zuno':'import arrays as a;\ncook even(x) { yeet x%2==0; }\nvibe values = a.filter([1,2],even);\neach x in values { bet x==2 { dip; } skip; }' });
  const analysis = f.analysis('main.zuno');
  assert.deepEqual(analysis.main.diagnostics, []);
  assert.match(analysis.hover(f.uri('main.zuno'), f.position('main.zuno', 'filter')).contents.value, /must return fr or cap/);
  assert.ok(analysis.completion(f.uri('main.zuno'), { line:3, character:0 }).some(item => item.label === 'skip'));
  f.edit('main.zuno', 'skip;');
  assert.ok(f.analysis('main.zuno').main.diagnostics.some(item => item.message.includes('inside a loop')));
});

test('completion and definitions resolve parameters, closures, shadowing and standard modules', t => {
  const f = fixture(t, { 'main.zuno': 'import math as m;\nvibe score = 1;\ncook outer(arg) {\n  vibe score = arg;\n  cook inner() { yeet score; }\n  yeet inner();\n}\nyap(score);\nyap(m.sqrt(9));' });
  const a = f.analysis('main.zuno');
  assert.deepEqual(a.main.diagnostics, []);
  assert.equal(a.definition(f.uri('main.zuno'), f.position('main.zuno', 'score;', 0)).range.start.line, 3);
  assert.equal(a.definition(f.uri('main.zuno'), f.position('main.zuno', 'score);')).range.start.line, 1);
  assert.ok(a.completion(f.uri('main.zuno'), { line: 3, character: 2 }).some(item => item.label === 'arg'));
  const source = f.open.get(f.uri('main.zuno'))?.getText() || fs.readFileSync(path.join(f.root, 'main.zuno'), 'utf8');
  f.edit('main.zuno', source + '\nm.');
  const completions = f.analysis('main.zuno').completion(f.uri('main.zuno'), { line: 9, character: 2 });
  assert.ok(completions.some(item => item.label === 'sqrt' && item.detail === 'sqrt(value)'));
  assert.ok(!completions.some(item => item.label === 'score'));
});

test('rename updates one lexical symbol and leaves strings, comments and shadowed symbols intact', t => {
  const source = 'vibe score = 1;\ncook work(score) { yeet score; }\nyap(score);\nyap("score");\n// score';
  const f = fixture(t, { 'main.zuno': source });
  f.edit('main.zuno', source, 7);
  const edits = f.analysis('main.zuno').rename(f.uri('main.zuno'), { line: 0, character: 6 }, 'points');
  assert.equal(edits.documentChanges.length, 1);
  assert.equal(edits.documentChanges[0].textDocument.version, 7);
  assert.deepEqual(edits.documentChanges[0].edits.map(edit => edit.range.start.line), [0, 2]);
  assert.throws(() => f.analysis('main.zuno').rename(f.uri('main.zuno'), { line: 0, character: 6 }, 'cap'), /keyword/);
  assert.throws(() => f.analysis('main.zuno').rename(f.uri('main.zuno'), { line: 0, character: 6 }, 'work'), /already declared/);
  f.edit('main.zuno', 'vibe value = 1;\ncook work(other) { yeet value + other; }');
  assert.throws(() => f.analysis('main.zuno').rename(f.uri('main.zuno'), { line: 0, character: 6 }, 'other'), /capture/);
});

test('file exports, definitions and rename use unsaved imports and update closed dependent files', t => {
  const f = fixture(t, {
    'main.zuno': 'import "./lib/helper.zuno" as h;\nyap(h.double(3));',
    'other.zuno': 'import "./lib/helper.zuno" as helper;\nyap(helper.double(4));',
    'lib/helper.zuno': 'cook double(value) { yeet value * 2; }'
  });
  f.edit('lib/helper.zuno', 'cook double(value) { yeet value * 3; }\ncook triple(value) { yeet value * 3; }', 9);
  let a = f.analysis('main.zuno');
  const definition = a.definition(f.uri('main.zuno'), f.position('main.zuno', 'double'));
  assert.equal(definition.uri, f.uri('lib/helper.zuno'));
  const rename = a.rename(f.uri('main.zuno'), f.position('main.zuno', 'double'), 'twice');
  assert.equal(rename.documentChanges.length, 3);
  assert.equal(rename.documentChanges.find(change => change.textDocument.uri === f.uri('lib/helper.zuno')).textDocument.version, 9);
  f.edit('main.zuno', 'import "./lib/helper.zuno" as h;\nh.');
  a = f.analysis('main.zuno');
  assert.ok(a.completion(f.uri('main.zuno'), { line: 1, character: 2 }).some(item => item.label === 'triple'));
  assert.equal(a.definition(f.uri('main.zuno'), { line: 0, character: 15 }).uri, f.uri('lib/helper.zuno'));
});

test('classes, this fields, methods and nested closures have separate bindings', t => {
  const source = 'class Counter {\n  cook init(start) { this.count = start; }\n  cook next(step) {\n    cook add() { yeet step + this.count; }\n    yeet add();\n  }\n}\nvibe counter = Counter(1);\nyap(counter.next(2));\nyap(counter.count);';
  const f = fixture(t, { 'main.zuno': source });
  let a = f.analysis('main.zuno');
  assert.deepEqual(a.main.diagnostics, []);
  assert.equal(a.definition(f.uri('main.zuno'), f.position('main.zuno', 'next(2)')).range.start.line, 2);
  assert.equal(a.definition(f.uri('main.zuno'), f.position('main.zuno', 'counter.count')).range.start.line, 7);
  const countPosition = a.main.document.positionAt(source.lastIndexOf('count') + 1);
  assert.equal(a.definition(f.uri('main.zuno'), countPosition).range.start.line, 1);
  assert.equal(a.rename(f.uri('main.zuno'), countPosition, 'total').documentChanges[0].edits.length, 3);
  f.edit('main.zuno', source + '\ncounter.');
  a = f.analysis('main.zuno');
  assert.ok(a.completion(f.uri('main.zuno'), { line: 10, character: 8 }).some(item => item.label === 'next'));
});

test('diagnostics are static, use UTF-16 positions, and recover completion inside incomplete functions', t => {
  const f = fixture(t, { 'main.zuno': 'yap("😀"); vibe value = missing;\r\nlock fixed = 1;\r\nfixed = 2;\r\ngrind fr {}' });
  let a = f.analysis('main.zuno');
  const missing = a.main.diagnostics.find(item => item.message.includes('missing'));
  assert.equal(missing.range.start.character, 24);
  assert.ok(a.main.diagnostics.some(item => item.message.includes('constant')));
  f.edit('main.zuno', 'cook outer(argument) {\n  vibe local = argument;\n  yap(\n}');
  a = f.analysis('main.zuno');
  assert.ok(a.main.diagnostics.length);
  const completion = a.completion(f.uri('main.zuno'), { line: 2, character: 2 });
  assert.ok(completion.some(item => item.label === 'argument'));
  assert.ok(completion.some(item => item.label === 'local'));
  assert.throws(() => a.rename(f.uri('main.zuno'), { line: 1, character: 8 }, 'renamed'), /syntax/);
});

test('missing, cyclic and escaping imports produce diagnostics without running code', t => {
  const f = fixture(t, { 'main.zuno': 'import "./missing.zuno" as missing;\nyap(1);' });
  assert.match(f.analysis('main.zuno').main.diagnostics[0].message, /Cannot read/);
  fs.writeFileSync(path.join(f.root, 'main.zuno'), 'import "../outside.zuno" as outside;');
  assert.match(f.analysis('main.zuno').main.diagnostics[0].message, /stay in/);
  fs.writeFileSync(path.join(f.root, 'main.zuno'), 'import "./other.zuno" as other;');
  fs.writeFileSync(path.join(f.root, 'other.zuno'), 'import "./main.zuno" as main;');
  const a = f.analysis('main.zuno');
  assert.ok([...a.files.values()].some(file => file.diagnostics.some(item => item.message.includes('Circular'))));
});

test('untitled documents support symbols and never access the filesystem for imports', () => {
  const document = TextDocument.create('untitled:Untitled-1', 'zuno', 2, 'vibe local = 1;\nyap(local);');
  const a = new Analysis(document.uri, new Map([[document.uri, document]]));
  assert.deepEqual(a.main.diagnostics, []);
  assert.equal(a.definition(document.uri, { line: 1, character: 6 }).uri, document.uri);
});

test('named modules and aliases bind exported declarations without renaming unrelated members', t => {
  const source = 'module helpers {\n  cook twice(value) { yeet value * 2; }\n}\nimport helpers as h;\nmodule other { cook twice(value) { yeet value; } }\nimport other as o;\nyap(h.twice(2));\nyap(o.twice(2));';
  const f = fixture(t, { 'main.zuno': source });
  const a = f.analysis('main.zuno');
  assert.deepEqual(a.main.diagnostics, []);
  const at = a.main.document.positionAt(source.indexOf('h.twice') + 3);
  assert.equal(a.definition(f.uri('main.zuno'), at).range.start.line, 1);
  const edits = a.rename(f.uri('main.zuno'), at, 'double');
  assert.deepEqual(edits.documentChanges[0].edits.map(edit => edit.range.start.line), [1, 6]);
  const module = a.rename(f.uri('main.zuno'), { line: 0, character: 8 }, 'utilities');
  assert.deepEqual(module.documentChanges[0].edits.map(edit => edit.range.start.line), [0, 3]);
});

test('static dictionary fields resolve and rename quoted keys without touching ordinary strings', t => {
  const source = 'vibe profile = {"name": "name", "score": 42};\nyap(profile.name);\nyap(profile["name"]);';
  const f = fixture(t, { 'main.zuno': source });
  let a = f.analysis('main.zuno');
  assert.deepEqual(a.main.diagnostics, []);
  const at = a.main.document.positionAt(source.indexOf('profile.name') + 9);
  assert.equal(a.definition(f.uri('main.zuno'), at).range.start.line, 0);
  const rename = a.rename(f.uri('main.zuno'), at, 'title');
  assert.equal(rename.documentChanges[0].edits.length, 3);
  assert.equal(rename.documentChanges[0].edits[0].newText, '"title"');
  f.edit('main.zuno', source + '\nprofile.');
  a = f.analysis('main.zuno');
  assert.ok(a.completion(f.uri('main.zuno'), { line: 3, character: 8 }).some(item => item.label === 'score'));
});
