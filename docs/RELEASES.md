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

There are two kinds of rollback:

- **For everyone:** publish a new, higher release that contains the old files (below). Use it when a release is bad.
- **For one project, right now:** switch that project to the `stable` channel (see [Release channels](#release-channels)). Use it to get unblocked while the fix is released, or to rehearse.

### New release with the old files

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

| Channel | Marketplace name | Add with | Contents |
|---|---|---|---|
| latest | `dev-digest-ai` | `georgsby/dev-digest-ai-marketplace` | `main` |
| stable | `dev-digest-ai-stable` | `georgsby/dev-digest-ai-marketplace#stable` | branch `stable`: the `sdd-engineering--v1.0.0` commit, with only the marketplace `name` and `description` changed |

Claude Code identifies a marketplace by its `name`, so the stable branch renames it; otherwise the two channels could not be registered side by side. To move stable to a newer release, recreate the branch from that release's tag, apply the same rename in `.claude-plugin/marketplace.json`, and force-push `stable`. No workflow runs on that branch.

If a beta channel is ever needed, add a third marketplace the same way (for example `owner/repo#beta`). Don't list `-dev` copies of plugins in this catalog.

### Switch a project to stable and back

Rehearsed on 2026-10-14 in a project that had the four plugins installed from `dev-digest-ai` with `--scope local` and was on `sdd-engineering@1.1.0`. Use the scope the plugins were installed with (`claude plugin list --json` shows it). Run the commands from the project root, then start a new session or run `/reload-plugins`.

**1. Switch to stable.** Disable rather than uninstall the latest plugins, so their options and data stay in place:

```bash
for p in sdd-engineering architecture-review research-tools engineering-paved-path; do
  claude plugin disable "$p@dev-digest-ai" --scope local
done
claude plugin marketplace add 'georgsby/dev-digest-ai-marketplace#stable' --scope local
claude plugin install sdd-engineering@dev-digest-ai-stable --scope local   # installs its 3 dependencies too
```

Disable all four plugins, not just `sdd-engineering`. If both channels stay enabled, every skill and agent loads twice under the same names.

**2. Smoke-check stable.**

```bash
claude plugin list --json | jq -r '.[] | select(.id|test("dev-digest")) | "\(.id) \(.version) enabled=\(.enabled)"'
claude -p "Reply with OK." --model claude-haiku-4-5 --output-format stream-json --verbose --max-budget-usd 0.05 \
  | jq -r 'select(.type=="system" and .subtype=="init") | .plugins[] | select(.source|test("dev-digest")) | "\(.source) \(.version)"'
```

The session's `init` event is the telemetry check. It must list `sdd-engineering@dev-digest-ai-stable 1.0.0`. For a behaviour check, run that version's `spec-lint` from the plugin cache on a spec whose only user story has `Should` criteria. 1.0.0 accepts it (exit 0) and 1.1.0 rejects it (exit 1, `US-1 has no Must acceptance criterion`). The check writes nothing into the project.

**3. Return to latest.**

```bash
claude plugin marketplace remove dev-digest-ai-stable        # also uninstalls the stable plugins
for p in engineering-paved-path research-tools architecture-review sdd-engineering; do
  claude plugin enable "$p@dev-digest-ai" --scope local
done
```

Repeat step 2: it must show `sdd-engineering@dev-digest-ai 1.1.0`, and `spec-lint` must reject the `Should`-only spec again.

**What the rehearsal showed**

- **Plugin data.** `marketplace remove` warns that it deletes the removed plugins' options, secrets and data. That hit only the stable copies, which had none. The latest plugins were only disabled, so nothing of theirs was lost. `sdd-engineering` keeps no plugin data: no `${CLAUDE_PLUGIN_DATA}`, hooks or MCP servers. Its specs, plans, retros and `.claude/.sdd/` run state are project files, which a channel switch never touches. The project's `git status` stayed clean throughout.
- **Settings.** Afterwards `.claude/settings.local.json` had the same `enabledPlugins` as before, plus an empty `"extraKnownMarketplaces": {}`. The stable cache directory (`~/.claude/plugins/cache/dev-digest-ai-stable`) stays on disk until Claude Code cleans it up; it is not loaded.
- **Dependencies resolve by tag, not by branch.** Installed from `stable`, `research-tools` came in at 1.1.0, not 1.0.0. The `^1.0.0` range resolves against the repository's `research-tools--v*` tags. Pinning a channel's branch does not pin its dependencies; a channel that must hold a dependency back needs an exact range such as `1.0.0` in the stable branch's `plugin.json`.
- **External state.** None to restore. The plugins make no network writes and install no services.
