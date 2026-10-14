# Marketplace research

Research done on 2026-10-14, before this repository was set up. It summarises the official Claude Code docs and the practices of public marketplaces. The docs in `docs/` turn it into rules. This file is temporary and will be removed once the first plugin is added.

## Official requirements

Sources:
- https://code.claude.com/docs/en/plugins/create-marketplace
- https://code.claude.com/docs/en/plugins/marketplace-reference
- https://code.claude.com/docs/en/plugins/manifest-reference
- https://code.claude.com/docs/en/plugins/host-marketplace
- https://code.claude.com/docs/en/plugins/loading
- https://code.claude.com/docs/en/plugins/troubleshooting

### Catalog

- **Location.** A marketplace is a git repository with `.claude-plugin/marketplace.json`. Relative sources resolve from the repository root, not from `.claude-plugin/`.
- **Required fields:** `name`, `owner.name` and `plugins[]`.
- **Plugin entries** need `name` and `source`.
- **Names** use letters, digits, `.`, `_` and `-`. Kebab-case is recommended and is required by claude.ai sync.
- **Reserved names.** These are rejected at `marketplace add` even though `validate` passes them:
  - `claude-plugins-official`, `anthropic-*`, `agent-skills`, `claudeai-*`;
  - `github`, `npm`, `inline`, and others;
  - names that impersonate official ones.
- **Source types:**
  - relative path `./plugins/x`;
  - `github`, `url` and `git-subdir`, each with optional `ref` and `sha`;
  - `npm`, `archive` and `command`.
- **Unknown keys** are ignored silently at load time. Only `claude plugin validate` reports them.

### Plugins

- **Manifest.** `plugin.json` is optional; `name` is its only required field. All components sit at the plugin root.
- **Paths** must start with `./`. No `..`, and symlinks must not leave the marketplace.
- **Cache.** Installed plugins are copied to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`. Files outside the plugin directory are not copied.
- **Variables.** `${CLAUDE_PLUGIN_ROOT}` changes with every version. `${CLAUDE_PLUGIN_DATA}` persists across updates.

### Strict mode

`strict` defaults to `true`. With it, `plugin.json` is authoritative and component fields on the entry are appended. With `strict: false` and both a `plugin.json` and entry components, the plugin fails with a conflict error.

### Versions and updates

- Version precedence: `plugin.json` `version`, then the entry `version`, then the commit SHA. An update installs only when that computed version changes.
- Don't set `version` in both places.
- Auto-update is off by default for third-party marketplaces.

### Other rules

- **Removals.** Use the `renames` map and `forceRemoveDeletedPlugins`.
- **Private repositories.** The user's own git credentials are used, non-interactively. `GITHUB_TOKEN` alone is not enough; run `gh auth setup-git`. `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` skips the SSH probe.
- **Team rollout.** Put `extraKnownMarketplaces` and `enabledPlugins` in the project's `.claude/settings.json` (`--scope project`).

## Verified in this repository

- **Empty catalog.** With `plugins: []`, `claude plugin validate .` passes with the warning "Marketplace has no plugins defined", and `--strict` fails (CLI 2.1.299). CI therefore uses `--strict` only once the catalog has plugins.
- **No login needed.** `claude plugin validate` works without authentication: it ran with an empty `HOME` and no credentials.

## Public marketplaces studied

| Repository | Takeaway |
|---|---|
| anthropics/claude-plugins-official | External plugins are pinned by `sha`, with a nightly SHA-bump PR. CI validates plugins, frontmatter and licenses, and every plugin needs a LICENSE. It has a `renames` map. |
| anthropics/claude-code | Monorepo of plugins with relative sources and a `category` field. |
| anthropics/skills | `"source": "./"` with `strict: false` and explicit `skills` arrays: skill bundles without a `plugin.json`. |
| wshobson/agents | Many small single-domain plugins. CI JSON-parses manifests, checks that entry directories exist, and checks name uniqueness. Actions are pinned by SHA. |
| obra/superpowers-marketplace | Catalog-only repository whose plugins live in their own repositories (`url` sources). |
| EveryInc/compound-engineering-plugin | release-please owns versions, so feature PRs don't bump them by hand. |
| jeremylongshore/tons-of-skills-marketplace | Generated `marketplace.json`, automatic patch bumps on PRs, gitleaks. |

## Practices adopted here

- **Layout.** Monorepo with `./plugins/<name>` sources.
- **Versions.** SemVer `version` only in `plugin.json`, a bump enforced by CI, and release tags `<plugin>--v<version>`.
- **Components.** New components are skills. No top-level `bin/`, no Git LFS, no files outside the plugin directory.
- **Secrets** come from `userConfig` with `"sensitive": true`. Hook paths are quoted.
- **CI:**
  - a custom linter for what `validate` doesn't check: missing source directories, name mismatches, version bumps, LICENSE, symlinks and LFS;
  - then `claude plugin validate`, with the CLI version pinned through `package-lock.json` and Dependabot;
  - actions pinned by SHA.
- **Planned:** gitleaks secret scanning.

## Known Claude Code issues to keep in mind

- **Stale cache after updates:** anthropics/claude-code #14061 and #17361 are open. Workaround: `/plugin marketplace update`, then `/reload-plugins`, then reinstall.
- **Unquoted `${CLAUDE_PLUGIN_ROOT}`** breaks on paths with spaces: #33431.
- **`CLAUDE_PLUGIN_ROOT` missing** in the Bash tool environment in some cases: #93057.
- **`$schema` URL.** The URL used by the official marketplace returns 404, so this repository uses `https://json.schemastore.org/claude-code-marketplace.json`. It is community-maintained and is for editor autocomplete only.

Issue numbers come from a web search and should be rechecked before relying on them.
