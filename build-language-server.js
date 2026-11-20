const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const directory = path.join(__dirname, 'editor-extension', 'dist');
const packages = new Set();
for (const [entry, name] of [['editor-extension/extension.js', 'extension'], ['language-server/server.js', 'server']]) {
  const result = esbuild.buildSync({ entryPoints: [entry], bundle: true, platform: 'node', format: 'cjs', target: 'node18', external: ['vscode'], outfile: path.join(directory, name + '.js'), legalComments: 'linked', metafile: true });
  for (const filename of Object.keys(result.metafile.inputs)) {
    const match = filename.replaceAll('\\', '/').match(/node_modules\/((?:@[^/]+\/)?[^/]+)/);
    if (match) packages.add(match[1]);
  }
}
const notices = [];
for (const name of packages) {
  const root = path.join(__dirname, 'node_modules', name);
  const license = fs.readdirSync(root).find(file => /^licen[cs]e(?:\..*)?$/i.test(file));
  if (!license) throw new Error('Missing dependency license: ' + name);
  notices.push(name + '\n' + fs.readFileSync(path.join(root, license), 'utf8'));
}
fs.writeFileSync(path.join(directory, 'THIRD-PARTY-NOTICES.txt'), notices.join('\n\n'));
console.log('Bundled language client and server with third-party notices.');
