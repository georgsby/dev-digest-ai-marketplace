# Engineering Insights — review mode

Triggered by "review insights" (optionally naming a module or a path). Read-only until the
user approves.

1. **Read** the whole target INSIGHTS.md. If no module was named, read every
   `INSIGHTS.md` in the repository (find them with `git ls-files '*INSIGHTS.md'`).
2. **Stats:** entries per section, total, oldest and newest date.
3. **Find:**
   - duplicates — same lesson in different words, or one entry containing another;
   - contradictions — entries giving opposite instructions;
   - vague entries — no concrete file, command, or value;
   - stale entries — the bug is fixed or the referenced path/symbol no longer exists
     (check with `ls` / grep);
   - misplaced entries — wrong section, or wrong file (a module-specific lesson in
     the root file, or a cross-module lesson in a module file).
4. **Propose** each change as `current text → proposed text` (or `→ remove`).
5. **Apply nothing without explicit approval.** Review is the only mode where
   existing lines may change, and only the ones the user approved. Skip the append
   guard here; show the resulting `diff` instead.
