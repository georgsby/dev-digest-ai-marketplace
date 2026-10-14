#!/usr/bin/env node
// Collects deterministic metrics about one Claude Code session and every
// subagent it spawned, straight from the transcripts Claude Code writes to
// ~/.claude/projects/<project>/. No dependencies; Node >= 22.
//
//   node collect.mjs [--session <id|path|latest>] [--since <ISO>] [--until <ISO>]
//                    [--project-dir <dir>] [--prices <file.json>] [--json <out.json>]
//
// Prints a markdown summary to stdout; --json also writes the full metrics.
// Layout it relies on (Claude Code 2.1.x):
//   <project>/<session>.jsonl                         main thread
//   <project>/<session>/subagents/agent-<id>.jsonl    one subagent (all its resumes)
//   <project>/<session>/subagents/agent-<id>.meta.json {agentType, description, toolUseId, spawnDepth}

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = parseArgs(process.argv.slice(2));
if (args.help || process.argv.includes('-h')) {
  process.stdout.write(`usage: node collect.mjs [--session <id|path|latest>] [--since <ISO>] [--until <ISO>]
                         [--project-dir <dir>] [--prices <file.json>] [--json <out.json>]

Metrics for one Claude Code session and every subagent it spawned, read from
~/.claude/projects/<cwd with non-alphanumerics replaced by '-'>/ (or --project-dir).
Prints markdown to stdout; --json also writes the full metrics.
`);
  process.exit(0);
}
const projectDir = args['project-dir']
  ?? path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'));
const since = args.since ? Date.parse(args.since) : -Infinity;
const until = args.until ? Date.parse(args.until) : Infinity;
const prices = args.prices ? JSON.parse(fs.readFileSync(args.prices, 'utf8')) : null;

const mainFile = resolveSession(args.session ?? 'latest');
const sessionId = path.basename(mainFile, '.jsonl');
const subDir = path.join(path.dirname(mainFile), sessionId, 'subagents');

const main = analyse(readJsonl(mainFile), { id: 'main', agentType: 'main-session', description: 'orchestrator' });
const agents = [];
if (fs.existsSync(subDir)) {
  for (const f of fs.readdirSync(subDir).filter((n) => n.endsWith('.jsonl'))) {
    const id = f.replace(/^agent-/, '').replace(/\.jsonl$/, '');
    const metaPath = path.join(subDir, `agent-${id}.meta.json`);
    const meta = fs.existsSync(metaPath) ? JSON.parse(fs.readFileSync(metaPath, 'utf8')) : {};
    const a = analyse(readJsonl(path.join(subDir, f)), { id, ...meta });
    if (a.requests > 0 || a.toolCalls > 0) agents.push(a);
  }
}
const all = [main, ...agents];

// Parent of each subagent = the transcript holding the tool_use that spawned it.
for (const a of agents) {
  const parent = all.find((t) => t.spawns.some((s) => s.toolUseId === a.toolUseId));
  a.parent = parent ? parent.id : 'unknown';
  const spawn = parent?.spawns.find((s) => s.toolUseId === a.toolUseId);
  a.spawnedAt = spawn?.at ?? a.start;
  a.background = spawn?.background ?? null;
  a.resumes = all.flatMap((t) => t.messagesSent).filter((m) => m.to === a.id).map((m) => m.at);
}
agents.sort((x, y) => (x.spawnedAt ?? '').localeCompare(y.spawnedAt ?? ''));

const result = {
  session: sessionId,
  transcript: mainFile,
  window: { since: args.since ?? null, until: args.until ?? null },
  totals: sumTotals(all),
  maxParallel: maxParallel(agents),
  duplicateReads: duplicateReads(all),
  agents: [main, ...agents].map(publicView),
};
if (args.json) fs.writeFileSync(args.json, JSON.stringify(result, null, 2));
process.stdout.write(renderMarkdown(result));

// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2);
    const next = argv[i + 1];
    out[key] = next && !next.startsWith('--') ? (i++, next) : true;
  }
  return out;
}

function resolveSession(s) {
  if (s.endsWith('.jsonl') && fs.existsSync(s)) return s;
  if (s !== 'latest') {
    const f = path.join(projectDir, `${s}.jsonl`);
    if (!fs.existsSync(f)) die(`no transcript ${f}`);
    return f;
  }
  if (!fs.existsSync(projectDir)) die(`no project transcript dir ${projectDir} (pass --project-dir)`);
  const files = fs.readdirSync(projectDir).filter((n) => n.endsWith('.jsonl'))
    .map((n) => path.join(projectDir, n))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!files.length) die(`no transcripts in ${projectDir}`);
  return files[0];
}

function die(msg) {
  process.stderr.write(`collect.mjs: ${msg}\n`);
  process.exit(2);
}

function readJsonl(file) {
  const recs = [];
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try { recs.push(JSON.parse(line)); } catch { /* partial last line while the session is live */ }
  }
  return recs.filter((r) => {
    if (!r.timestamp) return true;
    const t = Date.parse(r.timestamp);
    return t >= since && t <= until;
  });
}

function blocks(msg) {
  const c = msg?.content;
  if (Array.isArray(c)) return c;
  return typeof c === 'string' ? [{ type: 'text', text: c }] : [];
}

function textOf(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((c) => (typeof c === 'string' ? c : c.text ?? '')).join(' ');
  return '';
}

function isHumanTurn(r) {
  if (r.type !== 'user' || r.isMeta || r.toolUseResult !== undefined) return false;
  if (r.origin && r.origin.kind && r.origin.kind !== 'human' && r.origin.kind !== 'user') return false;
  const bs = blocks(r.message);
  if (bs.some((b) => b.type === 'tool_result')) return false;
  const t = bs.map((b) => b.text ?? '').join(' ');
  return !/^\s*<(local-command|command-name|task-notification|system-reminder)/.test(t) && t.trim().length > 0;
}

function analyse(recs, meta) {
  // One API request is split into several records (one per content block) that
  // repeat the same usage — count each requestId once, keep its last usage.
  const byReq = new Map();
  const toolUses = new Map();
  const a = {
    id: meta.id, agentType: meta.agentType ?? 'unknown', description: meta.description ?? '',
    toolUseId: meta.toolUseId ?? null, spawnDepth: meta.spawnDepth ?? 0,
    models: new Set(), start: null, end: null,
    toolCalls: 0, toolsByName: {}, errors: [], skills: [], spawns: [], messagesSent: [],
    reads: {}, writes: new Set(), bashCommands: {}, humanTurns: 0, humanWaitMs: 0,
    questionsAsked: 0, firstPrompt: '', finalReport: '',
  };
  let lastAssistantAt = null;
  for (const r of recs) {
    if (r.timestamp) {
      if (!a.start || r.timestamp < a.start) a.start = r.timestamp;
      if (!a.end || r.timestamp > a.end) a.end = r.timestamp;
    }
    if (r.type === 'assistant') {
      const m = r.message ?? {};
      if (m.model && m.model !== '<synthetic>') a.models.add(m.model);
      byReq.set(r.requestId ?? m.id ?? r.uuid, m.usage ?? {});
      lastAssistantAt = r.timestamp ?? lastAssistantAt;
      for (const b of blocks(m)) {
        if (b.type === 'text' && b.text.trim()) a.finalReport = b.text;
        if (b.type !== 'tool_use') continue;
        a.toolCalls++;
        a.toolsByName[b.name] = (a.toolsByName[b.name] ?? 0) + 1;
        toolUses.set(b.id, { name: b.name, input: b.input ?? {}, at: r.timestamp });
        const inp = b.input ?? {};
        if (b.name === 'Read' && inp.file_path) a.reads[inp.file_path] = (a.reads[inp.file_path] ?? 0) + 1;
        if ((b.name === 'Write' || b.name === 'Edit' || b.name === 'NotebookEdit') && inp.file_path) a.writes.add(inp.file_path);
        if (b.name === 'Bash' && inp.command) {
          const cmd = inp.command.trim().slice(0, 160);
          a.bashCommands[cmd] = (a.bashCommands[cmd] ?? 0) + 1;
        }
        if (b.name === 'Skill') a.skills.push(inp.skill);
        if (b.name === 'AskUserQuestion') a.questionsAsked += (inp.questions ?? []).length || 1;
        if (b.name === 'Agent' || b.name === 'Task') {
          a.spawns.push({ toolUseId: b.id, at: r.timestamp, type: inp.subagent_type ?? 'general-purpose',
            description: inp.description ?? '', background: inp.run_in_background ?? null });
        }
        if (b.name === 'SendMessage') a.messagesSent.push({ to: inp.to, at: r.timestamp });
      }
    } else if (r.type === 'user') {
      if (!a.firstPrompt && !r.isMeta) a.firstPrompt = textOf(r.message?.content).slice(0, 600);
      if (isHumanTurn(r) && meta.id === 'main') {
        a.humanTurns++;
        if (lastAssistantAt && r.timestamp) a.humanWaitMs += Math.max(0, Date.parse(r.timestamp) - Date.parse(lastAssistantAt));
      }
      for (const b of blocks(r.message)) {
        if (b.type !== 'tool_result' || !b.is_error) continue;
        const use = toolUses.get(b.tool_use_id);
        a.errors.push({ at: r.timestamp, tool: use?.name ?? '?', input: summariseInput(use), error: textOf(b.content).replace(/\s+/g, ' ').slice(0, 240) });
      }
    }
  }
  const u = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, peakContext: 0 };
  for (const x of byReq.values()) {
    u.input += x.input_tokens ?? 0;
    u.cacheWrite += x.cache_creation_input_tokens ?? 0;
    u.cacheRead += x.cache_read_input_tokens ?? 0;
    u.output += x.output_tokens ?? 0;
    u.peakContext = Math.max(u.peakContext, (x.input_tokens ?? 0) + (x.cache_creation_input_tokens ?? 0) + (x.cache_read_input_tokens ?? 0));
  }
  u.total = u.input + u.cacheWrite + u.cacheRead + u.output;
  a.usage = u;
  a.requests = byReq.size;
  a.cost = costOf(u, [...a.models][0]);
  return a;
}

function summariseInput(use) {
  if (!use) return '';
  const i = use.input;
  return String(i.file_path ?? i.command ?? i.pattern ?? i.skill ?? i.url ?? i.to ?? '').replace(/\s+/g, ' ').slice(0, 120);
}

function costOf(u, model) {
  if (!prices || !model || !prices[model]) return null;
  const p = prices[model]; // USD per million tokens
  return (u.input * p.input + u.cacheWrite * p.cache_write + u.cacheRead * p.cache_read + u.output * p.output) / 1e6;
}

function sumTotals(list) {
  const t = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0, total: 0, requests: 0, toolCalls: 0, errors: 0, cost: 0, costKnown: true };
  for (const a of list) {
    for (const k of ['input', 'cacheWrite', 'cacheRead', 'output', 'total']) t[k] += a.usage[k];
    t.requests += a.requests;
    t.toolCalls += a.toolCalls;
    t.errors += a.errors.length;
    if (a.cost == null) t.costKnown = false; else t.cost += a.cost;
  }
  t.subagents = list.length - 1;
  t.cacheHitRatio = t.input + t.cacheWrite + t.cacheRead ? t.cacheRead / (t.input + t.cacheWrite + t.cacheRead) : 0;
  t.wallClockMs = list[0].start && list[0].end ? Date.parse(list[0].end) - Date.parse(list[0].start) : null;
  t.humanTurns = list[0].humanTurns;
  t.humanWaitMs = list[0].humanWaitMs;
  return t;
}

function maxParallel(list) {
  const ev = [];
  for (const a of list) if (a.start && a.end) ev.push([Date.parse(a.start), 1], [Date.parse(a.end), -1]);
  ev.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let cur = 0; let max = 0;
  for (const [, d] of ev) { cur += d; max = Math.max(max, cur); }
  return max;
}

function duplicateReads(list) {
  const who = {};
  for (const a of list) for (const [f, n] of Object.entries(a.reads)) (who[f] ??= []).push({ agent: label(a), times: n });
  return Object.entries(who)
    .filter(([, v]) => v.length > 1 || v[0].times > 1)
    .map(([file, by]) => ({ file, by, totalReads: by.reduce((s, x) => s + x.times, 0) }))
    .sort((x, y) => y.totalReads - x.totalReads);
}

function label(a) {
  return a.id === 'main' ? 'main' : `${a.agentType}#${a.id.slice(0, 7)}`;
}

function publicView(a) {
  return {
    id: a.id, label: label(a), agentType: a.agentType, description: a.description, parent: a.parent ?? null,
    spawnDepth: a.spawnDepth, background: a.background ?? null, spawnedAt: a.spawnedAt ?? a.start,
    start: a.start, end: a.end, activeMs: a.start && a.end ? Date.parse(a.end) - Date.parse(a.start) : null,
    resumes: a.resumes ?? [], models: [...a.models], requests: a.requests, usage: a.usage, cost: a.cost,
    toolCalls: a.toolCalls, toolsByName: a.toolsByName, skills: a.skills, errors: a.errors,
    repeatedBash: Object.entries(a.bashCommands).filter(([, n]) => n > 1).map(([cmd, n]) => ({ cmd, n })),
    filesWritten: [...a.writes], filesRead: Object.keys(a.reads).length,
    questionsAsked: a.questionsAsked, humanTurns: a.id === 'main' ? a.humanTurns : undefined,
    firstPrompt: a.firstPrompt, finalReportChars: a.finalReport.length,
  };
}

function k(n) {
  return n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(n);
}

function dur(ms) {
  if (ms == null) return '—';
  const s = Math.round(ms / 1000);
  return s >= 3600 ? `${Math.floor(s / 3600)}h${Math.round((s % 3600) / 60)}m` : s >= 60 ? `${Math.floor(s / 60)}m${s % 60}s` : `${s}s`;
}

function renderMarkdown(r) {
  const t = r.totals;
  const L = [];
  L.push(`# Workflow metrics — session ${r.session}`, '');
  L.push(`- Transcript: \`${r.transcript}\``);
  if (r.window.since || r.window.until) L.push(`- Window: ${r.window.since ?? '…'} → ${r.window.until ?? '…'}`);
  L.push(`- Subagents: ${t.subagents} · max parallel: ${r.maxParallel} · wall clock: ${dur(t.wallClockMs)} · human turns: ${t.humanTurns} · waiting on human: ${dur(t.humanWaitMs)}`);
  L.push(`- Tokens: ${k(t.total)} total = input ${k(t.input)} + cache write ${k(t.cacheWrite)} + cache read ${k(t.cacheRead)} + output ${k(t.output)} · cache hit ${(t.cacheHitRatio * 100).toFixed(0)}%`);
  L.push(`- API requests: ${t.requests} · tool calls: ${t.toolCalls} · failed tool calls: ${t.errors}`);
  L.push(`- Cost: ${t.costKnown ? `$${t.cost.toFixed(2)}` : 'unknown (pass --prices)'}`, '');
  L.push('## Agents (spawn order)', '');
  L.push('| # | agent | parent | spawned | active | resumes | model | req | tools | errors | tokens | output | peak ctx |');
  L.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  r.agents.forEach((a, i) => {
    L.push(`| ${i} | ${a.label}${a.description ? ` — ${a.description}` : ''} | ${a.parent ?? '—'} | ${(a.spawnedAt ?? '').slice(11, 19)} | ${dur(a.activeMs)} | ${a.resumes.length} | ${a.models.join(', ')} | ${a.requests} | ${a.toolCalls} | ${a.errors.length} | ${k(a.usage.total)} | ${k(a.usage.output)} | ${k(a.usage.peakContext)} |`);
  });
  L.push('', '## Tools and skills per agent', '');
  for (const a of r.agents) {
    const tools = Object.entries(a.toolsByName).sort((x, y) => y[1] - x[1]).map(([n, c]) => `${n}×${c}`).join(', ');
    L.push(`- **${a.label}**: ${tools || '—'}${a.skills.length ? ` · skills: ${a.skills.join(', ')}` : ''} · files read: ${a.filesRead} · written: ${a.filesWritten.length}${a.questionsAsked ? ` · questions asked: ${a.questionsAsked}` : ''}`);
  }
  L.push('', '## Failed tool calls', '');
  const errs = r.agents.flatMap((a) => a.errors.map((e) => ({ ...e, agent: a.label })));
  if (!errs.length) L.push('None.');
  for (const e of errs) L.push(`- ${e.at?.slice(11, 19) ?? ''} **${e.agent}** ${e.tool}(${e.input}) → ${e.error}`);
  L.push('', '## Repeated Bash commands (possible retries)', '');
  const rep = r.agents.flatMap((a) => a.repeatedBash.map((b) => ({ ...b, agent: a.label })));
  if (!rep.length) L.push('None.');
  for (const b of rep) L.push(`- **${b.agent}** ×${b.n}: \`${b.cmd.replace(/`/g, "'")}\``);
  L.push('', '## Files read more than once (across or within agents)', '');
  if (!r.duplicateReads.length) L.push('None.');
  for (const d of r.duplicateReads.slice(0, 30)) L.push(`- \`${d.file}\` — ${d.by.map((b) => `${b.agent}×${b.times}`).join(', ')}`);
  L.push('');
  return L.join('\n');
}
