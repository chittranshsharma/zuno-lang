const functions = {
  len: ['value'], range: ['start', 'end', 'step'], push: ['items', 'value'], pop: ['items'],
  map: ['items', 'callback'], filter: ['items', 'callback'], reduce: ['items', 'callback', 'initial'],
  find: ['items', 'callback'], findIndex: ['items', 'callback'], some: ['items', 'callback'], every: ['items', 'callback'],
  slice: ['value', 'start', 'end'], reverse: ['items'], sort: ['items'], sum: ['items'], min: ['items'], max: ['items'],
  upper: ['value'], lower: ['value'], trim: ['value'], split: ['value', 'separator'], join: ['items', 'separator'],
  contains: ['value', 'part'], replace: ['value', 'from', 'to'], text: ['value'], number: ['value'],
  abs: ['value'], round: ['value'], floor: ['value'], ceil: ['value'], sqrt: ['value'], assert: ['condition', 'message'],
  keys: ['dictionary'], values: ['dictionary'], has: ['dictionary', 'key'], remove: ['dictionary', 'key']
};
const modules = {
  math: ['abs', 'round', 'floor', 'ceil', 'sqrt', 'sum', 'min', 'max'],
  strings: ['upper', 'lower', 'trim', 'split', 'join', 'contains', 'replace', 'text', 'number'],
  arrays: ['len', 'range', 'push', 'pop', 'slice', 'reverse', 'sort', 'map', 'filter', 'reduce', 'find', 'findIndex', 'some', 'every'],
  dict: { keys: ['dictionary'], values: ['dictionary'], has: ['dictionary', 'key'], remove: ['dictionary', 'key'] },
  testing: ['assert'],
  ui: { title: ['text'], label: ['id', 'text'], input: ['id', 'caption'], value: ['id'], set: ['id', 'text'], button: ['caption', 'callback'], clear: [] }
};
const aliases = { vibe: 'let', lock: 'const', cook: 'func', yap: 'print', yeet: 'return', fr: 'true', cap: 'false', bet: 'if', nah: 'else', grind: 'while', each: 'for', and: '&&', or: '||', not: '!', dip: 'break', skip: 'continue' };
const reserved = new Set([...Object.keys(aliases), 'let', 'const', 'fn', 'func', 'print', 'say', 'if', 'else', 'while', 'for', 'in', 'return', 'true', 'false', 'class', 'module', 'import', 'as', 'this', 'break', 'continue']);
const snippets = {
  dip: 'dip;', skip: 'skip;', break: 'break;', continue: 'continue;',
  vibe: 'vibe ${1:name} = ${2:value};', lock: 'lock ${1:name} = ${2:value};',
  cook: 'cook ${1:name}(${2:args}) {\n  ${0}\n}', bet: 'bet ${1:condition} {\n  ${0}\n}',
  grind: 'grind ${1:condition} {\n  ${0}\n}', each: 'each ${1:item} in ${2:items} {\n  ${0}\n}',
  yap: 'yap(${1:value});', yeet: 'yeet ${1:value};', class: 'class ${1:Name} {\n  cook init(${2:args}) {\n    ${0}\n  }\n}',
  import: 'import ${1:math} as ${2:m};', module: 'module ${1:name} {\n  ${0}\n}'
};
const descriptions = {
  map: 'Returns a new array. callback(value, optionalIndex) runs once per item from a shallow snapshot of the input.',
  filter: 'Returns matching items in a new array. callback(value, optionalIndex) must return fr or cap.',
  reduce: 'Combines items from left to right. callback(accumulator, value, optionalIndex) returns the next accumulator. An initial value is required, including for empty arrays.',
  find: 'Returns the first matching value, or cap when no value matches. Use findIndex when a false item needs to be distinguished from no match.',
  findIndex: 'Returns the first matching index, or -1. The predicate must return a boolean.',
  some: 'True when any item matches; stops at the first match. Empty arrays return cap.',
  every: 'True when every item matches; stops at the first non-match. Empty arrays return fr.',
  range: 'range(end), range(start, end), or range(start, end, step). The end is excluded. Step defaults to 1 and must be nonzero and point toward the end. Maximum 10,000 items.',
  assert: 'Throws a test failure when condition is false. The optional message describes what was expected.',
  len: 'Returns the length of an array or text. Text lengths use UTF-16 code units.'
};
module.exports = { functions, modules, reserved, snippets, aliases, descriptions };
