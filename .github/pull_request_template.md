## What and why

<!-- Which plugin(s), what changed, and why. -->

## Checklist

- [ ] `node scripts/validate-marketplace.mjs --base origin/main` passes
- [ ] `npx claude plugin validate .` passes, and so does `npx claude plugin validate ./plugins/<name> --strict` for each changed plugin
- [ ] Tried it with `claude --plugin-dir ./plugins/<name>`
- [ ] Version raised with `node scripts/bump-version.mjs`, and the `CHANGELOG.md` section describes the change (no TODO)
- [ ] Entry `name` and `plugin.json` `name` are identical; no `version` in the marketplace entry
- [ ] No secrets committed; secrets come from `userConfig` with `"sensitive": true`
- [ ] Hooks, scripts and MCP servers reviewed against [docs/SECURITY.md](../docs/SECURITY.md)
- [ ] Plugin has `LICENSE`, `README.md` and `CHANGELOG.md`
- [ ] A renamed or removed plugin is recorded in `renames`
