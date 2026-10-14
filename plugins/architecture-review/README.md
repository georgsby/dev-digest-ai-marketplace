# architecture-review

A read-only **architecture-reviewer** agent that checks a change set against your project's boundary rules and reports only the violations that change introduced. It takes the rules from two places: your project's own docs (`CLAUDE.md`, `AGENTS.md`, architecture docs, ADRs) and the [engineering-paved-path](../engineering-paved-path/README.md) skills that fit your stack — Onion Architecture for backend code, the frontend layer model for React / Next.js code, and Fastify, Drizzle, Zod and security rules only where your project uses them. Every finding is anchored to a line the change added (or a fresh tool run), with severity and confidence, so you get a short, defensible list instead of a lecture about pre-existing debt.

## Install

```text
/plugin marketplace add georgsby/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai
```

This also installs **engineering-paved-path** (`^1.0.0`). The reviewer preloads seven of its skills — `engineering-insights`, `onion-architecture`, `frontend-architecture`, `fastify-best-practices`, `drizzle-orm-patterns`, `zod`, `security` — and runs the check scripts those skills ship. Without them it would have no rules to check against.

## What's inside

| Type | Name | Invoke as | What it does | Writes files? |
|---|---|---|---|---|
| Agent | `architecture-reviewer` | `architecture-review:architecture-reviewer` (subagent), or `claude --agent architecture-review:architecture-reviewer` | Reviews a branch, commit range or path list against the project's architecture rules; returns a verdict and evidence-backed findings | No |

Model: `sonnet`. Tools: `Read, Grep, Glob, Bash, Skill`. Denied: `Write, Edit, NotebookEdit, Agent, WebSearch, WebFetch`.

## How to use

From your main session:

> Use the architecture-review:architecture-reviewer agent to review my branch.

> Use the architecture-review:architecture-reviewer agent on commits `a1b2c3d^..f4e5d6c`.

> Use the architecture-review:architecture-reviewer agent on `src/billing/service.ts` and `src/billing/routes.ts` only.

As a separate main session:

```bash
claude --agent architecture-review:architecture-reviewer
```

From another agent or skill, spawn it with `subagent_type: "architecture-review:architecture-reviewer"` (this is how `/implement` in [sdd-engineering](../sdd-engineering/README.md) runs it).

### Input

One scope:

| Scope | Meaning |
|---|---|
| `working-tree` (default) | Everything between `git merge-base <default-branch> HEAD` and the working tree, including untracked files. The default branch is taken from `origin/HEAD`, else `main`, else `master`, unless you name one. |
| commit range | `<sha>^..<sha>` or `<base>..<head>` |
| path list | The `working-tree` window restricted to the listed paths |

Optional extras in the prompt: a `Plan: <path>` for context, extra gate commands to run, and previous findings (`AR-<n>: <rule> — <path:line>`) to confirm as `RESOLVED | STILL PRESENT | MOVED` in a re-review round.

### What it does

1. Reads your project docs (root and per-module `CLAUDE.md` / `AGENTS.md`, `ARCHITECTURE.md`, `docs/architecture*`, ADRs) for boundary rules, "do not touch" paths, mirrored code and known debt. Project docs win over a skill when they disagree.
2. Detects modules (workspace packages, or top-level source dirs) and the stack per module from `package.json`, and applies only the skills that fit.
3. Runs the deterministic gates it finds (see Configuration).
4. Walks the added lines against the skills' Non-negotiables and your documented invariants.
5. Checks that the working tree did not change during the review.

### Output

```text
## Architecture review — <scope>
VERDICT: PASS | PASS_WITH_WARNINGS | FAIL | INCOMPLETE
TREE: unchanged | MODIFIED
Scope: <N files, areas: <module>[, <module>…] | none>
### Gates                 (Command | Exit | New vs baseline)
### Skills applied        (Skill | Loaded via | in scope? | rules checked)
### Findings              (AR-n blocks, or "none")
### Needs manual review
### Not checked
### Insight candidates
```

Each finding:

```text
### AR-<n> <CRITICAL|WARNING|SUGGESTION> · confidence: high|medium
- Rule: <skill> › rules/<file>.md › <rule>   (or <project doc> › <section> › <rule>)
- Location: `path:line` (added line in scope)
- Evidence: <excerpt> + <tool output or import chain>
- Why: <which boundary is crossed>
- Fix direction: <where the code belongs — no code>
```

- `FAIL` needs at least one CRITICAL (a failing gate, a check-script hit on an added line, a factual Non-negotiable breach, a broken documented invariant).
- `INCOMPLETE` means a gate that applies could not run at all (for example dependencies not installed).
- `TREE: MODIFIED` makes the whole report invalid — don't run it while something else edits the tree.

The `/implement` skill parses this format, so it is kept stable across minor releases.

## Configuration

Nothing is required. The reviewer discovers its gates in this order and never hard-codes a command your project doesn't define:

1. Commands you pass in the prompt.
2. `architectureChecks` in `.claude/sdd-engineering.json`, if present (shared with [sdd-engineering](../sdd-engineering/README.md)).
3. `package.json` scripts named like architecture checks (`arch`, `lint:arch`, `check:arch`, `depcruise`, …), run with your package manager. Scripts that write (baseline / record / fix flags) are skipped.
4. The check scripts shipped with the `engineering-paved-path:onion-architecture` and `engineering-paved-path:frontend-architecture` skills, using the layer mapping those skills document.
5. An architecture test file your docs name.

Minimal `.claude/sdd-engineering.json`:

```json
{
  "architectureChecks": ["npm run lint:arch"]
}
```

If no gate exists, the review relies on the manual checklist and says so under `### Gates` and `### Not checked`.

## How it fits with the other plugins

- [engineering-paved-path](../engineering-paved-path/README.md): the rules and check scripts. Installed with this plugin.
- [sdd-engineering](../sdd-engineering/README.md): `/implement` runs this reviewer after the implementation waves and turns its findings into fix tasks (up to 3 rounds).
- [research-tools](../research-tools/README.md): independent; use it for open questions, this agent for boundary checks.

## Limits and notes

- **Read-only.** It has no Write/Edit tools; Bash is limited by its instructions to read-only git commands, `rg`/`ls`/`cat`/`jq`, and the gates above. It never regenerates a baseline or known-violations file, installs, migrates, or changes git state.
- **Only what the change introduced.** Pre-existing debt is never reported; extending known debt is a WARNING.
- **Advisory.** It does not replace your CI or any pre-PR review procedure, and it never runs their scripts.
- **Main-thread runs.** Skill preloading works only when the agent runs as a subagent. Under `claude --agent …` it loads the skills itself with the Skill tool, so allow the Skill tool if you restrict permissions.
- The gates need the project's dependencies installed; otherwise the verdict is `INCOMPLETE`.
- Plugin agents ignore `permissionMode`, `hooks` and `mcpServers`; none are needed here.

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
