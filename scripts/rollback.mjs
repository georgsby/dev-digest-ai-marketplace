#!/usr/bin/env node
// Rolls a plugin back to the contents of an earlier release, shipped as a new patch version.
//
// Clients only update when the version goes up, so a rollback restores the old files
// from the `<plugin>--v<good-version>` tag and releases them under a higher version.
// CHANGELOG.md keeps its full history and gets an entry explaining the rollback.
//
// Usage:
//   node scripts/rollback.mjs <plugin> <good-version> --reason "why" [--bump patch|minor|major|X.Y.Z]
//
// The script changes the working tree only. Review the diff, commit, and open a PR.

import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import {
  ROOT,
  addChangelogSection,
  changelogPath,
  compareSemver,
  fail,
  findPlugin,
  git,
  incrementVersion,
  isTreeClean,
  readChangelog,
  readManifest,
  tagExists,
  tagName,
  writeManifestVersion,
} from './lib/plugins.mjs';

function usage(code) {
  console.log('Usage: node scripts/rollback.mjs <plugin> <good-version> --reason "why" [--bump patch|minor|major|X.Y.Z]');
  process.exit(code);
}

function parseArgs(argv) {
  const positional = [];
  let reason = null;
  let bump = 'patch';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--reason') reason = argv[++i];
    else if (argv[i] === '--bump') bump = argv[++i];
    else if (argv[i] === '-h' || argv[i] === '--help') usage(0);
    else positional.push(argv[i]);
  }
  if (positional.length !== 2 || !reason || !bump) usage(1);
  return { name: positional[0], good: positional[1], reason, bump };
}

const { name, good, reason, bump } = parseArgs(process.argv.slice(2));

try {
  const plugin = findPlugin(name);
  const relDir = relative(ROOT, plugin.dir);
  const tag = tagName(name, good);

  if (!tagExists(tag)) throw new Error(`tag ${tag} not found (run "git fetch --tags" or check the version)`);
  if (!isTreeClean([relDir])) throw new Error(`${relDir} has uncommitted changes; commit or stash them first`);

  const current = readManifest(plugin).version;
  if (compareSemver(good, current) >= 0) throw new Error(`${good} is not older than the current version ${current}`);
  const next = incrementVersion(current, bump);
  const history = readChangelog(plugin);

  // Restore the plugin directory exactly as tagged; files added since then are removed.
  git(['restore', `--source=${tag}`, '--staged', '--worktree', '--', relDir]);

  writeManifestVersion(plugin, next);
  const note = `Rolled back to the contents of ${good} (tag \`${tag}\`): ${reason}`;
  writeFileSync(changelogPath(plugin), addChangelogSection(history, next, [note]));

  console.log(`${name}: restored files from ${tag}, version ${current} -> ${next}`);
  console.log('Next steps:');
  console.log(`  git diff HEAD -- ${relDir}`);
  console.log(`  git checkout -b rollback/${name}-${next}`);
  console.log(`  git commit -am "revert(${name}): roll back to ${good}"`);
  console.log('  open a PR; after merge CI tags the release.');
} catch (e) {
  fail(e.message);
}
