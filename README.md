# dev-digest-ai marketplace

A [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugins/create-marketplace) for the dev-digest project.

The catalog is `.claude-plugin/marketplace.json`; plugins live in `plugins/<name>/`.

## Install

In one step (Claude Code 2.1.275+):

```text
/plugin install <plugin-name> --marketplace georgsby/dev-digest-ai-marketplace
```

Or add the marketplace once, then install plugins from it:

```text
/plugin marketplace add georgsby/dev-digest-ai-marketplace
/plugin install <plugin-name>@dev-digest-ai
```

From a shell:

```bash
claude plugin marketplace add georgsby/dev-digest-ai-marketplace
claude plugin install <plugin-name>@dev-digest-ai
```

To share it with a team, run the commands with `--scope project`. That writes `extraKnownMarketplaces` and `enabledPlugins` into the repository's `.claude/settings.json`, which you commit.

## Updates

Auto-update is **off by default** for third-party marketplaces. Turn it on in `/plugin` → Marketplaces → Enable auto-update, or update manually:

```text
/plugin marketplace update dev-digest-ai
/reload-plugins
```

### If an update doesn't show up

Claude Code runs a cached copy of each plugin from `~/.claude/plugins/cache/`. If you still get the old behaviour:

1. `/plugin marketplace update dev-digest-ai`
2. `/reload-plugins`, or restart Claude Code.
3. As a last resort: `/plugin uninstall <plugin-name>@dev-digest-ai`, then install it again.

### Private access and SSH

`owner/repo` sources try SSH first. If you have no SSH key for GitHub, set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` and authenticate git with `gh auth login && gh auth setup-git`. A `GITHUB_TOKEN` variable alone is not used.

## Plugins

None yet. See [CONTRIBUTING.md](CONTRIBUTING.md) to add one.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): how to add or change a plugin safely
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md): plugin structure, manifest, dependencies
- [docs/SECURITY.md](docs/SECURITY.md): permissions, secrets, scripts, reporting vulnerabilities
- [docs/RELEASES.md](docs/RELEASES.md): versioning, tags, updates, rollback, renames
- [docs/MARKETPLACE-RESEARCH.md](docs/MARKETPLACE-RESEARCH.md): the research behind these rules

## License

[MIT](LICENSE)
