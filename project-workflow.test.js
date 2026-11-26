const test = require('node:test');
const assert = require('node:assert/strict');
const { runVirtual, testVirtual } = require('./virtual-project');
const { validateFiles, prepareEdits, assertFresh } = require('./project-edits');

const files = () => [
  { id:'helper', path:'src/math.zuno', code:'cook double(value) { yeet value * 3; }', version:1 },
  { id:'test', path:'src/math.test.zuno', code:'import "./math.zuno" as math;\nassert(math.double(3) == 6, "doubles correctly");', version:1 }
];

test('project review can repair a failing imported test and undo to its original state', () => {
  const snapshot = files();
  assert.equal(testVirtual(snapshot).failed, 1);
  const changes = prepareEdits(snapshot, JSON.stringify({ edits:[{ id:'helper', code:'cook double(value) { yeet value * 2; }' }] }));
  assertFresh(snapshot, files());
  const applied = snapshot.map(file => ({ ...file, code:changes.find(change => change.id === file.id)?.after || file.code }));
  assert.equal(testVirtual(applied).passed, 1);
  assert.equal(testVirtual(snapshot).failed, 1);
  assert.throws(() => assertFresh(snapshot, applied), /changed/);
  assert.throws(() => assertFresh(snapshot, snapshot.slice(1)), /closed/);
  assert.throws(() => assertFresh(snapshot, snapshot.map(file => ({ ...file, version:2 }))), /changed/);
  assert.throws(() => assertFresh(snapshot, snapshot.map(file => ({ ...file, path:'renamed.zuno' }))), /changed/);
});

test('project edits reject unexpected files, duplicate IDs, ambiguous paths and oversized replacements', () => {
  const snapshot = files();
  assert.deepEqual(validateFiles(snapshot)[0], { id:'helper', path:'src/math.zuno', code:snapshot[0].code });
  for (const edits of [[{ id:'unknown', code:'' }], [{ id:'helper', code:'' }, { id:'helper', code:'yap(1);' }], [{ id:'helper', code:'x'.repeat(5001) }]]) assert.throws(() => prepareEdits(snapshot, { edits }));
  assert.throws(() => prepareEdits(snapshot, { edits:[] }));
  assert.throws(() => validateFiles([...snapshot, snapshot[0]]), /unique/);
  assert.throws(() => validateFiles([{ ...snapshot[0], path:'../secret.zuno' }]), /relative/);
  assert.throws(() => validateFiles([{ ...snapshot[0], path:'x.zuno' }, { ...snapshot[1], path:'X.zuno' }]), /unique/);
  assert.throws(() => validateFiles(Array.from({ length:5 }, (_, i) => ({ id:String(i), path:i + '.zuno', code:'x'.repeat(5000) }))), /20,000/);
});

test('browser projects resolve sibling and parent modules with original locations and isolated tests', () => {
  const snapshot = files();
  assert.match(testVirtual(snapshot).results[0].error, /src\/math.test.zuno:2:/);
  assert.deepEqual(runVirtual(snapshot, 'src/math.test.zuno', true), ['Syntax OK']);
  const modules = [
    { path:'main.zuno', code:'import "./src/helper.zuno" as h;\nyap(h.answer());' },
    { path:'src/helper.zuno', code:'import "../math.zuno" as m;\ncook answer() { yeet m.double(4); }' },
    { path:'math.zuno', code:'cook double(value) { yeet value * 2; }' }
  ];
  assert.deepEqual(runVirtual(modules, 'main.zuno'), ['8']);
  assert.throws(() => runVirtual([{ path:'main.zuno', code:'import "../escape.zuno" as x;' }], 'main.zuno'), /project directory/);
  assert.throws(() => runVirtual([{ path:'main.zuno', code:'import "./main.zuno" as x;' }], 'main.zuno'), /Circular/);
  assert.throws(() => runVirtual([{ path:'main.zuno', code:'import "./missing.zuno" as x;' }], 'main.zuno'), /File not found/);
  assert.throws(() => testVirtual([]), /test.zuno/);
  assert.equal(testVirtual([{ path:'a.test.zuno', code:'grind fr {}' }, { path:'b.test.zuno', code:'assert(fr, "runs");' }]).passed, 1);
});
