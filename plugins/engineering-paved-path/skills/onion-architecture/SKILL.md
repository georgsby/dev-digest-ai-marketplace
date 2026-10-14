---
name: onion-architecture
description: "Enforces Onion Architecture (ports and adapters, dependency rule pointing inward) in TypeScript backends — typically Fastify + Drizzle + Zod. Use when adding or changing backend code: creating a module, adding a route, service or repository, wiring an adapter into the composition root / DI container, defining a port or contract, writing a query, keeping a domain core I/O-free, or reviewing layering in a diff. Which directories are which ring comes from the project's .claude/architecture.json (or is detected). Ships a grep-level check script with a per-project baseline ratchet. Trigger terms: onion architecture, clean architecture, hexagonal, ports and adapters, dependency rule, layering, boundary, coupling, service layer, repository pattern, DI container, composition root, domain model, where should this code live."
metadata:
  tags: architecture, onion, backend, layering, fastify, drizzle, zod, dependency-injection
---

## The dependency rule

**Imports point inward. Always.** An outer ring may name an inner one; an inner
ring must not know the outer one exists.

```text
     ┌──────────────────────────────────────────────────────┐
     │ transport     route handlers · app bootstrap         │  the HTTP framework lives ONLY here
     │  ┌───────────────────────────────────────────────┐   │
     │  │ application   services / use cases            │   │  orchestration, jobs, tx boundary
     │  │  ┌────────────────────────────────────────┐   │   │
     │  │  │ persistence  repositories              │   │   │  the ONLY ORM / query code
     │  │  │  ┌─────────────────────────────────┐   │   │   │
     │  │  │  │ ports + contracts               │   │   │   │  interfaces + zod schemas only
     │  │  │  └─────────────────────────────────┘   │   │   │
     │  │  └────────────────────────────────────────┘   │   │
     │  └───────────────────────────────────────────────┘   │
     └──────────────────────────────────────────────────────┘
        composition root  the DI container        ← the one place that may
        infrastructure    adapters/*              ← reach across rings, by design

        domain core       pure domain package     ← knows NONE of the above
```

Two things sit deliberately outside the rings:

- **The composition root** (a `container.ts`, `bootstrap.ts` or equivalent) is
  *allowed* to import concrete adapters and module repositories — wiring the
  graph is its whole job. Nothing else may do that.
- **The domain core** (if the project has one — a `domain/` folder or a separate
  package) has zero I/O and zero knowledge of the server. Everything it needs
  arrives resolved, as a value, through an injected port.

## Your project's rings

The rings above are roles, not folder names. Which files play which role is a
**project** decision, read in this order:

1. **Declared** — the `onion` section of `.claude/architecture.json` in the
   project root (shared with `engineering-paved-path:frontend-architecture`):

   ```json
   {
     "onion": {
       "roots": ["api/src"],
       "baseline": ".architecture/onion-baseline.txt",
       "options": {
         "composition-root": "api/src/platform/container\\.ts$",
         "domain": "^packages/core/src/"
       }
     }
   }
   ```

   `roots` are the backend source roots, `baseline` is the project's debt file,
   and every `options` key is a ring regex — the same names as the check script's
   flags (`persistence`, `schema`, `transport`, `config`, `composition-root`,
   `adapters`, `adapter-class`, `domain`, `contracts`, `exclude`). Omitted keys
   use the defaults. Full reference: [enforcement/README.md](enforcement/README.md).
   The `onion` value may also be an array, one object per backend package.
2. **Detected** — no file: take the backend workspace package (the one depending
   on the HTTP framework / ORM) and its `src/`, look for the conventional names
   (`routes`/`controllers`, `service`, `repository`, `adapters`/`infrastructure`,
   `container`/`composition-root`, `config`/`env`, `contracts`/`ports`, `domain`),
   and **state the mapping you assumed** in your answer or report.

The default convention, used in the examples throughout this skill (illustrative
— your project's mapping wins):

```text
src/
├── app.ts                         transport — framework bootstrap
├── modules/<m>/
│   ├── routes.ts                  transport
│   ├── service.ts                 application
│   ├── repository.ts              persistence
│   ├── helpers.ts · constants.ts  pure, no I/O
├── adapters/<kind>/               infrastructure
├── platform/container.ts          composition root
├── platform/config.ts             the only process.env reader
├── contracts/ · ports.ts          ports + contracts (zod only)
└── db/schema/ · db/client.ts      ORM schema and client
```

## Where does this code go?

| The code… | goes in | never |
|---|---|---|
| reads `req`, sets a status code, shapes the HTTP response | a route handler | contains a query or a business rule |
| orchestrates steps, owns the transaction boundary, enqueues a job | a service | imports the ORM or the HTTP framework |
| is a SQL statement | a repository | leaks an ORM row type past its own module |
| talks to the outside world (an API, git, an LLM, the filesystem) | an adapter | imports a feature module |
| is the interface that outside world must satisfy | a port (ports/contracts ring) | imports an implementation |
| is a pure transform on values | `helpers.ts`, or the domain core | does I/O |
| is a literal, a limit, a job kind | `constants.ts` | is duplicated in two modules |
| decides *which* concrete thing gets used | the composition root | appears anywhere else |

When two answers fit, pick the **inner** one — inward code is cheaper to test and
has fewer reasons to change.

## Non-negotiables

1. **Route handlers import no ORM and no DB schema.** A module without a service
   is debt, not a licence. See `rules/fastify.md`.
2. **A service takes the container (or its ports), never a concrete adapter.**
   That is what lets tests inject mocks. See `rules/ports-di.md`.
3. **A row type never crosses out of persistence.** The repository returns a row;
   a mapper turns it into the contract DTO. See `rules/drizzle.md`.
4. **Parse once, at the edge.** Zod validates *input* in the route `schema`;
   nothing re-parses downstream. If routes do not declare `schema.response`, the
   response contract is a compile-time type only and the DTO mapper is what
   actually guarantees the shape. See `rules/fastify.md`.
5. **Secrets and config come from one module** (a config / secrets port), never
   `process.env` in feature code.
6. **The domain core stays I/O-free.** No `node:fs`, no network, no
   `process.env`, no server import. See `rules/domain-core.md`.
7. **Adapters are siblings.** One adapter does not import another; the
   composition root composes them.

## Before you commit

Run the project's own gates (typecheck, unit tests — the commands come from the
project's scripts or the plan's `Verify:` lines; use the project's package
manager), then the structural check, with the values from
`.claude/architecture.json` (or the mapping you detected):

```sh
"${CLAUDE_SKILL_DIR}/enforcement/check-onion.sh" \
  --baseline <onion.baseline> [--<option> <value> ...] <root> [<root> ...]
```

- Default mode reports and exits 0; `--strict` exits 1 when any count is above
  the baseline; `-v` prints offending lines for every check.
- **Your change must not raise a number.** A count above the baseline prints the
  offending lines — fix them.
- No baseline yet → every finding counts against zero. Creating the baseline is a
  project decision (see below), not something to do mid-task to get a green run.

If the project has an import-graph gate (dependency-cruiser, eslint boundaries
rules, an architecture test), it is the hard gate and runs too.
[enforcement/README.md](enforcement/README.md) has a dependency-cruiser rule set
that mirrors these rings.

## The baseline (project-owned debt list)

The baseline is a small `key=count` file **in the project** (suggested:
`.architecture/onion-baseline.txt`, committed). It turns the check into a
ratchet: existing debt does not block work, new debt does.

- Create it once, deliberately: `check-onion.sh --baseline <file> --record <roots>`
  and commit it with a note in the PR.
- **Fixed a violation?** Re-record in the same change, so the number falls.
- **Hit a violation you did not cause?** Move the code to the right ring.
  Re-recording to absorb a *new* violation is the one move this skill forbids
  outright.

The baseline file is the project's known-debt list. Touching a listed violation
means fixing it, not extending it.

## Rules

| File | Covers |
|---|---|
| `rules/layers.md` | the rings, and exactly what each may import |
| `rules/fastify.md` | routes as the transport adapter; plugins, Zod at the edge |
| `rules/drizzle.md` | repository-only queries, row→DTO mapping, transactions |
| `rules/ports-di.md` | defining a port, wiring the composition root, test overrides |
| `rules/domain-core.md` | the domain core: functional core, imperative shell |
| `rules/testing.md` | which test lane each ring belongs to |

Worked before/after diffs → `examples.md`. Sources → `references.md`.
Framework mechanics live in `engineering-paved-path:fastify-best-practices`,
`engineering-paved-path:drizzle-orm-patterns` and `engineering-paved-path:zod`;
this skill only decides *where* code goes.
