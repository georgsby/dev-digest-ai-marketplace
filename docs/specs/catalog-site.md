# Spec: catalog site on GitHub Pages

Status: draft · Owner: georgsby · Last updated: 2026-10-14

A static website, published on GitHub Pages, where people find and install the plugins, skills, agents and other components in this marketplace. Its core is a search box: someone types "I need a skill that writes commit messages" and gets matching components back as cards.

## 1. Goals and non-goals

### Goals

- **G1. Find.** Anyone can search everything in the marketplace by keywords or plain-English intent and get the relevant components back.
- **G2. Decide.** A detail page for each component shows what it does, how to invoke it, and what code it runs on the user's machine.
- **G3. Install.** Every card and page gives the exact command to install it. Several plugins can be installed together as one bundle.
- **G4. Stay current.** Users can see what changed and subscribe to updates.
- **G5. Contribute.** Authors get help creating a well-formed plugin before they open a PR.
- **G6. Machine-readable.** Agents and scripts get the same catalog as JSON, and a plugin in this marketplace lets Claude Code search it.

### Non-goals

- No backend, accounts, server-side search or database.
- No install counts, ratings or usage analytics. Claude Code does not report installs, and the site adds no tracking.
- No translations. All content and UI are in English.
- Not a replacement for `README.md`, `CONTRIBUTING.md` or `docs/`. The site links to them on GitHub.

## 2. Constraints

| Constraint | Consequence |
|---|---|
| GitHub Pages serves static files only | All parsing, indexing and embedding happen at build time in GitHub Actions. The browser only reads generated files. |
| Unauthenticated GitHub API calls are limited to 60 per hour | The site makes **no** GitHub API calls at runtime. Everything it needs is in the build output. |
| The site is public, as is the repository | Nothing that isn't already public in the repo is published. |
| Project site URL: `https://georgsby.github.io/dev-digest-ai-marketplace/` | Every link and asset path goes through the configured base path. |
| Pages limits: 1 GB published size, soft 100 GB/month bandwidth | The semantic model (about 25–35 MB) is fetched only on demand and cached by the browser (§6.3). |
| Data changes only when the site is rebuilt | The site is rebuilt on every push to `main` that touches catalog content and on every release tag (§10). The footer shows when it was built and from which commit. |
| The catalog is empty today | Development and tests use fixture plugins (§11). The site has a proper empty state. |

## 3. Users and key scenarios

- **Claude Code user looking for help with a task.** Types a need, scans cards, opens one, copies the install command.
- **Team lead setting up a project.** Picks several plugins and copies a `.claude/settings.json` snippet to commit (§7.2).
- **Cautious user.** Before installing, checks what hooks, MCP servers and scripts a plugin runs (§7.1).
- **Existing user.** Checks what changed in a plugin they already use, or subscribes to the feed (§7.3).
- **Plugin author.** Generates a correct skeleton and checks frontmatter before opening a PR (§8).
- **Claude itself.** Uses the `marketplace-finder` skill to search the catalog from inside a session (§7.4).

## 4. Phases

| Phase | Scope | Sections |
|---|---|---|
| **1. MVP** | Catalog build, keyword search with cards and filters, detail pages, install commands, "What it runs" panel, `catalog.json`, issue links, Pages deployment | §5, §6.1–6.2, §6.4, §7.1, §9, §10 |
| **2. Smart search and staying current** | Semantic search blended with keyword search (hybrid), bundle builder, changelog and Atom feeds, `llms.txt`, `marketplace-finder` plugin | §6.3, §7.2–7.4 |
| **3. Authoring** | Plugin wizard, in-browser validation, dependency graph | §8 |

Each phase ships on its own and leaves the site in a releasable state.

## 5. Catalog build

### 5.1 Pipeline

```text
repo (main) ──► scripts/build-catalog.mjs ──► site/src/data/catalog.json      (generated, git-ignored)
                                          └─► site/public/catalog.json         (public copy, §7.4)
            ──► site build (Astro)       ──► search-index.json, HTML pages
            ──► scripts/build-embeddings.mjs (phase 2) ──► embeddings.bin + embeddings.json
            ──► actions/deploy-pages
```

`build-catalog.mjs` follows the conventions of `scripts/validate-marketplace.mjs`: Node 22+, no runtime dependencies other than a YAML frontmatter parser. The plugin-reading code moves into `scripts/lib/plugin-reader.mjs`, and both the validator and the catalog build import it, so the rules for where components live can never drift apart.

### 5.2 Sources the build reads

For each entry in `.claude-plugin/marketplace.json`:

| Component | Where it is read from | Fields extracted |
|---|---|---|
| Plugin | marketplace entry and `.claude-plugin/plugin.json` | `name`, `displayName`, `description`, `version`, `author`, `license`, `homepage`, `repository`, `keywords`, `category`, `tags`, `dependencies`, `userConfig` (keys, titles, `sensitive` flag; never values) |
| Skill | `skills/<name>/SKILL.md`, plus custom paths in `plugin.json` | frontmatter `name`, `description`, `allowed-tools`, keywords (§5.4); body |
| Agent | `agents/*.md`, plus custom paths | frontmatter `name`, `description`, `tools`, `model`; body |
| Command | `commands/*.md` (legacy) | frontmatter `description`, `argument-hint`; body |
| Hook | `hooks/hooks.json` or inline `hooks` in `plugin.json` | event, matcher, handler type, command or script path |
| MCP server | `.mcp.json` or inline `mcpServers` in `plugin.json` | server name, transport, command or URL host; never env values |
| Scripts | `scripts/**` | file list and executable bit |
| Docs | `README.md`, `CHANGELOG.md` | rendered Markdown; changelog sections by version heading |
| Git | `git log`, `git tag -l '<plugin>--v*'` | last-updated date of the plugin directory; release dates |

Component locations follow the official [plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference). Any component type the reader doesn't recognise is listed on the plugin page as "Other components" with its path, rather than being dropped silently.

**External plugins** (`github`, `url`, `git-subdir` sources): in phase 1 only the marketplace entry is indexed. The card is marked *External · contents not indexed* and links to the pinned commit. Fetching the pinned `sha` at build time to index its contents is an open question (§13).

### 5.3 Catalog data model

`catalog.json` is the single source of truth for the UI, the search index and outside consumers.

```jsonc
{
  "schemaVersion": 1,
  "marketplace": { "name": "dev-digest-ai", "repo": "georgsby/dev-digest-ai-marketplace" },
  "builtAt": "2026-10-14T12:00:00Z",
  "commit": "<40-char sha>",
  "plugins": [ /* PluginRecord */ ],
  "artifacts": [ /* ArtifactRecord: every searchable item, including the plugins themselves */ ]
}
```

**ArtifactRecord** (one per card):

| Field | Type | Notes |
|---|---|---|
| `id` | string | `plugin:<plugin>`, `skill:<plugin>:<name>`, `agent:<plugin>:<name>`, `command:<plugin>:<name>`, `hook:<plugin>:<event>:<index>`, `mcp:<plugin>:<server>`. Stable across builds. |
| `type` | enum | `plugin` · `skill` · `agent` · `command` · `hook` · `mcp` |
| `name` | string | as declared |
| `title` | string | `displayName` if set, otherwise `name` |
| `plugin` | string | parent plugin name (its own name for plugins) |
| `description` | string | from frontmatter or manifest |
| `keywords` | string[] | §5.4 |
| `category`, `tags` | string, string[] | inherited from the plugin entry |
| `version` | string | of the parent plugin |
| `invocation` | string? | for example `/<plugin>:<skill>` for skills and commands |
| `runsCode` | boolean | inherited from the plugin: true if it has hooks, MCP servers or scripts |
| `path` | string | repo-relative path of the source file |
| `sourceUrl` | string | GitHub blob URL at the built commit |
| `url` | string | site-relative URL of the detail page |
| `updatedAt` | ISO date | last commit touching `path` |
| `bodyText` | string | plain text of the body, for search only; capped at 8 KB |

**PluginRecord** adds `components` (counts by type), `dependencies`, `userConfig`, `surface` (§7.1), `releases` (tag, version, date, changelog excerpt), `readmeHtml`, `external` (boolean) and `install` (the three command variants, §6.4).

### 5.4 Keywords and synonyms

- **Plugin level:** the official `keywords` field in `plugin.json` and `tags` and `category` from the marketplace entry. Authors are asked to fill these in. CONTRIBUTING.md and the PR template are updated to say so.
- **Skill and agent level:** optional `keywords` in frontmatter, **only if** `claude plugin validate --strict` accepts the extra key. This must be checked in phase 1. If strict validation rejects it, skip skill-level keywords; search then relies on `description` and, in phase 2, on semantic search.
- **Site level:** `site/src/data/synonyms.json` maps common terms to their variants (`"pr": ["pull request", "merge request"]`, `"commit": ["git commit", "commit message"]`). It is expanded at query time and kept small and reviewed.

### 5.5 Build-time checks

The catalog build fails if two artifacts produce the same `id`, if a required field is missing, or if `catalog.json` doesn't match its JSON Schema (`site/src/data/catalog.schema.json`). It **warns** when a plugin has no `keywords` or a component has a description shorter than 20 characters, because those hurt search.

## 6. Search

### 6.1 Keyword search (phase 1)

- **Engine:** [MiniSearch](https://github.com/lucaong/minisearch). It is small, has no dependencies, and supports prefix and fuzzy matching, field boosts and a serialisable index.
- **Index** is built at site build time and shipped as `search-index.json`, which is loaded with `MiniSearch.loadJSON`. The browser never re-indexes.
- **Indexed fields and boosts:** `title` ×5, `name` ×5, `keywords` ×4, `description` ×3, `plugin` ×2, `tags` ×2, `bodyText` ×1.
- **Matching:** prefix on, fuzzy `0.2` for terms of 4 or more characters, `AND` combination with a fallback to `OR` when `AND` returns nothing.
- **Query processing**, in order:
  1. Lowercase and trim. Strip punctuation except `-`, `/` and `:` (so `/plugin:skill` stays searchable).
  2. **Type intent:** words like `skill(s)`, `agent(s)`, `subagent(s)`, `hook(s)`, `command(s)`, `slash command`, `mcp`, `server(s)` and `plugin(s)` are removed from the terms and become a **type chip** (a removable filter). If the chip leaves zero results, results are shown without it, with a notice: "No skills matched, showing all types."
  3. **Stop phrases and stopwords:** remove filler such as "i need", "i want", "looking for", "something that", "a", "the", "for", "to", "that", "which", "help me".
  4. **Synonym expansion** from §5.4.
  5. An exact `invocation` or `name` match is pinned to the top.
- **Empty query:** browse mode. Everything is shown, plugins first, then by `updatedAt`, newest first.
- **Performance:** under 50 ms per keystroke for 2,000 artifacts on a mid-range laptop. Input is debounced at 120 ms.

### 6.2 Results UI

- **Card:** type badge · title · two-line description · `plugin@version` · a *Runs code* badge if `runsCode` · matched terms highlighted · a primary **Copy** button (§6.4) · the whole card links to the detail page.
- **Filters** (side panel on desktop, sheet on mobile): type, category, tags, plugin, and "Runs no code" as a toggle. Counts update with the query.
- **Sort:** relevance (default when there is a query), recently updated, name.
- **URL state:** `?q=commit+message&type=skill&tag=git`, kept up to date with `history.replaceState`. Back and forward work, and links are shareable.
- **No results:** suggestions (remove filters, try smart search in phase 2) and a **Suggest a skill** button that opens a pre-filled GitHub issue containing the query (§9.3).
- **Keyboard:** `/` focuses search, arrow keys move between cards, `Enter` opens one, `c` copies the focused card's command.

### 6.3 Smart search: hybrid semantic search (phase 2)

Keyword search misses queries that describe intent in different words ("tidy up my git history" should find a commit or rebase skill). Smart search adds vector similarity and **blends** it with keyword results; it never replaces them.

- **Model:** a small English sentence-embedding model run with [Transformers.js](https://huggingface.co/docs/transformers.js) (ONNX in WASM, WebGPU when available). Start with `Xenova/all-MiniLM-L6-v2` (384 dimensions, about 23 MB quantised). Compare it with `Xenova/bge-small-en-v1.5` on the relevance test set (§11.2) and keep the better one. Pin the model revision.
- **Build time:** `scripts/build-embeddings.mjs` embeds each artifact's text (`title. description. keywords. first 1,500 characters of bodyText`) with **the same model and revision** in Node. Output: `embeddings.bin` (Float32, L2-normalised, rows in `id` order) and `embeddings.json` (`model`, `revision`, `dims`, `ids`). Embeddings are recomputed only for artifacts whose text hash changed. The hash cache is stored with `actions/cache`.
- **Self-hosted model:** the model files and the ONNX runtime WASM are downloaded at build time and published with the site. At runtime, the site makes no third-party requests.
- **Runtime:**
  - Smart search is **opt-in** through a *Smart search* toggle next to the search box. The choice is remembered in `localStorage`.
  - When keyword search returns fewer than 3 results, a hint offers to switch smart search on.
  - Turning it on the first time shows the download size and a progress bar. The browser caches the model, so later visits load it instantly.
  - Inference runs in a Web Worker. The query embedding is compared with every row by dot product (brute force is fine at this scale).
- **Blending:** Reciprocal Rank Fusion of the keyword list and the vector list (`k = 60`), top 50. Vector hits with cosine similarity below a threshold (tuned on the test set, starting at 0.25) are dropped, so smart search doesn't pad the results with noise.
- **Fallback:** if the worker or model fails to load, the toggle shows an error, smart search turns itself off, and keyword search continues to work.
- **Budget:** under 150 ms per query after the model is warm. First load stays under 40 MB including WASM.

### 6.4 Install commands

Shown on every card's Copy button and as tabs on detail pages. The commands follow `README.md`:

| Variant | Command |
|---|---|
| One step (Claude Code 2.1.275+), default | `/plugin install <plugin> --marketplace georgsby/dev-digest-ai-marketplace` |
| Add marketplace, then install | `/plugin marketplace add georgsby/dev-digest-ai-marketplace` then `/plugin install <plugin>@dev-digest-ai` |
| Shell | `claude plugin install <plugin>@dev-digest-ai` |

For a skill, agent or command, the card copies its **plugin's** install command, because components can't be installed alone. The detail page also shows how to invoke it (for example `/<plugin>:<skill>`). If a plugin declares `userConfig`, the shell tab notes the `--config` flag, as `docs/SECURITY.md` requires.

## 7. Pages and features

### Site map

| Path | Page |
|---|---|
| `/` | Search, filters, results; "Recently updated" strip when the query is empty |
| `/plugins/<plugin>/` | Plugin detail |
| `/plugins/<plugin>/<type>/<name>/` | Component detail (skill, agent, command, MCP server) |
| `/bundle/` | Bundle builder (phase 2) |
| `/changelog/` | All releases (phase 2) |
| `/new/` | Plugin wizard (phase 3) |
| `/catalog.json`, `/llms.txt`, `/feed.xml`, `/plugins/<plugin>/feed.xml` | Machine-readable outputs |
| `/404.html` | Not found, with a search box |

Hooks are shown on the plugin page rather than on pages of their own.

**Plugin page:** header (title, description, version, author, license, category, tags, updated date), install tabs, the "What it runs" panel, a components list grouped by type, `userConfig` options, dependencies, rendered README, releases, "View on GitHub" and "Report an issue" links.

**Component page:** title, type, parent plugin card, invocation, `allowed-tools` or `tools` and `model` where declared, the rendered body (collapsed after 40 lines), source link, install tabs.

### 7.1 "What it runs" panel (phase 1)

Plugins run with the user's full privileges (see `docs/SECURITY.md`). This panel lists the facts that can be determined statically, so the risk is visible before anyone installs.

| Row | Content |
|---|---|
| Hooks | event, matcher, handler type, and the command or script it calls, for example `PreToolUse · Bash · scripts/check.sh` |
| MCP servers | name, transport (`stdio` or `http`/`sse`), the command, or the URL host |
| Scripts | the files under `scripts/` |
| Skill tool access | `allowed-tools` from each skill that declares it |
| Configuration | `userConfig` keys, with secrets flagged |
| Dependencies | other plugins it pulls in |

- The summary badge is either **Runs no code**, when the plugin has only skills, agents or commands, or **Runs code on your machine**, when it has hooks, MCP servers or scripts.
- The panel describes **what** runs, not **whether it is safe**, and says so in one line, with a link to `docs/SECURITY.md`.
- It does not guess about network access. It shows only what the files declare.

### 7.2 Bundle builder (phase 2)

- Every plugin card and page gets an **Add to bundle** control. The bundle lives in `localStorage` and in the URL (`/bundle/?p=a,b,c`), so it can be shared.
- Dependencies of selected plugins are added automatically and shown as "added because `<x>` needs it".
- The bundle page produces three outputs, each with a Copy button:
  1. Slash commands, one per line.
  2. A shell script made of `claude plugin marketplace add …` followed by `claude plugin install …` lines.
  3. A `.claude/settings.json` snippet for project scope:

     ```json
     {
       "extraKnownMarketplaces": {
         "dev-digest-ai": { "source": { "source": "github", "repo": "georgsby/dev-digest-ai-marketplace" } }
       },
       "enabledPlugins": { "<plugin>@dev-digest-ai": true }
     }
     ```

     with a note to merge it into existing settings rather than replace them.
- The page shows the combined "What it runs" summary for the whole bundle.

### 7.3 Changelog and feeds (phase 2)

- Releases come from git tags `<plugin>--v<version>` (see `docs/RELEASES.md`). Their dates are the tag dates. Their notes come from the matching `CHANGELOG.md` section, when there is one.
- `/changelog/` lists all releases, newest first, and can be filtered by plugin.
- `/feed.xml` is an Atom feed of all releases. `/plugins/<plugin>/feed.xml` covers one plugin.
- The home page shows "Recently updated", the five most recent releases, when the query is empty.
- A pushed release tag triggers a rebuild (§10).

### 7.4 Machine-readable catalog and `marketplace-finder` (phase 2; `catalog.json` in phase 1)

- `/catalog.json`: the full catalog (§5.3) minus `readmeHtml` and `bodyText`. Its `schemaVersion` changes only on breaking changes, and the schema is published at `/catalog.schema.json`.
- `/llms.txt`: a Markdown overview following the [llms.txt](https://llmstxt.org/) convention: what the marketplace is, how to install from it, and a one-line list of each plugin with its components and page URL.
- **`plugins/marketplace-finder/`**: a regular plugin in this marketplace with one skill. Asked something like "find me a skill for X", Claude:
  1. Fetches `https://georgsby.github.io/dev-digest-ai-marketplace/catalog.json`. This network call goes to that one host only, which its README states, as `docs/SECURITY.md` requires.
  2. Ranks the artifacts against the request.
  3. Answers with the best matches, why each fits, and the install command.

  The plugin contains no hooks, MCP servers or scripts, so it is labelled "Runs no code". It follows `docs/PLUGIN-GUIDELINES.md` and `docs/RELEASES.md`.

## 8. Authoring tools (phase 3)

### 8.1 Plugin wizard (`/new/`)

- A form for plugin name, description, category, keywords, and an optional first skill (name, description, body) or agent.
- It checks input live with the shared rules (§8.2): kebab-case names, a unique plugin name, no `version` in the marketplace entry, a SemVer starting at `0.1.0`.
- It produces `plugin.json`, `SKILL.md` or `agents/<name>.md`, `README.md`, the MIT `LICENSE`, and the `marketplace.json` entry to add.
- Delivery options:
  - **Download a `.zip`**, built in the browser with `fflate`, laid out as `plugins/<name>/…`.
  - **One GitHub link per file**, using `https://github.com/georgsby/dev-digest-ai-marketplace/new/main?filename=<path>&value=<urlencoded>`. GitHub then offers to fork and open a PR.
  - Copy each file.
- A closing checklist links to CONTRIBUTING.md and lists the local checks to run.

### 8.2 Shared validation rules

- The pure checks in `scripts/validate-marketplace.mjs` (name pattern, SemVer, source path rules, manifest–entry name match) move into `scripts/lib/rules.mjs` with no Node-only imports. The CLI validator and the site both import that module.
- The checks that need the filesystem or git (symlinks, LFS, version bump) stay in the CLI.
- The wizard also has a **Check frontmatter** box: paste a `SKILL.md` or agent file and see errors and warnings, including the short-description and missing-keywords warnings from §5.5.

### 8.3 Dependency graph

A small graph on each plugin page and a full graph at `/plugins/`, drawn as inline SVG from `dependencies`. It is shown only when at least one dependency exists.

## 9. Cross-cutting requirements

### 9.1 Technology

- **[Astro](https://astro.build/)**: static output, Markdown rendering, a page per artifact generated from `catalog.json`, and very little JavaScript by default. Interactive parts (search, filters, bundle, wizard) are islands written in **Preact**.
- **The site lives in `site/`** with its own `package.json` and lockfile, so the existing validate workflow's `npm ci` is not slowed down. Dependabot gets an entry for `/site`.
- Dependencies use exact versions in the lockfile, with no lifecycle scripts (in line with `docs/SECURITY.md`).
- Astro `base: '/dev-digest-ai-marketplace/'` and `site: 'https://georgsby.github.io'`.

### 9.2 Quality bars

| Area | Requirement |
|---|---|
| Performance | Home page JS ≤ 60 KB gzipped, not counting the search index. The search index loads in parallel with the page. Lighthouse Performance ≥ 90 on mobile. |
| Accessibility | WCAG 2.2 AA. Full keyboard use. Visible focus. Result count announced through an `aria-live` region. Lighthouse Accessibility ≥ 95. |
| Responsive | Works from 360 px wide. Filters collapse into a sheet on small screens. |
| Themes | Light and dark, following `prefers-color-scheme`, with a manual toggle. |
| No-JS | Detail pages are fully static. Without JS the home page shows the full catalog as a list. |
| Privacy | No analytics, cookies or third-party requests. Fonts and the model are self-hosted. `localStorage` holds only the bundle, the smart-search setting and the theme. |
| Security | Markdown from plugins is rendered with raw HTML disabled and sanitised. A Content-Security-Policy `<meta>` tag allows only `'self'` (plus `'wasm-unsafe-eval'` in phase 2). External links get `rel="noopener"`. |

### 9.3 Feedback without a backend

- **Report an issue** on every plugin page opens a new GitHub issue with the title `[<plugin>] ` and a body containing the version and page URL.
- **Suggest a skill** opens an issue form (`.github/ISSUE_TEMPLATE/suggest-skill.yml`, to be added) pre-filled with the search query.
- Security problems are sent to private reporting, never to public issues, as described in `docs/SECURITY.md`.

## 10. Build and deployment

A new workflow, `.github/workflows/pages.yml`:

- **Triggers:**
  - `push` to `main` touching `plugins/**`, `.claude-plugin/**`, `site/**`, `scripts/**` or `docs/specs/**`
  - `push` of tags matching `*--v*`
  - `workflow_dispatch`
- **Pull requests** get a build-only job: catalog build plus site build plus tests, with no deployment. This catches changes that would break the site.
- **Steps:**
  1. Checkout with `fetch-depth: 0`, for git dates and tags.
  2. Set up Node 24.
  3. `node scripts/validate-marketplace.mjs`. If the catalog is invalid, nothing is deployed.
  4. `node scripts/build-catalog.mjs`.
  5. Phase 2: `node scripts/build-embeddings.mjs`, with the model and hash cache restored from `actions/cache`.
  6. `npm ci && npm run build` in `site/`.
  7. `actions/upload-pages-artifact`, then `actions/deploy-pages`.
- **Permissions:** `contents: read`, `pages: write`, `id-token: write`. A `concurrency` group lets a newer deploy cancel an older one.
- **Actions are pinned to full commit SHAs**, as in `validate.yml`.
- **One-time manual setup:** Repository Settings → Pages → Source: *GitHub Actions*.
- **Footer:** shows the build time and the short commit SHA, linked to the commit.
- **README:** a "Browse the catalog" link to the site is added in phase 1.

## 11. Testing

### 11.1 Fixtures

`scripts/__fixtures__/marketplace/` is a small fake marketplace. It has plugins that cover every component type, plus inline hooks and MCP servers in `plugin.json`, `userConfig` with a sensitive key, a dependency, an external entry, a plugin with no keywords, and a `CHANGELOG.md`. `CATALOG_ROOT=scripts/__fixtures__/marketplace` points the build at it, so the site can be developed while the real catalog is empty.

### 11.2 Tests

| Layer | Tool | What is covered |
|---|---|---|
| Plugin reader and catalog build | `node:test` (no deps, like the existing scripts) | each component type; default and custom paths; ids stay stable across builds; schema validity; secrets never copied |
| Query processing | `node:test` | type-intent detection, stop phrases, synonyms, `AND`→`OR` fallback |
| Search relevance | golden set `site/tests/search-golden.json` of about 30 queries with expected ids in the top 3 | phase 1: at least 90% hit rate for keyword search. Phase 2: hybrid search must not do worse than keyword search on any query and must reach at least 95% overall, including about 10 paraphrased queries. |
| UI | Playwright smoke run in CI (phase 1) | search shows cards, filters and URL state, copy button, detail page, no-JS listing, keyboard navigation, axe accessibility check |
| Shared rules (phase 3) | `node:test` | the same cases pass in the CLI and in the browser bundle |

## 12. Acceptance criteria

**Phase 1**

- [ ] Pushing to `main` deploys the site to `https://georgsby.github.io/dev-digest-ai-marketplace/`.
- [ ] Every plugin, skill, agent, command, hook and MCP server in the catalog has a card; every one except hooks has a detail page.
- [ ] Searching "i need a skill for commit messages" against the fixtures returns the commit skill first, with the *Skills* chip applied.
- [ ] Filters and the query survive a reload and work as shared links.
- [ ] Every card's Copy button puts the correct install command on the clipboard.
- [ ] The "What it runs" panel lists every hook, MCP server, script and `userConfig` key in the fixtures, and shows no secret values.
- [ ] `/catalog.json` validates against `/catalog.schema.json`.
- [ ] With the real, empty catalog the site builds and shows an empty state linking to CONTRIBUTING.md.
- [ ] The quality bars in §9.2 are met, and the golden-set hit rate is at least 90%.

**Phase 2**

- [ ] With smart search on, paraphrased queries in the golden set reach the top-3 targets, and the overall hit rate is at least 95%.
- [ ] The site makes no third-party requests, model download included.
- [ ] The bundle builder produces valid commands and a valid `settings.json` snippet, and pulls in dependencies.
- [ ] Pushing a release tag updates `/changelog/` and both feeds.
- [ ] Asked "find a skill that writes commit messages", `marketplace-finder` returns the right plugin with its install command.

**Phase 3**

- [ ] A wizard-generated plugin, unzipped into `plugins/`, passes `node scripts/validate-marketplace.mjs` and `claude plugin validate --strict` without edits.
- [ ] The CLI validator and the site import the same rules module.

## 13. Open questions

1. **Skill-level `keywords`.** Does `claude plugin validate --strict` accept an extra `keywords` key in `SKILL.md` and agent frontmatter? This decides §5.4 and must be checked at the start of phase 1.
2. **External plugins.** Should the build fetch an external plugin's pinned `sha` to index its components? That gives better search, but builds need network access and get slower. Phase 1 indexes only the entry.
3. **Model choice.** `all-MiniLM-L6-v2` or `bge-small-en-v1.5`, decided by the golden set in phase 2.
4. **Custom domain.** Stay on `github.io`, or add a CNAME later? Changing it later changes the `catalog.json` URL that `marketplace-finder` uses, so decide before phase 2.
5. **Comments.** Is GitHub Discussions with giscus worth adding for per-plugin discussion? It is left out for now because it adds a third-party script.
