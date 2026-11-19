const fs = require('node:fs');
const esbuild = require('esbuild');
for (const file of fs.readdirSync('.').filter(name => name.endsWith('.css'))) {
  const result = esbuild.transformSync(fs.readFileSync(file, 'utf8'), { loader:'css', sourcefile:file, logLevel:'silent' });
  if (result.warnings.length) {
    console.error(file + ': ' + result.warnings.map(warning => warning.text).join('\n'));
    process.exitCode = 1;
  }
}
