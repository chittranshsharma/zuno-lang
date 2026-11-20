# Install Zuno 0.5.0

Zuno 0.5.0 needs Node.js 20 or newer. It works on Windows, macOS, and Linux; MongoDB is not required for the CLI or editor extension.

## Install the runtime

Download [zuno-runtime.tgz](https://github.com/chittranshsharma/zuno-lang/releases/latest/download/zuno-runtime.tgz) from the latest release. In the folder containing the download:

```sh
npm install --global ./zuno-runtime.tgz
zuno --version
zuno init my-first-app
cd my-first-app
zuno run
zuno check
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

## Starter and examples

`zuno-starter.tgz` contains a ready-made project and examples. Extract it with an archive tool, open the `starter` folder, and run `zuno run`. Examples importing the `ui` module need the browser studio.

## Update or remove

Install a newer release archive with the same npm command to update. To remove the terminal command:

```sh
npm uninstall --global zuno-runtime
```

Uninstall Zuno Language Tools from your editor's Extensions view to remove the editor extension. Your project files are kept.

The public website is an introduction and download page. For the local browser studio, clone the repository, run `npm install`, then `npm start`. Account-backed projects need your own MongoDB; the CLI and editor extension do not.
