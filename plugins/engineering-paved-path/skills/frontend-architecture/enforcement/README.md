# Enforcement

Typecheck and tests are the hard gate, and they say nothing about structure.
`check-frontend.sh` is the structural one: nine greps, counted against a
project-owned baseline.

```sh
check-frontend.sh [options] <src-root> [<src-root> ...]
```

Run it from the project root. In a skill or agent, refer to it as
`${CLAUDE_SKILL_DIR}/enforcement/check-frontend.sh` (see `SKILL.md`); a project
that wants it in CI copies the script into its own repository.

| Mode | Effect |
|---|---|
| *(default)* | report counts against the baseline, exit 0 |
| `--baseline FILE` | the project's baseline file; absent file → every count compares to 0 |
| `--strict` | exit 1 if any count is **above** the baseline |
| `--record` | write the current counts to `--baseline FILE` (creates the directory) |
| `-v` | also print offending lines for checks at or below the baseline |

Exit 2 means a usage error (no root, a root that is not a directory, `--record`
without `--baseline`, an unknown option).

## The checks

| Key | Rule it defends | What the grep sees |
|---|---|---|
| `fetch_outside_api` | every request goes through the API client | a bare `fetch(` outside `--api-client` files (`refetch(` and `x.fetch(` do not match; tests excluded) |
| `query_outside_hooks` | TanStack Query lives in the data hooks | `useQuery(` / `useMutation(` / `useInfiniteQuery(` / `useQueries(` / `useSuspenseQuery(` outside `--hooks` |
| `deep_relative_imports` | use the path alias | `from "../../../` anywhere under the roots |
| `star_barrels` | a barrel is a public API | `export *` at the start of a line in an `index.ts(x)` |
| `directive_on_modules` | `"use client"` marks a boundary, not a module | the directive in a `.ts` (not `.tsx`) file |
| `fat_pages` | a page renders one view | `page.tsx` over `--max-page-lines` (40) |
| `big_components` | the split checks | any non-test `.tsx` over `--max-component-lines` (150) |
| `missing_error_boundary` | a failing segment is contained | a `page.tsx` with no sibling `error.tsx` |
| `shell_in_pages` | shared chrome belongs in a layout *(needs `--shell`)* | `<Shell` rendered under the routes dir outside a `layout.tsx` |

## Layer options

| Option | Default | Meaning |
|---|---|---|
| `--routes DIR` | `app` | App Router directory, relative to each root |
| `--api-client RE` | `/lib/api(\.tsx?$\|/)` | the only files allowed to call `fetch()` |
| `--hooks RE` | `/lib/hooks/\|/src/hooks/` | the only files allowed to call TanStack Query hooks |
| `--exclude RE` | `/(vendor\|generated\|__generated__)/` | ignored paths |
| `--shell NAME` | *(unset — check skipped)* | the app-shell component name, e.g. `AppShell` |
| `--max-page-lines N` | `40` | page size limit |
| `--max-component-lines N` | `150` | component file size limit |

`RE` options are extended regular expressions matched against the file path as
grep prints it (relative to where you run the script, e.g.
`web/src/lib/api.ts`).

## Project configuration — `.claude/architecture.json`

One optional file in the project root declares the mapping for both
`engineering-paved-path:frontend-architecture` and `engineering-paved-path:onion-architecture`. This skill reads the
`frontend` section:

```json
{
  "frontend": {
    "roots": ["web/src"],
    "baseline": ".architecture/frontend-baseline.txt",
    "options": {
      "routes": "app",
      "api-client": "/lib/http/client\\.ts$",
      "hooks": "/lib/queries/",
      "shell": "AppShell"
    },
    "readOnly": ["web/src/generated/", "packages/contracts/"]
  }
}
```

| Key | Meaning |
|---|---|
| `roots` | source roots passed as positional arguments |
| `baseline` | the project's baseline file, passed as `--baseline` |
| `options` | `{ "<flag name without -->": "<value>" }`, passed as `--<flag> <value>` |
| `readOnly` | paths frontend work must not edit (generated clients, contract packages or copies it does not own). Not a script flag — a rule for the agent and for review (`git diff --name-only -- <path>` in a PR shows edits instantly) |

`frontend` may also be an array (one object per frontend package); run the script
once per entry. The command built from the example above:

```sh
check-frontend.sh --baseline .architecture/frontend-baseline.txt \
  --routes app --api-client '/lib/http/client\.ts$' --hooks '/lib/queries/' \
  --shell AppShell web/src
```

No file → the skill detects the frontend package and uses the defaults, and states
the mapping it assumed. If the project uses `sdd-engineering`, the same command
can be listed in `architectureChecks` of `.claude/sdd-engineering.json`.

## The baseline

A `key=count` file in the project, written only by `--record`:

```text
# frontend-architecture baseline — counts, not a licence.
# Regenerate ONLY after fixing something: the numbers may fall, never rise.
# roots: web/src
# recorded: 2026-10-14
fetch_outside_api=0
query_outside_hooks=0
deep_relative_imports=50
...
```

**Your change must not raise a number.** The script exits 0 unless you pass
`--strict`; the signal is the comparison with the baseline.

- **Create** it once, deliberately, with `--record`, and commit it (suggested
  path: `.architecture/frontend-baseline.txt`). It is the project's debt list.
- A count went **up** → the check prints the offending lines. Fix them.
- A count went **down** → re-record with `--record` and commit the new baseline in
  the same change, so the ratchet only tightens.
- A count is **wrong** (a false positive the rule genuinely allows) → tighten the
  option in `.claude/architecture.json`, not the baseline. Re-recording to silence
  a new violation is the one move this skill forbids outright. Reviewers and
  agents never run `--record`; it writes project state.

## What it deliberately does not check

- **Prop count** (>5 signals too many responsibilities) — needs a parser, not a
  grep.
- **Cross-route imports** (`_components/` reaching into another route) — needs
  path resolution; review catches it.
- **Edits to read-only contracts** — a review question:
  `git diff --name-only -- <readOnly path>` tells you instantly.
- **Derived state in Effects** — semantics, not text. That is what
  `rules/logic.md` and review are for.

If this ever needs teeth, the next step is an import-graph tool —
dependency-cruiser or `eslint-plugin-boundaries` — with a known-violations file
and a hermetic test that fails on a stale baseline (see the `engineering-paved-path:onion-architecture`
skill's enforcement notes for the same pattern on the backend).
