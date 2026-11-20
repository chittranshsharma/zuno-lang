# Zuno 0.4.0 — First public preview

Zuno's first downloadable release brings the language to your terminal, VS Code, and Cursor. Node.js 20 or newer is required. These packages are portable across Windows, macOS, and Linux; they are not native executables.

## Downloads

- `zuno-runtime-0.4.0.tgz`: standalone interpreter and CLI, with no website/database dependencies.
- `zuno-tools-0.4.0.vsix`: editor highlighting, current-file and project Run/Check commands, bundled runtime, and clickable errors.
- `zuno-starter-0.4.0.tgz`: starter project and language examples.
- `INSTALL.md`: installation, project layout, updates, and removal.
- `SHA256SUMS.txt`: hashes of the assets above.

## Quick start

```sh
npm install --global ./zuno-runtime-0.4.0.tgz
zuno init my-first-app
cd my-first-app
zuno run
zuno check
```

The generated `zuno.json` selects the project entry. Run/check discover it from child folders too. Local file imports load once, stay inside the project, and report syntax/runtime errors against original file positions. The language includes functions, closures, arrays, dictionaries, classes, modules, and built-in libraries.

For VS Code/Cursor, use Extensions → … → Install from VSIX. Install Node.js and open a `.zuno` file or project folder. The extension can run without installing the global CLI.

## Current boundaries

This is an early release. The interpreter bounds source size, evaluation steps, output, file count, and recursion. `zuno check` validates syntax in the entry and imports; it does not perform full static type checking. The local extension is not a language server. The browser-only `ui` module does not run in the CLI. Zuno has no package registry, networking API, or async runtime. Account-backed projects and AI need the local server; the public Pages site provides downloads and documentation.

See [the install guide](https://github.com/chittranshsharma/zuno-lang/blob/main/INSTALL.md) and [language reference](https://github.com/chittranshsharma/zuno-lang/blob/main/LANGUAGE.md). Report bugs with the command, version, and a small `.zuno` example.
