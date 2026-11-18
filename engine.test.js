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
