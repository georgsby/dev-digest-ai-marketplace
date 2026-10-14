# Worked examples

Illustrative refactors in the default layout (`src/modules/<m>/…`). Names are
examples; the shape of each fix is what carries over.

## 1. Routes-only module → full onion

The most common violation: one handler that queries, maps and serialises in place.

### Before — `modules/workspace/routes.ts`

```ts
import { eq } from 'drizzle-orm';                       // ← ring 6 importing ring 4
import * as t from '../../db/schema.js';

export default async function workspaceRoutes(app: FastifyInstance) {
  app.get('/workspace', async (req) => {
    const { tenantId } = await getContext(app.container, req);
    const projects = await app.container.db             // ← query in the handler
      .select().from(t.projects).where(eq(t.projects.tenantId, tenantId));
    return {
      tenantId,
      projects: projects.map((p) => ({                  // ← row→DTO mapping inline
        id: p.id,
        full_name: p.fullName,
        archived: Boolean(p.archivedAt),                // ← a business rule, in transport
      })),
    };
  });
}
```

Three rings in a dozen lines. `archived: Boolean(p.archivedAt)` is the tell: that
is a domain statement ("a project counts as archived when it has a date"), and it
is untestable without booting the server and the database.

### After

**`repository.ts`** — the only file that knows `t.projects` exists:

```ts
import { eq } from 'drizzle-orm';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export type ProjectRow = typeof t.projects.$inferSelect;

export class WorkspaceRepository {
  constructor(private db: Db) {}

  async listProjects(tenantId: string): Promise<ProjectRow[]> {
    return this.db.select().from(t.projects).where(eq(t.projects.tenantId, tenantId));
  }
}
```

**`helpers.ts`** (or `workspace.mapper.ts`) — the row→DTO mapper, pure and unit-testable:

```ts
export function toProjectSummary(row: ProjectRow): ProjectSummary {
  return {
    id: row.id,
    full_name: row.fullName,
    archived_at: row.archivedAt?.toISOString() ?? null,
    archived: Boolean(row.archivedAt),
  };
}
```

**`service.ts`** — the application ring; takes the container, no SQL:

```ts
export class WorkspaceService {
  private repo: WorkspaceRepository;
  constructor(private container: Container) {
    this.repo = new WorkspaceRepository(container.db);
  }

  async overview(tenantId: string): Promise<WorkspaceOverview> {
    const rows = await this.repo.listProjects(tenantId);
    return { tenantId, projects: rows.map(toProjectSummary) };
  }
}
```

**`routes.ts`** — transport only:

```ts
export default async function workspaceRoutes(app: FastifyInstance) {
  const service = new WorkspaceService(app.container);

  app.get('/workspace', async (req) => {
    const { tenantId } = await getContext(app.container, req);
    return service.overview(tenantId);
  });
}
```

Then lock the win in: `check-onion.sh` now reports fewer `orm_import_leak` /
`query_outside_persistence` findings than the baseline ("improved"). Re-record
the baseline with `--record` and commit the code and the baseline together, so
the number cannot creep back up.

### The recipe, generalised

1. Move every query into the repository, one method per query, scoped by the
   tenant / owner id.
2. Move every `.map(row => ({…}))` into a named mapper.
3. Move every `if`/branch about domain state into the service.
4. Leave the context lookup, the status code and the `return` in the route.
5. Re-record the baseline and commit the shrink.

## 2. The same recipe at scale

A large routes file — four routes, a dozen-plus database calls, two inline
mappings and the "external API unavailable" fallbacks inside the handlers —
splits the same way:

| File | Holds |
|---|---|
| `routes.ts` (~50 lines) | handlers: context, one service call, return |
| `service.ts` | sync, backfill, the degradation fallbacks, proxies to adapters |
| `repository.ts` | the query methods, plus read-model lookups for lists |
| `helpers.ts` | pure grouping / indexing functions and the DTO mappers |
| `constants.ts` | limits such as `BACKFILL_LIMIT` |

Three things worth copying:

**The degradation policy moves to the service, not the route.** A
`tryExternal()` helper returns `Client | null` and logs once; every "serve what is
persisted" branch reads as a plain `if (client)`. The route no longer knows the
external API can be absent.

**The logger is passed in, not imported** from another module. A logger type that
lives on an inner ring (platform) avoids a cross-module import and a new
violation.

**Grouping logic becomes testable.** Loops mutating `Map`s inside a long handler
become named pure functions, unit testable without a database. That is the whole
argument for the dependency rule, in one file.

Behaviour must stay unchanged: the existing integration tests pass before and
after.

## 3. Adapter → module (infrastructure depending on a feature)

```ts
// src/adapters/parser/index.ts
import { MAX_SIGNATURE_CHARS, SUPPORTED_EXT } from '../../modules/search/constants.js';
```

Infrastructure importing a feature. Both constants describe *what the adapter can
parse*, not what the search module wants — so they belong to the adapter:

```ts
// src/adapters/parser/constants.ts
export const SUPPORTED_EXT = [...] as const;
export const MAX_SIGNATURE_CHARS = 200;
```

…and `modules/search/constants.ts` re-exports them if the pipeline still needs
the same list. The arrow now points from the module to the adapter — outer ring
to inner contract, as required.

## 4. What *not* to do

```sh
check-onion.sh --baseline .architecture/onion-baseline.txt --record api/src   # after introducing a violation
```

The baseline exists to stop today's debt from blocking work, not to absorb
tomorrow's. The check will pass — and the next reviewer has no way to tell the two
cases apart. Move the code instead.
