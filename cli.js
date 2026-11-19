const fs = require('node:fs');
const { execute, parse } = require('./engine');
const args = process.argv.slice(2);
const check = args[0] === '--check';
const file = args[check ? 1 : 0];
if (!file) {
  console.log('Usage: node cli.js [--check] program.lingua');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(file).size > 400000) throw new Error('Source file is too large');
    const source = fs.readFileSync(file, 'utf8');
    if (check) { parse(source); console.log('Syntax OK'); }
    else execute(source).forEach(line => console.log(line));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
