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

| Plugin | What it gives you | Depends on |
|---|---|---|
| [sdd-engineering](plugins/sdd-engineering/README.md) | Spec Driven Development: `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier` agents, the `/implement` pipeline and `/workflow-retro` | the three below |
| [research-tools](plugins/research-tools/README.md) | `researcher`, a read-only agent that answers one question from the code and the web, with evidence | — |
| [architecture-review](plugins/architecture-review/README.md) | `architecture-reviewer`, a read-only agent that checks a change set against the project's boundary rules | engineering-paved-path |
| [engineering-paved-path](plugins/engineering-paved-path/README.md) | Engineering skills: React, Fastify, Drizzle, PostgreSQL, Zod, TypeScript, Onion and frontend architecture, testing, security, engineering insights | — |

Installing a plugin also installs its dependencies. For the whole workflow:

```text
/plugin install sdd-engineering@dev-digest-ai
```

See [CONTRIBUTING.md](CONTRIBUTING.md) to add a plugin.

## Documentation

- [CONTRIBUTING.md](CONTRIBUTING.md): how to add or change a plugin safely
- [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md): plugin structure, manifest, dependencies
- [docs/SECURITY.md](docs/SECURITY.md): permissions, secrets, scripts, reporting vulnerabilities
- [docs/RELEASES.md](docs/RELEASES.md): versioning, tags, updates, rollback, renames
- [docs/temp/MARKETPLACE-RESEARCH.md](docs/temp/MARKETPLACE-RESEARCH.md): the research behind these rules (temporary, removed after the first plugin)

## License

[MIT](LICENSE)
