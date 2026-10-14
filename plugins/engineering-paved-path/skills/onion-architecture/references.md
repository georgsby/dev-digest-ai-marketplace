# Sources

Where the rules in this skill come from, and what each source actually
contributes. Read the primary sources before arguing with a rule.

## The pattern itself

- **[The Onion Architecture: part 1](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)**
  — Jeffrey Palermo, 2008, the original. The dependency rule in his words: *"all
  code can depend on layers more central, but code cannot depend on layers
  further out from the core"*, and *"the database is not the center. It is
  external."* Also the framing this skill's ring table uses: the outer layer is
  reserved for things that change often.
- [part 2](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-2/) —
  the pattern stated formally; [part 3](https://jeffreypalermo.com/2008/08/the-onion-architecture-part-3/)
  — contrast with traditional layered architecture (why "UI → business → data" is
  *not* the same thing); [part 4 — After Four Years](http://jeffreypalermo.com/blog/onion-architecture-part-4-after-four-years/)
  — what held up in practice.
- **[DDD, Hexagonal, Onion, Clean, CQRS… How I put it all together](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)**
  — Herberto Graça. The best single explanation of how the rings compose: Onion
  takes the DDD layers and drops them *inside* the Ports & Adapters hexagon.
  Source for treating route handlers as an adapter rather than a layer.
- [Onion Architecture](https://medium.com/the-software-architecture-chronicles/onion-architecture-79529d127f85)
  — the same author's shorter piece on the pattern alone.
- [Clean vs Onion vs Hexagonal Architecture](https://milanjovanovic.tech/blog/clean-architecture-vs-onion-vs-hexagonal)
  — Milan Jovanović. Useful for the "these are the same rule with different ring
  names" conclusion, which is why this skill does not mix vocabularies.
- [Onion vs Clean vs Hexagonal](https://medium.com/@edamtoft/onion-vs-clean-vs-hexagonal-architecture-9ad94a27da91)
  — Eric Damtoft, a compact comparison.

## Domain core without I/O

- **[Boundaries](https://www.destroyallsoftware.com/talks/boundaries)** — Gary
  Bernhardt. Simple values as the boundary between subsystems; the argument
  behind the domain core's "inputs arrive resolved, as values".
- [Functional Core, Imperative Shell](https://www.destroyallsoftware.com/screencasts/catalog/functional-core-imperative-shell)
  — the screencast that names the pattern. "Many fast unit tests for the core,
  few integration tests for the shell" is the shape of the test lanes in `rules/testing.md`.
- [Simplify Your Code: Functional Core, Imperative Shell](https://testing.googleblog.com/2025/10/simplify-your-code-functional-core.html)
  — Google Testing Blog, a recent restatement with testing emphasis.

## Dependency injection

- **[Understanding the Composition Root](https://freecontent.manning.com/dependency-injection-in-net-2nd-edition-understanding-the-composition-root/)**
  — Seemann & van Deursen, free chapter. *A single location, as close as possible
  to the entry point, where all components are wired together.* This is exactly
  the composition root, and the reason it is allowed to break the ring rule.
- [Dependency Injection Principles, Practices, and Patterns](https://www.manning.com/books/dependency-injection-principles-practices-patterns)
  — the book, for Constructor Injection + Composition Root as one pair.

## Persistence without leaking the schema

- **[Atomic Repositories in Clean Architecture and TypeScript](https://blog.sentry.io/atomic-repositories-in-clean-architecture-and-typescript/)**
  — Sentry. States the failure mode this skill guards against: *"when HTTP handlers
  return database row types directly, you've coupled your API contract to your
  database schema"*, and *"modern ORMs like Drizzle are typed query builders —
  they don't map to entities"*, so the mapper must be explicit.
- [Repository Pattern in Nest.js with Drizzle ORM](https://medium.com/@vimulatus/repository-pattern-in-nest-js-with-drizzle-orm-e848aa75ecae)
  — a concrete Drizzle repository shape.
- [Drizzle ORM Best Practices](https://paulserban.eu/blog/post/drizzle-orm-best-practices-principles-patterns-and-real-world-case-studies/)
  — query-builder idioms, transactions.
- [Repository Pattern — Cosmic Python](https://www.cosmicpython.com/book/chapter_02_repository)
  — the canonical write-up of why the abstraction earns its keep.
- [DTOs, Mappers & the Repository Pattern](https://khalilstemmler.com/articles/typescript-domain-driven-design/repository-dto-mapper/)
  — Khalil Stemmler, the row → domain → DTO triad in TypeScript.
- [You might not need… the repository pattern](https://dev.to/jayfreestone/you-might-not-need-the-repository-pattern-46b)
  — the counter-argument, kept deliberately. Worth reading before adding a
  repository to a module that genuinely has one query.

## Boundaries and validation

- **[Parse, Don't Validate — In a Language That Doesn't Want You To](https://cekrem.github.io/posts/parse-dont-validate-typescript/)**
  — Alexis King's principle applied to TypeScript. *"A function deep in your
  domain logic that takes a User does not need to re-validate it."* This is why
  services take parsed values and never call `.parse()` again.
- [Zod documentation](https://zod.dev/) (and [v3](https://v3.zod.dev/) for projects still on Zod 3).
- [Achieving True Type Safety with Zod and Branded Types](https://zenn.dev/saitogo/articles/88e93fdf0b1dd5?locale=en)
  — for when a plain `string` id stops being good enough.

## Fastify as the transport ring

- [Plugins](https://fastify.dev/docs/latest/Reference/Plugins/) — encapsulation,
  the plugin DAG, `decorate`. The mechanism behind `app.decorate('container', …)`.
- [TypeScript reference](https://fastify.dev/docs/latest/Reference/TypeScript/)
  — `FastifyPluginAsync`, type providers.
- [Fastify plugins as building blocks for a backend Node.js API](https://snyk.io/blog/fastify-plugins-for-backend-node-js-api/)
  — Snyk, structuring an app out of plugins.
- [fastify-clean-template](https://github.com/Luxlorys/fastify-clean-template)
  — clean architecture delivered through Fastify's own idioms instead of a
  parallel DI framework. The approach this skill follows.

## Enforcing it mechanically

- **[dependency-cruiser rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md)**
  — `forbidden` rules, `from`/`to`, `path`/`pathNot`, group matching with `$1`,
  `severity: error`. The reference for the rule set in `enforcement/README.md`.
- [Validate Dependencies According to Clean Architecture](https://betterprogramming.pub/validate-dependencies-according-to-clean-architecture-743077ea084c)
  — a worked rule set for exactly this layering.
- [Avoid Cross Module Dependencies with Dependency Cruiser](https://dev.to/jacobandrewsky/avoid-cross-module-dependencies-with-dependency-cruiser-3b0b)
  — the `no-cross-module-internals` shape.
- [How We Enforce Architecture Boundaries at Scale](https://technology.lastminute.com/how-we-enforce-architecture-boundaries-at-scale-on-our-app/)
  — lastminute.com, on the baseline/ratchet approach to existing debt.
- [6 Tools for Enforcing Good Web Architecture](https://jmulholland.com/architecture-tools/)
  — the wider tool landscape, if `dependency-cruiser` ever stops fitting.
