# Placement — the decision tree

One question, asked in order. Stop at the first "yes". Paths are relative to the
frontend source root (the default convention; the project's mapping wins).

```text
Is it a URL?                      → app/**/page.tsx            (thin: renders one view)
Is it UI?
  used by exactly one route?      → **/_components/<Name>/
    used by exactly one view?     → **/_components/<Name>/_components/<Child>/
  used by 2+ routes?              → components/<kebab-name>/<PascalName>.tsx
  a generic primitive?            → the design system  (import from the barrel; do not edit)
Does it talk to the API?          → lib/hooks/<domain>.ts  (the hook), lib/api.ts (the fetch)
Is it a pure function?
  one component uses it?          → <Name>/helpers.ts
  two or more features use it?    → lib/<domain>.ts
Is it a value, not behaviour?
  one component?                  → <Name>/constants.ts
  shared?                         → lib/<domain>.ts, next to the functions that read it
  a user-visible string?          → the i18n messages   (never a constant)
Is it a style?                    → colocated with the component, in the project's styling system
Is it React context?              → lib/<name>.tsx, mounted in the providers file
```

**Two answers fit → pick the more local one.** Promotion is cheap and reversible;
a premature shared-components entry is a dependency everyone inherits.

## The component folder

Every component is a folder. The file names are fixed — that is what lets a
reader predict where anything is:

```text
_components/OrderPanel/
├── OrderPanel.tsx        the component (the only file that returns JSX)
├── OrderPanel.test.tsx   hermetic test, colocated
├── constants.ts          literals, colour maps, option lists
├── helpers.ts            pure functions over values
├── styles.ts             style objects (only if the project styles that way)
├── _components/          children used only by this component
└── index.ts              the public API: one or two named re-exports
```

Not every folder needs every file. Create `helpers.ts` when the first pure
function appears, not before. If the project already has a different but
consistent folder convention, follow it — predictability is the point.

## Promotion and demotion

- **Promote on the second consumer, not on the guess.** One route uses it → it
  stays in that route's `_components/`. Two routes need it → move to
  `components/<kebab-name>/`, and let the two importers point at the barrel.
- **A pure function promotes to `lib/<domain>.ts`** the same way — and gets a
  unit test when it does, because it now has more than one caller to break.
- **Demote too.** A shared-components entry with exactly one importer belongs back
  in that route's `_components/`.

## Naming

- Folders under `components/`: `kebab-case`; the component file inside is
  `PascalName.tsx`.
- Folders under `_components/`: `PascalName/` (matching the component).
- Shared pure modules: named by **domain** — `orders.ts`, `format.ts`,
  `github-urls.ts`, `price-label.ts`.
- Hooks: `use<Thing>`, in `lib/hooks/<domain>.ts`.
- Tests: `<Name>.test.tsx` beside the component; pure logic is tested in
  `lib/<domain>.test.ts`.

## Why there is no `utils.ts`

A folder or file named `utils` has no admission criteria, so everything qualifies
and it becomes the place code goes to be forgotten. The colocated names
(`constants`, `helpers`, `styles`) are bounded by their folder — one component's
worth of code, deleted when that component is. The shared ones are bounded by a
**domain name**, which is a claim you can check: does this function belong to
"orders"? If the answer is "not really", it needs its own module, not a
kitchen-sink one.

`index.ts` is the exception: it is a public API, not a bucket. Keep it to named
re-exports (`export { X } from "./X"`), never `export *` — the star form defeats
tree-shaking and hides what a folder actually offers.
