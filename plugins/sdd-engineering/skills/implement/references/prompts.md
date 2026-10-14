# Dispatch prompts

Every agent starts cold and sees only its prompt, the project's `CLAUDE.md`
files and its preloaded skills. Give it paths, not pasted file contents — it
reads the files itself. `<plansDir>` is the resolved plans folder (default
`specs/plans`).

## implementer (`sdd-engineering:implementer`)

```markdown
Plan: <plansDir>/<file>.md — execute task <task id> only (read your task
block plus the Contracts block it Consumes; do not read other tasks).
Mode: <multi-agent: other implementers are editing other files right now | single-agent: you are alone in the tree>
User notes: <clarifications from the /implement arguments or later answers, or "none">
During the red→green loop run only your own test file (the project's test
runner on that one file, e.g. `npx vitest run <file>`); run the full slice
gates from your task's Verify: line once, at the end, and report only their
summary and failures.
```

Fix task: the same prompt with the fix task id (`FA1.1`, `FV1.2` …) — its
block is in the plan's `## Amendments`.

`NEEDS_CONTEXT` answer: `SendMessage` to the same implementer with
`## Answer`, the decision, and (if `Owns` grew) the amended task block.

## architecture-reviewer (`architecture-review:architecture-reviewer`)

Round 1:

```markdown
Scope: working-tree. Plan: <plansDir>/<file>.md.
Nothing else is editing the tree during your review.
```

Round ≥ 2 (and the scoped round after verification fixes):

```markdown
Scope: path list —
- <path>
Plan: <plansDir>/<file>.md.
Previous findings (round <n-1>) — confirm each one: RESOLVED | STILL PRESENT | MOVED (<new path:line>):
- AR-<n>: <rule> — <path:line>
Report new findings only inside the path list.
```

## plan-verifier (`sdd-engineering:plan-verifier`)

```markdown
Plan: <plansDir>/<file>.md (includes ## Amendments — fix tasks count as plan tasks).
Implementer rulings (claims, not evidence):
- <task id>: Ruling: …   (or "none")
Accepted by the user (report them, still not MET): <from state › Accepted, or "none">
Environment: <service the integration lane needs, e.g. Docker/Postgres>: <available | not available> · e2e: <app running at <url> | not running — mark e2e rows UNVERIFIED, do not run them | no e2e rows>
Orchestrator edits (not out-of-plan): the plan's `Status:` line and `## Amendments`.
```

When e2e rows will run, add: "e2e: judge only the flows this plan owns; run
the suite once, in the foreground, and do not poll its output."

## doc agent (optional — only if the project has one, e.g. `doc-writer`)

```markdown
Topic: <feature name> · Sources: spec <path>, plan <plansDir>/<file>.md,
plan-verifier verdict COMPLETE (<date>).
Owns: <target doc files, if the user named them; otherwise "choose by the project's docs layout">
```
