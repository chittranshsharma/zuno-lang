#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { execute, parse } = require('./engine');
const args = process.argv.slice(2);
if(args[0]==='--version'||args[0]==='-v'){console.log('Zuno '+require('./package.json').version);process.exit(0);}
if(args[0]==='--help'||args[0]==='-h'){console.log('Zuno\n  zuno program.zuno\n  zuno run program.zuno\n  zuno check program.zuno\n  zuno init folder\n  zuno --version');process.exit(0);}
if(args[0]==='init'){
  const target=path.resolve(args[1]||'zuno-app');
  try{
    if(fs.existsSync(target))throw new Error('Target already exists. Choose a new directory.');
    fs.mkdirSync(target,{recursive:true});
    fs.writeFileSync(path.join(target,'main.zuno'),'cook greet(name) {\n  yeet "Welcome, " + name;\n}\nyap(greet("Zuno"));\n');
    fs.mkdirSync(path.join(target,'.vscode'));
    fs.writeFileSync(path.join(target,'.vscode','tasks.json'),JSON.stringify({version:'2.0.0',tasks:[{label:'Zuno: Run current file',type:'process',command:process.execPath,args:[__filename,'${file}'],group:{kind:'build',isDefault:true},problemMatcher:[]}]},null,2));
    console.log('Created '+target+'\nRun: zuno '+path.join(target,'main.zuno'));
    process.exit(0);
  }catch(error){console.error(error.message);process.exit(1);}
}
const check = ['--check','check'].includes(args[0]);
const file = args[check || args[0]==='run' ? 1 : 0];
if (!file) {
  console.log('Usage: zuno [run|check] program.zuno');
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
