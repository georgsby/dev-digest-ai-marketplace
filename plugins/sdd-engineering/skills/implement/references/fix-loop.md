# Fix loops

Every correction after the planned waves is a **fix task**: a normal plan
task, appended to the plan, executed by `implementer`. Writing fixes into the
plan keeps two things true: `plan-verifier` unions every task's `Owns` — a
file a fix created is not reported as an out-of-plan change — and the reason
the code differs from the original plan stays next to the plan.

## Fix task IDs

| Prefix | Raised by |
|---|---|
| `FB<wave>.<k>` | a red barrier gate after a wave |
| `FA<round>.<k>` | an architecture-reviewer finding |
| `FV<round>.<k>` | a plan-verifier gap |
| `FP<round>.<k>` | a blocking self-review finding (optional finish step) |

## The `## Amendments` section

Append it once at the end of the plan file, then one block per fix task, in
the plan's own task shape (the paths are an example):

```markdown
## Amendments

### FA1.1 Move order lookup query out of the service
- **Origin:** architecture-reviewer round 1 › AR-2 (CRITICAL) — `api/src/orders/service.ts:41`
- **Fixes task:** T1.1
- **Slice:** backend
- **Owns:** `api/src/orders/service.ts` (modify), `api/src/orders/repository.ts` (modify)
- **Must not touch:** every file owned by another fix task of this round; spec files
- **Covers:** <the same requirement IDs as the fixed task>
- **Skills (all mandatory):** <the routed subset for these owns — the implementer's table>
- **Finding (verbatim):**
  > <the AR-n block / failing gate output / verifier row, as reported>
- **Steps:**
  1. <reproduce: the failing gate/test command, or the rule the finding cites>
  2. <the change, following the reviewer's "Fix direction">
  3. <re-run the command → green>
- **Acceptance:** the finding no longer reproduces; the fixed task's own Acceptance still holds.
- **Verify:** <the slice gates + the specific command that showed the problem>
```

A fix is a change of plan, not a deviation from it: the implementer follows
the fix task as written; `Ruling:` lines are only for where it departs from
the fix task itself.

## Mapping a finding to a task

1. Find the task whose `Owns` contains the finding's path (original tasks
   and earlier Amendments). That is **Fixes task**; copy its Slice, Covers
   and Skills.
2. The fix needs a file no task owns (e.g. the repository the reviewer says
   the query belongs in) → add it to the fix task's `Owns` with `(create)` or
   `(modify)`.
3. The fix needs a change to a frozen Wave 0 contract, a migration, or a
   different slice → do not patch around it: escalate with "stop and re-plan"
   recommended.
4. Group findings with overlapping files into **one** fix task. Fix tasks
   with disjoint `Owns` run in parallel (one message, several `Agent`
   calls); overlapping ones run one after another.
5. No path to anchor (a finding about something missing) → owner = the task
   whose Covers includes the requirement; if none, ask the user.

## Architecture loop

```text
round 1: architecture-reviewer, scope working-tree
  │
  ├─ PASS ──────────────────────────────────────────► verification
  ├─ PASS_WITH_WARNINGS ─ user: fix which? ─┐
  ├─ FAIL (≥1 CRITICAL) ────────────────────┤
  │                                         ▼
  │                    FA<round>.* tasks → Amendments
  │                    implementers (parallel where disjoint)
  │                    barrier gates (red → FB before review)
  │                                         │
  └──── round n+1: scope = path list ◄──────┘
         (files changed by this round's fixes + files of the previous
          findings) + the previous findings to confirm resolved
```

Triage rules:

- **CRITICAL** — always fixed; accepting one needs an explicit user decision
  in an escalation.
- **WARNING** — ask once per round, `multiSelect`, one option per warning,
  plus "fix all (Recommended)". A warning that *extends known debt* is
  recommended for fixing ("touching debt means fixing it, not extending it").
- **SUGGESTION** — not fixed unless the user picks it.
- **Needs manual review** — read the cited lines yourself against the rule it
  names. Clear violation → a fix task; clearly fine → drop; still unsure →
  one question to the user. Say which way each went.
- A finding on pre-existing debt is out of scope — never a fix task.

| Situation | Action |
|---|---|
| `PASS`, or `PASS_WITH_WARNINGS` with all remaining warnings accepted | done → verification |
| a finding reported `STILL PRESENT`, or back at the same rule+file after its fix (**oscillation**) | escalate now, no further round |
| round 3 ends with a CRITICAL or an unaccepted WARNING | escalate |
| the fix direction contradicts the plan's contracts or another task's Acceptance | escalate, "stop and re-plan" recommended |

Escalation options: **one more round** / **accept as recorded debt** (the
finding and the user's reason go to the state file under `Accepted:`;
a self-review step, if the project has one, will still gate a CRITICAL) / **stop and re-plan this part**
with `implementation-planner` / **stop the run**.

## Verification-gap loop

Each row of plan-verifier's `Gaps to fix` becomes one `FV` implementer task:

| Gap | Fix task |
|---|---|
| `MISSING` / `PARTIAL` behaviour | implement it; Covers = that ID |
| `MISSING` / `PARTIAL` test, or a test in another lane than `Verify:` | write the test in the named lane; expected values quoted from the spec (`// spec: <path> › AC-n`), never computed by the code under test |
| `DEVIATED` out-of-plan file (`OOP-n`) | ask: it belongs (add it to an Amendment, no code change) / revert it (the fix task owns the file) |
| `DEVIATED (ruled: …)` | show the ruling; the user accepts it or it becomes a fix |

After the fixes: barrier gates. If a fix changed production source files
(not only tests), run **one** architecture round scoped to those files; a CRITICAL there goes back into the architecture loop. Then
re-verify with a full run. Cap 2 rounds, then escalate with the remaining
rows.

## Self-review loop (optional)

Only when the project provides a pre-PR review skill (e.g. `pr-self-review`).
A blocking verdict (`request_changes` or its equivalent) → one `FP` task per
blocking finding in that skill's report. Re-run its whole procedure (a
verdict tied to the diff goes stale with every edit). Cap 2; never use the
skill's override or bypass unless the user explicitly names the finding to
bypass.
