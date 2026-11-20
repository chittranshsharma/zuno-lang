# Next phase: Zuno 0.6

This is the implementation plan after the 0.5.0 language-server release. These items are planned, not shipped.

## Goal

Make a small local project comfortable to write, understand, format, and test in VS Code or Cursor. Keep the existing syntax and programs working.

## Build in this order

### 1. Hover and signature help

Reuse the language server's scope and import index. Hover should show a symbol's kind, function parameters, declaration location, and standard-library usage. Typing a function call should show its signature and highlight the current argument.

Acceptance: local and imported functions, constructors, parameters, and standard-library calls show correct information in both editors. Nested calls select the correct active argument. Unsaved edits update the result. Unknown dynamic values remain explicitly unresolved rather than guessed.

### 2. A formatter with one set of rules

Add a shared formatter to the CLI and language server: zuno format plus Format Document in the editors. Preserve the chosen dialect, strings, comments, and expression meaning. Begin with a whole-file formatter; syntax errors should produce an explanation without changing the file.

Acceptance: formatting twice produces the same text. The original and formatted programs produce the same results across the example suite. CRLF files, Unicode, nested structures, and both keyword styles are covered. Users can undo an editor format in one step.

### 3. Project tests

Add zuno test to discover *.test.zuno files inside the project root and run each with isolated language state and the existing execution limits. Use the current assert helper, show pass/fail totals and original source locations, and return a failing exit code when a test fails. Document the discovery rules and exclude build/dependency folders.

Acceptance: a starter project includes a passing test. A failed assertion, syntax error, or infinite loop fails clearly without hanging the remaining suite. Paths with spaces work on Windows, macOS, and Linux. Tests never gain filesystem, network, or arbitrary JavaScript access.

## Ship gate

Before calling 0.6 complete, run a fresh install from its release packages and build a small multi-file text-analysis tool using the public docs. Verify hover, signatures, formatting, tests, and existing completion/definition/rename in actual VS Code and Cursor extension hosts. Keep the Windows/macOS/Linux CI matrix green, publish checksums, and verify the website's latest-release links.

## After 0.6: project-aware AI

Use the project and symbol index to let the assistant inspect explicitly selected project files, explain relationships, and propose edits across files. Show a combined diff before applying changes; reject stale edits and support undo. Let users run the bounded Zuno check/test commands and see their results. Keep arbitrary terminal execution outside this initial agent workflow.

Start with one complete flow: fix a failing project test, review the proposed diff, apply it, and rerun the test. Expand only after that works reliably with a real provider key.

Hosting and cross-device projects can follow separately when a deployment target is chosen. No hosting purchase or new cloud account is needed for 0.6.
