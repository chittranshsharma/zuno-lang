const test = require('node:test');
const path = require('node:path');
const { verifyServer } = require('./lsp-smoke');
test('language server speaks LSP and tracks unsaved incremental changes without executing programs', { timeout: 30000 }, () => verifyServer(path.resolve('language-server/server.js')));
