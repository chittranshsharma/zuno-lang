# Zuno

A programming language with its own interpreter, a browser studio, and a command-line runner.

Zuno has a playful dialect — vibe, lock, cook, yap, and yeet — alongside conventional keywords. It supports functions, closures, recursion, arrays, dictionaries, classes, named modules, and a small namespaced standard library.

## Run the studio

Install Node.js and MongoDB, then run:

~~~sh
npm install
npm start
~~~

Open http://localhost:3000. Configure MONGODB_URI for your database; the default is mongodb://127.0.0.1:27017/zuno. Use HTTPS and NODE_ENV=production when hosting. Hosting is managed separately.

## Try a program

~~~text
import math as m;
vibe profile = {"name": "Avi", "score": 81};
yap(profile.name);
yap(m.sqrt(profile.score));
~~~

See [the language reference](LANGUAGE.md), [web guide](docs.html), and examples/ for complete programs. Run node cli.js examples/counter.zuno or node cli.js --check examples/counter.zuno.

The CLI supports file imports such as import "./helper.zuno" as helper; on their own line. Browser programs use inline modules and built-in namespaces. There is no package registry, native compilation, inheritance, or async runtime yet.

## Studio

Monaco provides highlighting, completion, diagnostics, tabs, and edit history. Ctrl+Enter runs code; Ctrl+Shift+P opens commands; Ctrl+Alt+B opens AI. Panels resize with drag handles and keyboard controls. Files can be imported/exported as .zuno.

Accounts isolate saved files with salted password hashes and HttpOnly sessions. Saved files support optional autosave. Email verification and account recovery are not implemented. Existing database records are retained; unsaved drafts and editor tabs are local to the browser.

## AI assistant

Groq uses openai/gpt-oss-120b by default, with medium reasoning and hidden reasoning output. GROQ_MODEL can override the model. Create a key at https://console.groq.com/keys and paste it into the assistant panel. Keys stay in page memory and pass through the server for each request; Zuno does not store them.

Chat streams Markdown, supports follow-ups and selected-code context, and can be stopped. Suggested code is reviewed in a diff, accepted explicitly, and undoable. Newer edits block stale suggestions. The assistant receives the supported syntax and standard-library context; it cannot execute code or edit files independently. Live provider replies require a valid user key.

## Checks

npm run build checks CSS and builds the browser bundles. npm test covers interpreter behavior, limits, published examples, and the AI request layer. The bounded runtime limits source size, steps, output, call depth, collection growth, and parser nesting.

## Source and credits

The project is maintained in its existing Git repository. [UI credits](UI-CREDITS.md) list third-party components and licenses.

## Interactive apps and the dialect

Use bet/nah for branches, grind for while loops, each for iteration, and and/or/not for logic. Conditions can omit parentheses. Existing aliases and conventional keywords still work.

The sandboxed browser App preview supports a ui module with labels, inputs, buttons and named Zuno callbacks. Try Clicker app, Converter app, or Quiz app and press Run. Run again resets state; Hide unloads the app. This enables small interactive tools, not arbitrary full-stack applications. Network access, persistence, custom HTML/CSS and native APIs are not supported. The CLI does not expose ui.

## Tabs and workspace recovery

The tab-bar + creates a new file. Each tab has a close button and an unsaved-change dot. Dirty tabs offer Save, Don’t save, and Cancel before closing; use Reopen closed file or Ctrl+Shift+T to restore one of the last ten closed files from this session. Ctrl+Alt+N creates a file; command search includes New, Close, and Reopen.

Up to 40 open files and their contents restore from local browser storage after refresh. Guest and account workspaces have separate recovery records. Sign-out restores the guest workspace and removes account models from memory. Local recovery is browser-local, not cloud synchronization or encrypted storage; on shared computers, clear site data to remove local drafts. Browser storage failure is reported so you can save/export instead. Closing the last tab leaves an empty workspace with a New file button.

Examples and imports open as separate tabs. Saving a draft attaches that tab to its server record without duplicating it. Deleting a saved record leaves the open copy as a local draft. Cursor state and undo history survive tab switching; undo history is not persisted across refresh.

## Install Zuno locally

Node.js 20 or newer is required. From this repository run npm run install:cli. This installs a standalone runtime without Express, MongoDB, or the website dependencies.

~~~sh
zuno --version
zuno init my-zuno-app
cd my-zuno-app
zuno run main.zuno
zuno check main.zuno
~~~

zuno main.zuno is also supported. init refuses to overwrite an existing directory and creates a starter plus a VS Code/Cursor build task (Ctrl+Shift+B). The browser ui module is not available in console runs.

For editor integration, run npm run package:extension. Install dist/zuno-tools.vsix with code --install-extension dist/zuno-tools.vsix or cursor --install-extension dist/zuno-tools.vsix. Open a .zuno file and use Zuno: Run current file or Zuno: Check current file from the command palette. The extension bundles the interpreter, provides syntax highlighting and brackets, and uses Node.js from PATH. Set zuno.nodePath if necessary. These local editor tools are not a full language server.

The example selector is now inside the Examples button. The tab strip stays horizontal and scrolls when necessary. Save before close can write a local .zuno file or save to the signed-in account; failed/cancelled saves keep the tab open. Browser file-picker support varies; unsupported browsers download the file.
