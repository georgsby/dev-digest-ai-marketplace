# Catalog site

React + Vite front end for the dev-digest-ai marketplace catalog (see `docs/specs/catalog-site.md`).
It lives in its own directory and is built and deployed independently of the marketplace plugins.

## Develop

```bash
cd catalog-site
npm install
npm run dev        # http://localhost:5173 with hot reload
```

## Build

```bash
npm run build      # outputs dist/
npm run preview    # serves dist/ locally to check the production build
```

## Text

All UI text is in `src/locales/en.js`; code references keys through `tr()` / `trp()` from `src/i18n.js`.

## Layout

- `scripts/build-catalog.mjs` – reads `.claude-plugin/marketplace.json` and every plugin it lists, writes `src/data/catalog.json` and `public/catalog.json` (generated, git-ignored; runs automatically before `dev` and `build`)
- `src/App.jsx` – state, search and the view-model that feeds the template
- `src/Template.jsx` – markup (ported from the Claude Design export)
- `src/styles.css` – theme tokens, base styles, bundled Geist fonts

## Deployment

`.github/workflows/pages.yml` (workflow "Catalog site", independent of "Validate marketplace") has two jobs:
`Build catalog site` runs on pull requests and pushes that touch this directory, `marketplace.json` or `plugins/`;
`Deploy to GitHub Pages` publishes `dist/` from `main` only (Settings → Pages → Source: GitHub Actions). Assets use relative URLs (`base: './'`) and routing is
hash-based (`#/plugins/…`), so the site works under `https://georgsby.github.io/dev-digest-ai-marketplace/`.

## Data

The site shows only what is in the marketplace: no sample or placeholder plugins. With an empty `plugins` array it
renders the empty state. Local plugins are read from disk (manifest, skills, agents, commands, hooks, `.mcp.json`,
scripts, `CHANGELOG.md`, `README.md`); plugins with a remote source show their marketplace entry only.
Rebuild after changing plugins: `npm run catalog`.

Not built yet: `llms.txt` and the Atom feeds.
