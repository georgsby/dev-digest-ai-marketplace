---
name: frontend-architecture
description: "Decides where frontend code lives in a React / Next.js (App Router) app that talks to an HTTP API. Use when adding or changing frontend code — creating a page, a view, a shared component, a data hook, a helper, a constant or a style module, splitting a component that grew too large, drawing the server/client boundary, mapping API DTOs to view models, or reviewing structure in a diff. Which directories are which layer comes from the project's .claude/architecture.json (or is detected). Ships a grep-level structural check with a per-project baseline ratchet. Trigger terms: component structure, folder structure, colocation, where should this component live, split this component, constants file, helpers vs utils, business logic in React, custom hook, feature folder, barrel file, view model, anti-corruption layer, prop drilling, use client, server component, route group, layout, error.tsx, search params, route handler, BFF."
metadata:
  tags: architecture, frontend, react, nextjs, app-router, colocation, layering, client
---

## The constraint this skill is built around

**The frontend adapts to the API contract it is given.** When the UI wants a
shape the API does not return, the default answer is produced **in the client**:
`select` in the data hook, or a pure mapper in a domain module. That is the
anti-corruption layer, and it is this skill's most load-bearing rule.

- Do not propose a backend endpoint or contract change as the fix for a UI shape
  mismatch, unless the task explicitly includes the backend.
- Contract code the frontend consumes but does not own — a generated API client,
  a shared contract package owned by the backend, a vendored copy of the
  contracts — is **read-only** from frontend work. The project lists such paths in
  `readOnly` in `.claude/architecture.json`. Editing one forges a contract the
  server never agreed to.

When the browser genuinely cannot do the job, the seam the frontend owns is a
Next.js Route Handler (backend-for-frontend). See `rules/nextjs.md` for the bar
it has to clear.

## The layer rule

**Imports point inward, and the route is the outermost adapter.**

```text
     ┌────────────────────────────────────────────────────────┐
     │ route        app/**/page.tsx                           │  renders ONE view
     │  ┌─────────────────────────────────────────────────┐   │
     │  │ view       **/_components/<Name>/               │   │  one route's UI
     │  │  ┌──────────────────────────────────────────┐   │   │
     │  │  │ shared UI   components/<kebab>/          │   │   │  2+ routes
     │  │  │  ┌───────────────────────────────────┐   │   │   │
     │  │  │  │ primitives  the design system     │   │   │   │  barrel import only
     │  │  │  └───────────────────────────────────┘   │   │   │
     │  │  └──────────────────────────────────────────┘   │   │
     │  └─────────────────────────────────────────────────┘   │
     └────────────────────────────────────────────────────────┘
        data      lib/hooks/*      ← the ONLY TanStack Query
        transport lib/api.ts       ← the ONLY fetch()
        domain    lib/<domain>.ts  ← pure, React-free, unit-tested
        contracts API types        ← read-only if not owned
```

Sideways rules:

- A view never imports another route's `_components/`. A second consumer is what
  promotes UI to the shared components folder.
- A domain module imports no React, no `next/*`, no component.
- A component never imports the API client — only the data hooks may.

This skill's data rules assume the frontend calls a separate HTTP API from the
client through a query library (TanStack Query). If the project fetches in
Server Components instead, keep the same layer rule — one transport module, one
data layer, pure domain modules — and see `rules/nextjs.md`.

## Your project's layers

The layers are roles. Which paths play them is a **project** decision, read in
this order:

1. **Declared** — the `frontend` section of `.claude/architecture.json` in the
   project root (shared with `engineering-paved-path:onion-architecture`):

   ```json
   {
     "frontend": {
       "roots": ["web/src"],
       "baseline": ".architecture/frontend-baseline.txt",
       "options": { "routes": "app", "shell": "AppShell" },
       "readOnly": ["web/src/generated/"]
     }
   }
   ```

   `roots` are the frontend source roots, `baseline` is the project's debt file,
   `options` keys are the check script's flags (`routes`, `api-client`, `hooks`,
   `exclude`, `shell`, `max-page-lines`, `max-component-lines`), and `readOnly`
   lists paths frontend work must not edit. Full reference:
   [enforcement/README.md](enforcement/README.md). The `frontend` value may be an
   array, one object per frontend package.
2. **Detected** — no file: take the frontend workspace package (the one depending
   on `react` / `next`), its `src/` (or package root), the App Router directory,
   and the conventional `components/`, `lib/hooks/`, `lib/api.ts`; **state the
   mapping you assumed** in your answer or report.

Paths in this skill (`app/`, `components/`, `lib/…`) are relative to the
frontend source root and are the default convention; the project's mapping wins.

## Where does this code go?

| The code… | goes in | never |
|---|---|---|
| defines a URL | `app/**/page.tsx` | holds data logic — it renders one view |
| is feature UI for exactly one route | `_components/<Name>/<Name>.tsx` | is imported by another route |
| is a child of exactly one view | `_components/<Name>/_components/<Child>/` | is promoted "just in case" |
| is chrome used by 2+ routes | `components/<kebab-name>/<PascalName>.tsx` | duplicates a design-system primitive |
| is a design-system primitive | the design-system package (barrel import) | is re-implemented locally |
| reads or writes server state | `lib/hooks/*` | is a `useEffect` + `fetch` in a component |
| issues an HTTP request | `lib/api.ts` | appears in a component or a view |
| is a pure transform used by one component | `<Name>/helpers.ts` | touches React or the DOM |
| is a pure transform used by 2+ features | `lib/<domain>.ts` | lands in a file called `utils.ts` |
| is a literal, limit, colour map, option list | `<Name>/constants.ts`, or `lib/<domain>.ts` when shared | is inlined as a magic value in JSX |
| is a user-visible string | the project's i18n messages, when it has i18n | is a constant in `constants.ts` |
| is a style | the project's styling system, colocated (see `rules/styling.md`) | mixes two styling systems in one component |
| is cross-cutting React context | `lib/<name>.tsx`, mounted in the providers file | is a new global store |
| maps an API DTO to a view model | the hook's `select`, or `lib/<domain>.ts` | edits a read-only contract |
| is interactive state | the lowest component that needs it | starts at the page and is drilled down |
| is shareable UI state (tab, filter) | the URL, via `router.replace` | is `useState` that a refresh loses |

**When two answers fit, pick the more local one.** Local code is cheap to delete;
promotion is a two-minute move once a *second* real consumer appears.

## Non-negotiables

1. **`page.tsx` renders one view and nothing else.** Data, tab state and branches
   belong in the view. See `rules/placement.md`.
2. **No `fetch` outside the API client; no `useQuery`/`useMutation` outside the
   data hooks.** See `rules/data.md`.
3. **No cross-route imports.** The second consumer promotes to shared components.
4. **Nothing in a domain module imports React, `next/*`, or a component.**
5. **Never edit a read-only contract, never propose a backend change as the
   fix** — map in the client instead. See `rules/data.md`.
6. **No derived state in a `useEffect`, no server state copied into `useState`.**
   See `rules/logic.md`.
7. **User-visible strings go through the project's i18n library** (when it has
   one), never into `constants.ts`.
8. **`"use client"` marks a boundary, not a module.** It goes on the entry —
   page, view, or provider — not on a hook or helper module. See `rules/nextjs.md`.
9. **Shared chrome belongs in a `layout.tsx`**, not rendered from inside pages —
   a layout preserves state across navigation, a page-rendered shell remounts.
10. **A route segment that can fail on its own gets an `error.tsx`.** A global
    query-error handler covers query errors only, never render errors.

## Before you commit

Run the project's own gates (typecheck, lint if any, tests — from the project's
scripts or the plan's `Verify:` lines, with the project's package manager), then
the structural check, with the values from `.claude/architecture.json` (or the
mapping you detected):

```sh
"${CLAUDE_SKILL_DIR}/enforcement/check-frontend.sh" \
  --baseline <frontend.baseline> [--<option> <value> ...] <root> [<root> ...]
```

- Default mode reports and exits 0; `--strict` exits 1 when any count is above
  the baseline; `-v` prints offending lines for every check.
- **Your change must not raise a number.**
- No baseline yet → every finding counts against zero. Creating one is a project
  decision, not something to do mid-task to get a green run.

## The baseline (project-owned debt list)

A `key=count` file **in the project** (suggested:
`.architecture/frontend-baseline.txt`, committed) makes the check a ratchet.

- Create it once, deliberately: `check-frontend.sh --baseline <file> --record <roots>`.
- **Fixed something?** Re-record in the same change, so the number falls.
- **Re-recording to silence a new violation** is the one move this skill forbids
  outright.

Touching a file the baseline counts (a fat page, a 300-line component) means
leaving it better, not extending it.

## Rules

| File | Covers |
|---|---|
| `rules/placement.md` | the full decision tree: components, constants, helpers, strings |
| `rules/components.md` | when to split, how to compose, prop count, folder shape |
| `rules/logic.md` | the three kinds of logic and their homes; Effects and memo |
| `rules/data.md` | hooks as the only data layer; the anti-corruption layer |
| `rules/nextjs.md` | the server/client boundary, layouts, error boundaries, URL state, Route Handlers |
| `rules/styling.md` | one styling system, semantic tokens, design-system primitives |

Worked before/after diffs → `examples.md`. Sources → `references.md`.
React correctness and anti-patterns → `engineering-paved-path:react-best-practices`;
component tests → `engineering-paved-path:react-testing-library`.
