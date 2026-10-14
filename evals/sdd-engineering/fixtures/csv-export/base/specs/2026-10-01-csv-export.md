# Spec: Export tasks as CSV

Spec ID: SPEC-2026-10-01-csv-export
Status: approved
Supersedes: —
Modules: tasks
Design sources: None — a library function, no UI.

## Problem and user

A team lead keeps a project's tasks in the tracker but reports progress in a
spreadsheet every week. Today they copy rows by hand, which takes about 20
minutes and loses rows. They need the tasks as CSV text their spreadsheet
tool opens directly, without an import wizard.

## Goals / Non-goals

**Goals**
- G-1 — A caller can turn a list of tasks into one CSV text that spreadsheet
  tools open without an import wizard.

**Non-goals**
- NG-1 — No column picker; the column set is fixed (see D-1).
- NG-2 — No file writing or download; the caller decides where the text goes.

## User stories

- US-1 — As a team lead, I want a project's tasks as CSV text, so that I can
  paste or save them for my weekly spreadsheet report.
  Covered by: AC-1, AC-2, AC-3, AC-4, AC-5.

## Acceptance criteria (EARS)

- AC-1 (Ubiquitous · Must) — The exporter shall return a header row with the
  columns id, title, status, due, in that order, followed by one row per
  task in input order. Verify: unit.
- AC-2 (Ubiquitous · Must) — The exporter shall wrap every field in double
  quotes and double every double quote inside a field, per RFC 4180.
  Verify: unit.
- AC-3 (Unwanted · Must) — IF a field starts with `=`, `+`, `-` or `@`, THEN
  the exporter shall prefix it with a single quote inside the field quotes.
  Verify: unit.
- AC-4 (Event-driven · Should) — WHEN the task list is empty, the exporter
  shall return only the header row. Verify: unit.
- AC-5 (Unwanted · Must) — IF a task has no due date, THEN the exporter shall
  write an empty quoted field in the due column. Verify: unit.

## Edge cases

- EC-1 — The project has no tasks. → AC-4.
- EC-2 — A title contains a comma, a double quote or a line break. → AC-2.
- EC-3 — A title starts with `=`. → AC-3.

## Non-functional requirements

- NFR-1 — Rows are separated by CRLF (`\r\n`), with no line break after the
  last row. Verify: unit.

## Inputs and provenance

| Input | Source (module / external) | How it arrives (contract, route, event) | Trusted? |
|---|---|---|---|
| Task list | tasks module, `listTasks()` | function argument | no — titles are free text from any user |

Module interaction: None — a single module; the caller passes the result of
`listTasks()` to the exporter and gets a string back.

## Interfaces touched

| Interface | Kind | Change | Owner | Notes |
|---|---|---|---|---|
| `Task` (`tasks/store.mjs`) | contract | read-only | tasks | — |

## Untrusted inputs

- UI-1 — Task titles (from tracker users): formula injection when the file is
  opened in a spreadsheet. Handling: → AC-3.

## Decisions

- D-1 — Should callers pick the columns? Chosen: a fixed column set.
  Rejected: a column picker — no caller needs one today. Decided by: user,
  2026-10-01. → NG-1, AC-1.

## Open questions

None — every question raised was decided (see Decisions).
