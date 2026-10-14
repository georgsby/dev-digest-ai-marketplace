#!/usr/bin/env node
// spec-lint — deterministic checks for a spec-creator spec (../SKILL.md › Lint).
// Usage: node spec-lint.mjs [--modules a,b,…] <spec.md> [<spec.md> …]
// Exit: 0 = no errors (warnings allowed), 1 = errors, 2 = usage / unreadable file.
//
// Allowed module names: --modules wins; else "modules" from
// .claude/sdd-engineering.json in the current directory (the project root);
// else any name is accepted as long as it is a plain package/folder name.
//
// The hygiene patterns below are assembled from pieces on purpose: a
// string-matching detector that spells its own patterns out literally flags
// its own source file.

import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SECTIONS = [
  'Problem and user',
  'Goals / Non-goals',
  'User stories',
  'Acceptance criteria (EARS)',
  'Edge cases',
  'Non-functional requirements',
  'Inputs and provenance',
  'Interfaces touched',
  'Untrusted inputs',
  'Decisions',
  'Open questions',
];

const PREFIXES_BY_SECTION = {
  'Goals / Non-goals': ['G', 'NG'],
  'User stories': ['US'],
  'Acceptance criteria (EARS)': ['AC'],
  'Edge cases': ['EC'],
  'Non-functional requirements': ['NFR'],
  'Untrusted inputs': ['UI'],
  Decisions: ['D'],
  'Open questions': ['OQ'],
};

// Sections that must hold at least one item; "None — <reason>." is not enough.
const MUST_HAVE_ITEMS = new Set(['Goals / Non-goals', 'User stories', 'Acceptance criteria (EARS)']);

const PATTERN_ALIASES = {
  Ubiquitous: 'Ubiquitous',
  'Event-driven': 'Event-driven',
  'State-driven': 'State-driven',
  Unwanted: 'Unwanted',
  'Unwanted behaviour': 'Unwanted',
  Optional: 'Optional',
  'Optional feature': 'Optional',
  Complex: 'Complex',
};

const PRIORITIES = ['Must', 'Should', 'Could'];
export const LANES = ['unit', 'integration', 'component', 'e2e', 'manual'];
const STATUSES = ['draft', 'approved', 'implemented'];
const MODULE_NAME_RE = /^[@a-zA-Z0-9][\w@./-]*$/;
const CHANGES = ['new', 'extended', 'read-only'];

const VAGUE = [
  'fast', 'faster', 'quick', 'quickly', 'slow', 'large', 'huge', 'small', 'many',
  'few', 'several', 'appropriate', 'appropriately', 'proper', 'properly',
  'user-friendly', 'robust', 'seamless', 'seamlessly', 'intuitive', 'intuitively',
  'efficient', 'efficiently', 'easy', 'easily', 'reasonable', 'reasonably',
  'adequate', 'adequately', 'flexible', 'etc',
];
const VAGUE_RE = new RegExp(`(?<![\\w-])(${VAGUE.join('|')})(?![\\w-])`, 'gi');

const HYGIENE = [
  ['<'.repeat(7), 'merge-conflict marker'],
  ['='.repeat(7), 'merge-conflict marker'],
  ['>'.repeat(7), 'merge-conflict marker'],
  ['.on' + 'ly(', 'focused-test modifier'],
  ['debug' + 'ger', 'JS breakpoint keyword'],
  ['TO' + 'DO', 'unfinished-work marker'],
  ['FIX' + 'ME', 'unfinished-work marker'],
];

const ID_RE = /(?<![\w-])(G|NG|US|AC|EC|NFR|UI|D|OQ)-(\d+)(?![\w-])/g;
const EARS_KEYWORDS = ['WHERE', 'WHILE', 'WHEN', 'IF', 'THEN'];

function refsIn(text) {
  return [...text.matchAll(ID_RE)].map((m) => `${m[1]}-${m[2]}`);
}

function keywordsIn(text) {
  const found = {};
  for (const kw of EARS_KEYWORDS) {
    const m = new RegExp(`\\b${kw}\\b`).exec(text);
    if (m) found[kw] = m.index;
  }
  return found;
}

function tableRows(lines) {
  // Returns the data rows (arrays of trimmed cells) of the first Markdown table.
  const rows = [];
  let seenSeparator = false;
  for (const { n, text } of lines) {
    const t = text.trim();
    if (!t.startsWith('|')) {
      if (seenSeparator) break;
      continue;
    }
    const cells = t.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{3,}:?$/.test(c))) {
      seenSeparator = true;
      continue;
    }
    if (seenSeparator) rows.push({ n, cells });
  }
  return rows;
}

export function lintSpec(text, fileName = 'spec.md', { modules = null } = {}) {
  const errors = [];
  const warnings = [];
  const err = (n, msg) => errors.push({ line: n, msg });
  const warn = (n, msg) => warnings.push({ line: n, msg });

  const raw = text.split('\n');
  const lines = [];
  let inFence = false;
  raw.forEach((t, i) => {
    const n = i + 1;
    for (const [needle, what] of HYGIENE) {
      if (t.includes(needle)) err(n, `hygiene: ${what} — describe it indirectly`);
    }
    if (/^\s*```/.test(t)) {
      inFence = !inFence;
      return;
    }
    lines.push({ n, text: t, fenced: inFence });
  });

  // Title and header block.
  const firstLine = lines.find((l) => l.text.trim() !== '');
  if (!firstLine || !firstLine.text.startsWith('# Spec: ')) err(firstLine?.n ?? 1, 'first line must be "# Spec: <feature name>"');

  const firstH2 = lines.find((l) => !l.fenced && l.text.startsWith('## '));
  const headerEnd = firstH2 ? firstH2.n : Infinity;
  const header = {};
  for (const l of lines) {
    if (l.n >= headerEnd) break;
    const m = /^(Spec ID|Status|Supersedes|Superseded by|Modules|Design sources):\s*(.*)$/.exec(l.text);
    if (m) header[m[1]] = { n: l.n, value: m[2].trim() };
  }
  for (const key of ['Spec ID', 'Status', 'Supersedes', 'Modules', 'Design sources']) {
    if (!header[key]) err(1, `header line "${key}:" is missing`);
  }

  const stem = basename(fileName).replace(/\.md$/, '');
  if (!/^\d{4}-\d{2}-\d{2}-[a-z0-9]+(-[a-z0-9]+){1,4}$/.test(stem)) {
    err(1, `file name "${basename(fileName)}" must be <YYYY-MM-DD>-<slug>.md with a 2–5-word kebab-case slug`);
  }
  if (header['Spec ID'] && header['Spec ID'].value !== `SPEC-${stem}`) {
    err(header['Spec ID'].n, `Spec ID must be "SPEC-${stem}" (the file name without .md)`);
  }
  const status = header.Status?.value;
  if (header.Status && !STATUSES.includes(status)) {
    err(header.Status.n, `Status must be one of ${STATUSES.join(' | ')}`);
  }
  let moduleCount = 0;
  let specModules = [];
  if (header.Modules) {
    const mods = header.Modules.value.split(',').map((s) => s.trim()).filter(Boolean);
    specModules = mods;
    moduleCount = mods.length;
    for (const m of mods) {
      if (modules && !modules.includes(m)) err(header.Modules.n, `unknown module "${m}" — allowed: ${modules.join(', ')}`);
      else if (!MODULE_NAME_RE.test(m)) err(header.Modules.n, `module "${m}" must be a package or folder name, e.g. "api" or "packages/web"`);
    }
    if (mods.length === 0) err(header.Modules.n, 'Modules lists no package');
  }

  // Sections.
  const sections = new Map();
  let current = null;
  for (const l of lines) {
    if (!l.fenced && l.text.startsWith('## ')) {
      const name = l.text.slice(3).trim();
      if (sections.has(name)) err(l.n, `duplicate section "## ${name}"`);
      current = { name, n: l.n, lines: [] };
      sections.set(name, current);
      continue;
    }
    if (current) current.lines.push(l);
  }
  const found = [...sections.keys()];
  for (const name of found) if (!SECTIONS.includes(name)) err(sections.get(name).n, `unknown section "## ${name}"`);
  for (const name of SECTIONS) if (!sections.has(name)) err(1, `missing section "## ${name}"`);
  const knownOrder = found.filter((s) => SECTIONS.includes(s));
  const expectedOrder = SECTIONS.filter((s) => sections.has(s));
  if (knownOrder.join('|') !== expectedOrder.join('|')) {
    err(1, `sections out of order — expected: ${expectedOrder.join(' → ')}`);
  }

  // Items.
  const items = new Map(); // id → item
  const byPrefix = {};
  const sectionItems = {};
  for (const [name, sec] of sections) {
    const list = [];
    let item = null;
    for (const l of sec.lines) {
      if (l.fenced) {
        item = null;
        continue;
      }
      if (l.text.startsWith('- ')) {
        item = { n: l.n, text: l.text.slice(2).trim(), section: name };
        list.push(item);
      } else if (item && /^\s+\S/.test(l.text)) {
        item.text += ' ' + l.text.trim();
      } else {
        item = null;
      }
    }
    sectionItems[name] = list;

    const allowed = PREFIXES_BY_SECTION[name];
    const hasNone = sec.lines.some((l) => /^None — \S/.test(l.text.trim()));
    const hasContent = sec.lines.some((l) => !l.fenced && l.text.trim() !== '');
    if (allowed) {
      if (list.length === 0 && (MUST_HAVE_ITEMS.has(name) || !hasNone)) {
        err(sec.n, MUST_HAVE_ITEMS.has(name)
          ? `"## ${name}" needs at least one item`
          : `"## ${name}" has no items — write "None — <reason>."`);
      }
      for (const it of list) {
        const m = /^([A-Z]+)-(\d+)\b/.exec(it.text);
        if (!m || !allowed.includes(m[1])) {
          err(it.n, `item in "## ${name}" must start with ${allowed.map((p) => `${p}-n`).join(' or ')}`);
          continue;
        }
        const id = `${m[1]}-${m[2]}`;
        it.id = id;
        it.prefix = m[1];
        it.num = Number(m[2]);
        if (items.has(id)) err(it.n, `duplicate ID ${id} (first at line ${items.get(id).n})`);
        else items.set(id, it);
        (byPrefix[m[1]] ??= []).push(it);
      }
    } else if (!hasContent) {
      err(sec.n, `"## ${name}" is empty — write "None — <reason>."`);
    }
  }
  if (!(byPrefix.G?.length)) err(sections.get('Goals / Non-goals')?.n ?? 1, 'Goals need at least one G-n');

  for (const [prefix, list] of Object.entries(byPrefix)) {
    list.forEach((it, i) => {
      if (it.num !== i + 1) err(it.n, `${it.id} out of sequence — expected ${prefix}-${i + 1}`);
    });
  }

  // Dangling references anywhere outside code fences.
  for (const l of lines) {
    if (l.fenced || l.n < headerEnd) continue;
    for (const ref of refsIn(l.text)) {
      if (!items.has(ref)) err(l.n, `${ref} is referenced but not defined`);
    }
  }

  const refsAfter = (text, marker) => {
    const i = text.indexOf(marker);
    return i === -1 ? null : refsIn(text.slice(i + marker.length));
  };
  const checkVerify = (it) => {
    const m = /Verify:\s*(.+?)\.?\s*$/.exec(it.text);
    if (!m) {
      err(it.n, `${it.id} needs "Verify: <lanes>" at the end (${LANES.join(', ')})`);
      return it.text;
    }
    const lanes = m[1].split(',').map((s) => s.trim());
    for (const lane of lanes) {
      const name = lane.replace(/\s*\(.*\)$/, '');
      const qualifier = /\((.+)\)$/.exec(lane)?.[1].trim();
      if (!LANES.includes(name)) err(it.n, `${it.id}: unknown verify lane "${name}" — allowed: ${LANES.join(', ')}`);
      if (name === 'manual' && !qualifier) warn(it.n, `${it.id}: "manual" lane should say why, e.g. "manual (visual contrast check)"`);
      if (name !== 'manual' && qualifier && specModules.length && !specModules.includes(qualifier)) {
        warn(it.n, `${it.id}: lane "${lane}" names "${qualifier}", which is not in the Modules header (${specModules.join(', ')})`);
      }
    }
    return it.text.slice(0, m.index);
  };
  const checkVague = (it, body) => {
    const hits = [...new Set([...body.matchAll(VAGUE_RE)].map((m) => m[1].toLowerCase()))];
    if (hits.length === 0) return;
    const msg = `${it.id}: vague word(s) ${hits.map((h) => `"${h}"`).join(', ')} — replace with a number or a rule`;
    if (/\d/.test(body)) warn(it.n, msg);
    else err(it.n, msg);
  };

  // User stories.
  const coveredAcs = new Set();
  const storyAcs = [];
  for (const it of byPrefix.US ?? []) {
    const refs = refsAfter(it.text, 'Covered by:');
    const acs = (refs ?? []).filter((r) => r.startsWith('AC-'));
    if (!refs || acs.length === 0) err(it.n, `${it.id} needs "Covered by: AC-n[, AC-n]"`);
    acs.forEach((a) => coveredAcs.add(a));
    storyAcs.push({ it, acs });
  }

  // Acceptance criteria.
  const acs = byPrefix.AC ?? [];
  const priorityOf = new Map();
  for (const it of acs) {
    const m = /^AC-\d+ \(([^)]*)\) — (.+)$/.exec(it.text);
    if (!m) {
      err(it.n, `${it.id} must read "${it.id} (<Pattern> · <Priority>) — <EARS sentence> Verify: <lanes>."`);
      continue;
    }
    const [patternRaw, priorityRaw] = m[1].split('·').map((s) => s.trim());
    const pattern = PATTERN_ALIASES[patternRaw];
    if (!pattern) err(it.n, `${it.id}: unknown EARS pattern "${patternRaw}" — ${Object.keys(PATTERN_ALIASES).join(', ')}`);
    if (!PRIORITIES.includes(priorityRaw)) err(it.n, `${it.id}: priority must be ${PRIORITIES.join(' | ')}`);
    priorityOf.set(it.id, priorityRaw);

    const body = checkVerify({ ...it, text: m[2] });
    const shalls = (body.match(/\bshall\b/g) ?? []).length;
    if (shalls !== 1) err(it.n, `${it.id}: needs exactly one "shall", found ${shalls}`);

    const kw = keywordsIn(body);
    const has = (k) => k in kw;
    const others = (allowed) => EARS_KEYWORDS.filter((k) => has(k) && !allowed.includes(k));
    const startsWith = (k) => body.trimStart().startsWith(k + ' ');
    const bad = (why) => err(it.n, `${it.id} (${patternRaw}): ${why}`);
    switch (pattern) {
      case 'Ubiquitous':
        if (others([]).length) bad(`no EARS keyword allowed, found ${others([]).join(', ')} — pick the matching pattern`);
        if (!/^The /.test(body.trimStart())) bad('must start with "The <component> shall …"');
        break;
      case 'Event-driven':
        if (!startsWith('WHEN')) bad('must start with "WHEN"');
        if (others(['WHEN']).length) bad(`also uses ${others(['WHEN']).join(', ')} — use "Complex" or split`);
        break;
      case 'State-driven':
        if (!startsWith('WHILE')) bad('must start with "WHILE"');
        if (others(['WHILE']).length) bad(`also uses ${others(['WHILE']).join(', ')} — use "Complex" or split`);
        break;
      case 'Unwanted':
        if (!startsWith('IF')) bad('must start with "IF"');
        if (!has('THEN')) bad('needs "THEN"');
        if (others(['IF', 'THEN']).length) bad(`also uses ${others(['IF', 'THEN']).join(', ')} — use "Complex" or split`);
        break;
      case 'Optional':
        if (!startsWith('WHERE')) bad('must start with "WHERE"');
        if (others(['WHERE']).length) bad(`also uses ${others(['WHERE']).join(', ')} — use "Complex" or split`);
        break;
      case 'Complex': {
        const order = ['WHERE', 'WHILE', has('WHEN') ? 'WHEN' : 'IF'].filter(has);
        if (order.length < 2) bad('needs at least two of WHERE / WHILE / WHEN|IF — otherwise use the single pattern');
        for (let i = 1; i < order.length; i++) {
          if (kw[order[i]] < kw[order[i - 1]]) bad(`keyword order must be WHERE … WHILE … WHEN/IF … THEN`);
        }
        if (has('IF') && !has('THEN')) bad('"IF" needs "THEN"');
        if (has('WHEN') && has('IF')) bad('use WHEN or IF, not both — split it');
        break;
      }
    }
    if (moduleCount >= 2 && /\bthe system shall\b/i.test(body)) {
      warn(it.n, `${it.id}: name the responding component instead of "the system" (${moduleCount} modules)`);
    }
    checkVague(it, body);
    if (!coveredAcs.has(it.id)) warn(it.n, `${it.id} is not in any US-n "Covered by:" — make sure it traces to a G-n or NFR-n`);
  }
  if (acs.length > 25) warn(sections.get('Acceptance criteria (EARS)').n, `${acs.length} acceptance criteria — consider splitting the spec`);

  // Every user story is a mandatory requirement: at least one of its ACs is a Must.
  for (const { it, acs: covered } of storyAcs) {
    const known = covered.filter((a) => priorityOf.has(a));
    if (known.length && !known.some((a) => priorityOf.get(a) === 'Must')) {
      err(it.n, `${it.id} has no Must acceptance criterion — every user story needs at least one "Must" AC-n in "Covered by:" (now ${known.map((a) => `${a} ${priorityOf.get(a)}`).join(', ')})`);
    }
  }

  // Edge cases.
  for (const it of byPrefix.EC ?? []) {
    const refs = (refsAfter(it.text, '→') ?? []).filter((r) => r.startsWith('AC-') || r.startsWith('OQ-'));
    if (refs.length === 0) err(it.n, `${it.id} needs "→ AC-n" or "→ OQ-n"`);
  }

  // NFRs.
  for (const it of byPrefix.NFR ?? []) {
    const body = checkVerify(it);
    checkVague(it, body);
  }

  // Untrusted inputs.
  for (const it of byPrefix.UI ?? []) {
    const afterHandling = it.text.includes('Handling:') ? refsAfter(it.text.slice(it.text.indexOf('Handling:')), '→') : null;
    const refs = (afterHandling ?? []).filter((r) => r.startsWith('AC-') || r.startsWith('NFR-'));
    if (refs.length === 0) err(it.n, `${it.id} needs "Handling: → AC-n / NFR-n"`);
  }

  // Decisions.
  for (const it of byPrefix.D ?? []) {
    for (const field of ['Chosen:', 'Rejected:', 'Decided by:']) {
      if (!it.text.includes(field)) err(it.n, `${it.id} needs "${field}"`);
    }
    const refs = (refsAfter(it.text, '→') ?? []).filter((r) => /^(AC|NG|NFR|EC)-/.test(r));
    if (refs.length === 0) err(it.n, `${it.id} needs "→" followed by the AC-n / NG-n / NFR-n / EC-n it produced`);
  }

  // Open questions.
  for (const it of byPrefix.OQ ?? []) {
    const m = /Blocking:\s*(yes|no)\b/i.exec(it.text);
    if (!m) err(it.n, `${it.id} needs "Blocking: yes" or "Blocking: no"`);
    else if (m[1].toLowerCase() === 'yes' && status === 'approved') {
      err(it.n, `${it.id} is blocking — a spec with a blocking open question cannot be approved`);
    }
  }

  // Inputs and provenance → untrusted rows need a UI-n.
  const inputs = sections.get('Inputs and provenance');
  if (inputs) {
    const rows = tableRows(inputs.lines);
    const untrusted = rows.filter((r) => /^no\b/i.test(r.cells.at(-1) ?? ''));
    for (const r of rows) {
      if (!/^(yes|no)\b/i.test(r.cells.at(-1) ?? '')) warn(r.n, 'the "Trusted?" cell should start with "yes" or "no"');
    }
    if (untrusted.length > 0 && !(byPrefix.UI?.length)) {
      err(untrusted[0].n, `${untrusted.length} untrusted input(s) but no UI-n in "## Untrusted inputs"`);
    }
  }

  // Interfaces touched.
  const ifaces = sections.get('Interfaces touched');
  if (ifaces) {
    for (const r of tableRows(ifaces.lines)) {
      const [iface = '', kind = '', change = '', , notes = ''] = r.cells;
      if (!CHANGES.includes(change)) err(r.n, `interface ${iface}: Change must be ${CHANGES.join(' | ')}`);
      if (/^contract$/i.test(kind) && change !== 'read-only' && /^(|—|-)$/.test(notes.trim())) {
        warn(r.n, `contract ${iface} changes — Notes should name every consumer that must change with it`);
      }
    }
  }

  errors.sort((a, b) => a.line - b.line);
  warnings.sort((a, b) => a.line - b.line);
  return { errors, warnings, counts: countIds(byPrefix) };
}

function countIds(byPrefix) {
  return Object.fromEntries(['G', 'NG', 'US', 'AC', 'EC', 'NFR', 'UI', 'D', 'OQ'].map((p) => [p, byPrefix[p]?.length ?? 0]));
}

function projectModules() {
  const config = join(process.cwd(), '.claude', 'sdd-engineering.json');
  if (!existsSync(config)) return null;
  try {
    const { modules } = JSON.parse(readFileSync(config, 'utf8'));
    return Array.isArray(modules) && modules.length ? modules.map(String) : null;
  } catch {
    return null;
  }
}

function main(argv) {
  const rest = argv.slice(2);
  let modules = null;
  const i = rest.indexOf('--modules');
  if (i !== -1) {
    modules = (rest[i + 1] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    rest.splice(i, 2);
  }
  const files = rest;
  if (files.length === 0 || files.some((f) => f.startsWith('--'))) {
    console.error('usage: node spec-lint.mjs [--modules a,b,…] <spec.md> [<spec.md> …]');
    return 2;
  }
  if (modules && modules.length === 0) modules = null;
  modules ??= projectModules();
  let failed = false;
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch (e) {
      console.error(`${file}: cannot read (${e.code ?? e.message})`);
      return 2;
    }
    const { errors, warnings, counts } = lintSpec(text, file, { modules });
    for (const e of errors) console.log(`${file}:${e.line}: ERROR ${e.msg}`);
    for (const w of warnings) console.log(`${file}:${w.line}: WARN  ${w.msg}`);
    const summary = Object.entries(counts).map(([p, n]) => `${p} ${n}`).join(' · ');
    console.log(`spec-lint: ${file} — ${errors.length} error(s), ${warnings.length} warning(s) — ${summary}`);
    if (errors.length) failed = true;
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv);
}
