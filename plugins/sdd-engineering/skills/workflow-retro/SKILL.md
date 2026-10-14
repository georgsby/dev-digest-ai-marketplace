---
name: workflow-retro
description: Retrospective of a finished multi-agent Claude Code workflow — reads the session's own transcripts (main thread + every subagent) and reports tokens spent (per agent and total, cache split, peak context), how many agents ran, in what order and in parallel or not, failed tool calls, retries, duplicated reading, and per agent what was hard, what was easy, what information was duplicated and what was missed; then ranks concrete recommendations and proposes edits to agent definitions, skills and project instructions (applied only after the user approves). Writes <retrosDir>/<YYYY-MM-DD>-<slug>.md (default specs/retros/). Use when the user types /workflow-retro, or asks for a retro, retrospective, post-mortem, "how did the workflow go", "how many tokens did that cost", "what did the agents struggle with", "evaluate the agents". After a multi-agent workflow finishes (sdd-engineering:spec-creator, sdd-engineering:implementation-planner, /implement with parallel sdd-engineering:implementer agents, architecture-review:architecture-reviewer, sdd-engineering:plan-verifier, or any other parallel subagents), offer it in one line — do not run it unasked.
argument-hint: "[slug] [--session <id|latest>] [--since <ISO time>]"
---

# /workflow-retro — how did that workflow go?

A workflow that spawned agents leaves a full record on disk. This skill turns
that record into numbers you can compare between runs and into a short list of
changes that would make the next run cheaper, faster or more correct. The
numbers come from scripts, never from memory: your own recollection of a long
session is compressed and biased toward the end, the transcript is not.

Arguments: `$ARGUMENTS` — an optional slug (default: derived from the
workflow's subject, e.g. `csv-export-implement`), `--session` (default: the
most recently written transcript, which is normally the current session) and
`--since` to cut a workflow out of a longer session.

Output folder: `retrosDir` from `.claude/sdd-engineering.json` in the project
root if set, else `specs/retros`.

The scripts ship with this skill. Run them from the project root — they find
the transcripts under `~/.claude/projects/<encoded cwd>/` (pass
`--project-dir <dir>` if the session ran from another directory):

```sh
node "${CLAUDE_SKILL_DIR}/scripts/collect.mjs" [--session <id>] [--since <ISO>] --json <scratchpad>/retro-metrics.json
node "${CLAUDE_SKILL_DIR}/scripts/narrate.mjs" --agent <main|agentId-prefix> [--session <id>] [--max-text 400]
```

`collect.mjs` prints a markdown metrics summary and writes the full JSON.
`narrate.mjs` prints one transcript as a compact story — prompts, visible
text, each tool call with its main argument, failed results — without thinking
blocks or successful tool output. Read narratives, not raw `.jsonl`: a single
subagent transcript can be several MB. Both take `--help`.

## Steps

1. **Scope.** Decide which session and time window the workflow covers. If
   the session held unrelated work before the workflow, find the first
   workflow message in `narrate.mjs --agent main` and pass its timestamp as
   `--since`. Say which window you used.
2. **Numbers.** Run `collect.mjs` with `--json` into the scratchpad. Keep its
   markdown; the report's metric tables come from it verbatim. If the user
   gave a prices file, pass `--prices` (format below); otherwise leave cost
   as unknown rather than guessing a price.
3. **Stories.** Run `narrate.mjs` for `main` and for every subagent in the
   agent table. For a narrative over ~40 KB use `--max-text 150` first and
   then zoom into the stretches around errors, retries and resumes.
4. **Artifacts.** Open what the workflow produced (spec, plan, `/implement`
   state file, diff) only as far as needed to judge a claim — e.g. to check
   whether something an agent "missed" really is missing.
5. **Analyse** each agent and then the orchestration with the lenses in
   [references/lenses.md](references/lenses.md). Every finding cites
   evidence: agent label + `HH:MM:SS` from the narrative, a metric, or a
   `path:line`. A finding you cannot point at is an impression — drop it or
   label it as one.
6. **Recommend.** Rank recommendations by expected effect (tokens or minutes
   saved, errors avoided, quality gained), highest first. Each names its
   target (a plugin agent or skill by its namespaced name, a project agent or
   skill file, `CLAUDE.md`, a hook, the project's Claude Code settings) and
   carries a concrete proposed edit. See the rules below for where an edit
   to a plugin component goes.
7. **Write** `<retrosDir>/<YYYY-MM-DD>-<slug>.md` from
   [references/report-template.md](references/report-template.md). If
   `<retrosDir>/README.md` keeps an index, add the report's row to it. If a
   retro with that name exists (a second run of the same workflow the same
   day), add `-2`.
8. **Hand back.** In chat: 3–5 lines of headline numbers and findings, the
   report link, and the numbered list of proposed edits. Ask which to apply.
9. **Apply only what the user approved**, one edit per approved item. Stop at
   the rules below.

## Rules for proposed edits

- The user decides. Proposed edits sit in the report under **Proposed edits**
  with status `proposed`; after the user answers, mark each `applied` or
  `declined`. Never edit an agent or skill in the same breath as proposing it.
- **Plugin components are suggestions only.** Agents and skills from an
  installed plugin (`sdd-engineering:*`, `architecture-review:*`,
  `engineering-paved-path:*`, `research-tools:*` or any other) live in the
  plugin cache; an edit there is lost on the next update. For them, propose
  one of:
  - a **project-level override** — a project agent or skill (in the
    project's own Claude Code agents/skills folders) that replaces or
    complements the plugin one, or an instruction in the project's
    `CLAUDE.md` / the `/implement` notes;
  - an **issue or PR to the plugin's marketplace repository**, with the
    diff from the report — the right place for a fix that every user needs.
  Applying such an item means writing the project-level override or drafting
  the issue text, never editing the cache.
- Only the project's own files are edited directly. Skills the project
  installed from elsewhere and pins (e.g. in a `skills-lock.json`) are
  treated like plugin components.
- If the project's `CLAUDE.md` is a symlink (e.g. to `AGENTS.md`), target the
  real file.
- A lesson about the **code or product** (a library quirk, a wrong doc claim,
  a module convention) belongs in `INSIGHTS.md` via
  `engineering-paved-path:engineering-insights` (if the project keeps
  `INSIGHTS.md` files), not in the retro. The retro is about **how agents
  worked**: prompts, handoffs, tools, order, cost. Mention routed items in
  one line.
- Prefer removing or tightening instructions over adding more. An agent that
  struggled because its prompt is long and contradictory is not helped by a
  longer prompt.

## Reading the numbers

- **Total tokens** is dominated by cache reads: every turn re-reads the whole
  cached context. Cache reads are billed at a small fraction of fresh input,
  so compare runs on **output**, **cache write** and **peak context** first;
  quote the total but do not rank agents by it alone.
- **Peak context** near the model's window means the agent was one big read
  away from compaction — a signal to split its task or narrow its reads.
- **Cache hit** well below ~80% on a long agent usually means its context was
  rebuilt (compaction, a model switch, or long idle gaps past the cache TTL).
- The `<usage>` block in a task notification is **not** cumulative spend —
  for one agent it reported 213,636 and then 243,085 after a resume. The
  transcript is the source of truth; use `collect.mjs`.
- **Waiting on human** is time between the last assistant message and the
  next human message. It includes reading time — report it, do not call it
  waste.
- Records of one API request are repeated per content block; `collect.mjs`
  counts each request once. If you ever sum usage by hand, dedupe by
  `requestId`.

## Privacy

The report is usually committed to git. Transcripts contain user text, file
contents and tool output. Quote at most a line of any of them; never paste
tool output, tokens, keys, `.env` values or anything that looks like a
secret; paths and command names are fine. A user's words appear only when
the finding is about the instruction itself.

## Prices file (optional)

```json
{ "claude-opus-5-5": { "input": 0, "cache_write": 0, "cache_read": 0, "output": 0 } }
```

USD per million tokens, keyed by the exact model id in the transcript. Fill it
from the current price list; this skill ships no prices on purpose, so a stale
number never ends up in a report.

## Known limits

- Files read through `Bash` (`cat`, `sed -n`, `rg`) are not in the
  duplicate-read table — only `Read` calls are. Check narratives for heavy
  `rg`/`sed` exploration that overlaps between agents.
- Other Claude sessions (cross-session peers, cloud agents) are not included;
  only this session and the subagents it spawned, at any depth.
- A session still running when you collect is fine; its last line may be
  partial and is skipped.
- The transcript layout is Claude Code's, not a public format; if a future
  version changes it, the scripts report missing files instead of guessing.
