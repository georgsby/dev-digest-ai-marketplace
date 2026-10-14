---
name: spec-authoring
description: "The Spec Driven Development spec format — template, requirement IDs, machine-checked line formats, EARS rules, priorities, verify lanes, and the deterministic spec-lint gate. Use when writing, revising or reviewing a spec-creator spec (<specsDir>/<YYYY-MM-DD>-<slug>.md or <module>/<specsDir>/<YYYY-MM-DD>-<slug>.md, default specsDir = specs), when planning or verifying work from one, or when mapping acceptance criteria to test lanes. Trigger terms: spec, specification, EARS, acceptance criteria, AC-n, user story, edge case, NFR, open question, decisions, spec lint, requirements traceability."
---

# Spec authoring

One format for every spec written by `sdd-engineering:spec-creator`. This
file is the single source for the template and the rules; a
`<specsDir>/README.md`, if the project keeps one, only lists the headings and
an index for humans. Readers:

| Who | Uses |
|---|---|
| `sdd-engineering:spec-creator` | everything — writes the spec, runs the lint |
| `sdd-engineering:implementation-planner` | IDs, **Priority** (what to cut), **Interfaces touched** (Contracts, Affected modules), open `OQ-n`, `Verify:` lanes (which test each task writes first) |
| `sdd-engineering:plan-verifier` | IDs and how each prefix is checked; `Verify:` lanes (where to look for the test) |

## Where specs live

`specsDir` comes from `.claude/sdd-engineering.json` in the project root
(default `specs`).

- A cross-module feature: `<specsDir>/<YYYY-MM-DD>-<slug>.md`.
- A feature inside one module (workspace package): `<module>/<specsDir>/<YYYY-MM-DD>-<slug>.md`.

The slug is 2–5 kebab-case words. The project's modules are `modules` from
the config file, else the workspace packages (`package.json` workspaces,
`pnpm-workspace.yaml`), else the top-level source folders of a single-package
repo.

A worked example that passes the lint (a fictional task tracker with an
`api` and a `web` package):
[`examples/2026-10-01-csv-task-export.md`](examples/2026-10-01-csv-task-export.md).

## Template

Same headings, same order. Every section is present; a section with nothing
to say reads `None — <reason>.` (not allowed for Goals, User stories and
Acceptance criteria).

```markdown
# Spec: <feature name>

Spec ID: SPEC-<YYYY-MM-DD>-<slug>
Status: draft
Supersedes: <link to the earlier spec, or "—">
Modules: <the project's modules that change, comma-separated — e.g. api, web>
Design sources: <paths / URLs / "existing UI: <route or component path>">

## Problem and user
Who the user is, what they cannot do today, why it matters. 3–6 sentences.

## Goals / Non-goals
**Goals**
- G-1 — …
**Non-goals**
- NG-1 — … (what we deliberately do not build, and where it belongs instead)

## User stories
- US-1 — As a <user>, I want <capability>, so that <outcome>.
  Covered by: AC-1, AC-2.

## Acceptance criteria (EARS)
- AC-1 (Event-driven · Must) — WHEN <trigger>, the <component> shall <response>. Verify: integration (api), e2e.
- AC-2 (Unwanted · Should) — IF <condition>, THEN the <component> shall <response>. Verify: component (web).

## Edge cases
- EC-1 — <situation>. → AC-n (or OQ-n while undecided).

## Non-functional requirements
- NFR-1 — <measurable: latency, budget, call cap, cache TTL, a11y, i18n, cost>. Verify: unit (api).

## Inputs and provenance
| Input | Source (module / external) | How it arrives (contract, route, event) | Trusted? |
|---|---|---|---|

Module interaction: one short paragraph or a Mermaid sequence diagram per
cross-module flow — who calls whom, sync vs async, what degrades on failure.

## Interfaces touched
| Interface | Kind | Change | Owner | Notes |
|---|---|---|---|---|

## Untrusted inputs
- UI-1 — <input> (from <source>): <risk>. Handling: → AC-n / NFR-n.

## Decisions
- D-1 — <question asked>. Chosen: <option>. Rejected: <option> — <why>.
  Decided by: user, <YYYY-MM-DD>. → AC-n / NG-n / NFR-n / EC-n.

## Open questions
- OQ-1 — <question>. Options: <a> / <b>. Recommended: <a>, because …
  Owner: user. Blocking: yes | no.
```

## IDs and line formats

An item is a `- ` list line plus its indented continuation lines. It starts
with its ID. IDs are unique and sequential per prefix (`AC-1, AC-2, …`), in
the section that owns the prefix. Every ID mentioned anywhere must be defined.

| Prefix | Section | Required on the item |
|---|---|---|
| `G-n`, `NG-n` | Goals / Non-goals | — (at least one `G-n`) |
| `US-n` | User stories | `Covered by:` with at least one `AC-n`, and at least one of them `Must` |
| `AC-n` | Acceptance criteria | `(<Pattern> · <Priority>)`, exactly one `shall`, `Verify: <lanes>` |
| `EC-n` | Edge cases | `→` followed by an `AC-n` or `OQ-n` |
| `NFR-n` | Non-functional requirements | a number or a checkable rule, `Verify: <lanes>` |
| `UI-n` | Untrusted inputs | `Handling:` then `→` an `AC-n` or `NFR-n` |
| `D-n` | Decisions | `Chosen:`, `Rejected:`, `Decided by:`, `→` an `AC-n`/`NG-n`/`NFR-n`/`EC-n` |
| `OQ-n` | Open questions | `Blocking: yes` or `Blocking: no` |

**Priority** — `Must` (the feature is not done without it), `Should` (planned
now, first to cut), `Could` (only if cheap). The planner cuts from the bottom.
A user story is a mandatory requirement: every `US-n` needs at least one
`Must` criterion, so cutting every `Should` and `Could` still leaves each
story testable. A story with no `Must` criterion is not finished — find its
`Must` criterion with the user, or move the story to Non-goals.

**Verify lanes** — at which boundary the proving test observes the
behaviour. Several lanes are comma-separated. Naming a lane is still *what*,
not *how*.

| Lane | The test… | Typical location (follow the project's own convention) |
|---|---|---|
| `unit` | exercises one module's logic in isolation, no I/O | next to the code or in the module's test folder, e.g. `*.test.ts` |
| `integration` | crosses a real boundary inside a module — HTTP route, database, queue; may need services (Docker, a database) | the module's integration tests, e.g. `*.it.test.ts` or `test/integration/` |
| `component` | renders a UI component and drives it like a user (e.g. React Testing Library) | next to the component, e.g. `*.test.tsx` |
| `e2e` | drives the running app end to end (browser or API client) | the project's e2e suite |
| `manual (<why>)` | — no automated test is possible; the reason is required | — |

In a spec with several modules, qualify a lane with the module that owns
the test: `unit (api)`, `component (web)`. The lint warns when the
qualifier is not in the `Modules:` header.

**Interfaces touched** — one row per existing or new interface the feature
reads or changes. `Kind`: `route`, `SSE`, `MCP tool`, `contract`, `table`,
`message deck`, `job`, `secret`. `Change`: `new`, `extended` or `read-only`.
A `contract` row (a shared type or schema) that is not `read-only` names in
Notes every consumer that must change with it (e.g. the other packages that
import it, or a vendored copy). Name existing things exactly; never invent a
class or function name.

**Inputs and provenance** — the `Trusted?` cell starts with `yes` or `no`.
Any `no` row needs a `UI-n`.

## EARS

Every `AC-n` uses exactly one pattern and names the responding component
(`the API`, `the Overview tab`, `the MCP tool get_x`) — "the system" only
when a single module is involved.

| Pattern (label) | Form |
|---|---|
| `Ubiquitous` | The <component> shall <response>. |
| `Event-driven` | WHEN <trigger>, the <component> shall <response>. |
| `State-driven` | WHILE <state>, the <component> shall <response>. |
| `Unwanted` | IF <condition>, THEN the <component> shall <response>. |
| `Optional` | WHERE <feature is enabled>, the <component> shall <response>. |
| `Complex` | keywords in the order WHERE … WHILE … WHEN/IF … THEN … |

Keywords are uppercase. Split a `Complex` sentence that grows past one
trigger and one state.

Vague words are defects. Rewrite each until a test can check it:

| Vague | Testable |
|---|---|
| "must work well on large repositories" | WHEN the repository exceeds the indexing threshold, the API shall build the overview from deterministic facts only, without reading whole files. |
| "must not crash if the model is unavailable" | IF the structured model call fails, THEN the API shall return the deterministic overview with the degradation reason. |
| "should suggest where to start reading" | The Overview tab shall order the reading path by file rank in the import graph. |

Words that always need a number or a rule: fast, quickly, slow, large, huge,
small, many, few, several, appropriate, proper(ly), user-friendly, robust,
seamless, intuitive, efficient, easy, reasonable, adequate, flexible, etc.

## Size

More than 25 `AC-n` is a signal to split the feature into two specs, each
with its own Goals — propose the split to the user.

## Lint (deterministic gate)

Run from the project root:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/spec-lint.mjs" <spec.md>
node "${CLAUDE_SKILL_DIR}/scripts/spec-lint.mjs" --modules api,web <spec.md>
```

Exit `0` = no errors (warnings allowed), `1` = errors, `2` = usage. Module
names in the `Modules:` header are checked against `--modules`, else against
`modules` in `.claude/sdd-engineering.json` (read from the current
directory), else only for being a plain package or folder name. It checks:
title and header lines (Spec ID = file name, Status, Modules), headings and
their order, ID uniqueness and sequence, dangling ID references, every line
format in the table above, EARS pattern ↔ keyword agreement and one `shall`,
priorities and lanes (and lane qualifiers vs `Modules:`, warning), a
`US-n` without a `Must` criterion, vague
words in `AC`/`NFR` (error; warning when the item also carries a number),
`Trusted? = no` without any `UI-n`, changed contract rows without named
consumers (warning), `approved` with a `Blocking: yes` question, more than
25 `AC-n` (warning), and hygiene patterns (merge-conflict markers, focused
tests, breakpoints, unfinished-work markers). Its own tests (Node 22 needs
the file path, not the folder):
`node --test "${CLAUDE_SKILL_DIR}/scripts/spec-lint.test.mjs"`.

## Self-check the lint cannot do

- Every failure mode of a cross-module hop (Inputs and provenance) has an
  `Unwanted` `AC-n` or an `EC-n`.
- Every `AC-n` not listed in a `US-n` still traces to a `G-n` or `NFR-n`
  (the lint only warns).
- Every answer the user gave that changed the spec is a `D-n`.
- No requirement prescribes an internal function, file or task split.
- Mermaid diagrams follow `sdd-engineering:mermaid-diagram`: a sequence diagram for a
  hop-by-hop flow, ≤ ~20 nodes, no C4.
- The spec never quotes a hygiene pattern literally (a merge conflict marker,
  a focused-test modifier, a JS breakpoint keyword, an unfinished-work
  marker).
