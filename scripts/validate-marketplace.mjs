#!/usr/bin/env node
// Structural checks for this marketplace that `claude plugin validate` does not cover.
// No dependencies; needs Node 22+ and git.
//
// Usage:
//   node scripts/validate-marketplace.mjs                  # structure only
//   node scripts/validate-marketplace.mjs --base origin/main  # + version-bump check against base

import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import {
  MARKETPLACE_PATH,
  NAME_RE,
  ROOT,
  SEMVER_RE,
  changelogSection,
  compareSemver,
  git,
  satisfiesRange,
} from './lib/plugins.mjs';

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

// The release notes for the current version come from this section (scripts/release-tags.mjs).
function checkChangelog(pluginDir, version, label) {
  const path = join(pluginDir, 'CHANGELOG.md');
  if (!existsSync(path)) {
    error(`${label}: missing CHANGELOG.md (scripts/bump-version.mjs creates it)`);
    return;
  }
  const section = changelogSection(readFileSync(path, 'utf8'), version);
  if (section === null) error(`${label}: CHANGELOG.md has no "## [${version}]" section`);
  else if (!section || /\bTODO\b/.test(section)) error(`${label}: CHANGELOG.md section for ${version} is empty or has a TODO`);
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
  } else {
    checkChangelog(pluginDir, manifest.version, label);
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

// Dependencies must name plugins in this catalog (or an allowed other marketplace), and a local
// dependency's current version must satisfy the declared range: for relative-path plugins Claude Code
// installs whatever version is in the catalog and leaves the dependent plugin disabled if it doesn't fit.
function checkDependencies(marketplace, localPlugins) {
  const names = new Set(marketplace.plugins.map((p) => p?.name));
  const versions = new Map(localPlugins.map((p) => [p.manifest.name, p.manifest.version]));
  const allowed = new Set(marketplace.allowCrossMarketplaceDependenciesOn ?? []);
  const graph = new Map();
  for (const { label, manifest } of localPlugins) {
    const deps = manifest.dependencies ?? [];
    if (!Array.isArray(deps)) {
      error(`${label}: plugin.json "dependencies" must be an array`);
      continue;
    }
    const edges = [];
    for (const dep of deps) {
      const { name, version: range, marketplace: depMarketplace } = typeof dep === 'string' ? { name: dep } : (dep ?? {});
      if (typeof name !== 'string' || !name) {
        error(`${label}: dependency without a "name"`);
        continue;
      }
      if (depMarketplace && depMarketplace !== marketplace.name) {
        if (!allowed.has(depMarketplace)) {
          error(`${label}: dependency "${name}" is in marketplace "${depMarketplace}", which is not in allowCrossMarketplaceDependenciesOn`);
        }
        continue;
      }
      if (name === manifest.name) error(`${label}: plugin depends on itself`);
      if (!names.has(name)) {
        error(`${label}: dependency "${name}" is not a plugin in this marketplace`);
        continue;
      }
      edges.push(name);
      const current = versions.get(name);
      if (range === undefined || current === undefined) continue;
      try {
        if (!satisfiesRange(current, range)) {
          error(`${label}: dependency "${name}" requires ${range}, but the catalog has ${current}`);
        }
      } catch (e) {
        error(`${label}: dependency "${name}": ${e.message}`);
      }
    }
    graph.set(manifest.name, edges);
  }

  const state = new Map(); // name -> 'visiting' | 'done'
  const visit = (name, path) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'visiting') {
      error(`dependency cycle: ${[...path.slice(path.indexOf(name)), name].join(' -> ')}`);
      return;
    }
    state.set(name, 'visiting');
    for (const next of graph.get(name) ?? []) visit(next, [...path, name]);
    state.set(name, 'done');
  };
  for (const name of graph.keys()) visit(name, []);
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

  checkDependencies(marketplace, localPlugins);
  if (args.base) checkVersionBump(args.base, localPlugins);
}

main();
for (const w of warnings) console.warn(`warning: ${w}`);
for (const e of errors) console.error(`error: ${e}`);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
