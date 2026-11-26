const test = require('node:test');
const assert = require('node:assert/strict');
const { execute, parse } = require('./engine');
const { format } = require('./formatter');
const { runVirtual } = require('./virtual-project');

test('loop controls target the closest loop and preserve function returns', () => {
  const source = 'vibe n = 0; grind n < 6 { n = n + 1; bet n == 2 { skip; } bet n == 5 { dip; } yap(n); } each x in [1,2] { each y in [3,4] { yap(x+y); break; } } cook first() { each x in [8,9] { yeet x; } yeet 0; } yap(first());';
  assert.deepEqual(execute(source), ['1','3','4','4','5','8']);
  assert.deepEqual(execute(format(source)), execute(source));
  for (const source of ['break;', 'skip;', 'grind fr { cook wrong() { dip; } }', 'each x in [1] { module bad { continue; } }']) assert.throws(() => parse(source), /inside a loop/);
  assert.throws(() => execute('grind fr { skip; }', 100), /Execution limit/);
  assert.deepEqual(execute('cook f() { vibe n=0; grind n<3 { n=n+1; continue; } yeet n; } each x in [1] { yap(f()); break; }'), ['3']);
});

test('collection callbacks support values, indexes, closures, bound methods and builtin functions', () => {
  const source = 'vibe factor=3; cook scale(value,index) { yeet value*factor+index; } cook even(value) { yeet value%2==0; } cook total(acc,value,index) { yeet acc+value+index; } vibe items=map([1,2,3],scale); yap(join(items,",")); yap(join(filter(items,even),",")); yap(reduce(items,total,0)); yap(join(map(["a","b"],upper),",")); class C { cook init(n) { this.n=n; } cook apply(x) { yeet x*this.n; } } vibe c=C(2); yap(join(map([2,3],c.apply),","));';
  assert.deepEqual(execute(source), ['3,7,11','','24','A,B','4,6']);
  assert.deepEqual(execute(format(source)), execute(source));
  assert.deepEqual(execute('import arrays as a; cook double(x) { yeet x*2; } yap(join(a.map([1,2],double),","));'), ['2,4']);
});

test('collection predicates short circuit and empty arrays have explicit results', () => {
  assert.deepEqual(execute('vibe calls=0; cook yes(x) { calls=calls+1; yeet x>1; } yap(some([2,3],yes)); yap(calls); yap(every([0,3],yes)); yap(calls); yap(find([0,2,3],yes)); yap(findIndex([0,2,3],yes)); yap(find([],yes)); yap(findIndex([],yes)); yap(some([],yes)); yap(every([],yes)); yap(len(map([],yes))); cook add(a,b) { yeet a+b; } yap(reduce([],add,17));'), ['true','1','false','2','2','1','false','-1','false','true','0','17']);
  assert.throws(() => execute('map([],42);'), /function callback/);
  assert.throws(() => execute('cook bad() { yeet 1; } map([],bad);'), /callback needs/);
  assert.throws(() => execute('cook identity(x) { yeet x; } filter([1],identity);'), /boolean/);
  assert.throws(() => execute('cook add(a,b) { yeet a+b; } reduce([],add);'), /initial value/);
});

test('callbacks use a shallow input snapshot and share interpreter limits and source locations', () => {
  assert.deepEqual(execute('vibe items=[1,2]; cook grow(x) { push(items,9); yeet x*2; } yap(join(map(items,grow),",")); yap(len(items));'), ['2,4','4']);
  assert.throws(() => execute('cook forever(x) { grind fr {} } map([1],forever);', 100), /Execution limit/);
  assert.throws(() => execute('cook recurse(x) { yeet map([x],recurse); } recurse(1);'), /Function call limit/);
  assert.throws(() => execute('cook broken(x) {\n  yeet 1/0;\n}\nmap([1],broken);'), /Line 2, column 9: Cannot divide/);
  assert.throws(() => runVirtual([
    { path:'main.zuno', code:'import "./helper.zuno" as h;\nmap([1],h.broken);' },
    { path:'helper.zuno', code:'cook broken(x) {\n  yeet 1/0;\n}' }
  ], 'main.zuno'), /helper.zuno:2:9:/);
});

test('stepped ranges support descending sequences and reject unsafe or unbounded inputs', () => {
  assert.deepEqual(execute('yap(join(range(4),",")); yap(join(range(1,6,2),",")); yap(join(range(5,0,-2),",")); yap(len(range(4,4,-1)));'), ['0,1,2,3','1,3,5','5,3,1','0']);
  for (const source of ['range(0,4,0);','range(4,0,1);','range(0,4,-1);','range(0,10001);','range(9007199254740992);','range(0,2,0.5);']) assert.throws(() => execute(source), /range/);
});
