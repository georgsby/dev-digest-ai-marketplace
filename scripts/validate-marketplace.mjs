#!/usr/bin/env node
// Structural checks for this marketplace that `claude plugin validate` does not cover.
// No dependencies; needs Node 22+ and git.
//
// Usage:
//   node scripts/validate-marketplace.mjs                  # structure only
//   node scripts/validate-marketplace.mjs --base origin/main  # + version-bump check against base

import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MARKETPLACE_PATH = join(ROOT, '.claude-plugin', 'marketplace.json');
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;
const SHA_RE = /^[0-9a-f]{40}$/;
const LICENSE_FILES = ['LICENSE', 'LICENSE.md', 'LICENSE.txt'];
const LFS_POINTER = 'version https://git-lfs.github.com/spec/v1';

const errors = [];
const warnings = [];
const error = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

function parseArgs(argv) {
  const args = { base: process.env.BASE_REF || null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i].startsWith('--base=')) args.base = argv[i].slice('--base='.length);
  }
  return args;
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    error(`${label}: cannot parse JSON (${e.message})`);
    return null;
  }
}

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function compareSemver(a, b) {
  const pa = SEMVER_RE.exec(a);
  const pb = SEMVER_RE.exec(b);
  for (let i = 1; i <= 3; i++) {
    const diff = Number(pa[i]) - Number(pb[i]);
    if (diff !== 0) return Math.sign(diff);
  }
  const [preA, preB] = [pa[4], pb[4]];
  if (preA === preB) return 0;
  if (!preA) return 1;
  if (!preB) return -1;
  const idsA = preA.split('.');
  const idsB = preB.split('.');
  for (let i = 0; i < Math.max(idsA.length, idsB.length); i++) {
    if (idsA[i] === undefined) return -1;
    if (idsB[i] === undefined) return 1;
    const numA = /^\d+$/.test(idsA[i]);
    const numB = /^\d+$/.test(idsB[i]);
    if (numA && numB) {
      const diff = Number(idsA[i]) - Number(idsB[i]);
      if (diff !== 0) return Math.sign(diff);
    } else if (numA !== numB) {
      return numA ? -1 : 1;
    } else if (idsA[i] !== idsB[i]) {
      return idsA[i] < idsB[i] ? -1 : 1;
    }
  }
  return 0;
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    yield path;
    if (entry.isDirectory()) yield* walk(path);
  }
}

function isInside(path, parent) {
  return path === parent || path.startsWith(parent + sep);
}

function checkPluginFiles(pluginDir, label) {
  if (existsSync(join(pluginDir, 'bin'))) {
    error(`${label}: top-level bin/ is rejected by claude.ai org sync and Cowork; use scripts/ instead`);
  }
  if (existsSync(join(pluginDir, 'CLAUDE.md'))) {
    warn(`${label}: CLAUDE.md in a plugin is not loaded as context; move instructions into a skill`);
  }
  if (!LICENSE_FILES.some((f) => existsSync(join(pluginDir, f)))) {
    error(`${label}: missing LICENSE file`);
  }
  for (const path of walk(pluginDir)) {
    const rel = relative(ROOT, path);
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) {
      let target;
      try {
        target = realpathSync(path);
      } catch {
        error(`${rel}: broken symlink`);
        continue;
      }
      if (!isInside(target, ROOT)) error(`${rel}: symlink points outside the marketplace (it is dropped at install)`);
    } else if (stat.isFile() && stat.size < 1024) {
      if (readFileSync(path, 'utf8').startsWith(LFS_POINTER)) {
        error(`${rel}: Git LFS pointer; LFS content is not fetched when the marketplace is cloned`);
      }
    }
  }
}

function checkRelativeEntry(entry, label) {
  const source = entry.source;
  if (!source.startsWith('./')) error(`${label}: source must start with "./"`);
  if (source.split(/[\\/]/).includes('..')) error(`${label}: source must not contain ".."`);
  if (source.includes('\\')) error(`${label}: source must use forward slashes`);

  const pluginDir = resolve(ROOT, source);
  if (!isInside(pluginDir, ROOT)) return null;
  if (!existsSync(pluginDir)) {
    error(`${label}: source directory ${source} does not exist (validate passes this, install fails)`);
    return null;
  }

  const manifestPath = join(pluginDir, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) {
    error(`${label}: missing ${relative(ROOT, manifestPath)}`);
    return null;
  }
  const manifest = readJson(manifestPath, relative(ROOT, manifestPath));
  if (!manifest) return null;

  if (manifest.name !== entry.name) {
    error(`${label}: plugin.json name "${manifest.name}" must equal the marketplace entry name`);
  }
  if (typeof manifest.version !== 'string' || !SEMVER_RE.test(manifest.version)) {
    error(`${label}: plugin.json must set a SemVer "version" (see docs/RELEASES.md)`);
  }
  checkPluginFiles(pluginDir, label);
  return { dir: pluginDir, manifestPath, manifest };
}

function checkExternalEntry(entry, label) {
  const { source } = entry;
  if (!source || typeof source !== 'object' || typeof source.source !== 'string') {
    error(`${label}: source must be a "./" path or an object with a "source" type`);
    return;
  }
  if (['github', 'url', 'git-subdir'].includes(source.source) && !SHA_RE.test(source.sha ?? '')) {
    warn(`${label}: external ${source.source} source is not pinned to a 40-char "sha"`);
  }
  if (source.source === 'archive' && !source.sha256) {
    warn(`${label}: archive source has no "sha256" pin`);
  }
}

function checkVersionBump(base, plugins) {
  try {
    git(['rev-parse', '--verify', `${base}^{commit}`]);
  } catch {
    error(`--base ${base}: ref not found (in CI, check out with fetch-depth: 0)`);
    return;
  }
  for (const { label, dir, manifestPath, manifest } of plugins) {
    const relDir = relative(ROOT, dir);
    const changed = git(['diff', '--name-only', `${base}...HEAD`, '--', relDir]).trim();
    if (!changed) continue;

    let baseManifest;
    try {
      baseManifest = JSON.parse(git(['show', `${base}:${relative(ROOT, manifestPath)}`]));
    } catch {
      continue; // new plugin, nothing to compare against
    }
    const [oldV, newV] = [baseManifest.version, manifest.version];
    if (!SEMVER_RE.test(newV ?? '') || !SEMVER_RE.test(oldV ?? '')) continue;
    if (compareSemver(newV, oldV) <= 0) {
      error(`${label}: files changed but version ${newV} is not greater than ${oldV} on ${base}`);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const gitattributes = join(ROOT, '.gitattributes');
  if (existsSync(gitattributes) && readFileSync(gitattributes, 'utf8').includes('filter=lfs')) {
    error('.gitattributes: Git LFS is not supported for marketplace content');
  }

  if (!existsSync(MARKETPLACE_PATH)) {
    error('.claude-plugin/marketplace.json not found');
    return;
  }
  const marketplace = readJson(MARKETPLACE_PATH, '.claude-plugin/marketplace.json');
  if (!marketplace) return;

  if (!NAME_RE.test(marketplace.name ?? '')) error('marketplace name must be kebab-case');
  if (!Array.isArray(marketplace.plugins)) {
    error('marketplace "plugins" must be an array');
    return;
  }

  const seen = new Set();
  const localPlugins = [];
  const listedDirs = new Set();
  marketplace.plugins.forEach((entry, i) => {
    const label = `plugins[${i}] (${entry?.name ?? 'unnamed'})`;
    if (!NAME_RE.test(entry?.name ?? '')) error(`${label}: name must be kebab-case`);
    if (seen.has(entry?.name)) error(`${label}: duplicate plugin name`);
    seen.add(entry?.name);
    if ('version' in (entry ?? {})) {
      error(`${label}: set "version" only in plugin.json, not in the marketplace entry`);
    }

    if (typeof entry?.source === 'string') {
      const plugin = checkRelativeEntry(entry, label);
      if (plugin) {
        localPlugins.push({ label, ...plugin });
        listedDirs.add(plugin.dir);
      }
    } else {
      checkExternalEntry(entry, label);
    }
  });

  const pluginsDir = join(ROOT, 'plugins');
  if (existsSync(pluginsDir)) {
    for (const d of readdirSync(pluginsDir, { withFileTypes: true })) {
      if (d.isDirectory() && !listedDirs.has(join(pluginsDir, d.name))) {
        warn(`plugins/${d.name}: directory is not listed in marketplace.json`);
      }
    }
  }

  if (args.base) checkVersionBump(args.base, localPlugins);
}

main();
for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
