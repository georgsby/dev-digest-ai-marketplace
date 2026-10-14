#!/usr/bin/env node
// Raises a plugin's version in plugin.json and adds a matching CHANGELOG.md section.
//
// Usage:
//   node scripts/bump-version.mjs <plugin> <patch|minor|major|X.Y.Z> [-m "change note"]...
//
// Example:
//   node scripts/bump-version.mjs hello minor -m "Add the farewell skill" -m "Fix greeting typo"

import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';
import {
  ROOT,
  addChangelogSection,
  changelogPath,
  fail,
  findPlugin,
  incrementVersion,
  readChangelog,
  readManifest,
  writeManifestVersion,
} from './lib/plugins.mjs';

function parseArgs(argv) {
  const positional = [];
  const notes = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '-m' || argv[i] === '--message') notes.push(argv[++i]);
    else if (argv[i] === '-h' || argv[i] === '--help') usage(0);
    else positional.push(argv[i]);
  }
  if (positional.length !== 2 || notes.some((n) => !n)) usage(1);
  return { name: positional[0], level: positional[1], notes };
}

function usage(code) {
  console.log('Usage: node scripts/bump-version.mjs <plugin> <patch|minor|major|X.Y.Z> [-m "change note"]...');
  process.exit(code);
}

const { name, level, notes } = parseArgs(process.argv.slice(2));

try {
  const plugin = findPlugin(name);
  const current = readManifest(plugin).version;
  const next = incrementVersion(current, level);

  const changelog = addChangelogSection(readChangelog(plugin), next, notes);
  writeManifestVersion(plugin, next);
  writeFileSync(changelogPath(plugin), changelog);

  console.log(`${name}: ${current} -> ${next}`);
  console.log(`updated ${relative(ROOT, plugin.manifestPath)} and ${relative(ROOT, changelogPath(plugin))}`);
  if (!notes.length) console.log('Replace the TODO line in CHANGELOG.md before committing; CI rejects it.');
  console.log('After the PR is merged, CI tags the release automatically (see docs/RELEASES.md).');
} catch (e) {
  fail(e.message);
}
