# The rings

Read top-down: each row may import everything below it, nothing above it. Paths
are the default convention from `SKILL.md`; the project's
`.claude/architecture.json` decides the real ones.

| # | Ring | Default path | MAY import | MUST NOT import |
|---|---|---|---|---|
| 6 | Transport | `src/modules/<m>/routes.ts`, `src/app.ts` | the HTTP framework, its own service, shared request helpers, contracts | the ORM, the DB schema, another module's internals |
| 5 | Application | `src/modules/<m>/service.ts` | the container type, its own repository/helpers/constants, contracts, the domain core | the HTTP framework, the ORM, concrete adapters |
| 4 | Persistence | `src/modules/<m>/repository.ts` | the ORM, the DB schema and client | services, routes, adapters, the HTTP framework |
| 3 | Infrastructure | `src/adapters/**` | npm SDKs, `node:*`, ports, shared error types | feature modules, another adapter, the HTTP framework |
| 2 | Platform | `src/platform/**` | ports, the DB client, adapters *(composition root only)* | the HTTP framework, feature logic |
| 1 | Ports & contracts | `src/contracts/**`, `src/ports.ts` | `zod`, itself | everything else |
| 0 | Domain core | `src/domain/**` or a separate package | `zod`, contracts, its own files | the server, `node:fs`, network, `process` |

Ring 0 is drawn below ring 1 on purpose: the core depends on the contracts and on
nothing else in the repository.

## The two sanctioned exceptions

**The composition root.** It imports concrete adapters *and* module
repositories. That is the point: one file knows every wiring decision, so no other
file has to. Mark Seemann's rule — a single location, as close to the entry point
as possible, where the object graph is composed.

**A shared row-types file** (e.g. `src/db/rows.ts`) may name ORM row types in one
place so cross-cutting consumers can reference a row shape without importing
another module's repository. Naming a row type there is fine; *using* one on
ring 5 or 6 is not — see `drizzle.md`.

## Why the direction matters

The outer rings are the ones that change: a route is reshaped by the UI, an
adapter by a vendor's SDK, the schema by a migration. The inner rings encode what
the product *is*. Palermo's framing: the database is not the centre, it is
external. Point the arrows inward and an SDK bump, a framework upgrade or a
database change cannot reach the business rules.

The practical payoff is testing. The domain core runs with stubbed ports and no
keys. A service runs against a container with mock adapters. Only ring 4 needs a
real database, which keeps the slow integration lane small.

## Cross-module contact

Modules do not reach into each other. Three sanctioned channels:

1. A shared module folder (e.g. `modules/_shared/`) — request-context helpers,
   shared param schemas.
2. A sibling's `constants.ts` or `types.ts` — literals and type-only shapes.
   One module's service importing another module's job-kind constant is fine.
3. The container — a repository or facade shared by several modules is
   constructed in the composition root, so the consumer never imports another
   module's folder.

Anything else is a cycle waiting to happen; an import-graph rule such as
`no-cross-module-internals` (see `../enforcement/README.md`) fails it.

## Adding a module

1. `routes.ts` — framework plugin, handlers only.
2. `service.ts` — takes the container, holds the logic.
3. `repository.ts` — takes the DB handle; every query scoped by the tenant or
   owner id when the schema is multi-tenant.
4. `helpers.ts` / `constants.ts` as needed — pure, no I/O.
5. Register the module in the app's module index (one import, one entry).
6. Run the structural check (and the import-graph gate, if any) — no number may rise.

Steps 2 and 3 are not optional because the module is small today. Modules that
skip them are where architecture debt accumulates first.
