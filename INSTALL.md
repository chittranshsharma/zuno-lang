# Install Zuno 0.4.0

Zuno's first public release needs Node.js 20 or newer. It works on Windows, macOS, and Linux; MongoDB is not required for the CLI or editor extension.

## Language server: 0.5 source build

The current source contains the 0.5.0 language server; the published 0.4.0 archives below remain the earlier release. To get completion, F12 definition, F2 rename, and live diagnostics in VS Code/Cursor:

```sh
git clone https://github.com/chittranshsharma/zuno-lang.git
cd zuno-lang
npm install
npm run package:extension
code --install-extension dist/zuno-tools.vsix --force
```

Use `cursor` instead of `code` for Cursor. Reload the editor and open a .zuno file. The language server starts automatically and needs no API key, database, or separate installation. Run/Check still use Node.js 20+ on PATH. Read the [editor guide](editor-extension/README.md) for supported symbols and analysis limits.

## Install the runtime

Download `zuno-runtime-0.4.0.tgz` from [the release](https://github.com/chittranshsharma/zuno-lang/releases/tag/v0.4.0). In the folder containing the download:

```sh
npm install --global ./zuno-runtime-0.4.0.tgz
zuno --version
zuno init my-first-app
cd my-first-app
zuno run
zuno check
```

You can also install the release directly:

```sh
npm install --global https://github.com/chittranshsharma/zuno-lang/releases/download/v0.4.0/zuno-runtime-0.4.0.tgz
```

Restart your terminal if `zuno` is not found. Your npm global bin directory must be on PATH. If global installation is unavailable, extract the archive and use `node package/cli.js run path/to/project`.

## Install editor tools

Download `zuno-tools-0.4.0.vsix` from the same release. In VS Code or Cursor, open Extensions, choose the `…` menu, then **Install from VSIX**. Or use:

```sh
code --install-extension ./zuno-tools-0.4.0.vsix
```

Replace `code` with `cursor` for Cursor. The extension bundles its runtime; install the CLI separately if you want a `zuno` terminal command. Open a `.zuno` file for highlighting and **Zuno: Run current file** / **Zuno: Check current file**. Open a project folder for **Zuno: Run project** / **Zuno: Check project**. Task errors appear in the Problems panel with clickable file positions. Set `zuno.nodePath` if Node.js is not on your editor's PATH.

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

`zuno-starter-0.4.0.tgz` contains a ready-made project and examples. Extract it with an archive tool, open the `starter` folder, and run `zuno run`. Examples importing the `ui` module need the browser studio.

## Update or remove

Install a newer release archive with the same npm command to update. To remove the terminal command:

```sh
npm uninstall --global zuno-runtime
```

Uninstall Zuno Language Tools from your editor's Extensions view to remove the editor extension. Your project files are kept.

The public website is an introduction and download page. For the local browser studio, clone the repository, run `npm install`, then `npm start`. Account-backed projects need your own MongoDB; the CLI and editor extension do not.
