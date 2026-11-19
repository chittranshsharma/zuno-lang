(function (root) {
  function execute(source, limit = 100000, parseOnly = false) {
    if (source.length > 100000) throw new Error('Program exceeds 100000 characters');
    const tokens = [];
    let line = 1;
    let column = 1;
    let offset = 0;
    const fail = (token, message) => { throw new Error(`Line ${token.line}, column ${token.column}: ${message}`); };
    while (offset < source.length) {
      if (source.slice(offset, offset + 2) === '//') {
        const end = source.indexOf('\n', offset);
        const count = (end < 0 ? source.length : end) - offset;
        offset += count; column += count; continue;
      }
      const match = source.slice(offset).match(/^(\s+|"(?:\\.|[^"\\\r\n])*"|\d+(?:\.\d+)?|[A-Za-z_]\w*|==|!=|<=|>=|&&|\|\||\*\*|[\[\],.{}:();=+*/%<>!\-])/);
      if (!match) fail({ line, column }, 'Unexpected character ' + source[offset]);
      const text = match[0];
      if (!/^\s/.test(text)) tokens.push({ text: ({ __proto__:null, vibe:'let', lock:'const', cook:'func', yap:'print', yeet:'return', fr:'true', cap:'false' })[text] || text, line, column });
      for (const character of text) {
        if (character === '\n') { line++; column = 1; }
        else column++;
      }
      offset += text.length;
    }
    tokens.push({ text: '', line, column });
    let index = 0;
    let depth = 0;
    const peek = () => tokens[index].text;
    const take = () => tokens[index++];
    const expect = text => {
      if (peek() !== text) fail(tokens[index], 'Expected ' + text);
      return take();
    };
    const reserved = new Set(['let', 'print', 'if', 'else', 'while', 'true', 'false', 'fn', 'func', 'const', 'say', 'for', 'in', 'return', 'class', 'module', 'import', 'as']);
    function argumentsUntil(end) {
      const values = [];
      if (peek() !== end) {
        do { values.push(expression()); if (peek() !== ',') break; take(); } while (true);
      }
      expect(end);
      return values;
    }
    const precedence = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '**': 8 };
    function expression(min = 0) {
      if (++depth > 200) fail(tokens[index], 'Expression is too deeply nested');
      const token = take();
      let node;
      if (token.text === '{') {
        const entries = [];
        while (peek() !== '}') {
          const key = take();
          if (!key.text.startsWith('"')) fail(key, 'Dictionary keys must be quoted text');
          expect(':'); entries.push([JSON.parse(key.text), expression()]);
          if (peek() !== ',') break; take();
        }
        expect('}'); node = { type:'dictionary', token, entries };
      } else if (token.text === '[') {
        node = { type: 'array', token, items: argumentsUntil(']') };
      } else if (token.text === '(') {
        node = expression();
        expect(')');
      } else if (['-', '+', '!'].includes(token.text)) {
        node = { type: 'unary', token, right: expression(7) };
      } else if (token.text.startsWith('"')) {
        try { node = { type: 'literal', value: JSON.parse(token.text), token }; }
        catch { fail(token, 'Invalid string escape'); }
      } else if (/^\d/.test(token.text)) {
        node = { type: 'literal', value: Number(token.text), token };
      } else if (['true', 'false'].includes(token.text)) {
        node = { type: 'literal', value: token.text === 'true', token };
      } else if (/^[A-Za-z_]\w*$/.test(token.text) && !reserved.has(token.text)) {
        node = { type: 'variable', token };
      } else fail(token, 'Expected an expression');
      while (peek() === '(' || peek() === '[' || peek() === '.') {
        const suffix = take();
        if (suffix.text === '.') { const key=take(); if(!/^[A-Za-z_]\w*$/.test(key.text))fail(key,'Expected member name'); node={type:'index',token:suffix,array:node,position:{type:'literal',token:key,value:key.text}}; }
        else if (suffix.text === '(') node = { type: 'call', token: suffix, callee: node, args: argumentsUntil(')') };
        else { const position = expression(); expect(']'); node = { type: 'index', token: suffix, array: node, position }; }
      }
      while (Object.hasOwn(precedence, peek()) && precedence[peek()] >= min) {
        const operator = take();
        const right = expression(precedence[operator.text] + (operator.text === '**' ? 0 : 1));
        node = { type: 'binary', token: operator, left: node, right };
      }
      depth--;
      return node;
    }
    function block() {
      expect('{');
      if (++depth > 200) fail(tokens[index], 'Blocks are too deeply nested');
      const statements = [];
      while (peek() && peek() !== '}') statements.push(statement());
      expect('}');
      depth--;
      return statements;
    }
    function statement() {
      const token = take();
      if (['module','class'].includes(token.text)) {
        const name=take(); if(!/^[A-Za-z_]\w*$/.test(name.text)||reserved.has(name.text))fail(name,'Expected a name');
        const body=block();
        if(token.text==='class'&&body.some(n=>n.type!=='function'))fail(name,'Class bodies contain methods only');
        return {type:token.text,token:name,body};
      }
      if (token.text === 'import') {
        const name=take();if(!/^[A-Za-z_]\w*$/.test(name.text))fail(name,'Expected module name');
        expect('as');const alias=take();if(!/^[A-Za-z_]\w*$/.test(alias.text)||reserved.has(alias.text))fail(alias,'Expected alias');expect(';');
        return {type:'import',token:alias,name:name.text};
      }
      if (['fn', 'func'].includes(token.text)) {
        const name = take();
        if (!/^[A-Za-z_]\w*$/.test(name.text) || reserved.has(name.text)) fail(name, 'Expected a function name');
        expect('(');
        const params = [];
        if (peek() !== ')') {
          do {
            const param = take();
            if (!/^[A-Za-z_]\w*$/.test(param.text) || reserved.has(param.text) || params.includes(param.text)) fail(param, 'Invalid or duplicate parameter');
            params.push(param.text);
            if (peek() !== ',') break;
            take();
          } while (true);
        }
        expect(')');
        return { type: 'function', token: name, params, body: block() };
      }
      if (token.text === 'for') {
        const name = take();
        if (!/^[A-Za-z_]\w*$/.test(name.text) || reserved.has(name.text)) fail(name, 'Expected a loop variable');
        expect('in');
        const iterable = expression();
        return { type: 'for', token: name, iterable, body: block() };
      }
      if (token.text === 'return') {
        const value = expression(); expect(';');
        return { type: 'return', token, value };
      }
      if (token.text === 'if' || token.text === 'while') {
        expect('(');
        const condition = expression();
        expect(')');
        const body = block();
        let otherwise = [];
        if (token.text === 'if' && peek() === 'else') { take(); otherwise = block(); }
        return { type: token.text, token, condition, body, otherwise };
      }
      if (['print', 'say'].includes(token.text)) {
        expect('(');
        const value = expression();
        expect(')');
        expect(';');
        return { type: 'print', token, value };
      }
      if (!['let', 'const'].includes(token.text)) {
        index--;const target=expression();
        if(peek()!== '='){expect(';');return {type:'expression',token,value:target};}
        take();const value=expression();expect(';');
        if(target.type==='variable')return {type:'assign',token:target.token,value};
        if(target.type!=='index')fail(token,'Invalid assignment target');
        return {type:'set',token,target,value};
      }
      const name = ['let', 'const'].includes(token.text) ? take() : token;
      if (!/^[A-Za-z_]\w*$/.test(name.text) || reserved.has(name.text)) fail(name, 'Expected a variable name');
      expect('=');
      const value = expression();
      expect(';');
      return { type: ['let', 'const'].includes(token.text) ? 'declare' : 'assign', constant: token.text === 'const', token: name, value };
    }
    const program = [];
    while (peek()) program.push(statement());
    if (parseOnly) return program;
    const modules = new Map();
    const constants = new WeakMap();
    const dict = entries => ({ kind:'dictionary', values:new Map(entries) });
    const output = [];
    let steps = 0;
    let calls = 0;
    const returnSignal = Symbol('return');
    const tick = token => { if (++steps > limit) fail(token, 'Execution limit reached. Check your loops.'); };
    function evaluate(node, scope) {
      tick(node.token);
      const op = node.token.text;
      if (node.type === 'dictionary') return dict(node.entries.map(([key,value])=>[key,evaluate(value,scope)]));
      if (node.type === 'array') return node.items.map(item => evaluate(item, scope));
      if (node.type === 'index') {
        const array = evaluate(node.array, scope);
        const position = evaluate(node.position, scope);
        if (array?.kind==='dictionary') {
          if(typeof position!=='string'||!array.values.has(position))fail(node.token,'Unknown dictionary key: '+position);
          return array.values.get(position);
        }
        if (array?.kind==='instance') {
          if(array.fields.has(position))return array.fields.get(position);
          const method=array.definition.methods.get(position);
          if(!method)fail(node.token,'Unknown member: '+position);
          return {...method,scope:{values:new Map([['this',array]]),parent:method.scope}};
        }
        if ((!Array.isArray(array) && typeof array !== 'string') || !Number.isInteger(position) || position < 0 || position >= array.length) fail(node.token, 'Array index is outside its bounds');
        return array[position];
      }
      if (node.type === 'call') {
        const fn = evaluate(node.callee, scope);
        if (fn?.kind === 'class') {
          const instance={kind:'instance',fields:new Map(),definition:fn};
          const init=fn.methods.get('init');
          if(init)evaluate({type:'call',token:node.token,callee:{type:'literal',token:node.token,value:{...init,scope:{values:new Map([['this',instance]]),parent:init.scope}}},args:node.args},scope);
          else if(node.args.length)fail(node.token,'Class has no initializer');
          return instance;
        }
        if (fn && fn.kind === 'builtin') {
          const args = node.args.map(arg => evaluate(arg, scope));
          try { return fn.call(...args); } catch (error) { fail(node.token, error.message); }
        }
        if (!fn || fn.kind !== 'function') fail(node.token, 'Expected a function');
        if (fn.params.length !== node.args.length) fail(node.token, 'Wrong number of arguments');
        const values = node.args.map(arg => evaluate(arg, scope));
        if (++calls > 100) fail(node.token, 'Function call limit reached');
        try {
          run(fn.body, { values: new Map(fn.params.map((name, i) => [name, values[i]])), parent: fn.scope });
          return false;
        } catch (signal) {
          if (signal && signal.type === returnSignal) return signal.value;
          throw signal;
        } finally { calls--; }
      }
      if (node.type === 'literal') return node.value;
      if (node.type === 'variable') {
        for (let current = scope; current; current = current.parent) if (current.values.has(op)) return current.values.get(op);
        fail(node.token, 'Unknown variable: ' + op);
      }
      if (node.type === 'unary') {
        const value = evaluate(node.right, scope);
        if (op === '!') return !value;
        if (typeof value !== 'number') fail(node.token, 'Maths needs numbers');
        return op === '-' ? -value : value;
      }
      const left = evaluate(node.left, scope);
      if (op === '&&') return Boolean(left) && Boolean(evaluate(node.right, scope));
      if (op === '||') return Boolean(left) || Boolean(evaluate(node.right, scope));
      const right = evaluate(node.right, scope);
      if (op === '==') return left === right;
      if (op === '!=') return left !== right;
      if (op === '+' && (typeof left === 'string' || typeof right === 'string')) {
        const result = String(left) + String(right);
        if (result.length > 100000) fail(node.token, 'Text exceeds 100000 characters');
        return result;
      }
      if (typeof left !== 'number' || typeof right !== 'number') fail(node.token, 'Maths and comparisons need numbers');
      if ((op === '/' || op === '%') && right === 0) fail(node.token, 'Cannot divide by zero');
      const operations = {
        '+': () => left + right, '-': () => left - right, '*': () => left * right,
        '/': () => left / right, '%': () => left % right, '**': () => left ** right,
        '<': () => left < right, '>': () => left > right, '<=': () => left <= right, '>=': () => left >= right
      };
      const result = operations[op]();
      if (typeof result === 'number' && !Number.isFinite(result)) fail(node.token, 'Number is outside the supported range');
      return result;
    }
    function run(statements, scope) {
      for (const node of statements) {
        tick(node.token);
        if (node.type === 'module') {
          if(modules.has(node.token.text))fail(node.token,'Module already exists');
          const local={values:new Map(),parent:scope};run(node.body,local);
          modules.set(node.token.text,dict(local.values));
        } else if (node.type === 'import') {
          if(scope.values.has(node.token.text))fail(node.token,'Alias already declared');
          if(!modules.has(node.name))fail(node.token,'Unknown module: '+node.name);
          scope.values.set(node.token.text,modules.get(node.name));
          if(!constants.has(scope))constants.set(scope,new Set());constants.get(scope).add(node.token.text);
        } else if (node.type === 'class') {
          if(scope.values.has(node.token.text))fail(node.token,'Name already declared');
          const methods=new Map();
          for(const method of node.body){if(methods.has(method.token.text))fail(method.token,'Duplicate method');methods.set(method.token.text,{kind:'function',params:method.params,body:method.body,scope});}
          scope.values.set(node.token.text,{kind:'class',methods});
        } else if (node.type === 'set') {
          const object=evaluate(node.target.array,scope);const key=evaluate(node.target.position,scope);const value=evaluate(node.value,scope);
          if(object?.kind==='dictionary'){if(typeof key!=='string')fail(node.token,'Dictionary key must be text');if(object.values.size>=10000&&!object.values.has(key))fail(node.token,'Dictionary limit reached');object.values.set(key,value);}
          else if(object?.kind==='instance'){if(typeof key!=='string')fail(node.token,'Field must be text');if(object.fields.size>=10000&&!object.fields.has(key))fail(node.token,'Field limit reached');object.fields.set(key,value);}
          else if(Array.isArray(object)&&Number.isInteger(key)&&key>=0&&key<object.length)object[key]=value;
          else fail(node.token,'Invalid indexed assignment');
        } else if (node.type === 'function') {
          if (scope.values.has(node.token.text)) fail(node.token, 'Variable already declared: ' + node.token.text);
          scope.values.set(node.token.text, { kind: 'function', params: node.params, body: node.body, scope });
        } else if (node.type === 'return') {
          if (!calls) fail(node.token, 'Return must be inside a function');
          throw { type: returnSignal, value: evaluate(node.value, scope) };
        } else if (node.type === 'if') {
          run(evaluate(node.condition, scope) ? node.body : node.otherwise, { values: new Map(), parent: scope });
        } else if (node.type === 'for') {
          const items = evaluate(node.iterable, scope);
          if (!Array.isArray(items) && typeof items !== 'string') fail(node.token, 'For needs an array or text');
          for (const item of items) { tick(node.token); run(node.body, { values: new Map([[node.token.text, item]]), parent: scope }); }
        } else if (node.type === 'while') {
          while (evaluate(node.condition, scope)) {
            tick(node.token);
            run(node.body, { values: new Map(), parent: scope });
          }
        } else {
          const value = evaluate(node.value, scope);
          const name = node.token.text;
          if (node.type === 'expression') continue;
          if (node.type === 'print') {
            if (output.length >= 1000) fail(node.token, 'Output limit reached');
            output.push(String(value));
          } else if (node.type === 'declare') {
            if (scope.values.has(name)) fail(node.token, 'Variable already declared: ' + name);
            scope.values.set(name, value);
            if (node.constant) { if (!constants.has(scope)) constants.set(scope, new Set()); constants.get(scope).add(name); }
          } else {
            let target = scope;
            while (target && !target.values.has(name)) target = target.parent;
            if (!target) fail(node.token, 'Unknown variable: ' + name);
            if (constants.get(target)?.has(name)) fail(node.token, 'Cannot reassign constant: ' + name);
            target.values.set(name, value);
          }
        }
      }
    }
    const requireArray = value => { if (!Array.isArray(value)) throw new Error('Expected an array'); return value; };
    const requireText = value => { if (typeof value !== 'string') throw new Error('Expected text'); return value; };
    const requireNumber = value => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Expected a finite number'); return value; };
    const builtins = {
      keys: value => { if(value?.kind!=='dictionary')throw new Error('keys needs dictionary');return [...value.values.keys()]; },
      values: value => { if(value?.kind!=='dictionary')throw new Error('values needs dictionary');return [...value.values.values()]; },
      has: (value,key) => { if(value?.kind!=='dictionary'||typeof key!=='string')throw new Error('has needs dictionary and text');return value.values.has(key); },
      remove: (value,key) => { if(value?.kind!=='dictionary'||typeof key!=='string')throw new Error('remove needs dictionary and text');return value.values.delete(key); },
      push: (items, value) => { requireArray(items); if(items.length>=10000)throw new Error('Array exceeds 10000 items'); if(typeof value==='object' && value!==null)throw new Error('push accepts primitive values'); items.push(value); return items.length; },
      pop: items => { requireArray(items); if(!items.length)throw new Error('Cannot pop an empty array'); return items.pop(); },
      slice: (value, start, end) => { if(!Array.isArray(value)&&typeof value!=='string')throw new Error('slice needs array or text'); if(!Number.isInteger(start)||(end!==undefined&&!Number.isInteger(end)))throw new Error('slice indexes must be integers'); return value.slice(start,end); },
      reverse: items => requireArray(items).slice().reverse(),
      sort: items => { requireArray(items); if(!items.every(x=>typeof x==='number'))throw new Error('sort needs numbers'); return items.slice().sort((a,b)=>a-b); },
      sum: items => { const total=requireArray(items).reduce((a,b)=>a+requireNumber(b),0); return requireNumber(total); },
      min: items => { requireArray(items); if(!items.length)throw new Error('min needs values'); return Math.min(...items.map(requireNumber)); },
      max: items => { requireArray(items); if(!items.length)throw new Error('max needs values'); return Math.max(...items.map(requireNumber)); },
      split: (text, separator) => { const items=requireText(text).split(requireText(separator)); if(items.length>10000)throw new Error('Array exceeds 10000 items'); return items; },
      trim: text => requireText(text).trim(),
      contains: (text, part) => requireText(text).includes(requireText(part)),
      replace: (text, from, to) => { const parts=requireText(text).split(requireText(from)); requireText(to); if(parts.reduce((n,p)=>n+p.length,0)+Math.max(0,parts.length-1)*to.length>100000)throw new Error('Text exceeds 100000 characters'); const result=parts.join(to); if(result.length>100000)throw new Error('Text exceeds 100000 characters'); return result; },
      text: value => { if(typeof value==='object')throw new Error('text needs a primitive value'); return String(value); },
      number: value => { if(typeof value!=='string'&&typeof value!=='number')throw new Error('number needs text or a number'); return requireNumber(Number(value)); },
      floor: value => Math.floor(requireNumber(value)),
      ceil: value => Math.ceil(requireNumber(value)),
      sqrt: value => { requireNumber(value); if(value<0)throw new Error('sqrt needs a nonnegative number'); return Math.sqrt(value); },
      assert: (condition, message = 'Assertion failed') => { if(!condition)throw new Error(requireText(message)); return true; },
      len: value => { if (!Array.isArray(value) && typeof value !== 'string') throw new Error('len needs an array or text'); return value.length; },
      range: (start, end) => { if (end === undefined) { end = start; start = 0; } if (!Number.isInteger(start) || !Number.isInteger(end) || end - start > 10000 || end < start) throw new Error('range needs ordered integers, up to 10000 items'); return Array.from({ length: end - start }, (_, i) => start + i); },
      upper: value => { if (typeof value !== 'string') throw new Error('upper needs text'); return value.toUpperCase(); },
      lower: value => { if (typeof value !== 'string') throw new Error('lower needs text'); return value.toLowerCase(); },
      abs: value => { if (typeof value !== 'number') throw new Error('abs needs a number'); return Math.abs(value); },
      round: value => { if (typeof value !== 'number') throw new Error('round needs a number'); return Math.round(value); },
      join: (values, separator = ',') => { if (!Array.isArray(values) || typeof separator !== 'string') throw new Error('join needs an array and text'); const result = values.join(separator); if (result.length > 100000) throw new Error('Text exceeds 100000 characters'); return result; }
    };
    const builtinScope = { values: new Map(Object.entries(builtins).map(([name, call]) => [name, { kind: 'builtin', call }])), parent: null };
    for(const [name,names] of Object.entries({math:['abs','round','floor','ceil','sqrt','sum','min','max'],strings:['upper','lower','trim','split','join','contains','replace','text','number'],arrays:['len','range','push','pop','slice','reverse','sort'],dict:['keys','values','has','remove'],testing:['assert']})) {
      modules.set(name,dict(names.map(key=>[key,builtinScope.values.get(key)])));
    }
    run(program, { values: new Map(), parent: builtinScope });
    return output;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { execute, parse: source => execute(source, 0, true) };
  else root.Zuno = { execute, parse: source => execute(source, 0, true) };
})(globalThis);
