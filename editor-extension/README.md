# Zuno Language Tools

Version 0.5.0 includes the Zuno Language Server. Download [zuno-tools.vsix](https://github.com/chittranshsharma/zuno-lang/releases/latest/download/zuno-tools.vsix), then use Extensions → … → Install from VSIX in VS Code or Cursor. To update from the terminal, use code --install-extension ./zuno-tools.vsix --force (or cursor instead of code), then reload the editor. Building from source is optional: npm install and npm run package:extension create dist/zuno-tools.vsix.

## Language features

- Ctrl+Space: variables, parameters, functions, keywords/snippets, imported exports, standard-library members, and known class members.
- F12 or Ctrl+click: go to a declaration or imported file.
- F2: rename a symbol and its resolved references across the project, including unsaved files. Shadowed variables, comments, and unrelated string contents are kept separate. Collisions and captures are rejected.
- Live diagnostics: syntax errors, unknown variables/modules/members, duplicate declarations, constant assignments, returns outside functions, and invalid file imports. The server never runs your program to find errors.

The extension starts its bundled server automatically for .zuno files. It uses the editor's Node runtime; there is no separate server or database setup. Open the project folder containing zuno.json for the best experience. File imports use the same project boundary as the CLI. Unsaved buffers take precedence over disk contents; file watches refresh other files.

Open a .zuno file for Zuno: Run current file or Zuno: Check current file. Open a project folder for Zuno: Run project or Zuno: Check project. Project commands use the entry field in zuno.json. Errors appear in the Problems panel at the original file and line. The extension bundles the runtime, so installing the global zuno command is optional.

Node.js 20+ on PATH is required for terminal Run/Check commands; set zuno.nodePath if Node is installed elsewhere. Includes syntax highlighting, bracket matching and line comments. This is a local extension, not a published Marketplace listing. Browser UI apps still run in the Zuno playground; the local CLI runs console programs and file modules.

## Analysis limits

This is static scope and symbol analysis, not a complete type checker. Dynamic dictionary keys, computed property names, and arbitrary function-return types cannot always be resolved. Definitions and rename cover statically resolved symbols. A project indexes at most 100 .zuno files and 200 directories; each source is limited to 100,000 characters. Nested projects and dependency/build folders are excluded from the project scan. Fix syntax/import errors before renaming so the server can produce a complete edit. Completion can recover declarations while a statement is incomplete.
