# engineering-paved-path

Eleven engineering skills for TypeScript web projects: React and Next.js
frontends, Fastify + Drizzle + PostgreSQL backends, Zod, TypeScript, security,
architecture rules, and per-module engineering insights. Claude loads each skill
on demand when your task matches it, so the guidance shows up while it writes or
reviews code. The two architecture skills also ship check scripts with a baseline
ratchet: existing debt doesn't block work, and new debt shows up as a higher
count. The skills make no assumptions about your repository layout. Paths,
modules and gates come from your project, either detected or declared in a small
config file.

## Install

```text
/plugin marketplace add georgsby/dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai
```

No dependencies. This plugin is itself a dependency of
[architecture-review](../architecture-review/README.md) and
[sdd-engineering](../sdd-engineering/README.md), so installing either one also
installs this.

## What's inside

All components are skills. Claude loads them automatically when a task matches
their description. You can also name one in a prompt ("use the
engineering-paved-path:onion-architecture skill"), and agents preload them by
their namespaced name.

| Type | Name | Invoke as | What it does | Writes files? | Origin |
|---|---|---|---|---|---|
| Skill | `react-best-practices` | `engineering-paved-path:react-best-practices` | Modern React best practices and anti-pattern catalog: component design, state, hooks misuse, performance, data fetching, code organization | No | this repo |
| Skill | `react-testing-library` | `engineering-paved-path:react-testing-library` | React Testing Library + Vitest: setup, query priority, `userEvent`, async patterns, mocking, anti-patterns | No | this repo |
| Skill | `frontend-architecture` | `engineering-paved-path:frontend-architecture` | Where frontend code lives in a React / Next.js App Router app: layers, colocation, component splitting, data hooks and the anti-corruption layer, server/client boundary, layouts and error boundaries | No. Its check script writes a baseline only with `--record` | this repo |
| Skill | `fastify-best-practices` | `engineering-paved-path:fastify-best-practices` | Fastify servers and REST APIs: routes, plugins, JSON Schema validation, errors, hooks, logging, auth, CORS, performance, deployment | No | third-party |
| Skill | `drizzle-orm-patterns` | `engineering-paved-path:drizzle-orm-patterns` | Drizzle ORM: schema, CRUD, relations, queries, transactions, migrations with Drizzle Kit | No | third-party |
| Skill | `postgresql-table-design` | `engineering-paved-path:postgresql-table-design` | PostgreSQL schema design: data types, indexing, constraints, performance patterns | No | third-party |
| Skill | `onion-architecture` | `engineering-paved-path:onion-architecture` | Onion Architecture for TypeScript backends: the dependency rule, rings, ports and adapters, composition root, repository-only queries, row→DTO mapping, an I/O-free domain core, test lanes per ring | No. Its check script writes a baseline only with `--record` | this repo |
| Skill | `typescript-expert` | `engineering-paved-path:typescript-expert` | Type-level programming, performance, monorepo tooling, migrations, modern TS tooling | No | third-party |
| Skill | `zod` | `engineering-paved-path:zod` | Zod schemas, parsing, `safeParse`, error handling, type inference | No | third-party |
| Skill | `security` | `engineering-paved-path:security` | OWASP Top 10:2025 review with confidence-based reporting: access control, injection, auth/JWT, uploads, secrets, LLM features, checklists | No | this repo |
| Skill | `engineering-insights` | `engineering-paved-path:engineering-insights` | Reads the nearest `INSIGHTS.md` before work; appends verified, significant lessons at the end (append-only, guarded) | **Yes:** `INSIGHTS.md` files in your project | this repo |

"Third-party" skills are copied from other open-source repositories under their
own licences. [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) lists the source,
the copied revision and the licence of each one. Everything else is covered by
this plugin's [LICENSE](LICENSE).

### Next.js guidance

This plugin has no standalone Next.js skill. Next.js guidance comes from
`frontend-architecture` (its `rules/nextjs.md` covers the server/client boundary,
layouts, error boundaries, URL state and Route Handlers) together with
`react-best-practices`. For framework mechanics such as caching, metadata, images
and async APIs, Vercel's own material is an optional extra:

- the docs bundled with Next.js and the `AGENTS.md` that Next.js 16.3+ generates
  for coding agents;
- Vercel's Next.js skills: https://github.com/vercel/next.js/tree/canary/skills.

## How to use

### Stack skills (React, testing, Fastify, Drizzle, PostgreSQL, TypeScript, Zod, security)

Work as usual and the matching skill loads by itself. Example prompts:

> Add a `POST /orders` route with a Zod body schema and a 409 on duplicates.

> Review `src/auth/` for security issues. Report only high-confidence findings.

> Design the tables for subscriptions and invoices in Postgres.

> Write tests for `OrderForm` with React Testing Library.

`security` reports only HIGH-confidence findings with file, line, exploit and fix,
and notes MEDIUM ones for manual checking. Its `checklists.md` works as a
pre-commit self-review.

### `onion-architecture` and `frontend-architecture`

Use them to decide where code goes and to check structure before you commit:

> Where should the email-sending code live? We call it from the orders service.

> Split `OrderDetailView`, it's 400 lines.

> Check my branch against the onion rules.

Each skill ships one check script and runs it as
`"${CLAUDE_SKILL_DIR}/enforcement/check-onion.sh"` or
`"${CLAUDE_SKILL_DIR}/enforcement/check-frontend.sh"`. Both scripts take the same
arguments:

```text
check-<onion|frontend>.sh [--baseline FILE] [--strict | --record] [-v] [--<option> <value> ...] <src-root> [<src-root> ...]
```

- **Inputs:** one or more source roots, an optional baseline file, and options
  that map rings or layers to paths (extended regexes, with sensible defaults).
- **Output:** one line per check with its count, compared to the baseline. Lines
  above the baseline are printed. The script exits 0, or exits 1 with `--strict`
  when any count is above the baseline, or exits 2 on a usage error.
- **onion checks:** row types or ORM imports or queries outside persistence,
  `process.env` outside config, the HTTP framework outside transport, adapters
  built outside the composition root, I/O in the domain core, and non-zod imports
  in contracts.
- **frontend checks:** `fetch()` outside the API client, TanStack Query outside
  the data hooks, deep relative imports, `export *` barrels, `"use client"` on
  non-component modules, fat pages, big components, missing `error.tsx`, and
  the app shell rendered outside a layout.

The full option lists are in each skill's `enforcement/README.md`. Neither script
needs any dependency beyond bash, grep, awk and find.

### `engineering-insights`

It runs at the start and end of tasks without being asked. You can also say
"wrap up", "remember this", "add an insight" or "review insights".

- **Read:** it finds the module that the touched files belong to (a workspace
  package, or a top-level source directory). Then it walks up from those files to
  the nearest `INSIGHTS.md` below the repository root. It reads that file, plus
  the root `INSIGHTS.md` when the task spans modules. If no file exists, it
  reports that there are no insights yet.
- **Write:** it records a lesson only when the lesson is significant, new and
  verified, such as a user correction, a dead end, or a tool quirk. Module
  lessons go to `<module>/INSIGHTS.md`, which is created on first write.
  Cross-module lessons go to the root `INSIGHTS.md`. Writes are append-only and
  checked by the skill's `scripts/append-guard.sh`.
- **Review:** "review insights" finds duplicates, contradictions, vague entries
  and stale entries, and proposes edits. It applies them only after you approve.

## Configuration — `.claude/architecture.json` (optional)

Both architecture skills read one optional file in your project root. Without
it, they detect your backend and frontend packages, use the default paths, and
state the mapping they assumed.

```json
{
  "onion": {
    "roots": ["api/src"],
    "baseline": ".architecture/onion-baseline.txt",
    "options": {
      "composition-root": "api/src/platform/container\\.ts$",
      "domain": "^packages/core/src/"
    }
  },
  "frontend": {
    "roots": ["web/src"],
    "baseline": ".architecture/frontend-baseline.txt",
    "options": { "routes": "app", "shell": "AppShell" },
    "readOnly": ["web/src/generated/"]
  }
}
```

- `roots` are the source roots, passed to the script as positional arguments.
- `baseline` is your project's baseline file.
- `options` are script flags without the leading `--`. Their values are extended
  regexes matched against file paths, except `routes`, `shell` and the line
  limits.
- `readOnly` (frontend only) lists code the frontend consumes but doesn't own,
  such as a generated API client or a contract package. Frontend work never
  edits it.
- Either section can be an array, with one object per package.

### Creating your baseline

The plugin doesn't ship a baseline. A baseline belongs to your project, because
it lists your project's existing debt. Create it once, on purpose, from the
project root:

```sh
# the script path: ask Claude to "record the onion baseline", or copy the script into your repo for CI
check-onion.sh    --baseline .architecture/onion-baseline.txt    --record api/src
check-frontend.sh --baseline .architecture/frontend-baseline.txt --record web/src
```

Commit the files. From then on the rule is that a change must not raise a
number. When you fix a violation, re-record in the same change so the number
falls. Never re-record to hide a new violation. Agents and reviewers never run
`--record`.

If you use [sdd-engineering](../sdd-engineering/README.md), list the same
commands in `architectureChecks` of `.claude/sdd-engineering.json`.

## How it fits with the other plugins

- [architecture-review](../architecture-review/README.md): its
  `architecture-reviewer` agent preloads `onion-architecture`,
  `frontend-architecture`, `fastify-best-practices`, `drizzle-orm-patterns`,
  `zod`, `security` and `engineering-insights`, and runs the check scripts named
  in those skills.
- [sdd-engineering](../sdd-engineering/README.md): its spec, plan, implement and
  verify agents preload these skills, and `/implement` and `/workflow-retro` use
  `engineering-insights`.
- [research-tools](../research-tools/README.md): independent. The `researcher`
  agent doesn't use these skills.

## Limits and notes

- **Many skills, truncated descriptions.** With many plugins installed, Claude
  Code may shorten skill descriptions, so skills trigger less reliably. If you
  only need part of the stack, name the skill in your prompt.
- **The checks are heuristics.** They grep text and don't resolve types or
  imports. If a check reports a false positive that your rules allow, tighten
  the regex in `.claude/architecture.json` rather than the baseline. For real
  import-graph enforcement, add dependency-cruiser. The onion skill's
  `enforcement/README.md` has a rule set to start from.
- **Opinionated defaults.** The architecture skills assume Fastify + Drizzle +
  Zod on the backend, and Next.js App Router + TanStack Query on the frontend.
  The rules describe roles, so they still apply to similar stacks, but the
  check defaults may need options.
- **Only `engineering-insights` writes files**, and only `INSIGHTS.md` files in
  your project. The check scripts write only with `--record`.
- **Third-party skills** are kept verbatim from upstream. Report problems in them
  upstream, as listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).
