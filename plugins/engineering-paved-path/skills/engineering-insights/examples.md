# Engineering Insights — formats and examples

## Contents

- New-file skeleton
- Entry template
- Section guide (what goes where)
- Update line
- Bad → good

All examples below are illustrative. They describe an imaginary project, not yours.

## New-file skeleton

Used only when the target INSIGHTS.md does not exist yet. Replace `<module>` with
the module's directory name (or the repository name for the root file):

```markdown
# <module> — engineering insights

Append-only. Newest entries first in each section. Managed with the
engineering-insights skill.

## What Works

## What Doesn't Work

## Codebase Patterns

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
```

## Entry template

Insert directly under the section heading (newest first):

```markdown
### YYYY-MM-DD — <one-line title>
- **Symptom:** what went wrong, or what the agent got wrong
- **Cause:** the actual reason
- **Rule:** ALWAYS/NEVER …, because …
- **Evidence:** `path/to/file.ts:LINE` › `symbolName` (+ the command and its output, if any)
- **Promoted:** no
```

Both the date in the heading and `path:LINE` in Evidence are mandatory.

Session Notes and Open Questions are one-liners:

```markdown
- YYYY-MM-DD — <what the session achieved and what it taught, one line>
- [ ] YYYY-MM-DD — <unresolved question> (<where it came up>)
```

## Section guide

| Section | Goes here | Example |
|---|---|---|
| What Works | An approach that proved effective and is not obvious | Running only the unit lane (`vitest run --exclude '**/*.it.test.ts'`) gives a Docker-free loop while editing services |
| What Doesn't Work | Dead ends and antipatterns — **the most valuable section** | Mocking `fetch` per test file: the global setup in `test/setup.ts` replaces it again, so the per-file mock is silently ignored |
| Codebase Patterns | Conventions and **decisions with their reason** | Money is stored as integer cents (`amount_cents`), because the payment provider rejects fractional amounts |
| Tool & Library Notes | Dependency and tooling quirks | The `docs/` workspace uses npm, not the root package manager (it ships its own `package-lock.json`) — run `npm test` there |
| Recurring Errors & Fixes | An error seen more than once + the fix | "relation does not exist" after a schema change → run the migration command; migrations never run on boot |
| Session Notes | Dated one-line summary, only next to a real entry | `- 2026-09-16 — added Order.refundedAt; the generated API client must be regenerated` |
| Open Questions | Unverified or unresolved things | `- [ ] 2026-09-16 — is the CI cache keyed on the lockfile hash? (root INSIGHTS)` |

## Update line

Appended as the new last line of an existing entry — never edit the entry itself:

```markdown
- **Update 2026-10-02:** also applies to `RefundService`; the admin client still lacks it.
- **Update 2026-10-09:** promoted → CLAUDE.md
```

## Bad → good

| Bad | Why it fails | Good |
|---|---|---|
| "Promises can be tricky" | Noise, no action | "`Promise.all()` on the ingest pipeline times out after 30 items — use `Promise.allSettled()` in batches of 10" |
| "Be careful with async" | No subject, no action | "Checkout state ALWAYS goes through Zustand (`cartStore.ts`), because three components share the cart" |
| "Tests are important" | Generic truism | "NEVER put a Postgres-dependent test in a plain `*.test.ts`, because the unit lane runs without Docker and fails" |
| "Fixed a bug on line 47 of parser.ts" | A bare line number with no symbol goes stale; and a fix is not a lesson | "`parseHunk` miscounts `\ No newline` markers — skip them before counting lines" · Evidence: `parser.ts:47` › `parseHunk` |
| "Changed variable name from x to y" | A code change, not an insight | *(don't record)* |
| "Be careful with the shared types" | Says nothing about what to do | "ALWAYS regenerate the API client (`npm run gen:api`) after changing a route schema, because the frontend compiles against the generated copy" |
