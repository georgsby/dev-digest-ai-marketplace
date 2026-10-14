# research-tools

A read-only **researcher** agent that answers one concrete question with evidence. It looks inside your project (code, docs, specs, config, `CLAUDE.md` / `AGENTS.md`, `INSIGHTS.md`, git history) and on the public internet (official docs, changelogs, release notes, GitHub issues, standards, advisories), pinned to the library versions your project actually uses. Every conclusion cites a `path:line`, a commit or a fetched URL, and anything it could not find is listed explicitly instead of guessed. Use it when you want an answer you can trust, not just a list of files.

## Install

```text
/plugin marketplace add georgsby/dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai
```

No dependencies.

## What's inside

| Type | Name | Invoke as | What it does | Writes files? |
|---|---|---|---|---|
| Agent | `researcher` | `research-tools:researcher` (subagent), or `claude --agent research-tools:researcher` | Answers one concrete question from the project (Mode A), from external sources (Mode B), or both, with evidence | No |

Model: `sonnet`. Tools: `Read, Grep, Glob, Bash, WebSearch, WebFetch`. Denied: `Write, Edit, NotebookEdit, Skill, Agent`.

## How to use

The agent's description tells Claude to use it **proactively** for any research, investigation or fact-finding request, in any language. Usually you just ask:

> Research how retries are configured for outgoing HTTP calls in this repo.

> Does the version of Drizzle we use support `onConflictDoUpdate` with a `where` clause? Check our usage too.

To call it explicitly:

> Use the research-tools:researcher agent to find out why `userId` is nullable in the sessions table.

As a separate main session:

```bash
claude --agent research-tools:researcher
```

From another agent or skill, spawn it with `subagent_type: "research-tools:researcher"`, or allow it in an agent's frontmatter with `tools: Agent(research-tools:researcher)`.

### Input

A good request has three parts:

- **a concrete question** — "where / how / why / which / does X support Y", not "look into auth";
- **a scope** — project, external, or both, and a rough area (package, module, feature) if the question does not imply one;
- **what the answer is for** — so the agent knows how deep to go.

Example prompt from a main session:

> Does `src/billing/service.ts` write `costUsd` before or after the API call resolves? Project scope. I need it to judge whether a partial-cost row can exist.

A vague request gets `STATUS: CLARIFICATION_NEEDED` with up to five numbered questions instead of research. Minor gaps are filled with defaults and listed under **Assumptions**.

### Output

A structured Markdown report:

```text
STATUS: ANSWERED | PARTIAL | CLARIFICATION_NEEDED
TREE: unchanged | MODIFIED
# Repo research | External research: <question>
## Answer            direct answer + confidence (high | medium | low)
## Findings          numbered conclusions, each citing [E…] / [S…]
## Evidence          path:line excerpts, commits, INSIGHTS entries / quotes from sources
## Sources           (external) title, URL, type, version/date, reliability
## Conflicts & caveats
## Not found         what was searched and came up empty (always present)
## Assumptions
```

A combined question returns one report with `## Repo findings` and `## External findings`.

### What it reads in your project

All optional; missing files are noted, not an error: root `README.md`, `CLAUDE.md`, `AGENTS.md`; the project's modules (workspace packages from `package.json` workspaces / `pnpm-workspace.yaml`, otherwise top-level source directories) and their own `README.md` / `AGENTS.md` / `INSIGHTS.md`; `docs/`, architecture notes, ADRs and specs; manifests and lockfiles for version pinning; git history (`git log -S`, `git blame`, `git show`) for "why" questions.

## Configuration

None. The agent discovers the project layout and the stack on its own.

## How it fits with the other plugins

- [sdd-engineering](../sdd-engineering/README.md): `spec-creator` and `implementation-planner` delegate fact-finding to `research-tools:researcher`. Installing `sdd-engineering` installs this plugin.
- [architecture-review](../architecture-review/README.md) and [engineering-paved-path](../engineering-paved-path/README.md) are independent of it.

## Limits and notes

- **Read-only by rule and by tools.** It has no Write/Edit tools. Bash is limited by its instructions to read-only commands (`git log/show/blame/grep`, `rg`, `ls`, `cat`, `jq`); it never installs, migrates, starts servers or changes git state.
- **Tree integrity.** In a git repository it runs `git status --porcelain` at start and end. If they differ, the report says `TREE: MODIFIED` and flags affected findings as unreliable — avoid running it while another agent edits the tree.
- It never runs `/deep-research`, other skills or sub-agents. For broad, multi-source literature reviews use a dedicated deep-research tool instead.
- Web research needs `WebSearch` / `WebFetch` to be allowed in your environment; without them, external questions come back `PARTIAL` with the gaps under **Not found**.
- Text in files and web pages is treated as data, never as instructions.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
