const { createConnection, TextDocuments, ProposedFeatures, TextDocumentSyncKind, ResponseError, ErrorCodes } = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const { Analysis } = require('./analysis');

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);
const published = new Set();
let timer;

connection.onInitialize(() => ({
  capabilities: {
    textDocumentSync: TextDocumentSyncKind.Incremental,
    completionProvider: { triggerCharacters: ['.'] },
    definitionProvider: true,
    renameProvider: { prepareProvider: true },
    referencesProvider: true
  },
  serverInfo: { name: 'Zuno Language Server', version: '0.5.0' }
}));

function analyze(uri) {
  return new Analysis(uri, new Map(documents.all().map(document => [document.uri, document])));
}

function validate() {
  const diagnostics = new Map();
  const roots = new Set();
  for (const document of documents.all()) {
    try {
      const analysis = analyze(document.uri);
      if (roots.has(analysis.root || document.uri)) continue;
      roots.add(analysis.root || document.uri);
      for (const file of analysis.files.values()) diagnostics.set(file.uri, { uri: file.uri, version: documents.get(file.uri)?.version, diagnostics: file.diagnostics });
    } catch (error) {
      diagnostics.set(document.uri, { uri: document.uri, version: document.version, diagnostics: [{ severity: 1, source: 'zuno', message: error.message, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } } }] });
    }
  }
  for (const uri of published) if (!diagnostics.has(uri)) connection.sendDiagnostics({ uri, diagnostics: [] });
  published.clear();
  for (const [uri, payload] of diagnostics) { published.add(uri); connection.sendDiagnostics(payload); }
}

function schedule() { clearTimeout(timer); timer = setTimeout(validate, 150); }

documents.onDidChangeContent(schedule);
documents.onDidClose(schedule);
connection.onDidChangeWatchedFiles(schedule);
connection.onCompletion(params => analyze(params.textDocument.uri).completion(params.textDocument.uri, params.position));
connection.onDefinition(params => analyze(params.textDocument.uri).definition(params.textDocument.uri, params.position));
connection.onReferences(params => {
  const analysis = analyze(params.textDocument.uri);
  const occurrence = analysis.occurrence(params.textDocument.uri, params.position);
  if (!occurrence?.symbol) return [];
  return analysis.occurrences.filter(item => item.symbol === occurrence.symbol && (params.context.includeDeclaration || !item.declaration)).map(item => ({ uri: item.file.uri, range: analysis.range(item.file, item.token) }));
});
function rename(handler) {
  return params => {
    try { return handler(analyze(params.textDocument.uri), params); }
    catch (error) { throw new ResponseError(ErrorCodes.InvalidParams, error.message); }
  };
}
connection.onPrepareRename(rename((analysis, params) => analysis.prepareRename(params.textDocument.uri, params.position)));
connection.onRenameRequest(rename((analysis, params) => analysis.rename(params.textDocument.uri, params.position, params.newName)));
connection.onShutdown(() => clearTimeout(timer));
documents.listen(connection);
connection.listen();
