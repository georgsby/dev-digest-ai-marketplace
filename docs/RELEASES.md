# Releases

## How Claude Code detects updates

Claude Code computes a version for each installed plugin. It installs an update only when that version changes. The version comes from, in order:

1. `version` in `plugin.json`
2. `version` in the marketplace entry
3. a value derived from the source (for a relative path in a git repository, the commit SHA)

This marketplace uses **option 1 only**. `version` lives in `plugin.json` and is never set in the marketplace entry. If both were set, `plugin.json` would win silently.

Because the version is pinned, **pushing commits without a version bump ships nothing** to users who already have the plugin. CI fails a PR that changes `plugins/<name>/` without raising its version.

Source: https://code.claude.com/docs/en/plugins/loading

## SemVer

| Change | Bump |
|---|---|
| Fix, wording, internal refactor | patch: `1.2.3` → `1.2.4` |
| New skill, agent, hook or option; behaviour that stays compatible | minor: `1.2.3` → `1.3.0` |
| Removed or renamed component, changed `userConfig`, changed behaviour users rely on | major: `1.2.3` → `2.0.0` |

Start new plugins at `0.1.0`.

## Release steps

1. On a branch, make the change and bump the version:

   ```bash
   node scripts/bump-version.mjs <plugin> <patch|minor|major|X.Y.Z> -m "What changed" [-m "Another change"]
   ```

   This updates `version` in `plugins/<plugin>/.claude-plugin/plugin.json`, keeping the file's formatting. It also adds a `## [<version>] - <date>` section to `plugins/<plugin>/CHANGELOG.md`, creating the file if needed. Without `-m` the section gets a TODO line, and CI rejects a TODO.
2. Open a PR. The **Validate marketplace** workflow checks that the version went up, and that `CHANGELOG.md` has a filled-in section for it.
3. Merge into `main`. The **Release** workflow (`.github/workflows/release.yml`) then runs `scripts/release-tags.mjs`. For every plugin whose current version has no tag yet, it:
   - creates and pushes the tag `<plugin>--v<version>` with `claude plugin tag`, which also checks that `plugin.json` and the marketplace entry agree;
   - creates a GitHub Release with that version's `CHANGELOG.md` section as its notes.

Plugin dependency version ranges resolve against tags in the `<plugin>--v<version>` format, so every released version must be tagged.

### Running the release by hand

If the workflow failed or was skipped:

```bash
git checkout main && git pull --tags
node scripts/release-tags.mjs --dry-run                    # what would be tagged
node scripts/release-tags.mjs --push --github-release      # needs gh logged in
```

Only plugins whose current version is untagged are touched, so the script is safe to run again.

### Note for workflows triggered by tags

Tags pushed by the Release workflow use the built-in `GITHUB_TOKEN`. GitHub does not start other workflows for events created with that token, so a workflow that runs `on: push: tags` will **not** run for these tags. That includes the site rebuild planned in `docs/specs/catalog-site.md`. Use one of these instead:
- trigger it with `on: workflow_run` after **Release** completes;
- have `release.yml` start it with `gh workflow run`;
- push tags with a GitHub App token.

## How users receive it

- Auto-update is off by default for this marketplace. Users get the release after `/plugin marketplace update dev-digest-ai` and `/reload-plugins`, or automatically if they enabled auto-update.
- Stale-cache reports are a known Claude Code issue. Point users to the README section "If an update doesn't show up".

## Rollback

Clients only update when the version goes up, and users can't pin an older version of a relative-path plugin. A rollback is therefore a **new, higher release that contains the old files**. Never reuse or lower a version number.

```bash
git checkout main && git pull --tags
node scripts/rollback.mjs <plugin> <good-version> --reason "Why the rollback is needed"
```

The script:
1. checks that the tag `<plugin>--v<good-version>` exists, that the plugin directory has no uncommitted changes, and that `<good-version>` is older than the current version;
2. restores `plugins/<plugin>/` exactly as it was at that tag (files added later are removed);
3. sets the version to the next patch above the current one (`--bump minor|major|X.Y.Z` to change that);
4. keeps the full `CHANGELOG.md` history and adds an entry naming the restored version and the reason.

It only changes the working tree. Review the diff, commit it as `revert(<plugin>): roll back to <good-version>`, open a PR, and merge. The Release workflow tags it like any other release.

A rollback does not touch the marketplace entry in `marketplace.json`. If the bad release also changed the entry (description, category, dependencies), restore that by hand.

For a security problem, also see [SECURITY.md](SECURITY.md).

## Renaming or removing a plugin

The entry `name` is the install key in users' settings. Changing or deleting it breaks existing installs. Use the `renames` map in `marketplace.json`, and never delete old `renames` entries:

```json
"renames": {
  "old-name": "new-name",
  "retired-plugin": null
}
```

To also uninstall a removed plugin from users' machines, set `"forceRemoveDeletedPlugins": true`.

## Release channels

If a beta channel is ever needed, add a second marketplace with its own `name` that points at a different branch (for example `owner/repo#beta`). Don't list `-dev` copies of plugins in this catalog.
