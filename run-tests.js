const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const files = fs.readdirSync(__dirname).filter(file => file.endsWith('.test.js')).sort();
const result = spawnSync(process.execPath, ['--test', ...files], { cwd:__dirname, stdio:'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
