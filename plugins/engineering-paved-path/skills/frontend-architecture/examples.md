# Worked examples

Illustrative before/after refactors in the default layout (`app/`,
`components/`, `lib/`). Names are examples; the shape of each fix carries over.

---

## 1. Fat page → thin page + view

The rule: `page.tsx` renders one view and nothing else.

### Before — `app/shops/[shopId]/orders/[number]/page.tsx` (~185 lines)

```tsx
export default function OrderDetailPage() {
  const params = useParams<{ shopId: string; number: string }>();
  const search = useSearchParams();
  const router = useRouter();
  // …8 hooks: useOrders, useOrderDetail, useOrderHistory, useActiveShipments,
  //   useRefunds, useDeleteNote, useCancelShipment, useQueryClient
  const orderId = orders?.find((o) => o.number === Number(number))?.id ?? null;

  const setParam = (key: string, val: string | null) => { /* URL juggling */ };
  const allLines = React.useMemo(() => shipments.flatMap((s) => s.lines), [shipments]);
  const crumb = [ /* three breadcrumb entries */ ];

  if (shopNotFound) return <AppShell crumb={crumb}><ShopNotFound /></AppShell>;
  if (isLoading)    return <AppShell crumb={crumb}><Skeleton … /></AppShell>;
  if (isError || !order) return <AppShell crumb={crumb}><ErrorState … /></AppShell>;

  return (
    <AppShell crumb={crumb}>
      <OrderHeader … />
      {/* tabs, drawer, panels */}
    </AppShell>
  );
}
```

Four responsibilities in one file: routing params, data orchestration, URL state,
and four rendering branches — each repeating the shell.

### After

```tsx
// page.tsx — 6 lines
import { OrderDetailView } from "./_components/OrderDetailView";

/* Route: /shops/:shopId/orders/:number. Thin entry — data, tabs, styles and
   branches are colocated under _components/OrderDetailView. */
export default function OrderDetailPage() {
  return <OrderDetailView />;
}
```

```text
_components/OrderDetailView/
├── OrderDetailView.tsx   the four branches + composition of the tabs
├── hooks.ts              useOrderDetailData() — the 8 hooks, one return value
├── helpers.ts            crumbFor(), setParam() over URLSearchParams
├── constants.ts          tab ids, default tab
└── index.ts
```

The recipe, generalised:

1. Move everything except the default export into `_components/<Name>/<Name>.tsx`.
2. Collapse the data hooks into one local `use<Name>Data()` in the view's
   `hooks.ts`, returning a single object. The view reads fields, not eight hooks.
3. Pure bits (`crumbFor`, param juggling) → `helpers.ts`; literals → `constants.ts`.
4. Leave the branches in the view, not the page — but see example 4: the repeated
   `<AppShell>` is a layout problem, not a branching problem.

---

## 2. The API does not return it → derive it, do not change the API

The order list and the shipment timeline both need per-shipment line previews.
The shipment summary type carries only `line_count`, and the task is
frontend-only.

### Wrong

> "Add `previews` to the shipment summary on the server and update the shared
> contract."

Two rules broken at once (non-negotiable 5 and the core constraint), for data the
page already has in memory.

### Right — `lib/shipments.ts`

```ts
/* Pure shipment helpers shared by the order detail page and the order list. No I/O. */

/** Timeline lookup: shipment id → that shipment's line previews. */
export function previewsByShipment(orders: readonly OrderRecord[]): Map<string, LinePreview[]> {
  const byShipment = new Map<string, LinePreview[]>();
  for (const o of orders) {
    if (o.shipment_id) byShipment.set(o.shipment_id, toLinePreviews(o.lines));
  }
  return byShipment;
}
```

```tsx
// _components/ShipmentsTab/ShipmentsTab.tsx
const previews = useMemo(() => previewsByShipment(orders), [orders]);
```

The link exists already (`OrderRecord.shipment_id`), the orders are already
loaded by a hook, and the mapping is a pure function with its own unit test in
`lib/shipments.test.ts`. Nothing crossed the package boundary.

---

## 3. A literal and its lookup — colocated

### Before

```tsx
const color =
  order.status === "paid"     ? "#3b82f6" :
  order.status === "shipped"  ? "#10b981" :
  order.status === "refunded" ? "#f59e0b" : "var(--text-secondary)";
```

### After — `_components/OrderCard/`

```ts
// constants.ts — the value
/** Status → chip colour. Falls back to --text-secondary for unknown statuses. */
export const STATUS_COLOR: Record<string, string> = { paid: "var(--info)", … };

// helpers.ts — the behaviour
export function statusColor(status: string): string {
  return STATUS_COLOR[status] ?? "var(--text-secondary)";
}

// OrderCard.tsx — the JSX
const color = statusColor(order.status);
```

Three files, each with one job, all deleted together with the component. Values
and the fallback are tokens, not hex literals — that is what keeps the dark theme
honest.

---

## 4. The shell, and the missing error boundary

### The shell → a route-group layout

```text
app/(main)/layout.tsx          <AppShell>{children}</AppShell>   ← state survives navigation
app/(main)/shops/[shopId]/orders/[number]/page.tsx
app/(main)/settings/page.tsx
```

The URL does not change — `(main)` is a route group. Prerequisite: per-page shell
data (the breadcrumb) moves from a prop into the shell context, so the layout does
not need to know which route rendered it.

### A render-error boundary

```tsx
// app/(main)/shops/[shopId]/orders/[number]/error.tsx
"use client";

export default function OrderDetailError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState title="Couldn't render this order" body={error.message} onRetry={reset} />;
}
```

A global query-error toast handles *query* failures. This handles the other kind,
and keeps the failure inside one route segment instead of taking the app down.

---

## 5. What not to do

```ts
// ✗ lib/utils.ts — no admission criteria; it will collect everything
export function formatDate(…) {}
export function truncate(…) {}
export function isOverdue(…) {}
```
```ts
// ✓ named by domain, one claim per file
// lib/format.ts        formatDate, formatPrice
// lib/orders.ts        isOverdue, countByStatus
```

```ts
// ✗ index.ts — hides the surface, defeats tree-shaking
export * from "./orders";
// ✓
export { useOrders, useOrderDetail } from "./orders";
```

```tsx
// ✗ five levels of guessing
import { useOrders } from "../../../../../lib/hooks";
// ✓ the path alias from tsconfig.json
import { useOrders } from "@/lib/hooks";
```

```tsx
// ✗ a second source of truth for data you do not own
const { data } = useOrderHistory(orderId);
const [history, setHistory] = useState<HistoryEvent[]>([]);
useEffect(() => { if (data) setHistory(data); }, [data]);
// ✓
const { data: history = [] } = useOrderHistory(orderId);
```

```tsx
// ✗ a shared component reaching into a route's private folder
import { LineItem } from "@/app/shops/[shopId]/orders/[number]/_components/LineItem";
// ✓ the second consumer promotes it to components/line-item/
import { LineItem } from "@/components/line-item";
```
