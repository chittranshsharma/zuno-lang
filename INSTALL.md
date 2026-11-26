# Install Zuno 0.6.0

Zuno 0.6.0 needs Node.js 20 or newer. It works on Windows, macOS, and Linux; MongoDB is not required for the CLI or editor extension.

## Install the runtime

Download [zuno-runtime.tgz](https://github.com/chittranshsharma/zuno-lang/releases/latest/download/zuno-runtime.tgz) from the latest release. In the folder containing the download:

```sh
npm install --global ./zuno-runtime.tgz
zuno --version
zuno init my-first-app
cd my-first-app
zuno run
zuno check
zuno test
zuno format --check
```

You can also install the release directly:

```sh
npm install --global https://github.com/chittranshsharma/zuno-lang/releases/latest/download/zuno-runtime.tgz
```

Restart your terminal if `zuno` is not found. Your npm global bin directory must be on PATH. If global installation is unavailable, extract the archive and use `node package/cli.js run path/to/project`.

## Install editor tools

Download [zuno-tools.vsix](https://github.com/chittranshsharma/zuno-lang/releases/latest/download/zuno-tools.vsix) from the same release. In VS Code or Cursor, open Extensions, choose the `…` menu, then **Install from VSIX**. Or use:

```sh
code --install-extension ./zuno-tools.vsix --force
```

Replace `code` with `cursor` for Cursor. The extension bundles its runtime; install the CLI separately if you want a `zuno` terminal command. Open a `.zuno` file for highlighting and **Zuno: Run current file** / **Zuno: Check current file**. Open a project folder for **Zuno: Run project** / **Zuno: Check project**. Task errors appear in the Problems panel with clickable file positions. Set `zuno.nodePath` if Node.js is not on your editor's PATH.

The bundled language server starts automatically for .zuno files. Use Ctrl+Space for completion, F12 or Ctrl+click for definitions, and F2 for rename. Errors appear live without running your code. It supports unsaved buffers, imports across files, and known members; no API key or separate server install is required. Reload the editor after updating. See the [editor guide](editor-extension/README.md) for analysis limits.

Versioned archives are also available on the release page. Stable filenames above track the latest release. Download SHA256SUMS.txt from the same release to verify files before installing.

## Local projects

`zuno init my-first-app` creates:

```text
my-first-app/
  zuno.json
  src/
    main.zuno
    greeting.zuno
    greeting.test.zuno
  .vscode/
    tasks.json
  README.md
```

The `zuno.json` file selects the entry:

```json
{
  "name": "my-first-app",
  "entry": "src/main.zuno"
}
```

`zuno run` and `zuno check` discover the closest project file from your current folder. You can also pass a folder or a `.zuno` file explicitly. Without `zuno.json`, a folder uses `main.zuno`. File imports must occupy their own line. They are relative to the importing file, may use `../` within the project root, and execute once per run. Cycles, paths outside the root, and symlinks escaping the root are rejected. Check validates the entry and all imported files; it does not execute them or inspect unused files.

Errors show the original absolute file path, line, column, and source excerpt. Runs remain bounded to 100,000 steps, 100 files, and 100,000 combined source characters. The `ui` module needs the browser studio and is unavailable in terminal runs.

## Format and test a project

`zuno format` formats every `.zuno` file in the nearest project. Pass a file to format just that file. `zuno format --check` makes no edits and exits with code 1 when formatting is needed. Formatting preserves tokens, dialect, strings, comments and CRLF/LF line endings. Invalid syntax prevents writes; all selected files are validated before any are changed.

`zuno test` discovers `*.test.zuno` files in deterministic path order, including subfolders. Each test file gets fresh state and the usual execution limits. A failure or infinite loop does not stop the remaining tests. Imports use the project root and failures point to the original file/line. Exit code is 0 when every file passes, 1 on failures or no tests. A passing file means execution finished; write `assert` calls to verify behavior.

```zuno
import "./greeting.zuno" as greeting;
assert(greeting.greet("Zuno") == "Welcome, Zuno", "greets by name");
```

Folder discovery excludes dot folders, node_modules, dist, output, vendor, public, symlink directories and nested projects. It is limited to 100 matching files and 200 directories. Pass a nested project explicitly to test it separately. No filesystem or networking APIs are exposed to test programs.

In VS Code/Cursor, hover a symbol for its signature and declaration. Typing `(` or `,` opens signature help; Ctrl+Shift+Space requests it manually. Use Format Document for the shared formatter (one undo restores the source), and **Zuno: Test project** for project tests. Terminal tasks require Node.js 20+; the language server uses the editor's bundled runtime.

## Starter and examples

`zuno-starter.tgz` contains a ready-made project and examples. Extract it with an archive tool, open the `starter` folder, and run `zuno run`. Examples importing the `ui` module need the browser studio.

## Update or remove

Install a newer release archive with the same npm command to update. To remove the terminal command:

```sh
npm uninstall --global zuno-runtime
```

Uninstall Zuno Language Tools from your editor's Extensions view to remove the editor extension. Your project files are kept.

The public website is an introduction and download page. For the local browser studio, clone the repository, run `npm install`, then `npm start`. Account-backed projects need your own MongoDB; the CLI and editor extension do not.
