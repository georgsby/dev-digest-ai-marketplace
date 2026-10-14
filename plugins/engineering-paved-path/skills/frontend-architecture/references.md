# Sources

Where these rules come from. **Bold** = read this before arguing with a rule.

## Structure and colocation

- **[bulletproof-react — project structure](https://github.com/alan2207/bulletproof-react/blob/master/docs/project-structure.md)**
  — the feature-folder reference. Two rules taken directly: *"It might not be a
  good idea to import across the features. Instead, compose different features at
  the application level"*, and the unidirectional flow **shared → features → app**.
  Also: prefer direct imports over barrels.
- **[Kent C. Dodds — Colocation](https://kentcdodds.com/blog/colocation)** — the
  maxim behind the whole placement table: *"Place code as close to where it's
  relevant as possible."* Names the exception too (end-to-end tests do not colocate).
- **[Feature-Sliced Design — Slices and segments](https://feature-sliced.design/docs/reference/slices-segments)**
  — segments named by **purpose, not essence**; `components`, `hooks`, `types` are
  called out as bad names. The argument for `constants.ts` / `helpers.ts` /
  `styles.ts` over a `utils/` bucket.
  [Public API](https://feature-sliced.design/docs/reference/public-api) — the
  per-folder `index.ts` rule.
- [Robin Wieruch — React Folder Structure (2026)](https://www.robinwieruch.de/react-folder-structure/)
  — the component-folder shape this skill uses, and the promotion rule: one feature uses
  it → it lives there; two or more → it moves up.
- [The utility module antipattern](https://www.yanglinzhao.com/posts/utils-antipattern/)
  · [Dunghill anti-pattern](https://mattilehtinen.com/articles/dunghill-anti-pattern-why-utility-classes-and-modules-smell/)
  — why a `utils` file has no admission criteria and becomes a graveyard.
- [Next.js #12557 — tree shaking and barrel files](https://github.com/vercel/next.js/issues/12557)
  · [The hidden cost of barrel files](https://medium.com/capchase/the-hidden-cost-of-barrel-files-how-capchase-sped-up-builds-by-5x-fcb38bcbe8be)
  — why `export *` is the form that hurts.

## Components

- **[Alex Kondov — Tao of React](https://alexkondov.com/tao-of-react/)** — "Manage
  Component Size", **"Number of Props"** (over ~5 signals too many
  responsibilities), "Avoid Nested Render Functions", "Organize Helper Functions",
  "Use Absolute Paths". Most of `rules/components.md`.
- [Kent C. Dodds — When to break up a component](https://kentcdodds.com/blog/when-to-break-up-a-component-into-multiple-components)
  — the counterweight: splitting for its own sake buys indirection, not clarity.
- [When to split a React component (and when you're over-engineering)](https://dev.to/137foundry/when-to-split-a-react-component-and-when-youre-over-engineering-2a6e)
  — the one-sentence test, the ~150-line heuristic, the rule of three.
- [TkDodo — Component composition is great btw](https://tkdodo.eu/blog/component-composition-is-great-btw)
  — children and slots instead of boolean-prop explosion.

## Logic and state

- **[react.dev — You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect)**
  — *"When something can be calculated from existing props or state, don't put it
  in state. Instead, calculate it during rendering."* The full list of Effects to
  delete.
- **[react.dev — Components and Hooks must be pure](https://react.dev/reference/rules/components-and-hooks-must-be-pure)**
  — idempotent render, side effects in handlers and Effects only.
- [react.dev — Reusing logic with custom hooks](https://react.dev/learn/reusing-logic-with-custom-hooks)
  — the official position that custom hooks are how logic is shared.
- [Dan Abramov — Presentational and Container Components](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0)
  — read the 2019 update: *"I don't suggest splitting your components like this
  anymore."* Cited so nobody reintroduces the pattern.
- [Kent C. Dodds — State colocation](https://kentcdodds.com/blog/state-colocation-will-make-your-react-app-faster)
  — state belongs at the lowest level that needs it; lifting is forced, pushing
  down is deliberate.
- [Josh W. Comeau — useMemo and useCallback](https://www.joshwcomeau.com/react/usememo-and-usecallback/)
  — what memoization actually buys. Whether the "let the compiler handle it" advice applies depends on whether React
  Compiler is enabled in the project.

## Data and the anti-corruption layer

- **[TkDodo — React Query as a State Manager](https://tkdodo.eu/blog/react-query-as-a-state-manager)**
  — *"resist the urge to sync server data to a different state manager"*; what
  `staleTime` controls; wrap `useQuery` in a custom hook.
- [TkDodo — Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
  · [Practical React Query](https://tkdodo.eu/blog/practical-react-query)
  · [React Query Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
  — key structure, defaults, and error surfacing (one error type + a global
  `QueryCache.onError`).
- **[Tomasz Ducin — Anti-Corruption Layer in Frontend Development](https://ducin.dev/anti-corruption-layer-in-frontend-development)**
  — the pattern behind this skill's core constraint: *"the model, the semantics, the knowledge
  from one module leaks to another, hence strengthening coupling."* Mapping
  happens at the integration point and can be introduced one contract at a time.
- [Microsoft Learn — Anti-Corruption Layer pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer)
  — the canonical statement, including when it is not worth it.

## Next.js (App Router architecture)

- **[Next.js — Project structure and organization](https://nextjs.org/docs/app/getting-started/project-structure)**
  — the authority for `_components/`: files colocate in `app/` without becoming
  routable, and a private `_folder` opts itself out of routing entirely. Next.js
  is explicitly unopinionated about the rest, which is why this skill is not.
- **[Next.js — The Server and Client Boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary)**
  — **code** crosses through imports, **data** crosses through props and must be
  serializable; *"a rendered React element can cross the boundary because it is
  serializable data"*; and the rule this skill enforces: *"You only need
  `'use client'` at the entry to a client subtree, not on every file inside it."*
- [Next.js — Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
  — when each is appropriate; providers must be Client Components; the wrapper
  technique for third-party client-only code.
- [Next.js — `layout.js`](https://nextjs.org/docs/app/api-reference/file-conventions/layout)
  · [Route Groups](https://nextjs.org/docs/app/api-reference/file-conventions/route-groups)
  · [`template.js`](https://nextjs.org/docs/app/api-reference/file-conventions/template)
  — *"On navigation, layouts preserve state, remain interactive, and do not
  rerender"* — the reason shared chrome belongs in a route-group `layout.tsx`.
- [Next.js Learn — Handling errors](https://nextjs.org/learn/dashboard-app/error-handling)
  · [error.tsx / not-found.tsx / global-error.tsx](https://dev.to/aon_infotech_3a1b6ff525fc/error-handling-in-nextjs-app-router-errortsx-not-foundtsx-and-global-errortsx-29k8)
  — `error.tsx` must be a Client Component, catches its segment and below, and not
  its own segment's layout.
- [Next.js — Single-Page Applications guide](https://nextjs.org/docs/app/guides/single-page-applications)
  — the officially supported shape of a client-data app: router + shell, data
  fetched client-side against a separate API.
- [Robin Wieruch — Next.js search params for URL state](https://www.robinwieruch.de/next-search-params/)
  — `useSearchParams` + `router.replace` (not `push`) for filters and tabs.
- [Why Next.js is the ultimate tool for the BFF pattern](https://dev.to/carlosorioli/why-nextjs-is-the-ultimate-tool-for-the-bff-backend-for-frontend-pattern-4lej)
  · [Route handlers as a data proxy](https://shahin.page/article/nextjs-backend-for-frontend-route-handlers-data-proxy)
  — what a Route Handler is actually for, and its cost.

## Styling

- [The developer's guide to design tokens and CSS variables](https://penpot.app/blog/the-developers-guide-to-design-tokens-and-css-variables/)
  · [Design tokens with Tailwind v4 + CSS variables](https://www.maviklabs.com/blog/design-tokens-tailwind-v4-2026/)
  — primitive vs semantic tokens; components consume the semantic layer only
  (`var(--border)`, `var(--accent)`).

## Related skills

- `engineering-paved-path:onion-architecture` — the backend counterpart; same
  shape, same baseline-ratchet philosophy, same `.claude/architecture.json`.
- `engineering-paved-path:react-best-practices` — correctness and mechanics. This
  skill deliberately does not restate them.
- Next.js mechanics: the Next.js documentation (bundled with `next` in recent
  versions).
