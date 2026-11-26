# Next batch: useful language building blocks

The 0.6 developer workflow is implemented: hover/signature help, shared formatting, isolated project tests, browser project commands and reviewed multi-file AI edits. See INSTALL.md for commands and IMPLEMENTATION-PLAN.md for the batch scope.

## Build next

1. Loop control: `break` exits the closest loop; `continue` skips an iteration. Reject either outside a loop, including functions declared inside loops.
2. Collection transforms: `map`, `filter`, `reduce`, `find`, `some` and `every` accept Zuno callbacks. Callbacks use the same interpreter budget and source positions. Define mutation and empty-array behavior explicitly.
3. Stepped ranges: descending and custom steps, while preserving existing `range(end)` and `range(start, end)` calls.
4. Update completion, hover/signatures, syntax highlighting, the AI language reference, docs and executable examples together.

Gate: regression tests for nested loops/functions, empty arrays, callback errors, mutation, execution budgets, file modules, formatting and editor services. Package and install from scratch, then verify VS Code/Cursor again.

## Following batch

- Structured test reports suitable for CI; machine-readable check/test output and test timings.
- Editor outline and workspace symbol search using the existing index.
- Project archive import/export so a multi-file browser workspace moves to the local CLI intact.
- A bounded assistant tool loop that proposes a fix, requests review, and reruns selected tests. A live-provider acceptance run is still required before calling this an autonomous agent.

## Later, with a deployment target

Choose hosting, then account recovery, private project synchronization, audit history and collaboration. No cloud account or purchase is required for local tooling. Native compilation, networking and a package registry need separate language/runtime designs; they are not promised by these batches.
