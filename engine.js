(function (root) {
  function execute(source, limit = 100000) {
    if (source.length > 100000) throw new Error('Program exceeds 100000 characters');
    const tokens = [];
    let line = 1;
    let column = 1;
    let offset = 0;
    const fail = (token, message) => { throw new Error(`Line ${token.line}, column ${token.column}: ${message}`); };
    while (offset < source.length) {
      const match = source.slice(offset).match(/^(\s+|"(?:\\.|[^"\\\r\n])*"|\d+(?:\.\d+)?|[A-Za-z_]\w*|==|!=|<=|>=|&&|\|\||\*\*|[{}();=+*/%<>!\-])/);
      if (!match) fail({ line, column }, 'Unexpected character ' + source[offset]);
      const text = match[0];
      if (!/^\s/.test(text)) tokens.push({ text, line, column });
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
    const reserved = new Set(['let', 'print', 'if', 'else', 'while', 'true', 'false']);
    const precedence = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6, '/': 6, '%': 6, '**': 8 };
    function expression(min = 0) {
      if (++depth > 200) fail(tokens[index], 'Expression is too deeply nested');
      const token = take();
      let node;
      if (token.text === '(') {
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
      if (token.text === 'if' || token.text === 'while') {
        expect('(');
        const condition = expression();
        expect(')');
        const body = block();
        let otherwise = [];
        if (token.text === 'if' && peek() === 'else') { take(); otherwise = block(); }
        return { type: token.text, token, condition, body, otherwise };
      }
      if (token.text === 'print') {
        expect('(');
        const value = expression();
        expect(')');
        expect(';');
        return { type: 'print', token, value };
      }
      const name = token.text === 'let' ? take() : token;
      if (!/^[A-Za-z_]\w*$/.test(name.text) || reserved.has(name.text)) fail(name, 'Expected a variable name');
      expect('=');
      const value = expression();
      expect(';');
      return { type: token.text === 'let' ? 'declare' : 'assign', token: name, value };
    }
    const program = [];
    while (peek()) program.push(statement());
    const output = [];
    let steps = 0;
    const tick = token => { if (++steps > limit) fail(token, 'Execution limit reached. Check your loops.'); };
    function evaluate(node, scope) {
      tick(node.token);
      const op = node.token.text;
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
        if (node.type === 'if') {
          run(evaluate(node.condition, scope) ? node.body : node.otherwise, { values: new Map(), parent: scope });
        } else if (node.type === 'while') {
          while (evaluate(node.condition, scope)) {
            tick(node.token);
            run(node.body, { values: new Map(), parent: scope });
          }
        } else {
          const value = evaluate(node.value, scope);
          const name = node.token.text;
          if (node.type === 'print') {
            if (output.length >= 1000) fail(node.token, 'Output limit reached');
            output.push(String(value));
          } else if (node.type === 'declare') {
            if (scope.values.has(name)) fail(node.token, 'Variable already declared: ' + name);
            scope.values.set(name, value);
          } else {
            let target = scope;
            while (target && !target.values.has(name)) target = target.parent;
            if (!target) fail(node.token, 'Unknown variable: ' + name);
            target.values.set(name, value);
          }
        }
      }
    }
    run(program, { values: new Map(), parent: null });
    return output;
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { execute };
  else root.Lingua = { execute };
})(globalThis);
