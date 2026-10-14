# Run state

One file per run: `<stateDir>/<slug>/state.md` — by default
`.claude/.sdd/<slug>/state.md` (set `stateDir` in `.claude/sdd-engineering.json`
to move it). `<slug>` is the plan file name without `.md`. It is run state,
not a deliverable: add `<stateDir>/` to the project's `.gitignore`.
It exists so `/implement --resume <slug>` can continue after `/clear`, a
crash or a new day, and so you can drop agent reports from working memory
once their essentials are written down.

Create it at G1. Rewrite the header lines and append to the lists after
**every** agent report, barrier run and user decision — before starting the
next step.

```markdown
# /implement run — <slug>

Phase: implement | review | verify | finish | done
Step: <e.g. "Wave 1 dispatched: T1.1 T1.2 T1.3" · "review round 2 fixes running">
Plan: <path> (<status>) · Mode: multi-agent | single-agent
Spec: <path> (<status>)
Notes: <user notes passed to the implementers, or "none">
Updated: <YYYY-MM-DD HH:MM>

## Decisions
- G1 <date>: started
- <each escalation: what was asked, what the user chose>

## Tasks
| Task | Status | Rulings | Note |
|---|---|---|---|
| T0.1 | DONE | none | |
| FA1.1 | DONE | none | AR-2 |

## Loops
- review: round 2 of 3 — open: AR-4 (WARNING, extends debt)
- verify: round 0 of 2
- self-review: round 0 of 2 (or "skipped — no self-review skill")

## Accepted
- <finding / deviation / unverified row> — accepted by user <date>: <reason>

## Skipped
- <optional finish step> — skipped: <reason, e.g. "no doc agent in this project">

## Insight candidates
- <from report X: the candidate, with its evidence path:line>
```

On `--resume`: read the state file, the plan (with `## Amendments`) and
`git status --porcelain`; tell the user where the run stopped and what the
next step is; ask before continuing. A task recorded as dispatched with no
report was interrupted: check its `Owns` in `git status` and re-dispatch it
(the implementer reads the existing files first).
