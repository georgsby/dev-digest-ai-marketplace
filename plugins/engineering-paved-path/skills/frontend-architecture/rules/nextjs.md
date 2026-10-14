# Next.js — the architecture decisions

Mechanics (async APIs, metadata, caching, images, bundling) are not restated
here — see the Next.js documentation (bundled with `next` in recent versions) and
`engineering-paved-path:react-best-practices`. This file covers only the
structural decisions an App Router frontend has to make, and then keep.

## Decide where the server/client boundary sits

Two shapes are both legitimate; pick one per app and write it down (in the
project's agent instructions or `INSIGHTS.md`):

- **Client-data app (the shape this skill's data rules assume).** The data lives
  behind a separate HTTP API; caching, streaming and invalidation are TanStack
  Query's job. The root `layout.tsx` is a Server Component that does only what
  needs the server (locale and messages, a no-flash theme script), and below it
  a `"use client"` `<Providers>` makes the tree client-side. Fetching in Server
  Components here would duplicate the base URL, the error normalization and the
  cache, without removing a hop.
- **Server-first app.** Data is fetched in Server Components (or through server
  actions) close to the data source. Keep the layer rule anyway: one module owns
  the transport, pure domain modules own derivations, components stay thin.

**Rule for the client-data shape: do not scatter RSC.** A new Server Component
needs something only the Next.js server can provide — the filesystem, build-time
data, a secret.

## `"use client"` marks a boundary, not a file type

The directive belongs on the **entry** to a client subtree — a page, a view, or a
provider. Everything that entry imports joins the client bundle automatically;
`helpers.ts`, `constants.ts` and hook modules do not need their own copy.

What follows from the boundary, and changes *placement*:

- A Client Component never **imports** a Server Component. It receives rendered
  output through `children` or a prop — a rendered element is serializable, a
  module is not.
- Props crossing the boundary must be serializable, so an event handler cannot be
  passed from a Server Component to a Client one.
- Context providers must be Client Components. In a client-data app they sit at
  the root because every consumer is client-side anyway.
- A third-party component that needs client-only features gets a local
  `"use client"` wrapper rather than the directive spreading into shared code.

## Shared chrome belongs in a layout

A layout *"preserves state, remains interactive, and does not rerender"* on
navigation; an app shell rendered from inside each page does none of that — the
command palette, global shortcuts and scroll position are rebuilt on every route
change, and a page with several return branches repeats the shell in each.

**Rule: chrome shared by a set of routes goes in a `layout.tsx`**, grouped with a
route group when the set is not a URL prefix — `app/(main)/layout.tsx`. Use a
`template.tsx` only when you *want* the remount.

A common blocker is per-page data the shell displays (a breadcrumb, a title):
move it into a shell context or a slot first, then move the shell. Until then, do
not add another page-level shell call site. The check script counts them when the
project names its shell component (`shell` in `.claude/architecture.json`).

## Error, loading and not-found boundaries

A global query-error handler (toast) and inline error states cover **query**
errors. They do not cover **render** errors — without an `error.tsx`, a render
error takes out the whole tree up to the nearest boundary.

- **`error.tsx` per route segment that can fail independently.** It must be a
  Client Component (it needs `reset()`), and it does **not** catch errors thrown
  by its own segment's `layout.tsx` — that is what the parent's boundary is for.
- **`not-found.tsx`** is the framework's answer where a route genuinely 404s;
  prefer it over hand-rolled "not found" components.
- **Pick one loading strategy.** In a client-data app, loading is usually
  expressed per component (skeletons driven by query state) and `loading.tsx` is
  deliberately absent. In a server-first app, `loading.tsx` / Suspense boundaries
  carry it. Mixing both for the same data shows two loading states.

## The URL is a state container

| State | Home |
|---|---|
| shareable, survives refresh, back-button-worthy (tab, filter, selected item) | URL search params, written with `router.replace` |
| per-session, not shareable (palette open, expanded row, draft text) | local `useState` |
| server data | the query cache — never mirrored into state |

Read with `useSearchParams()`; write by copying into a `URLSearchParams`, setting
or deleting one key, and calling `router.replace` — `push` would make every filter
tweak a back-button stop. Any component calling `useSearchParams()` needs a
Suspense boundary above it.

## Route Handlers — the seam the frontend owns

`app/api/**/route.ts` lives inside the frontend package, so frontend work may add
one. Zero is the preferred number: a handler adds a hop and a second place where
the API base URL lives.

It earns its place only when the browser genuinely cannot do the job:

- a credential must not reach the client;
- several API calls must become one payload the UI can render;
- a contract the frontend cannot change must be adapted server-side.

That is the backend-for-frontend pattern. Anything else — reshaping, filtering,
sorting, aggregating data the browser already has — belongs in a hook `select` or
a pure module. See `rules/data.md`.
