---
name: engineering-insights
description: Reads and records module-specific engineering lessons in INSIGHTS.md files — the nearest INSIGHTS.md to the files a task touches (normally at the module or workspace-package root), and the repository-root INSIGHTS.md for cross-module lessons. Use at the start of every task, right after the user's request, to load the INSIGHTS.md that covers the code the task is about; and at the end of every session to record anything significant and new — a user correction, a dead end, a dependency quirk, a recurring error and its fix, an undocumented convention or decision, a doc claim that proved false. Also use when the user says "wrap up", "capture learnings", "remember this", "add an insight", or "review insights".
---

# Engineering Insights

Two mandatory phases: **read** before work, **evaluate** at the end. Writing is
automatic (no confirmation) but happens only when something significant and new
was learned.

## Target file

INSIGHTS.md files live in the user's project, next to the code they describe. This
skill never assumes a layout; it resolves the file from the paths the task touches.

1. **Find the module.** The module is the workspace package that contains the
   touched files (from `package.json` `workspaces` or `pnpm-workspace.yaml`), or
   the top-level source directory when the repo has no workspaces. In a
   single-package repository the module root *is* the repository root.
2. **Walk up.** Start at the deepest directory that contains all touched files of
   that module and walk up to the repository root. The first `INSIGHTS.md` found
   **below** the repository root is the module's file.
3. **None found** → the module's file is `<module root>/INSIGHTS.md`. It does not
   exist yet; it is created on the first write (see "Creating the file").

| Work touches | Read | Write lessons to |
|---|---|---|
| one module | that module's file (if it exists) | that module's file |
| 2+ modules, or the repository as a whole | each module's file + root `INSIGHTS.md` | root `INSIGHTS.md` |
| a single-package repository | root `INSIGHTS.md` | root `INSIGHTS.md` |

A missing file is not an error: there is simply nothing to read yet.

## Phase 1 — start (before any work)

1. Map the request to target files (above). Cross-module task → read the root file too.
2. Read only those files — not every INSIGHTS.md in the repository.
3. Tell the user the 1–3 entries relevant to the task, or "no relevant insights"
   (also when no INSIGHTS.md exists yet).
4. Treat entries as high-confidence guidance.

## Phase 2 — end of session (always evaluate, write only if needed)

1. **Gate.** Scan the session for signals, strongest first:
   1. the user corrected you;
   2. the first approach failed and you had to switch;
   3. an error or failing build/test whose cause you found;
   4. a library or tool behaved unexpectedly;
   5. a documented claim proved false;
   6. an undocumented convention or decision (with its reason).

   No signal → write nothing; report `Nothing significant — INSIGHTS unchanged`.
2. **Filter.** Keep a candidate only if it will recur, cannot be inferred from the
   code, stays true as code changes, and is specific to this repository — and the
   fix is **verified**, not assumed. If it would be obvious to anyone reading the
   code, drop it. Also drop: generic best practice, transient failures (network),
   personal style, anything already in the project's agent instructions
   (`CLAUDE.md`, `AGENTS.md`) or its docs (`README.md`, testing guides).
3. **Read the whole target file** right before writing (it may have changed).
   - Same lesson already there → skip it.
   - Adds to an existing entry → append an `Update` line under that entry.
   - Lesson bit a second time → propose promoting it to the project's agent
     instructions (`CLAUDE.md` or `AGENTS.md`, whichever the project uses) — ask first.
4. **Write** (rules below). Unproven or unresolved → Open Questions, not a lesson.
   Add a Session Notes line only alongside a real entry.
5. **Report** one line per action:
   `Recorded → <module>/INSIGHTS.md › What Doesn't Work: <title>` ·
   `Created → <module>/INSIGHTS.md` · `Updated → … › <title>` ·
   `Skipped: <title> (already recorded)`.

Capture mid-session too, as soon as a fix is verified — steps 2–4 still apply.

## Creating the file

The first write to a target that does not exist creates it with the skeleton in
[examples.md](examples.md#new-file-skeleton) — a title line naming the module and
the seven empty section headings, nothing else. Creating a new file with `Write` is
the one allowed use of `Write`; then insert the entry exactly as for an existing
file (snapshot, `Edit` insertion, check). Report `Created → <path>`.

## Never overwrite

INSIGHTS.md is append-only. Existing lines are never deleted, shortened,
reworded, or moved.

- **Never** use `Write` on an existing INSIGHTS.md, `replace_all`, `sed -i`, or
  shell redirection into it.
- **Only** `Edit` insertions:
  - new entry → `old_string` = the section heading line, `new_string` = the same
    heading + blank line + entry;
  - update → `old_string` = the last line of the target entry, `new_string` = the
    same line + `- **Update YYYY-MM-DD:** …`.
- `Promoted` is never edited; record promotion as
  `- **Update YYYY-MM-DD:** promoted → CLAUDE.md` (or `AGENTS.md`).
- Guard every write (the path is the project's target file, e.g. `api/INSIGHTS.md`):

  ```bash
  snap=$("${CLAUDE_SKILL_DIR}/scripts/append-guard.sh" snapshot <target>/INSIGHTS.md)
  # ... Edit insertions ...
  "${CLAUDE_SKILL_DIR}/scripts/append-guard.sh" check "$snap" <target>/INSIGHTS.md
  ```

  Exit 1 → `cp "$snap" <file>`, redo the insertion, check again. A write is not
  done until `check` prints `OK`.

## Rules

- Pick the section by content (see `examples.md`); decisions with a reason go to
  **Codebase Patterns**. Don't dump everything into What Works.
- `Rule` is ALWAYS/NEVER + "because …", at most two sentences.
- Every entry is dated (`### YYYY-MM-DD — …`) and has an `Evidence` line with
  `path:line` **and** a symbol: `src/billing/invoice.ts:42` › `roundTotals`.
  Get the line with `grep -n` at write time, never from memory. The symbol keeps the
  entry findable after lines shift; a stale line is fixed with an `Update` line.
- Evidence that is a command, not code → still cite the file it is about
  (`src/routes/orders.ts:1` + the command and its output).
- Never write lessons into this skill's own files — they belong in the project.
- A file past ~200 entries → tell the user and suggest `review insights`.

## References

- New-file skeleton, entry template, section guide, good/bad examples → [examples.md](examples.md)
- "review insights" mode → [review.md](review.md)
