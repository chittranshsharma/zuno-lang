const fs = require('node:fs');
const path = require('node:path');
const { execute, parse } = require('./engine');
const args = process.argv.slice(2);
const check = args[0] === '--check';
const file = args[check ? 1 : 0];
if (!file) {
  console.log('Usage: node cli.js [--check] program.zuno');
  process.exitCode = 1;
} else {
  try {
    if (fs.statSync(file).size > 400000) throw new Error('Source file is too large');
    const root = fs.realpathSync(path.dirname(path.resolve(file)));
    const visiting = new Set();
    const loaded = new Map();
    const compiled = [];
    function load(filename) {
      const resolved=fs.realpathSync(filename);
      if(path.relative(root,resolved).startsWith('..')||path.isAbsolute(path.relative(root,resolved)))throw new Error('Imports must stay in the project directory');
      if(visiting.has(resolved))throw new Error('Circular module import');
      if(fs.statSync(resolved).size>400000)throw new Error('Source file too large');
      visiting.add(resolved);
      let text=fs.readFileSync(resolved,'utf8');
      text=text.replace(/^\s*import\s+"([^"]+)"\s+as\s+([A-Za-z_]\w*)\s*;/gm,(match,relative,alias)=>{
        if(!relative.endsWith('.zuno'))throw new Error('Module files must end in .zuno');
        const target=fs.realpathSync(path.resolve(path.dirname(resolved),relative));
        if(visiting.has(target))throw new Error('Circular module import');
        if(!loaded.has(target)){
          if(loaded.size>=100)throw new Error('Too many module files');
          const name='__file'+loaded.size;
          loaded.set(target,name);
          const contents=load(target);
          loaded.set(target,{name,contents});
          compiled.push({name,contents});
        }
        const entry=loaded.get(target);
        return 'import '+entry.name+' as '+alias+';';
      });
      visiting.delete(resolved);
      return text;
    }
    const main=load(path.resolve(file));
    const source=compiled.map(entry=>'module '+entry.name+' { '+entry.contents+' }').join('\n')+'\n'+main;
    if (check) { parse(source); console.log('Syntax OK'); }
    else execute(source).forEach(line => console.log(line));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
