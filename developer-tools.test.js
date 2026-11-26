const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { format } = require('./formatter');
const { execute } = require('./engine');
const { testProject } = require('./test-runner');

test('formatter preserves dialect, comments, escapes, Unicode, precedence and line endings', () => {
  const sources = [
    'cook f(a,b){yeet a**b;}yap(f(2,3));',
    'vibe d={"x":[1,2],"text":"🟣 // \\""};yap(d.x[0]);',
    'vibe a=2; // keep this\r\n// and this\r\nbet a>1{yap("yes");}nah{yap("no");}',
    'let x = - -2;print(x + +3);',
    'module m{cook f(){yeet {"x":1};}}import m as n;yap(n.f().x);',
    '\uFEFFvibe x=fr and not cap;yap(x);'
  ];
  for (const source of sources) {
    const result = format(source);
    assert.equal(format(result), result);
    assert.deepEqual(execute(result), execute(source));
    assert.equal(result.includes('\r\n'), source.includes('\r\n'));
  }
  assert.match(format('cook f(){yap(1);}', { insertSpaces: false }), /\n\tyap/);
  assert.throws(() => format('vibe x = ;'), /expression/);
});

test('formatter is idempotent across all examples and retains file import boundaries', () => {
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filename);
      else if (filename.endsWith('.zuno')) {
        const source = fs.readFileSync(filename, 'utf8');
        const result = format(source);
        assert.equal(format(result), result, filename);
        if (!source.includes('import "') && !source.includes('import ui')) assert.deepEqual(execute(result), execute(source), filename);
      }
    }
  }
  walk(path.join(__dirname, 'examples'));
  assert.equal(format('import "./file.zuno" as f; yap(f.work());'), 'import "./file.zuno" as f;\nyap(f.work());\n');
});

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'zuno tools ')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (name, content) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); };
  write('zuno.json', '{"entry":"main.zuno"}');
  write('main.zuno', 'yap("ready");');
  const cli = (...args) => spawnSync(process.execPath, [path.join(__dirname, 'cli.js'), ...args], { cwd: root, encoding: 'utf8', timeout: 15000 });
  return { root, write, cli };
}

test('project tests isolate state, map failures, bound loops, continue and skip unrelated directories', t => {
  const f = fixture(t);
  f.write('lib.zuno', 'vibe count = 0;\ncook next() { count = count + 1; yeet count; }');
  for (const name of ['a', 'b']) f.write(name + '.test.zuno', 'import "./lib.zuno" as lib;\nassert(lib.next() == 1, "fresh state");');
  f.write('c.test.zuno', 'assert(cap, "failed deliberately");');
  f.write('d.test.zuno', 'grind fr {}');
  f.write('e.test.zuno', 'vibe broken = ;');
  f.write('z.test.zuno', 'assert(fr, "still runs");');
  for (const name of ['node_modules', 'dist', '.hidden']) f.write(name + '/skip.test.zuno', 'broken');
  f.write('nested/zuno.json', '{}');
  f.write('nested/skip.test.zuno', 'broken');
  const report = testProject(f.root);
  assert.equal(report.passed, 3);
  assert.equal(report.failed, 3);
  assert.match(report.results[2].error, /c\.test\.zuno:1:/);
  assert.match(report.results[3].error, /limit/i);
  assert.equal(f.cli('test').status, 1);
  assert.equal(f.cli('test', 'a.test.zuno').status, 0);
  assert.equal(f.cli('test', 'main.zuno').status, 1);
});

test('format check does not write and project formatting validates every file before changes', t => {
  const f = fixture(t);
  f.write('main.zuno', 'yap( 1 );');
  assert.equal(f.cli('format', '--check').status, 1);
  assert.equal(fs.readFileSync(path.join(f.root, 'main.zuno'), 'utf8'), 'yap( 1 );');
  f.write('broken.zuno', 'vibe x = ;');
  assert.equal(f.cli('format').status, 1);
  assert.equal(fs.readFileSync(path.join(f.root, 'main.zuno'), 'utf8'), 'yap( 1 );');
  f.write('broken.zuno', 'yap(2);');
  assert.equal(f.cli('format').status, 0);
  assert.equal(f.cli('format', '--check').status, 0);
  assert.equal(f.cli('test').status, 1);
  assert.equal(f.cli('init', 'starter').status, 0);
  assert.equal(f.cli('test', 'starter').status, 0);
});
