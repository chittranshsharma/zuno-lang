const functions = {
  len: ['value'], range: ['start', 'end'], push: ['items', 'value'], pop: ['items'],
  slice: ['value', 'start', 'end'], reverse: ['items'], sort: ['items'], sum: ['items'], min: ['items'], max: ['items'],
  upper: ['value'], lower: ['value'], trim: ['value'], split: ['value', 'separator'], join: ['items', 'separator'],
  contains: ['value', 'part'], replace: ['value', 'from', 'to'], text: ['value'], number: ['value'],
  abs: ['value'], round: ['value'], floor: ['value'], ceil: ['value'], sqrt: ['value'], assert: ['condition', 'message'],
  keys: ['dictionary'], values: ['dictionary'], has: ['dictionary', 'key'], remove: ['dictionary', 'key']
};
const modules = {
  math: ['abs', 'round', 'floor', 'ceil', 'sqrt', 'sum', 'min', 'max'],
  strings: ['upper', 'lower', 'trim', 'split', 'join', 'contains', 'replace', 'text', 'number'],
  arrays: ['len', 'range', 'push', 'pop', 'slice', 'reverse', 'sort'],
  dict: { keys: ['dictionary'], values: ['dictionary'], has: ['dictionary', 'key'], remove: ['dictionary', 'key'] },
  testing: ['assert'],
  ui: { title: ['text'], label: ['id', 'text'], input: ['id', 'caption'], value: ['id'], set: ['id', 'text'], button: ['caption', 'callback'], clear: [] }
};
const aliases = { vibe: 'let', lock: 'const', cook: 'func', yap: 'print', yeet: 'return', fr: 'true', cap: 'false', bet: 'if', nah: 'else', grind: 'while', each: 'for', and: '&&', or: '||', not: '!' };
const reserved = new Set([...Object.keys(aliases), 'let', 'const', 'fn', 'func', 'print', 'say', 'if', 'else', 'while', 'for', 'in', 'return', 'true', 'false', 'class', 'module', 'import', 'as', 'this']);
const snippets = {
  vibe: 'vibe ${1:name} = ${2:value};', lock: 'lock ${1:name} = ${2:value};',
  cook: 'cook ${1:name}(${2:args}) {\n  ${0}\n}', bet: 'bet ${1:condition} {\n  ${0}\n}',
  grind: 'grind ${1:condition} {\n  ${0}\n}', each: 'each ${1:item} in ${2:items} {\n  ${0}\n}',
  yap: 'yap(${1:value});', yeet: 'yeet ${1:value};', class: 'class ${1:Name} {\n  cook init(${2:args}) {\n    ${0}\n  }\n}',
  import: 'import ${1:math} as ${2:m};', module: 'module ${1:name} {\n  ${0}\n}'
};
module.exports = { functions, modules, reserved, snippets, aliases };
