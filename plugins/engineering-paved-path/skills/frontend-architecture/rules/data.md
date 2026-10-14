# Data — hooks, the API client, and the anti-corruption layer

```text
component  →  lib/hooks/<domain>.ts  →  lib/api.ts  →  the HTTP API
             (useQuery / useMutation)   (apiFetch, ApiError)
```

Three files, one direction. A component that skips a step becomes hard to test:
test setups typically mock `fetch` (or the API client) in one place, so anything
that reaches the network another way has nothing standing behind it.

## Rules

**The API client owns every `fetch`.** It knows the base URL (resolved once from
the environment), sets the JSON header only when a body is actually sent, and
normalizes every failure to one error type (e.g. `ApiError` with `status` /
`code`; `status: 0` meaning the API is unreachable).

**The data hooks own every `useQuery` / `useMutation`.** One hook per use case,
named for the concept (`useOrders`, `useOrderHistory`, `useCancelOrder`), grouped
by domain file and re-exported from `hooks/index.ts` with named exports.

**Branch on the error type, never on message text.** `status >= 500` or `0` is a
toast (handled once, globally — e.g. a `QueryCache` `onError`); an expected `404`
is an inline empty state, and must stay silent.

**Query keys are structured and stable** — `["order-history", orderId]`, not a
template string. Everything the result depends on goes *in the key*, so a change
refetches instead of needing an Effect. Invalidate by the same key from the
mutation that changed the data.

**Defaults live in one place** (the `QueryClient` in the providers file, e.g.
`staleTime`, `retry`, `refetchOnWindowFocus`). Override per hook only with a
reason worth a comment.

**Never mirror query data into `useState`.** See `rules/logic.md`.

## The anti-corruption layer

When the API's shape is not the UI's shape, the mapping is the frontend's, and it
has exactly two legal homes:

1. **`select` in the hook** — when the mapping is a projection of one response:

   ```ts
   export function useOrderHistory(orderId: string | null) {
     return useQuery({
       queryKey: ["order-history", orderId],
       queryFn: () => api.orderHistory(orderId!),
       enabled: !!orderId,
       select: (events) => events.map(toHistoryRow),   // API DTO → view model
     });
   }
   ```

2. **A pure mapper in `lib/<domain>.ts`** — when it combines or derives, and
   therefore deserves a unit test:

   ```ts
   // lib/orders.ts
   export function linesByShipment(orders: readonly OrderRecord[]): Map<string, LinePreview[]>
   ```

Both keep the contract type at the edge and the view model in the UI. The failure
mode this prevents: a screen needs a per-item count, the API does not carry it,
and the tempting "fix" is a change to the server's response type — when the data
needed to derive it is already loaded in the client.

## What is forbidden

- **Editing a read-only contract** (paths in `readOnly` in
  `.claude/architecture.json`: generated clients, contract packages owned by the
  backend, vendored copies). A type that does not fit is absorbed by a mapper,
  not by rewriting the contract.
- **Proposing an endpoint or contract change as the solution** when the task is
  frontend-only. State the limitation in the PR description if it matters; ship
  the client-side mapping.
- **Reading `process.env` in a component.** The base URL is resolved once, in the
  API client.

## When the client genuinely cannot do it

If the work truly needs a server — hiding a credential, collapsing five calls into
one payload, adapting a contract in a way the browser cannot — the seam the
frontend owns is a **Route Handler** under `app/api/**/route.ts`. See
`rules/nextjs.md` for the bar it has to clear; zero handlers is the preferred
number.
