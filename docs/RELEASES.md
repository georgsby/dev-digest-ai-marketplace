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

1. Raise `version` in `plugins/<name>/.claude-plugin/plugin.json`.
2. Add an entry to the plugin's `CHANGELOG.md` (or its README "Changes" section).
3. Merge the PR into `main`.
4. Tag the release on `main`:

   ```bash
   claude plugin tag plugins/<name> --push
   ```

   This creates the tag `<name>--v<version>`. Plugin dependency version ranges resolve against tags in this format.

## How users receive it

- Auto-update is off by default for this marketplace. Users get the release after `/plugin marketplace update dev-digest-ai` and `/reload-plugins`, or automatically if they enabled auto-update.
- Stale-cache reports are a known Claude Code issue. Point users to the README section "If an update doesn't show up".

## Rollback

Users can't pin an older version of a relative-path plugin, so a rollback is a new release:

1. Revert the faulty change on `main` (`git revert`).
2. Raise the version again. Never reuse or lower a version number, because clients already holding it won't update.
3. Release as usual.

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
