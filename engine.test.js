const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execute } = require('./engine');
test('functions, recursion, and arrays work together', () => {
  assert.deepEqual(execute('fn double(x) { return x * 2; } let items = [2, 4, 6]; print(double(items[1]));'), ['8']);
  assert.deepEqual(execute('fn fact(n) { if (n <= 1) { return 1; } return n * fact(n - 1); } print(fact(5));'), ['120']);
  assert.throws(() => execute('return 1;'), /inside a function/);
  assert.throws(() => execute('let a = [1]; print(a[2]);'), /bounds/);
  assert.throws(() => execute('fn f() { return f(); } print(f());'), /call limit/);
});

test('existing programs and arithmetic precedence', () => {
  assert.deepEqual(execute('let name = "World"; print(name); print((2 + 3) ** 2); print(10 % 3);'), ['World', '25', '1']);
  assert.deepEqual(execute('print(-2 ** 2); print(2 ** 3 ** 2);'), ['-4', '512']);
});
test('conditions and reassignment', () => {
  assert.deepEqual(execute('let score = 4; if (score >= 4) { score = score + 1; } else { score = 0; } print(score);'), ['5']);
});
test('loops and block scope', () => {
  assert.deepEqual(execute('let n = 0; while (n < 3) { let next = n + 1; print(next); n = next; }'), ['1', '2', '3']);
  assert.throws(() => execute('if (true) { let secret = 1; } print(secret);'), /Unknown variable/);
});
test('logical expressions short circuit', () => {
  assert.deepEqual(execute('print(false && missing); print(true || missing); print(!false);'), ['false', 'true', 'true']);
});
test('diagnostics include source location', () => {
  assert.throws(() => execute('let x = 1;\nprint(x / 0);'), /Line 2, column .*divide by zero/);
  assert.throws(() => execute('print(1)'), /Expected ;/);
  assert.throws(() => execute('let x = 1; let x = 2;'), /already declared/);
});
test('untrusted loops, output, and nesting are bounded', () => {
  assert.throws(() => execute('while (true) {}', 100), /Execution limit/);
  assert.throws(() => execute('while (true) { print(1); }'), /Output limit/);
  assert.throws(() => execute('print(' + '('.repeat(250) + '1' + ')'.repeat(250) + ');'), /deeply nested/);
});
test('variable names do not access object prototypes', () => {
  assert.deepEqual(execute('let __proto__ = 7; print(__proto__);'), ['7']);
  assert.throws(() => execute('print(constructor);'), /Unknown variable/);
});

test('modern and playful syntax with bounded helpers', () => {
  assert.deepEqual(execute('lock items = range(3); cook twice(x) { yeet x * 2; } for item in items { yap(twice(item)); }'), ['0','2','4']);
  assert.deepEqual(execute('vibe ok = fr; yap(ok && !cap); say(upper("hello")); say(len([1,2]));'), ['true','HELLO','2']);
  assert.throws(() => execute('lock x = 1; x = 2;'), /constant/);
  assert.throws(() => execute('say(range(10001));'), /10000/);
  assert.equal(require('./engine').parse('while (fr) {}').length, 1);
});

test('collections, text utilities and standalone calls', () => {
  assert.deepEqual(execute('vibe xs = [3, 1]; push(xs, 2); yap(join(sort(xs), ",")); yap(sum(xs)); yap(pop(xs)); assert(len(xs) == 2);'), ['1,2,3','6','2']);
  assert.deepEqual(execute('vibe words = split(trim(" hi there "), " "); yap(upper(words[0])); yap(replace("hello", "l", "x")); yap(slice("hello", 1, 4));'), ['HI','hexxo','ell']);
  assert.deepEqual(execute('yap(sqrt(81)); yap(number("42") + 1); yap(max([1,5,2]));'), ['9','43','5']);
  assert.throws(()=>execute('assert(cap, "Nope");'), /Nope/);
  assert.throws(()=>execute('vibe xs = []; push(xs, xs);'), /primitive/);
  assert.throws(()=>execute('yap(sqrt(-1));'), /nonnegative/);
  assert.throws(()=>execute('yap(number("abc"));'), /finite/);
});

test('every published guide example runs', () => {
  for (const example of require('./examples/catalog.json')) assert.doesNotThrow(()=>execute(example.code),example.name);
});

test('modules, classes, dictionaries and library namespaces integrate', () => {
  const fs=require('node:fs');
  assert.deepEqual(execute(fs.readFileSync('examples/counter.zuno','utf8')),['Avi','47','name, score','9']);
  assert.deepEqual(execute('vibe d = {"__proto__": 7, "constructor": 8}; yap(d["__proto__"]); yap(d.constructor); vibe a = [1]; a[0] = 9; yap(a[0]);'),['7','8','9']);
  assert.throws(()=>execute('module a {} module a {}'),/already exists/);
  assert.throws(()=>execute('import missing as m;'),/Unknown module/);
  assert.throws(()=>execute('class A { cook init(x) {} } vibe a = A();'),/arguments/);
  assert.throws(()=>execute('vibe d = {}; yap(d.x);'),/Unknown dictionary/);
  assert.throws(()=>execute('vibe a = [1]; a[4] = 3;'),/Invalid indexed/);
  assert.deepEqual(execute('class C { cook init(n) { this.n = n; } cook get() { yeet this.n; } } vibe a=C(1); vibe b=C(2); lock get=a.get; yap(get()); yap(b.get());'),['1','2']);
});

test('module names and class bodies remain isolated from host objects',()=>{
  assert.throws(()=>execute('import constructor as host;'),/Unknown module/);
  assert.throws(()=>execute('class Bad { vibe x = 1; }'),/methods only/);
  assert.throws(()=>execute('class C { cook init() {} } vibe c = C(); yap(c.constructor);'),/Unknown member/);
  assert.throws(()=>execute('module m {} import m as a; a = 2;'),/constant/);
});
