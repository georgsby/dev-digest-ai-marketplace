// Shared helpers for the marketplace scripts: paths, SemVer, manifests, changelogs, git.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const MARKETPLACE_PATH = join(ROOT, '.claude-plugin', 'marketplace.json');
export const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

// ---------- SemVer ----------

export function compareSemver(a, b) {
  const pa = SEMVER_RE.exec(a);
  const pb = SEMVER_RE.exec(b);
  if (!pa || !pb) throw new Error(`not a SemVer version: ${!pa ? a : b}`);
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

// Supports the range forms plugin dependencies use: exact `1.2.3` or `=1.2.3`, `^1.2.3`, `~1.2.3`,
// comparators (`>=1.2.0`, `<2.0.0`), space-separated AND, and `*`. Partial versions (`^1`, `~1.2`) are padded.
export function satisfiesRange(version, range) {
  const pad = (v) => {
    const [core, ...rest] = v.split('-');
    const parts = core.split('.');
    while (parts.length < 3) parts.push('0');
    return [parts.join('.'), ...rest].join('-');
  };
  const one = (cmp) => {
    if (cmp === '*' || cmp === '') return true;
    const m = /^(\^|~|>=|<=|>|<|=)?v?(\d+(?:\.\d+){0,2}(?:-[0-9A-Za-z.-]+)?)$/.exec(cmp);
    if (!m) throw new Error(`unsupported version range "${range}"`);
    const [, op = '=', raw] = m;
    const base = pad(raw);
    const [major, minor] = base.split('.').map(Number);
    const c = compareSemver(version, base);
    switch (op) {
      case '=': return c === 0;
      case '>=': return c >= 0;
      case '<=': return c <= 0;
      case '>': return c > 0;
      case '<': return c < 0;
      case '~': return c >= 0 && compareSemver(version, `${major}.${minor + 1}.0-0`) < 0;
      case '^': {
        const upper = major > 0 ? `${major + 1}.0.0-0` : minor > 0 ? `0.${minor + 1}.0-0` : `0.0.${Number(base.split('.')[2]) + 1}-0`;
        return c >= 0 && compareSemver(version, upper) < 0;
      }
    }
  };
  return range.trim().split(/\s+/).every(one);
}

// `level` is patch, minor, major, or an explicit version that must be greater than `version`.
export function incrementVersion(version, level) {
  const m = SEMVER_RE.exec(version);
  if (!m) throw new Error(`current version "${version}" is not SemVer`);
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  let next;
  if (level === 'major') next = `${major + 1}.0.0`;
  else if (level === 'minor') next = `${major}.${minor + 1}.0`;
  // A pre-release (1.2.3-beta.1) is released as its final version (1.2.3).
  else if (level === 'patch') next = m[4] ? `${major}.${minor}.${patch}` : `${major}.${minor}.${patch + 1}`;
  else if (SEMVER_RE.test(level)) next = level;
  else throw new Error(`unknown bump "${level}" (use patch, minor, major or X.Y.Z)`);
  if (compareSemver(next, version) <= 0) throw new Error(`${next} is not greater than ${version}`);
  return next;
}

// ---------- Marketplace and manifests ----------

export function readMarketplace() {
  return JSON.parse(readFileSync(MARKETPLACE_PATH, 'utf8'));
}

// Plugins listed with a relative source, resolved to their directories.
export function localPlugins() {
  return readMarketplace()
    .plugins.filter((entry) => typeof entry.source === 'string')
    .map((entry) => {
      const dir = resolve(ROOT, entry.source);
      return { name: entry.name, dir, manifestPath: join(dir, '.claude-plugin', 'plugin.json') };
    });
}

export function findPlugin(name) {
  const plugin = localPlugins().find((p) => p.name === name);
  if (!plugin) throw new Error(`plugin "${name}" is not listed in marketplace.json with a ./ source`);
  if (!existsSync(plugin.manifestPath)) throw new Error(`missing ${plugin.manifestPath}`);
  return plugin;
}

export function readManifest(plugin) {
  return JSON.parse(readFileSync(plugin.manifestPath, 'utf8'));
}

// Replaces the top-level "version" while keeping the file's own formatting.
export function writeManifestVersion(plugin, version) {
  const text = readFileSync(plugin.manifestPath, 'utf8');
  const before = JSON.parse(text);
  const edited = text.replace(/("version"\s*:\s*")[^"]*(")/, `$1${version}$2`);
  let after;
  try {
    after = JSON.parse(edited);
  } catch {
    after = null;
  }
  const onlyVersionChanged =
    after && after.version === version && JSON.stringify({ ...after, version: before.version }) === JSON.stringify(before);
  writeFileSync(plugin.manifestPath, onlyVersionChanged ? edited : JSON.stringify({ ...before, version }, null, 2) + '\n');
}

export const tagName = (name, version) => `${name}--v${version}`;

// ---------- CHANGELOG.md ----------

export const CHANGELOG_HEADER = `# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).
`;

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const sectionHeadingRe = (version) => new RegExp(`^## \\[${escapeRe(version)}\\]`, 'm');

export const today = () => new Date().toISOString().slice(0, 10);

// Inserts a "## [version] - date" section above the newest existing one.
export function addChangelogSection(text, version, notes, date = today()) {
  const base = text && text.trim() ? text : CHANGELOG_HEADER;
  if (sectionHeadingRe(version).test(base)) throw new Error(`CHANGELOG.md already has a section for ${version}`);
  const bullets = notes.length ? notes.map((n) => `- ${n}`).join('\n') : '- TODO: describe the change';
  const section = `## [${version}] - ${date}\n\n${bullets}\n\n`;
  const firstSection = base.search(/^## \[/m);
  if (firstSection === -1) return base.replace(/\n*$/, '\n\n') + section.replace(/\n+$/, '\n');
  return base.slice(0, firstSection) + section + base.slice(firstSection);
}

// Body of the section for `version`, without its heading, or null.
export function changelogSection(text, version) {
  const match = sectionHeadingRe(version).exec(text ?? '');
  if (!match) return null;
  const start = text.indexOf('\n', match.index) + 1;
  const rest = text.slice(start);
  const next = rest.search(/^## \[/m);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

export const changelogPath = (plugin) => join(plugin.dir, 'CHANGELOG.md');

export function readChangelog(plugin) {
  const path = changelogPath(plugin);
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

// ---------- git ----------

export function git(args, opts = {}) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
}

export function tagExists(tag) {
  try {
    git(['rev-parse', '--verify', '--quiet', `refs/tags/${tag}`]);
    return true;
  } catch {
    return false;
  }
}

export function isTreeClean(paths = []) {
  return git(['status', '--porcelain', '--', ...paths]).trim() === '';
}

// ---------- CLI ----------

export function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}
