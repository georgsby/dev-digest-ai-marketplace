# Ports, adapters and the composition root

A **port** is an interface on the innermost ring describing what the application
needs. An **adapter** is an implementation of it on the outermost ring. The
application depends on the port; the composition root decides which adapter
satisfies it. This is what "dependency inversion" means concretely: both the
service and the adapter point at the interface in the middle.

Ports live in the ports/contracts ring (by default `src/ports.ts` or
`src/contracts/`). Typical ports: `LLMProvider`, `Mailer`, `PaymentGateway`,
`GitClient`, `BlobStore`, `AuthProvider`, `SecretsProvider`, `Clock`. A port used
by only one pipeline can live next to that pipeline — it is still a port.

## Shared contract packages

When contracts are shared between packages (backend and frontend, or two
services), keep **one** source of truth: a workspace package both sides depend
on, or a generated client. If the project instead keeps *copies* of the contracts
(a vendored mirror per package), every port or contract change is an N-file
change — update every copy in the same change, or a consumer type-checks against
a stale shape. Prefer collapsing the copies into one package when you can.

## Adding an adapter

1. **Port** in the ports ring, phrased in the application's vocabulary:
   `symbols()`, `diff()`, `complete()`, `send()` — never `runRipgrep()` or
   `octokitPaginate()`. A port named after its implementation has already leaked.
2. **Implementation** in `src/adapters/<kind>/<impl>.ts`, one class implementing
   the port. It may import an SDK and `node:*`; it may not import feature modules
   or another adapter.
3. **An override field** (e.g. `ContainerOverrides`) so tests can inject a mock.
4. **A lazy getter in the composition root**, resolving credentials through the
   config / secrets port:

```ts
get mailer(): Mailer {
  if (this.overrides.mailer) return this.overrides.mailer;
  this._mailer ??= new SmtpMailer(this.secrets);
  return this._mailer;
}
```

The `overrides` check comes first, then the memoised construction. Lazy matters:
an adapter that needs an optional feature flag or credential must not stop the
container building for every other feature.

5. **A mock** next to the other test doubles if a test will need one.

## Using an adapter

```ts
export class ProjectService {
  constructor(private container: Container) {}          // ✅ the port bundle

  async refresh(id: string) {
    await this.container.git.clone(...);                 // ✅ resolved through the root
  }
}

const git = new SimpleGitClient(cloneDir);               // ❌ outside the composition root
```

A service takes the container (or the specific ports it needs) and reaches
adapters through it. Constructing a concrete adapter anywhere but the composition
root removes the seam that test overrides depend on — the `adapter_outside_root`
check in `check-onion.sh` flags it.

## Secrets

A new secret is read through one module — the config module or a
`SecretsProvider` port — never a `process.env` read in feature code. If secrets
can change at runtime (managed in a UI, rotated by a vault), read them through
the port at use time, not into a boot-time config object. The
`env_outside_config` check flags stray `process.env` reads.

## The cycle to watch for

The composition root imports a module's service (to build a facade), and that
service imports the `Container` type (to reach adapters). Both arrows are
individually correct; together they are a cycle.

When adding a service to the container, prefer:

- a **type-only** import of the interface (`import type { Search } from …`) with
  the concrete class imported once, or
- registering the factory from the module side.

Do not add a third participant to an existing cycle.
