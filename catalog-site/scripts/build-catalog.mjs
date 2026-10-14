#!/usr/bin/env node
// Builds the catalog data the site shows, from the real marketplace in this repository.
// Reads .claude-plugin/marketplace.json and each local plugin's manifest and component files.
// Writes src/data/catalog.json (bundled into the app) and public/catalog.json (published as-is).
// Nothing is invented: an empty marketplace produces an empty catalog.
//
//   node scripts/build-catalog.mjs [--root <repo root>]

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

const here = dirname(fileURLToPath(import.meta.url));
const SITE = resolve(here, '..');
const argRoot = process.argv.indexOf('--root');
const ROOT = argRoot > -1 ? resolve(process.argv[argRoot + 1]) : resolve(SITE, '..');

const warnings = [];
const warn = (m) => warnings.push(m);

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    warn(`${relative(ROOT, path)}: ${e.message}`);
    return null;
  }
};
const git = (args) => {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};
const listDir = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }) : []);
const asArray = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);

function frontmatter(path) {
  const text = readFileSync(path, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) return { data: {}, body: text };
  try {
    return { data: parseYaml(m[1]) ?? {}, body: m[2] };
  } catch (e) {
    // Claude Code reads an unquoted value containing ": " (common in long
    // agent descriptions) that strict YAML rejects, so fall back to the same
    // lenient `key: value` / `- item` reading instead of dropping the fields.
    warn(`${relative(ROOT, path)}: frontmatter is not strict YAML, read leniently (${e.message.split('\n')[0]})`);
    return { data: lenientFrontmatter(m[1]), body: m[2] };
  }
}

function lenientFrontmatter(src) {
  const data = {};
  let listKey = null;
  for (const line of src.split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && listKey) {
      data[listKey].push(item[1].trim());
      continue;
    }
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const [, key, value] = kv;
    listKey = value === '' ? key : null;
    data[key] = value === '' ? [] : value.trim();
  }
  return data;
}

const toolsOf = (data) => {
  const t = data['allowed-tools'] ?? data.tools;
  return Array.isArray(t) ? t.join(', ') : t ? String(t) : undefined;
};
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const stripRoot = (s) => String(s).replace(/\$\{CLAUDE_PLUGIN_ROOT\}\/?/g, '');

// Markdown files under dir (non-recursive), or the files named by custom paths.
function mdFiles(dir, custom) {
  const files = listDir(dir)
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => join(dir, e.name));
  return files.concat(custom.filter((p) => p.endsWith('.md') && existsSync(p)));
}

function readSkills(dir, manifest) {
  const roots = [join(dir, 'skills'), ...asArray(manifest.skills).filter((s) => typeof s === 'string').map((s) => resolve(dir, s))];
  const out = [];
  for (const root of roots) {
    for (const e of listDir(root)) {
      const file = e.isDirectory() ? join(root, e.name, 'SKILL.md') : null;
      if (!file || !existsSync(file)) continue;
      const { data } = frontmatter(file);
      out.push(clean({ name: data.name || e.name, description: String(data.description ?? '').trim(), tools: toolsOf(data) }));
    }
  }
  return out;
}

function readAgents(dir, manifest) {
  const custom = asArray(manifest.agents).filter((s) => typeof s === 'string').map((s) => resolve(dir, s));
  return mdFiles(join(dir, 'agents'), custom).map((file) => {
    const { data } = frontmatter(file);
    return clean({
      name: data.name || file.split('/').pop().replace(/\.md$/, ''),
      description: String(data.description ?? '').trim(),
      tools: toolsOf(data),
      model: data.model,
    });
  });
}

function readCommands(dir, manifest) {
  const custom = asArray(manifest.commands).filter((s) => typeof s === 'string').map((s) => resolve(dir, s));
  return mdFiles(join(dir, 'commands'), custom).map((file) => {
    const { data } = frontmatter(file);
    return clean({
      name: file.split('/').pop().replace(/\.md$/, ''),
      description: String(data.description ?? '').trim(),
      hint: data['argument-hint'],
    });
  });
}

function readHooks(dir, manifest) {
  let config = typeof manifest.hooks === 'object' && !Array.isArray(manifest.hooks) ? manifest.hooks : null;
  const file = join(dir, typeof manifest.hooks === 'string' ? manifest.hooks : 'hooks/hooks.json');
  if (!config && existsSync(file)) config = readJson(file);
  const events = config?.hooks ?? config ?? {};
  const out = [];
  for (const [event, groups] of Object.entries(events)) {
    for (const g of asArray(groups)) {
      for (const h of asArray(g.hooks)) {
        out.push(clean({
          event,
          matcher: g.matcher || '*',
          type: h.type || 'command',
          cmd: stripRoot(h.command ?? h.prompt ?? h.url ?? ''),
          desc: h.description ?? '',
        }));
      }
    }
  }
  return out;
}

function readMcp(dir, manifest) {
  let servers = typeof manifest.mcpServers === 'object' && !Array.isArray(manifest.mcpServers) ? manifest.mcpServers : null;
  const file = join(dir, typeof manifest.mcpServers === 'string' ? manifest.mcpServers : '.mcp.json');
  if (!servers && existsSync(file)) {
    const json = readJson(file);
    servers = json?.mcpServers ?? json;
  }
  return Object.entries(servers ?? {}).map(([name, s]) => ({
    name,
    transport: s.url ? s.type || 'http' : 'stdio',
    target: stripRoot(s.url ?? [s.command, ...(s.args ?? [])].filter(Boolean).join(' ')),
    desc: s.description ?? '',
  }));
}

function* walkFiles(dir) {
  for (const e of listDir(dir)) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* walkFiles(p);
    else yield p;
  }
}
const readScripts = (dir) => [...walkFiles(join(dir, 'scripts'))].map((p) => relative(dir, p)).sort();

function readUserConfig(manifest) {
  const uc = manifest.userConfig;
  if (!uc) return [];
  const entries = Array.isArray(uc) ? uc.map((u) => [u.key ?? u.name, u]) : Object.entries(uc);
  return entries.map(([key, u]) => ({ key, title: u?.title ?? u?.description ?? key, sensitive: !!u?.sensitive }));
}

function readReleases(dir) {
  const file = join(dir, 'CHANGELOG.md');
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8');
  const out = [];
  const re = /^## \[([^\]]+)\](?:\s*-\s*(\d{4}-\d{2}-\d{2}))?[^\n]*\n([\s\S]*?)(?=^## \[|(?![\s\S]))/gm;
  for (const m of text.matchAll(re)) {
    if (/^unreleased$/i.test(m[1])) continue;
    const notes = m[3].split('\n').map((l) => l.trim()).filter((l) => /^[-*]\s+/.test(l)).map((l) => l.replace(/^[-*]\s+/, ''));
    out.push({ v: m[1], date: m[2] ?? '', notes });
  }
  return out;
}

// First prose paragraphs of the README: no headings, code, tables or badges.
function readReadme(dir) {
  const file = join(dir, 'README.md');
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8').replace(/```[\s\S]*?```/g, '');
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(#|\||!\[|\[!\[|<|[-*]\s|>)/.test(p))
    .map((p) => p.replace(/\s*\n\s*/g, ' '))
    .slice(0, 4);
}

function externalSource(source) {
  if (typeof source === 'string') return '';
  const where = source.repo ?? source.url ?? source.package ?? '';
  const pin = source.sha ?? source.ref ?? source.version;
  return `${source.source} · ${where}${pin ? ` @ ${String(pin).slice(0, 12)}` : ''}`;
}

function buildPlugin(entry) {
  const base = {
    name: entry.name,
    displayName: entry.displayName ?? entry.name,
    description: entry.description ?? '',
    category: entry.category ?? 'other',
    tags: asArray(entry.tags),
    keywords: asArray(entry.keywords),
  };
  const authorOf = (a) => (typeof a === 'string' ? a : a?.name ?? '');

  if (typeof entry.source !== 'string') {
    const pin = entry.source.sha ?? entry.source.ref ?? entry.source.version;
    return {
      ...base,
      version: entry.version ?? (pin ? `pinned ${String(pin).slice(0, 7)}` : 'unversioned'),
      author: authorOf(entry.author),
      license: entry.license ?? '',
      external: true,
      source: externalSource(entry.source),
      homepage: entry.homepage,
      updatedAt: '',
      releases: [],
      readme: [],
    };
  }

  const dir = resolve(ROOT, entry.source);
  const manifestPath = join(dir, '.claude-plugin', 'plugin.json');
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) ?? {} : {};
  if (!existsSync(manifestPath)) warn(`${entry.name}: missing ${relative(ROOT, manifestPath)}`);
  const releases = readReleases(dir);
  const updatedAt = git(['log', '-1', '--format=%cs', '--', relative(ROOT, dir)]) || releases[0]?.date || '';

  return clean({
    ...base,
    displayName: entry.displayName ?? manifest.displayName ?? entry.name,
    description: manifest.description ?? entry.description ?? '',
    keywords: [...new Set([...asArray(manifest.keywords), ...base.keywords])],
    version: manifest.version ?? entry.version ?? '',
    author: authorOf(manifest.author ?? entry.author),
    license: manifest.license ?? entry.license ?? '',
    homepage: manifest.homepage ?? entry.homepage,
    repository: manifest.repository ?? entry.repository,
    external: false,
    updatedAt,
    skills: readSkills(dir, manifest),
    agents: readAgents(dir, manifest),
    commands: readCommands(dir, manifest),
    hooks: readHooks(dir, manifest),
    mcp: readMcp(dir, manifest),
    scripts: readScripts(dir),
    userConfig: readUserConfig(manifest),
    ...readDependencies(manifest),
    releases,
    readme: readReadme(dir),
  });
}

// plugin.json `dependencies`: "name", "name@marketplace" or { name, version }.
// `deps` keeps the bare names the site links and bundles by; `dependencies`
// keeps each version range for display.
function readDependencies(manifest) {
  const dependencies = asArray(manifest.dependencies)
    .map((d) => (typeof d === 'string' ? { name: d } : d && typeof d.name === 'string' ? { name: d.name, version: d.version } : null))
    .filter(Boolean)
    .map(({ name, version }) => clean({ name: name.split('@')[0], marketplace: name.includes('@') ? name.split('@')[1] : undefined, version }));
  return dependencies.length ? { deps: dependencies.map((d) => d.name), dependencies } : {};
}

const marketplacePath = join(ROOT, '.claude-plugin', 'marketplace.json');
const marketplace = readJson(marketplacePath) ?? { plugins: [] };
const plugins = (marketplace.plugins ?? []).map(buildPlugin).sort((a, b) => a.name.localeCompare(b.name));

const commit = process.env.GITHUB_SHA || git(['rev-parse', 'HEAD']);
const catalog = {
  generatedAt: new Date().toISOString(),
  commit,
  marketplace: { name: marketplace.name ?? '', description: marketplace.description ?? '' },
  plugins,
};

for (const out of [join(SITE, 'src', 'data', 'catalog.json'), join(SITE, 'public', 'catalog.json')]) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(catalog, null, 2) + '\n');
}
for (const w of warnings) console.warn(`warning: ${w}`);
console.log(`catalog: ${plugins.length} plugin(s) from ${relative(process.cwd(), marketplacePath) || marketplacePath}`);
