# Components — splitting and composing

## Split when any of these fires

Ordered by how reliably they signal a real problem:

1. **The one-sentence test.** You cannot describe the component in one sentence
   without "and". Three clauses = three candidates.
2. **More than ~5 props.** Prop count tracks responsibility count. A component
   with 14 props is a page pretending to be a component.
3. **Over ~150 lines of component body**, or you scroll to find the part you came
   to edit.
4. **A nested render function** — `const renderRow = () => …` is a child
   component that has not been named yet.
5. **Repeated shell in branches.** Four `return (<AppShell …>…</AppShell>)` in one
   file means the shell is in the wrong layer, not that the component is complex.
6. **State only one subtree reads.** Push it down instead of splitting.

## Do not split for

- **A wrapper that only forwards props.** It adds a file and a name, and removes
  nothing.
- **Reuse that does not exist yet.** Wait for the third use site; two things that
  look alike today often diverge tomorrow.
- **Line count alone.** A 180-line component that does exactly one thing and reads
  top-to-bottom is fine. The checks above are signals, not a linter.

## Compose, do not configure

When a component grows a second boolean prop, the problem is usually the shape,
not the size:

```tsx
// ✗ configuration — every variant adds a prop and a branch
<Panel title="Orders" compact hideHeader showFooter footerAction={…} />

// ✓ composition — the caller supplies the parts
<Panel>
  <Panel.Header>{t("orders.title")}</Panel.Header>
  <Panel.Body>{children}</Panel.Body>
</Panel>
```

Rules that follow:

- Pass **children or a slot** (`header`, `actions`) instead of flags that toggle
  regions on and off.
- Pass **data, not flags**: `severity` beats `isCritical` + `isWarning`.
- A component that takes a render-prop *and* children is usually two components.

## Where the split lands

- A child used only by its parent view → that view's `_components/`. Two levels of
  nesting is normal here (`OrderDrawer/_components/LineItems/`); three means
  the middle layer is probably a view of its own.
- A child that two routes render → `components/<kebab-name>/`.
- A child that is generic UI with no domain knowledge → it belongs in the design
  system. If the design system is not editable from feature work (a vendored or
  external package), wrap it locally instead and raise the gap.

## Component shape

```tsx
"use client";                      // only on the entry — see rules/nextjs.md

import { Badge } from "@acme/ui";
import { statusColor } from "./helpers";

export function OrderCard({ order, onToggle }: { order: Order; onToggle?: (v: boolean) => void }) {
  const t = useTranslations("orders");       // strings
  const cancel = useCancelOrder();           // server state
  const color = statusColor(order.status);   // pure, from helpers.ts
  return <div>…</div>;                       // JSX only
}
```

- Props destructured in the signature; the type inline for ≤3 props, a named
  `interface` above for more.
- Helpers defined **outside** the component (or in `helpers.ts`), taking values as
  arguments rather than reading a closure.
- One exported component per file; the folder's `index.ts` re-exports it.
- `React.memo`, `useMemo`, `useCallback` only with an identified cost. If React
  Compiler is enabled in the project, let it memoize; if it is not, that is a
  reason to measure, not a licence to memoize everything.
