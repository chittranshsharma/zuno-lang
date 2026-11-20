# Zuno 0.5.0 — Language server release

Zuno now ships a language server inside its VS Code/Cursor extension. Install the VSIX and reload the editor; no API key, database, or separate server installation is needed.

## Editor features

- Ctrl+Space: complete variables, parameters, functions, dialect snippets, imported exports, standard-library members, and known class/dictionary members.
- F12 or Ctrl+click: go to declarations and imported files.
- F2: rename resolved symbols across project files, including unsaved buffers. Rename checks for collisions and capture while keeping shadowed variables, comments, and unrelated strings separate.
- Live diagnostics: syntax, unknown symbols/modules/members, duplicate declarations, constant assignments, invalid returns, and file-import errors, without executing programs.

The server watches project files, resolves imports inside the project root, and uses the interpreter's parser. Positions use UTF-16 so editor ranges remain correct around Unicode. Multiple open files share one project validation pass.

## Downloads and installation

Install Node.js 20+ for the CLI and editor Run/Check commands. The packages work on Windows, macOS, and Linux.

| Download | Use |
| --- | --- |
| zuno-runtime.tgz | Standalone terminal interpreter and CLI |
| zuno-tools.vsix | VS Code/Cursor extension, language server, and bundled runtime |
| zuno-starter.tgz | Starter project and examples |
| INSTALL.md | Installation, project layout, updates, and removal |
| SHA256SUMS.txt | SHA-256 hashes for all packages and the install guide |

Versioned copies of the three packages are included too. The website's stable download links follow GitHub's latest release.

```sh
npm install --global https://github.com/chittranshsharma/zuno-lang/releases/latest/download/zuno-runtime.tgz
zuno init my-first-app
cd my-first-app
zuno run
zuno check
```

Download zuno-tools.vsix, then use Extensions → … → Install from VSIX in VS Code or Cursor. Or use code --install-extension ./zuno-tools.vsix --force (replace code with cursor for Cursor). Reload the editor after updating.

## Validation and boundaries

The release is checked with interpreter/CLI tests, symbol-analysis tests, real LSP messages, fresh runtime installs, and packaged-server checks. Extension-host tests cover completion, definition, rename, and diagnostic updates in actual VS Code and Cursor. CI checks Windows, macOS, Linux, and the Node.js 20 minimum.

This is static symbol analysis, not a full type checker. Computed properties and arbitrary function-return types are not fully inferred. Rename requires valid syntax/imports and stays within the bounded project index (100 source files and 200 scanned directories). The browser-only ui module remains unavailable in console runs. Account-backed projects and AI require the local server; GitHub Pages provides downloads and documentation.

See the [install guide](https://github.com/chittranshsharma/zuno-lang/blob/v0.5.0/INSTALL.md), [editor guide](https://github.com/chittranshsharma/zuno-lang/blob/v0.5.0/editor-extension/README.md), and [next-phase plan](https://github.com/chittranshsharma/zuno-lang/blob/main/NEXT-PHASE.md).
