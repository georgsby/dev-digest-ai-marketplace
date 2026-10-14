# Contributing

The catalog decides what code runs on users' machines, so every change goes through a pull request and CI.

## Add a plugin

1. Create `plugins/<plugin-name>/` following [docs/PLUGIN-GUIDELINES.md](docs/PLUGIN-GUIDELINES.md). It needs at least:
   - `.claude-plugin/plugin.json` with `name`, `version`, `description`, `author`, `license`
   - `LICENSE`
   - `README.md`
   - `CHANGELOG.md` with a section for the first version:

     ```markdown
     # Changelog

     ## [0.1.0] - YYYY-MM-DD

     - Initial release
     ```

   - one component, usually `skills/<skill-name>/SKILL.md`
2. Add an entry to `.claude-plugin/marketplace.json`:

   ```json
   {
     "name": "<plugin-name>",
     "source": "./plugins/<plugin-name>",
     "description": "One sentence on what it does",
     "category": "development"
   }
   ```

   Keep `name` identical to `plugin.json`. Do not put `version` here; it lives only in `plugin.json`.
3. Optionally add a per-plugin owner in `.github/CODEOWNERS`.
4. Run the checks below and open a PR.

## Change a plugin

- Any change under `plugins/<name>/` must raise `version` in its `plugin.json` and add a `CHANGELOG.md` section. Without a bump, installed users never receive the change. CI enforces both on pull requests. Use the script:

  ```bash
  node scripts/bump-version.mjs <name> <patch|minor|major> -m "What changed"
  ```

- After merge, CI tags the release and publishes release notes. See [docs/RELEASES.md](docs/RELEASES.md), which also covers rollback (`scripts/rollback.mjs`).
- Never change a plugin's `name`. Use `displayName` for the label, or follow the rename steps in [docs/RELEASES.md](docs/RELEASES.md).

## Remove a plugin

Don't just delete the entry. Add it to `renames` with `null` (see [docs/RELEASES.md](docs/RELEASES.md)).

## Check locally

```bash
npm ci                                        # installs the pinned Claude Code CLI
npm test                                      # tests for the release scripts
node scripts/validate-marketplace.mjs         # structure, names, LICENSE, CHANGELOG, symlinks, LFS
node scripts/validate-marketplace.mjs --base origin/main   # + version-bump check
npx claude plugin validate .                  # official schema check
npx claude plugin validate ./plugins/<name> --strict
```

Then try the plugin the way users will:

```bash
claude --plugin-dir ./plugins/<name>          # fast loop; /reload-plugins after edits
claude plugin marketplace add ./              # install from the local catalog
claude plugin install <name>@dev-digest-ai
```

`--plugin-dir` must point at the plugin, not at the marketplace root. A local-path marketplace loads files in place, so it does not show caching or version problems. After merging, check one install from GitHub too.

## Pull request checklist

The [PR template](.github/pull_request_template.md) has the checklist. CI (`.github/workflows/validate.yml`) runs the same checks as above.
