# Interface references

The current file explorer and terminal adapt the behavior of the Magic UI File Tree and Terminal documentation supplied by the user, authored by dillionverma. These are native JavaScript implementations for Lingua's existing HTML interface, rather than installations of the React/Radix components.

The file explorer has folder and file icons, folder-first sorting, persistent expansion during refresh and selection, nesting indicators, selection styling, collapse/expand controls, and animated folder contents.

Both editor and runtime output use a terminal window shell. The editor has a syntax-highlighted overlay and staggered token entrance when a file or example loads. Manual typing stays immediate. Output types on each run, including repeated runs with identical results, and restarts safely if another result arrives before typing finishes. Reduced motion displays complete content immediately. A separate live region exposes the full result to assistive technology.

Earlier iterations used React Bits Branched Menu and Code Morph as interaction references. The additional example panel and earlier token-morph output have been replaced by the current interface.
