const { parse } = require('./engine');

function tokens(source) {
  return [...source.matchAll(/\/\/[^\r\n]*|"(?:\\.|[^"\\\r\n])*"|\d+(?:\.\d+)?|[A-Za-z_]\w*|==|!=|<=|>=|&&|\|\||\*\*|[^\s\uFEFF]/g)].map(match => ({ raw: match[0], start: match.index, end: match.index + match[0].length }));
}

function validate(source) {
  const items = tokens(source);
  let masked = source;
  for (let i = items.length - 1; i > 0; i--) {
    if (items[i - 1].raw === 'import' && items[i].raw.startsWith('"')) {
      const token = items[i];
      masked = masked.slice(0, token.start) + '_'.repeat(token.raw.length) + masked.slice(token.end);
    }
  }
  parse(masked);
}

function format(source, options = {}) {
  validate(source);
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const indent = options.insertSpaces === false ? '\t' : ' '.repeat(Math.max(1, Math.min(8, options.tabSize || 2)));
  const items = tokens(source);
  const lines = [];
  let line = '';
  let depth = 0;
  const flush = () => { if (line.trim()) lines.push(line.trimEnd()); line = ''; };
  const write = (raw, space = false) => {
    if (!line) line = indent.repeat(depth);
    else if (space && !line.endsWith(' ')) line += ' ';
    line += raw;
  };
  for (let i = 0; i < items.length; i++) {
    const raw = items[i].raw;
    const previous = items[i - 1]?.raw;
    const next = items[i + 1]?.raw;
    const trailingComment = next?.startsWith('//') && !/[\r\n]/.test(source.slice(items[i].end, items[i + 1].start));
    if (raw.startsWith('//')) {
      if (i && /[\r\n]/.test(source.slice(items[i - 1].end, items[i].start))) flush();
      write(raw, true);
      flush();
    } else if (raw === '{') {
      write(raw, previous !== '(' && previous !== '[' && previous !== '.');
      depth++;
      if (!trailingComment) flush();
    } else if (raw === '}') {
      flush();
      depth--;
      write(raw);
      if (!trailingComment && ![';', ',', ')', ']', '.', '(', 'else', 'nah', '+', '-', '*', '/', '%', '**', '==', '!='].includes(next)) flush();
    } else if (raw === ';') {
      write(raw);
      if (!trailingComment) flush();
    } else if ([',', ')', ']', '.', ':'].includes(raw)) write(raw);
    else if (raw === '(') write(raw, ['if', 'bet', 'while', 'grind', 'for', 'each'].includes(previous));
    else if (raw === '[') write(raw, previous && !/^[A-Za-z_]\w*$/.test(previous) && ![')', ']', '.'].includes(previous));
    else write(raw, line.trim().length > 0 && !['(', '[', '.'].includes(previous));
  }
  flush();
  const result = (source.startsWith('\uFEFF') ? '\uFEFF' : '') + lines.join(eol) + (lines.length ? eol : '');
  validate(result);
  if (JSON.stringify(tokens(result).map(item => item.raw)) !== JSON.stringify(items.map(item => item.raw))) throw new Error('Formatting would change source tokens. File was not changed.');
  return result;
}

module.exports = { format, validate };
