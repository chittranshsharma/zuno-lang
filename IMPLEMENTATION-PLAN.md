# Zuno developer workflow batch

## 1. Language tools — implemented in 0.6

- Hover local/imported symbols, parameters, constructors and standard functions.
- Signature help follows nested calls and unsaved source; unknown dynamic calls stay unresolved.
- One token-preserving formatter shared by the CLI and language server. Keep dialect, comments, strings and line endings; reject invalid syntax before writing.
- `zuno format [file|folder]`, with `--check` for CI.
- `zuno test [file|folder]`: deterministic discovery of `*.test.zuno`, isolated execution per file, bounded execution and source-mapped failures.
- Starter tests and editor commands, usage docs and installable packages.

Gate: unit and protocol tests, example equivalence and formatter idempotence, packaged installs, actual VS Code and Cursor extension-host checks.

## 2. Project-aware assistance — implemented in 0.6

- Explicitly select open files as AI context; show what is being sent.
- Request edits across the selected files and review every proposed file in a combined review dialog.
- Validate file names, duplicate edits and source limits; reject changes if a selected source changed during generation or review.
- Apply only after acceptance, and offer a guarded batch undo.
- Keep the existing single-file conversation and selection workflow.

Gate: mocked provider/API and edit transaction tests plus browser interaction checks. A real provider answer requires a user's valid Groq key; never describe mocks as a live-provider test.

## 3. Project execution — implemented in 0.6

- Bring the same bounded project check/test pipeline to the browser workspace, including file imports and navigable results.
- Feed an explicitly chosen failing test result into AI review, then rerun the test after acceptance.
- Browser verification covers a failing imported test, a mocked two-file proposal, review, acceptance, passing tests, guarded undo and stale-edit rejection. This is not a live Groq/provider acceptance test.
- A reviewed tool loop and hosting remain future work; see NEXT-PHASE.md.

Each shipped section must have regression tests and accurate docs. Unfinished ideas stay marked as planned. Preserve existing programs and current stable download links until a release is published.
