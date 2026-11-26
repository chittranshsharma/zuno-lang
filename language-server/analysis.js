const fs = require('node:fs');
const path = require('node:path');
const { URI } = require('vscode-uri');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { parse } = require('../engine');
const { functions, modules, reserved, snippets } = require('./catalog');
const identity = filename => process.platform === 'win32' ? filename.toLowerCase() : filename;
const canonical = filename => { try { return fs.realpathSync(filename); } catch { return path.resolve(filename); } };
const inside = (root, filename) => { const relative = path.relative(root, filename); return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative); };

function lex(text) {
  const tokens = [];
  const pattern = /\/\/[^\r\n]*|"(?:\\.|[^"\\\r\n])*"?|[A-Za-z_]\w*|\d+(?:\.\d+)?|\s+|./g;
  for (const match of text.matchAll(pattern)) {
    const raw = match[0];
    if (/^\s/.test(raw) || raw.startsWith('//')) continue;
    tokens.push({ raw, start: match.index, end: match.index + raw.length, string: raw.startsWith('"') });
  }
  return tokens;
}

function projectRoot(filename) {
  let directory = path.dirname(filename);
  while (true) {
    if (fs.existsSync(path.join(directory, 'zuno.json'))) return directory;
    const parent = path.dirname(directory);
    if (parent === directory) return path.dirname(filename);
    directory = parent;
  }
}

function recover(source, tokens) {
  const closing = { '{': '}', '(': ')', '[': ']' };
  let candidate = source;
  for (let attempts = 0; attempts < 8; attempts++) {
    const stack = [];
    for (const token of lex(candidate)) {
      if (Object.hasOwn(closing, token.raw)) stack.push(token.raw);
      else if (closing[stack.at(-1)] === token.raw) stack.pop();
    }
    const extra = stack.reverse().map(value => closing[value]).join('');
    try { return parse(candidate + '\n' + extra); }
    catch (error) {
      let offset = error.token?.start;
      if (offset === undefined) return error.program || [];
      if (offset >= candidate.length || /\.\s*$/.test(candidate.slice(0, offset))) offset = candidate.slice(0, Math.min(offset, candidate.length)).search(/\S\s*$/);
      if (offset < 0) return error.program || [];
      let start = candidate.lastIndexOf('\n', offset - 1) + 1;
      let end = candidate.indexOf('\n', offset);
      if (end < 0) end = candidate.length;
      if (/^[\s}\])]+;?$/.test(candidate.slice(start, end))) {
        offset = candidate.slice(0, start).search(/\S\s*$/);
        end = start;
        start = candidate.lastIndexOf('\n', offset - 1) + 1;
      }
      const line = candidate.slice(start, end);
      if (!line.trim() || /[{}]/.test(line)) return error.program || [];
      candidate = candidate.slice(0, start) + line.replace(/[^\r]/g, ' ') + candidate.slice(end);
    }
  }
  return [];
}

class Analysis {
  constructor(uri, openDocuments = new Map()) {
    this.files = new Map();
    this.occurrences = [];
    this.symbols = [];
    this.complete = true;
    this.scanned = 0;
    this.open = new Map();
    this.nodes = new WeakMap();
    this.bindings = new WeakMap();
    this.moduleSymbols = new Map();
    this.builtins = this.scope(null, null, 0, Infinity);
    for (const [name, params] of Object.entries(functions)) this.builtin(this.builtins, name, 'function', params);
    this.standard = new Map();
    for (const [name, members] of Object.entries(modules)) {
      const symbol = { name, kind: 'module', builtin: true, members: this.scope(null, null, 0, Infinity) };
      for (const [member, params] of Object.entries(Array.isArray(members) ? Object.fromEntries(members.map(key => [key, functions[key]])) : members)) this.builtin(symbol.members, member, 'function', params);
      this.standard.set(name, symbol);
    }
    for (const document of openDocuments.values()) {
      const parsed = URI.parse(document.uri);
      this.open.set(parsed.scheme === 'file' ? identity(canonical(parsed.fsPath)) : document.uri, document);
    }
    const parsed = URI.parse(uri);
    this.root = parsed.scheme === 'file' ? canonical(projectRoot(canonical(parsed.fsPath))) : null;
    const filename = parsed.scheme === 'file' ? canonical(parsed.fsPath) : uri;
    this.main = this.load(filename, uri);
    if (this.root) this.scan(this.root);
    for (const [filename, document] of this.open) {
      if (URI.parse(document.uri).scheme === 'file' && this.root && inside(this.root, canonical(URI.parse(document.uri).fsPath)) && canonical(projectRoot(canonical(URI.parse(document.uri).fsPath))) === this.root) this.load(canonical(URI.parse(document.uri).fsPath));
    }
    for (const file of this.files.values()) this.declarations(file.program, file.scope);
    for (const file of this.files.values()) this.resolveImports(file.program, file.scope);
    for (const file of this.files.values()) this.references(file.program, file.scope);
    this.occurrences.sort((a, b) => a.token.start - b.token.start);
  }

  scope(parent, file, start, end, kind = 'block') {
    return { parent, file, start, end, kind, symbols: new Map(), children: [] };
  }

  builtin(scope, name, kind, params) {
    const symbol = { name, kind, params, builtin: true, scope };
    scope.symbols.set(name, symbol);
    return symbol;
  }

  load(filename, uri) {
    const key = identity(filename);
    if (this.files.has(key)) return this.files.get(key);
    if (this.files.size >= 100) { this.complete = false; return null; }
    const open = this.open.get(key) || this.open.get(filename);
    let text;
    try {
      if (!open && fs.statSync(filename).size > 400000) { this.complete = false; return null; }
      text = open ? open.getText() : fs.readFileSync(filename, 'utf8');
    } catch { return null; }
    if (text.length > 100000) { this.complete = false; text = ''; }
    const document = open || TextDocument.create(uri || URI.file(filename).toString(), 'zuno', 0, text);
    const file = { filename, uri: document.uri, document, text, tokens: lex(text), diagnostics: [], imports: new Map(), program: [], loading: true };
    file.scope = this.scope(this.builtins, file, 0, text.length + 1, 'file');
    this.files.set(key, file);
    let masked = text;
    const replacements = [];
    for (let i = 0; i < file.tokens.length; i++) {
      const token = file.tokens[i];
      if (token.raw !== 'import' || !file.tokens[i + 1]?.string) continue;
      const target = file.tokens[i + 1];
      replacements.push(target);
      let dependency;
      try {
        const relative = JSON.parse(target.raw);
        if (!this.root) throw new Error('Save this file inside a project to resolve file imports.');
        if (!relative.endsWith('.zuno')) throw new Error('Module files must end in .zuno.');
        const resolved = canonical(path.resolve(path.dirname(filename), relative));
        if (!inside(this.root, resolved)) throw new Error('Imports must stay in the project directory.');
        dependency = this.load(resolved);
        if (!dependency) throw new Error('Cannot read module: ' + relative);
        if (dependency.loading) throw new Error('Circular file import: ' + relative);
      } catch (error) { file.importError = true; this.diagnostic(file, target, error.message); }
      file.imports.set(target.start, { target: dependency, token: target });
    }
    for (const token of replacements.reverse()) masked = masked.slice(0, token.start) + '_'.repeat(token.end - token.start) + masked.slice(token.end);
    try { file.program = parse(masked); }
    catch (error) {
      file.syntaxError = true;
      const match = error.message.match(/^Line (\d+), column (\d+): ([\s\S]*)$/);
      const offset = error.token?.start ?? (match ? document.offsetAt({ line: Number(match[1]) - 1, character: Number(match[2]) - 1 }) : 0);
      const token = file.tokens.find(item => item.start <= offset && offset < item.end) || { start: offset, end: offset + 1 };
      this.diagnostic(file, token, match ? match[3] : error.message);
      file.program = recover(masked, file.tokens);
    }
    if (!this.complete) this.diagnostic(file, { start: 0, end: 1 }, 'Project analysis limit reached; rename is disabled.');
    file.loading = false;
    return file;
  }

  scan(directory) {
    if (++this.scanned > 200) { this.complete = false; return; }
    if (directory !== this.root && fs.existsSync(path.join(directory, 'zuno.json'))) return;
    let entries;
    try { entries = fs.readdirSync(directory, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (this.files.size >= 100) { this.complete = false; return; }
      if (entry.name.startsWith('.') || ['node_modules', 'dist', 'output', 'vendor', 'public'].includes(entry.name)) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        this.scan(filename);
      } else if (entry.isFile() && entry.name.endsWith('.zuno')) this.load(canonical(filename));
    }
  }

  range(file, token) {
    return { start: file.document.positionAt(token.start ?? 0), end: file.document.positionAt(Math.max(token.start + 1, token.end ?? token.start + (token.raw || token.text || '').length)) };
  }

  diagnostic(file, token, message) {
    file.diagnostics.push({ range: this.range(file, token), severity: 1, source: 'zuno', message });
  }

  symbol(scope, token, kind, fields = {}) {
    const symbol = { name: token.text, token, file: scope.file, scope, kind, ...fields };
    if (scope.symbols.has(symbol.name)) this.diagnostic(scope.file, token, 'Name already declared: ' + symbol.name);
    else scope.symbols.set(symbol.name, symbol);
    this.symbols.push(symbol);
    this.occurrences.push({ file: scope.file, token, symbol, scope, declaration: true });
    return symbol;
  }

  child(scope, body, kind = 'block', parent = scope) {
    const end = node => Math.max(node.token?.end || 0, node.body?.end || 0, node.otherwise?.end || 0, ...(node.otherwise || []).map(end));
    const child = this.scope(parent, scope.file, body.start ?? body[0]?.token.start ?? 0, body.end ?? Math.max(...body.map(end), 0), kind);
    scope.children.push(child);
    return child;
  }

  declarations(statements, scope, classScope) {
    for (const node of statements) {
      this.nodes.set(node, scope);
      if (['declare', 'function', 'class', 'module', 'import'].includes(node.type)) {
        const kind = node.type === 'declare' ? 'variable' : node.type;
        const symbol = this.symbol(scope, node.token, kind, { node, constant: node.constant || node.type === 'import', params: node.params });
        this.bindings.set(node, symbol);
        if (node.type === 'module') {
          symbol.members = this.child(scope, node.body, 'module');
          this.moduleSymbols.set(scope.file.uri + ':' + symbol.name, symbol);
          this.declarations(node.body, symbol.members);
        } else if (node.type === 'class') {
          symbol.members = this.child(scope, node.body, 'class');
          this.declarations(node.body, symbol.members, symbol.members);
        } else if (node.type === 'function') {
          const directMethod = scope === classScope;
          const local = this.child(scope, node.body, 'function', directMethod ? scope.parent : scope);
          this.nodes.set(node.body, local);
          if (directMethod) {
            const self = this.builtin(local, 'this', 'variable');
            self.members = classScope;
          }
          for (const token of node.paramTokens || []) this.symbol(local, token, 'parameter');
          this.declarations(node.body, local, classScope);
        }
      } else if (['if', 'while', 'for'].includes(node.type)) {
        const local = this.child(scope, node.body);
        this.nodes.set(node.body, local);
        if (node.type === 'for') this.symbol(local, node.token, 'variable');
        this.declarations(node.body, local, classScope);
        if (node.otherwise?.length) {
          const alternate = this.child(scope, node.otherwise);
          this.nodes.set(node.otherwise, alternate);
          this.declarations(node.otherwise, alternate, classScope);
        }
      } else if (node.type === 'set' && classScope && node.target.array.type === 'variable' && node.target.array.token.text === 'this' && node.target.position.type === 'literal' && typeof node.target.position.value === 'string') {
        const key = node.target.position;
        if (!classScope.symbols.has(key.value)) {
          const field = this.symbol(classScope, { ...key.token, text: key.value }, 'property');
          this.bindings.set(node.target, field);
        }
      }
    }
  }

  lookup(scope, name) {
    for (let current = scope; current; current = current.parent) if (current.symbols.has(name)) return current.symbols.get(name);
    return null;
  }

  resolveImports(statements, scope) {
    for (const node of statements) {
      if (node.type === 'import') {
        const symbol = this.bindings.get(node);
        const external = scope.file.imports.get(node.moduleToken.start);
        const target = external ? external.target : this.moduleSymbols.get(scope.file.uri + ':' + node.name) || this.standard.get(node.name);
        symbol.target = target;
        symbol.members = external ? target?.scope : target?.members;
        if (!external && !target) this.diagnostic(scope.file, node.moduleToken, 'Unknown module: ' + node.name);
        if (!external && target && !target.builtin) this.occurrences.push({ file: scope.file, token: node.moduleToken, symbol: target, scope, module: true });
      }
      if (['module', 'class'].includes(node.type)) this.resolveImports(node.body, this.bindings.get(node).members);
      else if (node.body) {
        this.resolveImports(node.body, this.nodes.get(node.body));
        if (node.otherwise?.length) this.resolveImports(node.otherwise, this.nodes.get(node.otherwise));
      }
    }
  }

  value(node, scope, seen = new Set()) {
    if (!node || seen.has(node) || seen.size > 100) return null;
    seen.add(node);
    if (node.type === 'dictionary') {
      if (!this.bindings.has(node)) {
        const value = { members: this.scope(null, scope.file, node.token.start, scope.end), dictionary: true };
        this.bindings.set(node, value);
        node.entries.forEach(([name, item], index) => {
          if (!value.members.symbols.has(name)) this.symbol(value.members, node.entryTokens[index], 'property', { node: { value: item }, valueScope: scope });
        });
      }
      return this.bindings.get(node);
    }
    if (node.type === 'variable') {
      const symbol = this.lookup(scope, node.token.text);
      if (symbol?.members) return symbol;
      if (symbol?.node?.value) return this.value(symbol.node.value, symbol.scope, seen);
      return symbol;
    }
    if (node.type === 'index' && node.position.type === 'literal') {
      const value = this.value(node.array, scope, seen);
      if (value?.kind === 'class') return null;
      const member = value?.members?.symbols.get(node.position.value);
      return member?.node?.value ? this.value(member.node.value, member.valueScope || member.scope, seen) || member : member || null;
    }
    if (node.type === 'call') {
      const symbol = this.value(node.callee, scope, seen);
      if (symbol?.kind === 'class') return { members: symbol.members };
    }
    return null;
  }

  expression(node, scope) {
    if (!node) return;
    if (node.type === 'variable') {
      const symbol = this.lookup(scope, node.token.text);
      this.occurrences.push({ file: scope.file, token: node.token, symbol, scope, lexical: true });
      if (!symbol) this.diagnostic(scope.file, node.token, 'Unknown variable: ' + node.token.text);
    } else if (node.type === 'index') {
      this.expression(node.array, scope);
      if (node.position.type === 'literal' && typeof node.position.value === 'string') {
        const value = this.value(node.array, scope);
        const symbol = value?.members?.symbols.get(node.position.value);
        if (symbol && value.kind !== 'class') this.occurrences.push({ file: scope.file, token: node.position.token, symbol, scope, member: value.members });
        else if (value?.kind === 'class') this.diagnostic(scope.file, node.position.token, 'Class members require an instance.');
        else if (value?.members && !value.dictionary) this.diagnostic(scope.file, node.position.token, 'Unknown member: ' + node.position.value);
      } else this.expression(node.position, scope);
    } else {
      for (const field of ['callee', 'left', 'right']) this.expression(node[field], scope);
      for (const value of node.args || node.items || []) this.expression(value, scope);
      for (const [, value] of node.entries || []) this.expression(value, scope);
    }
  }

  references(statements, scope) {
    for (const node of statements) {
      if (node.type === 'assign') {
        this.expression({ type: 'variable', token: node.token }, scope);
        const target = this.lookup(scope, node.token.text);
        if (target?.constant) this.diagnostic(scope.file, node.token, 'Cannot reassign constant: ' + target.name);
      }
      if (node.type === 'set') this.expression(node.target, scope);
      this.expression(node.value, scope);
      if (node.value?.type === 'dictionary') this.value(node.value, scope);
      this.expression(node.condition, scope);
      this.expression(node.iterable, scope);
      if (node.type === 'return') {
        let current = scope;
        while (current && current.kind !== 'function') current = current.parent;
        if (!current) this.diagnostic(scope.file, node.token, 'Return must be inside a function');
      }
      if (['module', 'class'].includes(node.type)) this.references(node.body, this.bindings.get(node).members);
      else if (node.body) {
        this.references(node.body, this.nodes.get(node.body));
        if (node.otherwise?.length) this.references(node.otherwise, this.nodes.get(node.otherwise));
      }
    }
  }

  scopeAt(file, offset, scope = file.scope) {
    for (const child of scope.children) {
      if (child.start <= offset && offset < child.end) return this.scopeAt(file, offset, child);
    }
    return scope;
  }

  occurrence(uri, position) {
    const file = [...this.files.values()].find(file => file.uri === uri);
    if (!file) return null;
    const offset = file.document.offsetAt(position);
    return this.occurrences.find(item => item.file === file && item.token.start <= offset && offset <= item.token.end);
  }

  definition(uri, position) {
    const occurrence = this.occurrence(uri, position);
    if (occurrence?.symbol?.file) return { uri: occurrence.symbol.file.uri, range: this.range(occurrence.symbol.file, occurrence.symbol.token) };
    const file = [...this.files.values()].find(file => file.uri === uri);
    const offset = file?.document.offsetAt(position);
    const external = file && [...file.imports.values()].find(item => item.token.start <= offset && offset < item.token.end);
    if (external?.target) return { uri: external.target.uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } } };
    return null;
  }

  callable(symbol) {
    if (symbol?.kind === 'class') return { name: symbol.name, params: symbol.members?.symbols.get('init')?.params || [] };
    if (symbol?.params) return { name: symbol.name, params: symbol.params };
    return null;
  }

  describe(symbol) {
    const call = this.callable(symbol);
    const label = call ? call.name + '(' + call.params.join(', ') + ')' : symbol.kind + ' ' + symbol.name;
    const location = symbol.file ? '\n\nDeclared in ' + path.relative(this.root || path.dirname(symbol.file.filename), symbol.file.filename).replaceAll('\\', '/') + ':' + (symbol.file.document.positionAt(symbol.token.start).line + 1) : '\n\nZuno standard library.';
    return '```zuno\n' + label + '\n```\n\n' + (symbol.constant ? 'Constant ' : '') + symbol.kind + '.' + location;
  }

  hover(uri, position) {
    const item = this.occurrence(uri, position);
    if (item?.symbol) return { contents: { kind: 'markdown', value: this.describe(item.symbol) }, range: this.range(item.file, item.token) };
    if (item) return { contents: { kind: 'plaintext', value: 'Unresolved symbol. No static declaration is available.' }, range: this.range(item.file, item.token) };
    return null;
  }

  signatureHelp(uri, position) {
    const file = [...this.files.values()].find(item => item.uri === uri);
    if (!file) return null;
    const offset = file.document.offsetAt(position);
    const token = file.tokens.find(item => item.start < offset && offset < item.end);
    if (token?.string) return null;
    const line = file.text.slice(file.text.lastIndexOf('\n', offset - 1) + 1, offset);
    if (/\/\//.test(line.replace(/"(?:\\.|[^"\\])*"/g, ''))) return null;
    const stack = [];
    const pairs = { ')': '(', ']': '[', '}': '{' };
    for (const [index, token] of file.tokens.entries()) {
      if (token.start >= offset) break;
      if (['(', '[', '{'].includes(token.raw)) stack.push({ raw: token.raw, index, argument: 0 });
      else if (pairs[token.raw]) { if (stack.at(-1)?.raw === pairs[token.raw]) stack.pop(); }
      else if (token.raw === ',' && stack.length) stack.at(-1).argument++;
    }
    for (const frame of stack.reverse()) {
      if (frame.raw !== '(') continue;
      const before = file.tokens[frame.index - 1];
      if (!before || !/^[A-Za-z_]\w*$/.test(before.raw)) continue;
      if (['cook', 'fn', 'func'].includes(file.tokens[frame.index - 2]?.raw)) return null;
      if (['if', 'bet', 'while', 'grind', 'for', 'each', 'not'].includes(before.raw)) continue;
      let symbol = this.occurrences.find(item => item.file === file && item.token.start === before.start)?.symbol;
      if (!symbol) {
        const parts = [before.raw];
        let index = frame.index - 2;
        while (file.tokens[index]?.raw === '.' && /^[A-Za-z_]\w*$/.test(file.tokens[index - 1]?.raw || '')) {
          parts.unshift(file.tokens[index - 1].raw);
          index -= 2;
        }
        symbol = this.value({ type: 'variable', token: { text: parts.shift() } }, this.scopeAt(file, offset));
        for (const part of parts) symbol = symbol?.members?.symbols.get(part);
      }
      if (['yap', 'print', 'say'].includes(before.raw)) symbol = { name: before.raw, kind: 'function', params: ['value'], builtin: true };
      const call = this.callable(symbol);
      if (!call) return null;
      return { signatures: [{ label: call.name + '(' + call.params.join(', ') + ')', parameters: call.params.map(label => ({ label })), documentation: { kind: 'markdown', value: this.describe(symbol) } }], activeSignature: 0, activeParameter: frame.argument };
    }
    return null;
  }

  completion(uri, position) {
    const file = [...this.files.values()].find(file => file.uri === uri);
    if (!file) return [];
    const offset = file.document.offsetAt(position);
    const current = file.tokens.find(item => item.start <= offset && offset <= item.end);
    if (current?.string) return [];
    const lineStart = file.text.lastIndexOf('\n', offset - 1) + 1;
    if (file.text.slice(lineStart, offset).includes('//')) return [];
    const scope = this.scopeAt(file, offset);
    const before = file.text.slice(0, offset);
    const member = before.match(/([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\.([A-Za-z_]\w*)?$/);
    let candidates = new Map();
    if (member) {
      const parts = member[1].split('.');
      let value = this.value({ type: 'variable', token: { text: parts.shift() } }, scope);
      for (const part of parts) value = value?.members?.symbols.get(part);
      candidates = value?.kind === 'class' ? new Map() : value?.members?.symbols || new Map();
    } else {
      for (let current = scope; current; current = current.parent) for (const [name, symbol] of current.symbols) if (!candidates.has(name)) candidates.set(name, symbol);
      const line = file.text.slice(lineStart, offset);
      if (/^\s*import\s+\w*$/.test(line)) for (const [name, symbol] of this.standard) candidates.set(name, symbol);
    }
    const items = [...candidates.values()].map(symbol => ({ label: symbol.name, kind: { function: 3, parameter: 6, variable: 6, property: 10, class: 7, module: 9, import: 9 }[symbol.kind] || 6, detail: symbol.params ? symbol.name + '(' + symbol.params.join(', ') + ')' : symbol.kind + ' ' + symbol.name, insertText: symbol.name }));
    if (!member) for (const name of reserved) if (name !== 'this') items.push({ label: name, kind: 14, insertText: snippets[name] || name, insertTextFormat: snippets[name] ? 2 : 1 });
    return items;
  }

  prepareRename(uri, position) {
    const occurrence = this.occurrence(uri, position);
    if (!occurrence?.symbol || occurrence.symbol.builtin) throw new Error('Select a declared Zuno symbol.');
    if (!this.complete || [...this.files.values()].some(file => file.syntaxError || file.importError)) throw new Error('Fix syntax errors, file imports, and analysis limits before renaming.');
    return { range: this.range(occurrence.file, occurrence.token), placeholder: occurrence.symbol.name };
  }

  rename(uri, position, newName) {
    this.prepareRename(uri, position);
    if (!/^[A-Za-z_]\w*$/.test(newName) || reserved.has(newName)) throw new Error('Use a valid name that is not a Zuno keyword.');
    const symbol = this.occurrence(uri, position).symbol;
    if (newName === symbol.name) return { documentChanges: [] };
    if (symbol.scope.symbols.has(newName)) throw new Error('That name is already declared in this scope.');
    const oldName = symbol.name;
    symbol.scope.symbols.delete(oldName);
    symbol.scope.symbols.set(newName, symbol);
    try {
      for (const reference of this.occurrences) {
        if (!reference.lexical) continue;
        const name = reference.symbol === symbol ? newName : reference.token.text;
        if (this.lookup(reference.scope, name) !== reference.symbol) throw new Error('Rename would capture or hide another symbol.');
      }
    } finally { symbol.scope.symbols.delete(newName); symbol.scope.symbols.set(oldName, symbol); }
    const edits = new Map();
    const seen = new Set();
    for (const occurrence of this.occurrences.filter(item => item.symbol === symbol)) {
      const key = occurrence.file.uri + ':' + occurrence.token.start;
      if (seen.has(key)) continue;
      seen.add(key);
      if (!edits.has(occurrence.file)) edits.set(occurrence.file, []);
      edits.get(occurrence.file).push({ range: this.range(occurrence.file, occurrence.token), newText: occurrence.token.raw?.startsWith('"') ? JSON.stringify(newName) : newName });
    }
    return { documentChanges: [...edits].map(([file, edits]) => ({ textDocument: { uri: file.uri, version: (this.open.get(identity(file.filename)) || this.open.get(file.filename)) ? file.document.version : null }, edits })) };
  }
}

module.exports = { Analysis, lex };
