#!/usr/bin/env node
// Tags every plugin whose current version has no `<plugin>--v<version>` tag yet.
// CI runs this after each push to main; it can also be run by hand.
//
// Usage:
//   node scripts/release-tags.mjs [--dry-run] [--push] [--github-release]
//
//   --dry-run          list the tags that would be created
//   --push             push new tags to origin
//   --github-release   also create a GitHub Release with the CHANGELOG.md notes (needs gh and GH_TOKEN)

import { execFileSync } from 'node:child_process';
import { delimiter, join, relative } from 'node:path';
import {
  ROOT,
  changelogSection,
  fail,
  localPlugins,
  readChangelog,
  readManifest,
  tagExists,
  tagName,
} from './lib/plugins.mjs';

const args = new Set(process.argv.slice(2));
for (const a of args) {
  if (!['--dry-run', '--push', '--github-release'].includes(a)) fail(`unknown option ${a}`);
}
const dryRun = args.has('--dry-run');

// Prefer the CLI version pinned in package-lock.json when node_modules is installed.
const env = { ...process.env, PATH: [join(ROOT, 'node_modules', '.bin'), process.env.PATH].join(delimiter) };
const run = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: ROOT, env, stdio: 'inherit' });

const pending = [];
for (const plugin of localPlugins()) {
  const { version } = readManifest(plugin);
  const tag = tagName(plugin.name, version);
  if (!tagExists(tag)) pending.push({ plugin, version, tag });
}

if (!pending.length) {
  console.log('Every plugin version is already tagged.');
  process.exit(0);
}

for (const { plugin, version, tag } of pending) {
  const notes = changelogSection(readChangelog(plugin), version);
  if (!notes) console.warn(`warning: ${plugin.name}: CHANGELOG.md has no section for ${version}`);

  if (dryRun) {
    console.log(`would tag ${tag}`);
    continue;
  }

  // `claude plugin tag` checks that plugin.json and the marketplace entry agree before tagging.
  const tagArgs = ['plugin', 'tag', relative(ROOT, plugin.dir), '-m', `${plugin.name} %s`];
  if (args.has('--push')) tagArgs.push('--push');
  run('claude', tagArgs);

  if (args.has('--github-release')) {
    run('gh', [
      'release', 'create', tag,
      '--verify-tag',
      '--title', `${plugin.name} ${version}`,
      '--notes', notes ?? `See ${relative(ROOT, plugin.dir)}/CHANGELOG.md.`,
    ]);
  }
}
