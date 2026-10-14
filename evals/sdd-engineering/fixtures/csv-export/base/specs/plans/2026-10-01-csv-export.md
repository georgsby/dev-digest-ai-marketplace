# Implementation Plan: SPEC-2026-10-01-csv-export — Export tasks as CSV

Spec: `specs/2026-10-01-csv-export.md` · Mode: single-agent · Status: approved · Planned: 2026-10-01
Decisions confirmed by the user: 2026-10-01 — mode: single-agent; no open questions in the spec.

## Goal
A caller can turn the list returned by `listTasks()` into one CSV text that
spreadsheet tools open without an import wizard (G-1).

## Non-goals
- No column picker; the column set is fixed (NG-1, D-1).
- No file writing or download (NG-2).

## Requirements review
| ID | Requirement (short) | Status | Resolution |
|---|---|---|---|
| AC-1 | header id,title,status,due + one row per task, input order | OK | — |
| AC-2 | every field quoted, inner quotes doubled (RFC 4180) | OK | — |
| AC-3 | field starting with `=`, `+`, `-`, `@` gets a `'` prefix | OK | — |
| AC-4 | empty list → header row only | OK | — |
| AC-5 | missing due date → empty quoted field | OK | — |
| EC-1 | no tasks | OK | covered by AC-4 |
| EC-2 | comma, quote, line break in a title | OK | covered by AC-2 |
| EC-3 | title starts with `=` | OK | covered by AC-3 |
| NFR-1 | CRLF between rows, no trailing line break | OK | — |
| UI-1 | formula injection through titles | OK | handled by AC-3 |
| D-1 | fixed column set, no picker | OK | — |

## Recommendations
- None — the spec is small and fully decided.

## Context found
- INSIGHTS: none in this project.
- Existing pieces: `tasks/store.mjs` — the `Task` shape `{ id, title, status, due }` is reused as is.

## Affected modules
| Module | Area | Layer | Change |
|---|---|---|---|
| `tasks` | `tasks/csv.mjs` | library (no I/O) | new |

## Gates
| Module | Gate | Command | Source |
|---|---|---|---|
| tasks | test | `npm test` | config `gates` |

## Contracts (frozen first)
```js
// tasks/csv.mjs
/** @param {Array<{ id: string, title: string, status: string, due: string | null }>} tasks */
export function toCsv(tasks) /* : string */;
```

## Sequence
### S1 CSV exporter
- **Slice:** tasks
- **Owns:** `tasks/csv.mjs` (create), `tasks/csv.test.mjs` (create)
- **Must not touch:** `tasks/store.mjs`, `tasks/store.test.mjs`, `package.json`, `specs/**`
- **Consumes:** `Task` objects from `listTasks()` in `tasks/store.mjs`
- **Produces:** `toCsv(tasks): string` exported from `tasks/csv.mjs`
- **Covers:** AC-1, AC-2, AC-3, AC-4, AC-5, EC-1, EC-2, EC-3, NFR-1, UI-1, D-1
- **Skills (all mandatory):** `engineering-paved-path:security` — key rules: output encoding of untrusted text
- **Steps:**
  1. Write failing tests in `tasks/csv.test.mjs`, one named test per AC-n and NFR-1, plus EC-2 and EC-3; run `node --test tasks/csv.test.mjs` → red.
  2. Implement `toCsv` in `tasks/csv.mjs`: quote and escape each field, apply the formula prefix, join fields with `,` and rows with `\r\n`.
  3. Run `node --test tasks/csv.test.mjs` → green, then `npm test` → green.
- **Acceptance:**
  - `toCsv([])` returns `"id","title","status","due"`.
  - Every AC-n and NFR-1 has its own named test in `tasks/csv.test.mjs`.
  - `toCsv` takes exactly one parameter; there is no column option.
- **Verify:** `node --test tasks/csv.test.mjs`, `npm test`

## Review focus
1. The formula prefix (AC-3) is applied to every field, not only to titles.
2. Quote doubling (AC-2) happens on the final field text, after the prefix.
3. No trailing CRLF after the last row (NFR-1).

## Risks
- A leading `-` also marks negative numbers; acceptable, the column set has no numeric column.

## Open questions
- None.

## Assumptions
- The header row is quoted like every other row (AC-2 says every field).
