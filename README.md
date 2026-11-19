# Lingua 🚀

### A tiny programming language you can write, run, and save in your browser.

Lingua began as a simple question for our Web Programming project: **what if we built a programming language and its playground ourselves?** The result is a small language with a browser editor, instant output, examples, documentation, file import/export, and a folder-style explorer backed by MongoDB.

The aim is to make the full journey easy to follow: write a program, run it, understand an error, save it, and open it again later.

## Try a program

```text
let name = "World";
print("Hello, " + name);
print((2 + 3) ** 2);
```

Output:

```text
Hello, World
25
```

Lingua currently uses two statements: `let` stores a value and `print` displays one. Write one statement per line and finish it with `;`. It supports numbers, double-quoted strings, variables, `+`, `-`, `*`, `/`, `**`, `%`, and brackets. The [Docs](docs.html) page walks through the syntax with examples you can paste into the playground.

## What is inside?

| Part | What it does |
| --- | --- |
| Playground | Run Lingua code, try four examples, and see output or a line-specific error. |
| Explorer | Save, open, update, and delete programs; group them using folder paths such as `College/Maths`. |
| File tools | Export code to a `.lingua` file and import `.lingua` or `.txt` files later. |
| Editor details | Show line and character counts, the selected file, and unsaved code changes. |
| Feedback | Validate a form and save submissions to a local JSON file. |
| Docs and About | Explain the language and the project in beginner-friendly pages. |

The Playground, Docs, About, and Feedback pages are linked together. You can run code with the **Run** button or **Ctrl + Enter**.

## Run locally

You need Node.js, npm, and a running MongoDB server.

```bash
npm install
npm start
```

Open **http://localhost:3000**. The default database address is `mongodb://127.0.0.1:27017/lingua`. To use a different MongoDB server, set the `MONGODB_URI` environment variable before starting the app.

The runner works even when MongoDB is offline. Saving and loading programs needs MongoDB. Open the site through the Node server so the feedback and program APIs work.

## How it works

```text
Browser pages
  ├── playground.js → reads and runs Lingua code in the browser
  ├── programs.js   → shows saved files and calls the program API
  ├── files.js      → imports and exports local code files
  └── feedback.js   → validates and sends feedback
                         ↓
                    Express server
                     ├── MongoDB → saved programs
                     └── JSON file → feedback
```

The runner reads code line by line. It stores variables in a JavaScript object, calculates expressions, and puts printed values in the output panel. If a line cannot be understood, it shows the line number and a short error. It does not use `eval`.

Express provides `GET /api/programs`, `POST /api/programs`, `PUT /api/programs/:id`, and `DELETE /api/programs/:id` for program CRUD. Program records have a title, code, and folder. `POST /api/feedback` checks and saves form data in `data/feedback.json`; `GET /api/feedback` returns only the submission count, keeping names, emails, and messages out of the response.

## A quick demo flow

1. Pick **Simple Maths** in the example menu and press **Run**.
2. Change a number and run it again. Try an unknown variable to see a line-specific error.
3. Create a folder path in the Explorer, give the program a title, and save it.
4. Click the saved file, edit the code, and watch the unsaved indicator change. Update the file.
5. Export the code, clear the editor, and import the `.lingua` file.
6. Open the AI assistant with Ctrl+Alt+B to ask about the program.

## Current scope

Lingua is deliberately small. Conditions, loops, reassignment, booleans, and block scope are supported. Functions and arrays are implemented. See [LANGUAGE.md](LANGUAGE.md) for the language rules. Imports and exports have a 5,000-character code limit, matching saved programs. Saved programs belong to one shared database for the course demo; accounts now isolate saved programs.

Built as a Web Programming course project using **HTML, CSS, JavaScript, Node.js, Express, and MongoDB**.

## Development

The home page at `/` features the React Bits ShapeWaves animation with a `</>` cutout. Open the playground from its main button. `npm start` builds the React background with esbuild before starting Express; `npm run build` rebuilds it after visual changes. WebGPU browsers show the full interactive effect, with a simpler Canvas fallback for other browsers.

The Explorer now uses folder/file icons, nesting guides, folder-first sorting, collapse/expand controls, and animated folder opening. The code and output panels use matching terminal windows. Code highlights keywords, strings, and numbers; loading a file or example animates the tokens. Each run types the real result into the terminal, and repeated runs restart the animation. The extra example panel has been removed. Reduced-motion settings show content immediately. See [UI-CREDITS.md](UI-CREDITS.md) for component references.

The next workspace includes a dark responsive interface, recoverable local drafts, run timing, and a clear-output action. The engine now supports `fn` functions, `return`, lexical closures, recursion, and array literals with checked indexing. See [LANGUAGE.md](LANGUAGE.md) for exact syntax and current limits. Live collaboration and production hosting are still pending.

Run `npm test` for the engine tests. The next product version is being built on `codex/lingua-next`; live collaboration and production hosting are not implemented yet.

## Editor and optional AI
The playground uses Monaco with Lingua highlighting, completion snippets, line numbers, bracket matching, find, and undo. Ctrl+Enter runs the program. Ctrl+Alt+B opens the Groq code assistant. It explains code and suggests changes; it does not execute code or edit files.

Each visitor can add their own Groq key in the assistant sidebar. Get one at https://console.groq.com/keys, paste it into Your Groq key, and choose Use key. No .env setup is required. Keys stay in page memory, are cleared on refresh/disconnect, and pass through the server only to authorize the Groq request. Lingua does not persist keys. Host over HTTPS. GROQ_MODEL optionally overrides llama-3.3-70b-versatile on the server. Requests have size limits, a timeout and a per-IP rate limit.

The Feedback page and its API routes have been removed. Existing stored submissions are left untouched.

## Studio upgrade
The workspace now has per-file Monaco models and tabs, keyboard-operable panel size sliders, a terminal below the editor, syntax diagnostics, runtime-error navigation, symbol suggestions, and Ctrl+Shift+P commands. Ctrl+Alt+B opens streaming Markdown chat with history, stop, selected-code context, and suggested edits reviewed in a Monaco diff. Accepted edits support undo and reject stale file contents.

Private accounts use salted scrypt password hashes and expiring HttpOnly sessions. Program queries require the account owner. Existing shared records are retained without an owner and are not exposed to new accounts; they need an explicit owner migration if you want them imported. Saved files have optional autosave. Local drafts and unsaved tabs are browser-local, not cloud records.

Hosting is deferred at the owner's request. Deploy the Express server with HTTPS, NODE_ENV=production, and MONGODB_URI pointing at a hosted database. Use the same deployment from another device to access your account. Account recovery and email verification are not implemented yet.

New syntax: vibe/let, lock/const, cook/func/fn, yap/say/print, yeet/return, fr/true, cap/false, and for item in iterable blocks. Helpers include len, range, upper, lower, abs, round, and join. Existing grammar remains supported except that the new keywords are now reserved. This is still a bounded small-language runtime, not a general-purpose platform with modules or a package ecosystem.

## Language utilities and CLI
The expanded helper library covers arrays, numeric summaries, text processing, conversions, and assertions. Run node cli.js examples/scoreboard.lingua or node cli.js --check examples/word-counter.lingua. All executable examples in the language guide are tested. See LANGUAGE.md for the complete supported syntax and limits.

The home page, studio, documentation, About page, and AI panel share a purple theme. The shared stylesheet was repaired and is checked during the build.
