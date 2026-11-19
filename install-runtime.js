const { execFileSync } = require('node:child_process');
const path = require('node:path');
require('./package-runtime');
const npm = process.env.npm_execpath;
if (!npm) throw new Error('Run this installer with npm run install:cli.');
const destination = path.join(__dirname,'dist');
const result = execFileSync(process.execPath,[npm,'pack',path.join(destination,'zuno'),'--pack-destination',destination,'--json'],{encoding:'utf8'});
const archive = path.join(destination,JSON.parse(result)[0].filename);
execFileSync(process.execPath,[npm,'install','--global',archive],{stdio:'inherit'});
