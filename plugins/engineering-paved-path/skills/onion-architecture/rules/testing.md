# Testing by ring

The rings decide the lane. If a test needs Docker to check a business rule, the
rule is on the wrong ring.

| Ring | Lane | What it uses | Example |
|---|---|---|---|
| 0 domain core | unit (the core package's own tests) | stubbed ports, no keys | `pricing.test.ts` |
| 1 ports/contracts | unit | zod parsing only | `contracts.test.ts` |
| 3 infrastructure | unit | mocks / recorded responses | `adapters.test.ts` |
| 5 application | unit | the container with mock adapters (overrides) | service tests |
| 4 persistence | integration (e.g. `*.it.test.ts`) | a real database (e.g. Testcontainers) | `orders.it.test.ts` |
| 6 transport | both | route smoke hermetic (`app.inject`); full flow integration | `routes-smoke.test.ts` |

Integration tests need a real database; **everything else must stay hermetic**.
A filename convention makes the lane selectable without configuration, for
example with Vitest:

```sh
vitest run --exclude '**/*.it.test.ts'   # unit, no Docker
vitest run .it.test                      # integration, Docker
```

Use the project's own scripts if it already defines the lanes.

## The architecture test is a unit test

If the project has an import-graph gate (dependency-cruiser, an architecture
test), it needs no Docker and no network — it belongs in the hermetic lane and
runs on every push. The same ratchet applies as for `check-onion.sh`:

- a violation **not** in the baseline fails → no new debt;
- a baseline entry that no longer reproduces should fail too → fixing something
  forces a re-record, so the list can only shrink.

## Why layering buys test speed

Mock the outside world, keep one real integration per data-backed workflow. That
is only affordable when the business rule is reachable without the database. A
rule inside a route handler next to a database call can *only* be tested with a
booted server and a live database — so it lands in the slow lane, or it does not
get tested at all. That is the practical reason for the dependency rule, more
than any diagram.

When a service needs an adapter, inject it — do not reach for a network mock:

```ts
const container = new Container(config, db, {
  mailer: new MockMailer(),
  llm: new MockLLMProvider(),
});
```

Test overrides exist for exactly this. If a new service cannot be tested that
way, it has taken a concrete dependency it should have taken as a port.
