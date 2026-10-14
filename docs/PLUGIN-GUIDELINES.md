# Plugin guidelines

Rules for plugins in this marketplace. They follow the official [plugin manifest reference](https://code.claude.com/docs/en/plugins/manifest-reference) and [marketplace reference](https://code.claude.com/docs/en/plugins/marketplace-reference), plus a few house rules marked **(house rule)**.

## Layout

```text
plugins/<plugin-name>/
├── .claude-plugin/
│   └── plugin.json          # only the manifest goes in here
├── skills/<skill-name>/SKILL.md
├── agents/*.md              # optional
├── hooks/hooks.json         # optional
├── .mcp.json                # optional
├── scripts/                 # helper scripts used by hooks or skills
├── README.md
├── CHANGELOG.md             # one "## [x.y.z] - date" section per release
└── LICENSE
```

- All components sit at the plugin root, never inside `.claude-plugin/`.
- Write new features as **skills**. `commands/` is the older format.
- No top-level `bin/`: claude.ai org sync and Cowork reject it. Put executables in `scripts/` and call them as `"${CLAUDE_PLUGIN_ROOT}/scripts/<name>"`.
- A `CLAUDE.md` in a plugin is not loaded. Put instructions in a skill.
- No Git LFS. Clones get pointer files only.

## Scope **(house rule)**

One plugin covers one domain. Small plugins let users install only what they need. Many installed skills also get their descriptions truncated, which makes them trigger less reliably.

## plugin.json

```json
{
  "name": "<plugin-name>",
  "version": "0.1.0",
  "description": "One sentence on what it does",
  "author": { "name": "georgsby" },
  "license": "MIT",
  "repository": "https://github.com/georgsby/dev-digest-ai-marketplace"
}
```

- `name`: kebab-case, identical to the marketplace entry name, and never changed after release. It namespaces every component (`<plugin-name>:<skill>`).
- `version` **(house rule)**: required SemVer, set only here and not in the marketplace entry. Change it with `scripts/bump-version.mjs`, not by hand. See [RELEASES.md](RELEASES.md).
- `homepage`, if set, must be a valid URL or the plugin fails to load.
- Unknown keys are silently ignored at load time. `claude plugin validate` reports them.

## Paths and variables

- Every component path is relative to the plugin root and starts with `./`.
- Never reference files outside the plugin directory (`../shared`). Installed plugins are copied into `~/.claude/plugins/cache/`, so those paths break. To share files between plugins, use a symlink that stays inside this repository.
- `${CLAUDE_PLUGIN_ROOT}` is the installed version's directory. It changes on every update, so don't write state there.
- `${CLAUDE_PLUGIN_DATA}` persists across updates. Use it for caches, `node_modules`, virtualenvs and other state.
- In shell-form hook commands, always quote: `"${CLAUDE_PLUGIN_ROOT}"/scripts/check.sh`. Or use exec form with `args`.
- Skill instructions must not rely on `CLAUDE_PLUGIN_ROOT` being set in the Bash tool's environment. Write `${CLAUDE_PLUGIN_ROOT}` in the Markdown instead, and Claude Code substitutes it when loading.

## Configuration and secrets

User-specific values (API keys, paths) go in `userConfig`. See [SECURITY.md](SECURITY.md).

## Dependencies between plugins

- Declare them in `plugin.json` under `dependencies`, for example `["other-plugin"]` or `[{ "name": "other-plugin", "version": "^1.2.0" }]`.
- Version ranges resolve against git tags named `<plugin>--v<version>`, so tag every release (see [RELEASES.md](RELEASES.md)).
- Depending on another marketplace's plugin requires `allowCrossMarketplaceDependenciesOn` in `marketplace.json`. Avoid it unless needed.
- `scripts/validate-marketplace.mjs` checks that every dependency is a plugin in this catalog, that its current version satisfies the declared range, and that there are no cycles. For relative-path plugins an unsatisfied range doesn't fail the install: Claude Code installs the catalog's copy and leaves the dependent plugin disabled.
- Components from a dependency are addressed with its namespace: `skills: [other-plugin:skill]` in agent frontmatter, `Agent(other-plugin:agent)` in `tools`. Preloaded `skills:` apply only when the agent runs as a subagent; an agent started with `claude --agent` must load its skills with the Skill tool.

Reference: https://code.claude.com/docs/en/plugins/dependencies

## External plugins

A plugin can live in another repository. Its entry then uses a `github`, `url` or `git-subdir` source. Always pin a full 40-character `sha` so the catalog controls exactly which code users get:

```json
{
  "name": "<plugin-name>",
  "source": { "source": "github", "repo": "owner/repo", "ref": "v1.2.0", "sha": "<40-char commit sha>" }
}
```

The local linter can't inspect external sources. Review the pinned commit by hand.
