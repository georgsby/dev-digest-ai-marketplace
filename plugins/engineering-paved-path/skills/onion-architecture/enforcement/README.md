# Enforcement

Two kinds of gate. The **soft gate** ships with this skill: `check-onion.sh`,
grep-level checks counted against a project-owned baseline. The **hard gate** is
an import-graph tool the project adds itself (a dependency-cruiser rule set is
below); it is optional.

## Soft gate — `check-onion.sh`

```sh
check-onion.sh [options] <src-root> [<src-root> ...]
```

Run it from the project root. In a skill or agent, refer to it as
`${CLAUDE_SKILL_DIR}/enforcement/check-onion.sh` (see `SKILL.md`); a project that
wants it in CI copies the script into its own repository.

| Mode | Effect |
|---|---|
| *(default)* | report counts against the baseline, exit 0 |
| `--baseline FILE` | the project's baseline file; absent file → every count compares to 0 |
| `--strict` | exit 1 if any count is **above** the baseline |
| `--record` | write the current counts to `--baseline FILE` (creates the directory) |
| `-v` | also print offending lines for checks at or below the baseline |

Exit 2 means a usage error (no root, a root that is not a directory, `--record`
without `--baseline`, an unknown option).

### The checks

| Key | Rule it defends | What the grep sees |
|---|---|---|
| `row_types_leak` | row types stay in the persistence ring | `$inferSelect` / `$inferInsert` outside persistence and schema files |
| `orm_import_leak` | only persistence talks to the ORM | `from 'drizzle-orm…'` outside persistence and schema files |
| `query_outside_persistence` | queries stay in repositories | `db.` / `tx.` `select\|insert\|update\|delete\|execute\|transaction\|query` outside persistence and schema |
| `env_outside_config` | config and secrets come from one module | `process.env` outside config files |
| `http_import_leak` | the HTTP framework stays in transport | `from 'fastify…'` / `'@fastify/…'` outside transport and the composition root |
| `adapter_outside_root` | adapters are built in the composition root | `new <AdapterClass>(` outside the composition root and adapter folders |
| `domain_io` | the domain core stays I/O-free *(needs `--domain`)* | `node:fs`, `child_process`, `http(s)`, `net`, the ORM, the HTTP framework or `process.env` in domain files |
| `contracts_import_leak` | contracts import only zod *(needs `--contracts`)* | a non-relative import other than `zod` in contract files |

Test files, mocks, `vendor/` and generated code are excluded by default
(`--exclude`). The checks are heuristics: they see text, not types. A false
positive the rules genuinely allow is fixed by tightening the ring regex in
`.claude/architecture.json`, never by re-recording the baseline.

### Ring options

Every option is an extended regular expression matched against the file path as
grep prints it (relative to the directory you run from, e.g.
`api/src/modules/orders/service.ts`).

| Option | Default | Meaning |
|---|---|---|
| `--persistence` | `(repositor(y\|ies)\|\.repo\|mappers?)(\.ts$\|/)` | files allowed to use the ORM and run queries |
| `--schema` | `/(db\|database\|schema\|migrations\|drizzle)/\|schema\.ts$` | ORM schema, DB client, migrations |
| `--transport` | `(routes?\|controllers?\|handlers?\|plugins?)(\.ts$\|/)\|/(app\|server\|main)\.ts$` | files allowed to import the HTTP framework |
| `--config` | `(^\|/)(config\|env)(\.ts$\|/)` | files allowed to read `process.env` |
| `--composition-root` | `(container\|composition-root\|bootstrap)\.ts$` | files allowed to construct adapters |
| `--adapters` | `/(adapters\|infrastructure\|infra)/` | adapter implementations (may construct SDK clients) |
| `--adapter-class` | `[A-Z][A-Za-z0-9]*(Client\|Provider\|Adapter\|Gateway)` | class names that count as adapters |
| `--domain` | *(unset — check skipped)* | the domain core |
| `--contracts` | *(unset — check skipped)* | ports and contracts |
| `--exclude` | tests, mocks, `vendor/`, generated | ignored paths |
| `--orm-module` | `drizzle-orm` | ORM import specifier |
| `--http-module` | `fastify\|@fastify/` | HTTP framework import specifier |

## Project configuration — `.claude/architecture.json`

One optional file in the project root declares the mapping for both
`engineering-paved-path:onion-architecture` and `engineering-paved-path:frontend-architecture`. This skill reads the `onion`
section:

```json
{
  "onion": {
    "roots": ["api/src", "packages/core/src"],
    "baseline": ".architecture/onion-baseline.txt",
    "options": {
      "composition-root": "api/src/platform/container\\.ts$",
      "config": "api/src/platform/config\\.ts$",
      "domain": "^packages/core/src/",
      "contracts": "/contracts/"
    }
  }
}
```

| Key | Meaning |
|---|---|
| `roots` | source roots passed as positional arguments |
| `baseline` | the project's baseline file, passed as `--baseline` |
| `options` | `{ "<flag name without -->": "<value>" }`, passed as `--<flag> <value>` |

`onion` may also be an array of such objects (one per backend package); run the
script once per entry. The command built from the example above:

```sh
check-onion.sh --baseline .architecture/onion-baseline.txt \
  --composition-root 'api/src/platform/container\.ts$' \
  --config 'api/src/platform/config\.ts$' \
  --domain '^packages/core/src/' --contracts '/contracts/' \
  api/src packages/core/src
```

No file → the skill detects roots and uses the defaults, and states the mapping it
assumed. If the project uses `sdd-engineering`, the same command can be listed in
`architectureChecks` of `.claude/sdd-engineering.json`.

## The baseline

A `key=count` file in the project, written only by `--record`:

```text
# onion-architecture baseline — counts, not a licence.
# Regenerate ONLY after fixing something: the numbers may fall, never rise.
# roots: api/src
# recorded: 2026-10-14
row_types_leak=3
orm_import_leak=2
query_outside_persistence=7
env_outside_config=0
...
```

- **Create** it once, deliberately, with `--record`, and commit it (suggested
  path: `.architecture/onion-baseline.txt`). It is the project's debt list.
- A count went **up** → the check prints the offending lines. Fix them.
- A count went **down** → re-record and commit the new baseline in the same
  change, so the ratchet only tightens.
- Re-recording to silence a *new* violation is the one move this skill forbids
  outright. Reviewers and agents never run `--record`; it writes project state.

## Optional hard gate — dependency-cruiser

`check-onion.sh` reads text. For real import-graph enforcement (including
relative imports and cycles), add [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)
to the backend package. A rule set mirroring the rings, for the default layout —
adjust the paths to your project:

```js
// .dependency-cruiser.cjs (excerpt)
module.exports = {
  forbidden: [
    { name: 'no-routes-to-db', severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to:   { path: ['^src/db/', 'drizzle-orm'] } },
    { name: 'no-service-to-db', severity: 'error',
      from: { path: '^src/modules/[^/]+/service\\.ts$' },
      to:   { path: ['^src/db/schema', 'drizzle-orm'] } },
    { name: 'no-module-helpers-to-db', severity: 'error',
      from: { path: '^src/modules/[^/]+/(helpers|constants)\\.ts$' },
      to:   { path: 'drizzle-orm' } },
    { name: 'no-adapter-to-module', severity: 'error',
      from: { path: '^src/adapters/' }, to: { path: '^src/modules/' } },
    { name: 'no-adapter-to-adapter', severity: 'error',
      from: { path: '^src/adapters/([^/]+)/' },
      to:   { path: '^src/adapters/', pathNot: '^src/adapters/$1/' } },
    { name: 'no-adapter-to-transport', severity: 'error',
      from: { path: ['^src/adapters/', '^src/platform/'] }, to: { path: 'fastify' } },
    { name: 'no-contracts-to-impl', severity: 'error',
      from: { path: '^src/contracts/' },
      to:   { pathNot: ['^src/contracts/', 'zod'] } },
    { name: 'no-cross-module-internals', severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to:   { path: '^src/modules/', pathNot: ['^src/modules/$1/', '^src/modules/_shared/', '/(constants|types)\\.ts$'] } },
    { name: 'no-repository-to-service', severity: 'error',
      from: { path: 'repository\\.ts$' }, to: { path: '(service|routes)\\.ts$' } },
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
  ],
};
```

Run it with `depcruise src --config .dependency-cruiser.cjs`. For existing debt,
dependency-cruiser's `--output-type baseline` / `--ignore-known` pair gives the
same ratchet as the baseline file above: commit the known-violations file, and
fail on anything new.
