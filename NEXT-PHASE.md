# Development batches after 0.7

## Shipped in this run

0.6 adds hover and signature help, a shared formatter, isolated project tests, browser run/check/test, and reviewed multi-file AI changes. 0.7 adds loop control, collection callbacks, stepped ranges and a tested inventory-report project. The AI review flow has deterministic mocked-provider coverage; live provider generation is still unverified.

## 0.8 — move real projects between tools

- Add portable project archive import/export in the studio, retaining paths and source. Preview conflicts before import; preserve unsaved tabs and reject traversal, duplicate paths and oversized archives.
- Add `zuno test --json` and `zuno check --json`, with stable source positions, test totals, execution timings and documented exit codes. Keep normal terminal output readable.
- Add editor document outline and workspace symbol search for functions, classes, methods and modules using the existing index.
- Gate: browser export → fresh CLI install → test → reimport; malformed archives leave the workspace unchanged. Test the editor providers in VS Code and Cursor.

## 0.9 — language ergonomics and a useful standard library

- Design optional function parameters without changing existing positional-call semantics.
- Add consistent text search/prefix/suffix helpers and collection copying/concatenation with documented limits.
- Add structured parse/runtime error codes while preserving original import locations.
- Build a text report, inventory tool and small data-transformation project from the public guide.
- Gate: interpreter, CLI, formatter, language server and browser examples agree. Every helper documents types, empty input, mutation behavior and limits.

## 0.10 — reviewed project agent

- Inspect only explicitly selected files and bounded check/test results.
- Let the model propose an edit, open the existing combined diff, and run the selected tests after the user accepts.
- Add a visible run history, cancellation, maximum tool-call budget and stale-source guards throughout the loop.
- First live acceptance case: fix a failing imported test, review, apply, rerun, then undo. Test provider disconnects, truncated output and repeated failures.
- A real Groq key is needed for the live-provider gate. Never substitute a mocked answer and call it autonomous. Arbitrary shell execution remains outside this workflow.

## 0.11 — hosted projects, once hosting is chosen

- Decide deployment and database targets with the owner.
- Add account recovery, per-project access checks, synchronization conflict handling and exportable backups.
- Add collaboration only after private project isolation and reconnect behavior pass end-to-end tests.
- Gate: two separate accounts and two devices; offline/reconnect, conflicting edits, failed saves, and access revocation must be covered.

## How to run the next batch

Implement one numbered batch completely, update its docs, run the automated suite and targeted browser/editor checks, package a fresh install, push, and wait for the Windows/macOS/Linux CI matrix. Publish a release only from a tested commit. Continue to the next batch when its prerequisites exist; report the specific missing external dependency when they do not.

Keep the language guide and examples executable. Do not invent cloud availability, provider verification or runtime capabilities. Hosting purchases, credentials and external account setup are separate prerequisites.
