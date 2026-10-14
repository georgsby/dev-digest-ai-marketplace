# Logic — three kinds, three homes

The recurring mistake is treating "logic" as one thing. It is three, and they do
not share a home.

| Kind | Example | Home | Tested by |
|---|---|---|---|
| **Server state** | which orders exist, an order's history | `lib/hooks/*` | hook test, `fetch` mocked |
| **Domain logic** | totals by status, sort order, `file:line` formatting | `lib/<domain>.ts` — pure, no React | plain unit test, no DOM |
| **UI state** | open tab, expanded row, draft comment | the component that owns it | RTL test |

## Rules

**Never copy server state into `useState`.** The query cache is already a
synchronized copy of something you do not own; a second copy is two sources of
truth and one of them is always stale. Derive from `data` instead, or put the
varying input in the query key.

**Never derive with a `useEffect`.** If it can be computed from props or state,
compute it during render:

```tsx
// ✗ an extra render pass, and a window where the two disagree
const [counts, setCounts] = useState(empty);
useEffect(() => setCounts(countByStatus(orders)), [orders]);

// ✓
const counts = countByStatus(orders);
```

Effects are for synchronizing with something outside React — an SSE stream, a
keyboard listener, `document.title`. If there is no external system, there is no
Effect.

**The component attaches the handler; the handler is not the logic.** The body of
an `onClick` should read as a sentence: call a named helper, call a mutation,
update one piece of state. Anything longer moves to `helpers.ts` or a hook.

**Custom hooks, not container components.** The presentational/container split was
retracted by its own author once hooks existed. A `use<Thing>` hook gives the same
separation without inventing two kinds of component.

**Keep components and hooks pure.** Same inputs → same output; no mutation of
anything created outside the render. Side effects live in handlers and Effects.

## What "pure domain logic" buys

Derivations the backend does not provide happen in the client (see the
anti-corruption layer in `rules/data.md`). That is only sustainable if they live
somewhere testable:

```ts
// lib/orders.ts — no React, no fetch, no DOM
export function linesByShipment(orders: readonly OrderRecord[]): Map<string, LinePreview[]>
```

A pure module like this is the part of the client that survives a redesign, gets a
cheap unit test, and can be reasoned about without mounting anything. Put the
derivation there **first**, and let the component call it.

## State placement

Push state to the lowest component that needs it. Lifting is forced by a second
consumer; pushing down has to be done on purpose, so do it when you notice.

Escalation order, cheapest first:

1. local `useState` in the owning component;
2. **the URL** (`?tab=`, filters) when it should survive a refresh or be
   shareable — see `rules/nextjs.md`;
3. props, one or two levels;
4. composition (`children`) to skip a level of drilling;
5. a context in `lib/<name>.tsx`, mounted in the providers file — only for
   genuinely cross-cutting state (theme, toasts, current workspace).

If the project has no global store, adding one is an architecture decision, not a
refactor. If it has one, server state still stays in the query cache.
