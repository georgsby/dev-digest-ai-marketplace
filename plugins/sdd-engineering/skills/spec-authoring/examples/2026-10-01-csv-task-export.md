# Spec: Export tasks as CSV

Spec ID: SPEC-2026-10-01-csv-task-export
Status: approved
Supersedes: —
Modules: api, web
Design sources: existing UI: the project task list toolbar

> Worked example for the `sdd-engineering:spec-authoring` skill. It describes
> a fictional task tracker with an `api` and a `web` package. It is not a
> real spec and is not listed in any index.

## Problem and user

A team lead keeps a project's tasks in the tracker but reports progress in a
spreadsheet every week. Today they copy rows by hand, which takes about 20
minutes and drops tasks because the list is paginated. They need a project's
tasks in a file their spreadsheet tool opens directly.

## Goals / Non-goals

**Goals**
- G-1 — A project member can download all tasks of one project as a CSV file
  in one action.
- G-2 — The file opens in spreadsheet tools without an import wizard.

**Non-goals**
- NG-1 — No scheduled or emailed exports; the export runs on demand only.
- NG-2 — No column picker; the column set is fixed (see D-1).

## User stories

- US-1 — As a team lead, I want to download a project's tasks as CSV, so that
  I can report progress from my spreadsheet.
  Covered by: AC-1, AC-2, AC-3, AC-5.
- US-2 — As a project member, I want a clear outcome when the export cannot
  run, so that I know whether to retry.
  Covered by: AC-4, AC-6.

## Acceptance criteria (EARS)

- AC-1 (Event-driven · Must) — WHEN a project member selects "Export CSV" on
  the task list, the web app shall download a file named
  `<project-slug>-tasks.csv`. Verify: component (web), e2e.
- AC-2 (Ubiquitous · Must) — The export endpoint shall return every task of
  the project, one row per task, with the columns id, title, status,
  assignee, due date, in that order. Verify: integration (api).
- AC-3 (Ubiquitous · Must) — The export endpoint shall encode the file as
  UTF-8 with a byte order mark and quote every field per RFC 4180.
  Verify: unit (api).
- AC-4 (Unwanted · Must) — IF the requester is not a member of the project,
  THEN the export endpoint shall respond with status 403 and no body.
  Verify: integration (api).
- AC-5 (State-driven · Should) — WHILE the export request is pending, the web
  app shall show the button disabled with the label "Exporting…".
  Verify: component (web).
- AC-6 (Unwanted · Should) — IF the export request fails, THEN the web app
  shall show the message "Export failed — try again" and re-enable the
  button. Verify: component (web).

## Edge cases

- EC-1 — The project has no tasks. → AC-2 (the file holds only the header
  row).
- EC-2 — A task title contains a comma, a double quote or a line break. → AC-3.
- EC-3 — A task title starts with `=`, `+`, `-` or `@`. → AC-3, NFR-2.
- EC-4 — A project holds more than 10,000 tasks. → OQ-1.

## Non-functional requirements

- NFR-1 — Exporting a project with 10,000 tasks completes in under 3 s at p95,
  measured at the API. Verify: integration (api).
- NFR-2 — A field that starts with `=`, `+`, `-` or `@` is prefixed with a
  single quote, so spreadsheet tools never evaluate it as a formula.
  Verify: unit (api).

## Inputs and provenance

| Input | Source (module / external) | How it arrives (contract, route, event) | Trusted? |
|---|---|---|---|
| Task title, assignee name | tracker users, via api | the `tasks` table | no — free text from any member |
| Project id | the web app | `GET /projects/:id/tasks.csv` path parameter | no — any client can send it |
| Session user | the api auth layer | the existing session middleware | yes |

Module interaction: the web app calls the new route with the user's session;
the api checks membership, reads the tasks, serialises them and streams the
file. If the call fails, the web app leaves the list unchanged and shows the
message from AC-6.

## Interfaces touched

| Interface | Kind | Change | Owner | Notes |
|---|---|---|---|---|
| `GET /projects/:id/tasks.csv` | route | new | api | streams `text/csv` |
| `Task` | contract | read-only | api | — |
| `tasks` | table | read-only | api | no migration |

## Untrusted inputs

- UI-1 — Task titles and assignee names (from tracker users): formula
  injection when the file is opened in a spreadsheet. Handling: → NFR-2.
- UI-2 — The project id (from any client): reading another project's tasks.
  Handling: → AC-4.

## Decisions

- D-1 — Should users pick the columns? Chosen: a fixed column set. Rejected: a
  column picker — it doubles the UI work for a weekly report. Decided by:
  user, 2026-10-01. → NG-2, AC-2.
- D-2 — Build the file on the server or in the browser? Chosen: the server.
  Rejected: the browser — the list is paginated, so the browser never holds
  every task. Decided by: user, 2026-10-01. → AC-2, NFR-1.

## Open questions

- OQ-1 — Should exports above 10,000 tasks run as a background job? Options:
  a background job with a download link / a synchronous stream with no cap.
  Recommended: a synchronous stream, because no project is that size today.
  Owner: user. Blocking: no.
