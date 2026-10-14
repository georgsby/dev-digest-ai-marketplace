# Styling

## One system per project, followed everywhere

Detect the project's styling system before writing a style — Tailwind utility
classes, CSS Modules, style objects, or a CSS-in-JS library — and use it. The
architecture rules below hold for all of them; the file shape differs.

**Never mix two styling systems in one component.** A component written with CSS
Modules does not grow a few utility classes, and a utility-class component does
not grow an inline style object, except for the one-off case below.

## The rules

- **Consume semantic tokens, never raw values.** `var(--border)`,
  `var(--accent)`, `text-muted` — not `#3b82f6`, not `rgba(255,255,255,.08)`. A
  literal colour is how dark mode breaks silently.
- **Colocate styles with the component.** A CSS Module beside the component, or a
  `styles.ts` in the component folder, or the classes in the JSX for a
  utility-class project — never a shared stylesheet that every component edits.
- **A colour map is a constant, not a style.** Value → colour lookups live in
  `constants.ts` with a `helpers.ts` accessor that falls back to a token:

  ```ts
  export function statusColor(status: string): string {
    return STATUS_COLOR[status] ?? "var(--text-secondary)";
  }
  ```

- **Global CSS lives in one file** (e.g. `app/globals.css`) and nowhere else. If a
  rule cannot be expressed in the component's system, it belongs there or in the
  design system, with a comment saying why.
- **Layout primitives come from the design system**, imported from its barrel. Do
  not re-implement a card, a badge or a skeleton locally because the props do not
  fit — wrap it, and raise the gap.

## If the project uses style objects

A common shape: inline style objects exported as `s` from a colocated
`styles.ts`, values from CSS variables:

```ts
// _components/OrderCard/styles.ts
export const s = {
  card: {
    border: "1px solid var(--border)",
    borderRadius: 10,
    background: "var(--surface)",
    padding: "12px 14px",
  },
  title: { fontSize: 13, fontWeight: 600, color: "var(--text)" },
} as const;
```

```tsx
import { s } from "./styles";
<div style={s.card}>…</div>
```

A style that depends on props becomes a function on `s` (`s.card(active)`), not a
conditional spread at the call site. Pseudo-classes, media queries and keyframes
cannot be style objects — they go in global CSS or the design system.

## Where a style does *not* go

- Not inline in JSX as a literal object, except a one-off value that genuinely
  belongs to that element (an animation delay, a computed width).
- Not in `lib/`. Styles are not domain logic.
- Not in the design system from feature work, if the design system is a vendored
  or external package.
