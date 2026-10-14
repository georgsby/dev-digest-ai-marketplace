#!/usr/bin/env node
// Cost and quality eval for sdd-engineering:plan-verifier on a fixed fixture.
// No dependencies; Node >= 22.
//
//   node evals/sdd-engineering/run.mjs run --label <name> [--runs 5] [--variant complete|gaps|all]
//                                          [--model claude-opus-5-5] [--max-budget-usd 5]
//                                          [--mode subagent|agent]
//   node evals/sdd-engineering/run.mjs summarize <label>
//   node evals/sdd-engineering/run.mjs compare <baseline-label> <candidate-label>
//
// Each run materialises fixtures/csv-export as a throwaway git repository
// (base commit on `main`, the variant's implementation committed on
// `feat/csv-export`), runs `claude -p` with the plugins loaded from this
// repository's working tree, records the stream-json transcript and grades
// the report. Results go to results/<label>/.
//
// --mode subagent (default) dispatches plan-verifier through the Agent tool,
// the way /implement runs it: frontmatter `skills:` are preloaded only for a
// subagent. --mode agent runs it as the main thread (`claude --agent`), where
// they are not. Metrics are reported for the whole run and for the verifier
// alone (subagent messages carry parent_tool_use_id). Token totals come from
// the result event's modelUsage: stream-json usage on subagent messages is a
// partial snapshot, so per-scope token splits are not reported.

import { spawn, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync, existsSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const FIXTURE = join(HERE, 'fixtures', 'csv-export');
const RESULTS = join(HERE, 'results');

const PROMPT = `Verify the Implementation Plan \`specs/plans/2026-10-01-csv-export.md\` against the working tree.
The work is committed on branch \`feat/csv-export\`; the base branch is \`main\`.
Test environment: local Node 22, no services needed. Return your report.`;

const DISPATCH_PROMPT = `Dispatch the \`sdd-engineering:plan-verifier\` subagent with the Agent tool, passing the task below word for word.
Do not inspect or verify anything yourself. When it returns, reply with the single word DONE.

Task:
${PROMPT}`;
const SPAWN_TOOLS = new Set(['Agent', 'Task']);

// Read-only commands plan-verifier's Hard rule 1 allows, plus the plan's Verify commands.
const ALLOWED_TOOLS = [
  'Read', 'Grep', 'Glob', 'Skill',
  'Bash(git status:*)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)',
  'Bash(git merge-base:*)', 'Bash(git rev-parse:*)', 'Bash(git branch:*)',
  'Bash(rg:*)', 'Bash(grep:*)', 'Bash(ls:*)', 'Bash(cat:*)', 'Bash(jq:*)', 'Bash(echo:*)',
  'Bash(node --test:*)', 'Bash(npm test:*)',
];

// What a correct report says for each variant. `seeded` rows must be flagged
// (any of PARTIAL / MISSING / DEVIATED); flagging none of them is a critical
// false negative.
const VARIANTS = {
  complete: { verdict: 'COMPLETE', seeded: {} },
  gaps: {
    verdict: 'INCOMPLETE',
    seeded: {
      'AC-3': 'formula-injection prefix not implemented and not tested',
      'AC-5': 'missing-due handling has no test',
      'NG-1': 'column picker parameter added (scope creep)',
    },
  },
};
const FLAGGED = new Set(['PARTIAL', 'MISSING', 'DEVIATED']);
const STATUS_RE = /^(MET|PARTIAL|MISSING|DEVIATED|UNVERIFIED|BLOCKED)\b/;

// ---------------------------------------------------------------- args

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1]?.startsWith('--') || argv[i + 1] === undefined ? true : argv[++i];
    else out._.push(a);
  }
  return out;
}

// ---------------------------------------------------------------- fixture

const GIT_ENV = {
  GIT_AUTHOR_NAME: 'eval', GIT_AUTHOR_EMAIL: 'eval@example.invalid',
  GIT_COMMITTER_NAME: 'eval', GIT_COMMITTER_EMAIL: 'eval@example.invalid',
  GIT_AUTHOR_DATE: '2026-10-01T10:00:00Z', GIT_COMMITTER_DATE: '2026-10-01T10:00:00Z',
};

function materialise(variant) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), `sdd-eval-${variant}-`)));
  const git = (...args) => execFileSync('git', args, { cwd: dir, env: { ...process.env, ...GIT_ENV }, stdio: 'pipe' });
  cpSync(join(FIXTURE, 'base'), dir, { recursive: true });
  git('init', '-q', '-b', 'main');
  git('add', '-A');
  git('commit', '-q', '-m', 'chore: task tracker with CSV export spec and plan');
  git('switch', '-q', '-c', 'feat/csv-export');
  cpSync(join(FIXTURE, 'variants', variant), dir, { recursive: true });
  git('add', '-A');
  git('commit', '-q', '-m', 'feat(tasks): add CSV exporter');
  return dir;
}

// ---------------------------------------------------------------- run

function claudeArgs(mode, model, budget) {
  return [
    '-p',
    ...(mode === 'agent' ? ['--agent', 'sdd-engineering:plan-verifier'] : []),
    '--model', model,
    '--plugin-dir', join(REPO_ROOT, 'plugins'),
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--permission-mode', 'dontAsk',
    '--allowedTools', [...ALLOWED_TOOLS, ...(mode === 'agent' ? [] : ['Agent'])].join(','),
    '--output-format', 'stream-json', '--verbose',
    '--no-session-persistence',
    '--max-budget-usd', String(budget),
  ];
}

function runOnce({ mode, variant, model, budget, outFile, timeoutMs }) {
  const cwd = materialise(variant);
  const env = { ...process.env };
  delete env.CLAUDECODE;
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', claudeArgs(mode, model, budget), { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = createWriteStream(outFile);
    let stderr = '';
    child.stdout.pipe(out);
    child.stderr.on('data', (d) => { stderr += d; });
    child.stdin.end(mode === 'agent' ? PROMPT : DISPATCH_PROMPT);
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      out.end(() => {
        rmSync(cwd, { recursive: true, force: true });
        resolve({ code, signal, stderr: stderr.slice(-2000), wallMs: Date.now() - started });
      });
    });
  });
}

// ---------------------------------------------------------------- parse + grade

const emptyTokens = () => ({ input: 0, output: 0, cacheRead: 0, cacheCreation: 0 });

function addUsage(tokens, u) {
  tokens.input += u?.input_tokens ?? 0;
  tokens.output += u?.output_tokens ?? 0;
  tokens.cacheRead += u?.cache_read_input_tokens ?? 0;
  tokens.cacheCreation += u?.cache_creation_input_tokens ?? 0;
}

const textOf = (content) => typeof content === 'string'
  ? content
  : (content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n');

// Splits the run into the main thread and the verifier subagent. In agent
// mode the main thread *is* the verifier.
function parseTranscript(file, mode) {
  const lines = readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const scopes = { main: { calls: new Map(), tools: new Map() }, sub: { calls: new Map(), tools: new Map() } };
  const skills = [];
  let spawnId = null;
  let subReport = null;
  let init = null;
  let result = null;
  for (const line of lines) {
    let ev;
    try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === 'system' && ev.subtype === 'init') init = ev;
    const scope = ev.parent_tool_use_id ? scopes.sub : scopes.main;
    if (ev.type === 'assistant' && ev.message) {
      // stream-json emits one event per content block; usage repeats per message id, keep the last.
      if (ev.message.id) scope.calls.set(ev.message.id, ev.message.usage);
      for (const block of ev.message.content ?? []) {
        if (block.type !== 'tool_use') continue;
        scope.tools.set(block.id, block.name);
        if (block.name === 'Skill') skills.push(`${ev.parent_tool_use_id ? 'sub' : 'main'}:${block.input?.skill}`);
        if (!ev.parent_tool_use_id && SPAWN_TOOLS.has(block.name) && !spawnId) spawnId = block.id;
      }
    }
    if (ev.type === 'user' && !ev.parent_tool_use_id && spawnId) {
      for (const block of Array.isArray(ev.message?.content) ? ev.message.content : []) {
        if (block.type === 'tool_result' && block.tool_use_id === spawnId) subReport = textOf(block.content);
      }
    }
    if (ev.type === 'result') result = ev;
  }
  const summarise = (sc) => {
    const tokens = emptyTokens();
    for (const u of sc.calls.values()) addUsage(tokens, u);
    const toolsByName = {};
    for (const name of sc.tools.values()) toolsByName[name] = (toolsByName[name] ?? 0) + 1;
    return { apiCalls: sc.calls.size, toolCalls: sc.tools.size, toolsByName, tokens };
  };
  const main = summarise(scopes.main);
  const sub = summarise(scopes.sub);
  const all = {
    apiCalls: main.apiCalls + sub.apiCalls,
    toolCalls: main.toolCalls + sub.toolCalls,
    tokens: Object.fromEntries(Object.keys(main.tokens).map((k) => [k, main.tokens[k] + sub.tokens[k]])),
  };
  // Prefer Claude Code's own per-model totals for the whole run when present.
  const models = Object.keys(result?.modelUsage ?? {});
  if (models.length) {
    const t = emptyTokens();
    for (const u of Object.values(result.modelUsage)) {
      t.input += u.inputTokens ?? 0;
      t.output += u.outputTokens ?? 0;
      t.cacheRead += u.cacheReadInputTokens ?? 0;
      t.cacheCreation += u.cacheCreationInputTokens ?? 0;
    }
    all.tokens = t;
  }
  const verifier = mode === 'agent' ? main : sub;
  const report = mode === 'agent'
    ? (typeof result?.result === 'string' ? result.result : '')
    : (subReport ?? '');
  return {
    claudeVersion: init?.claude_code_version ?? null,
    initModel: init?.model ?? null,
    models,
    plugins: (init?.plugins ?? []).map((p) => p.name ?? p),
    costUsd: result?.total_cost_usd ?? null,
    durationMs: result?.duration_ms ?? null,
    durationApiMs: result?.duration_api_ms ?? null,
    numTurns: result?.num_turns ?? null,
    apiCalls: all.apiCalls,
    toolCalls: all.toolCalls,
    tokens: all.tokens,
    verifier,
    orchestrator: mode === 'agent' ? null : main,
    skills,
    dispatched: mode === 'agent' || Boolean(spawnId),
    permissionDenials: result?.permission_denials?.length ?? 0,
    isError: result ? Boolean(result.is_error) : true,
    resultSubtype: result?.subtype ?? 'missing',
    report,
  };
}

const clean = (cell) => cell.replace(/[`*]/g, '').trim();

function parseReport(report) {
  const verdict = report.match(/VERDICT:\s*\**\s*([A-Z]+)/)?.[1] ?? null;
  const tree = report.match(/TREE:\s*\**\s*([a-zA-Z]+)/)?.[1] ?? null;
  const rows = {};
  let statusIdx = -1;
  for (const line of report.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(clean);
    if (cells[0] === 'ID') { statusIdx = cells.indexOf('Status'); continue; }
    if (!/^[A-Z]+[\w.-]*$/.test(cells[0]) || /^-+$/.test(cells[0])) continue;
    let status = statusIdx >= 0 ? cells[statusIdx]?.match(STATUS_RE)?.[1] : undefined;
    status ??= cells.slice(1).map((c) => c.match(STATUS_RE)?.[1]).find(Boolean);
    if (status && !(cells[0] in rows)) rows[cells[0]] = status;
  }
  return { verdict, tree, rows };
}

function grade(variant, metrics) {
  const spec = VARIANTS[variant];
  const { verdict, tree, rows } = parseReport(metrics.report);
  const critical = [];
  const issues = [];
  if (metrics.isError) issues.push(`run ended abnormally (${metrics.resultSubtype})`);
  if (!metrics.dispatched) issues.push('plan-verifier was not dispatched');
  if (tree !== 'unchanged') critical.push(`TREE: ${tree ?? 'absent'}`);
  for (const [id, what] of Object.entries(spec.seeded)) {
    const status = rows[id];
    if (!FLAGGED.has(status)) critical.push(`false negative: ${id} (${what}) reported ${status ?? 'absent'}`);
  }
  if (variant === 'gaps' && verdict === 'COMPLETE') critical.push('false negative: VERDICT COMPLETE on seeded gaps');
  if (verdict !== spec.verdict) issues.push(`VERDICT ${verdict ?? 'absent'}, expected ${spec.verdict}`);
  if (variant === 'complete') {
    const notMet = Object.entries(rows).filter(([, s]) => s !== 'MET').map(([id, s]) => `${id}=${s}`);
    if (notMet.length) issues.push(`false positive rows: ${notMet.join(', ')}`);
  }
  return { pass: critical.length === 0 && issues.length === 0, verdict, tree, rowCount: Object.keys(rows).length, critical, issues };
}

// ---------------------------------------------------------------- stats

const median = (xs) => {
  const s = xs.filter((x) => x != null).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const range = (xs) => {
  const s = xs.filter((x) => x != null);
  return s.length ? [Math.min(...s), Math.max(...s)] : [null, null];
};

const METRICS = [
  ['costUsd', 'Cost, USD', (r) => r.costUsd, (v) => v.toFixed(3)],
  ['durationS', 'Latency, s', (r) => r.durationMs / 1000, (v) => v.toFixed(1)],
  ['input', 'Input tokens (uncached)', (r) => r.tokens.input, (v) => Math.round(v).toLocaleString('en-US')],
  ['cacheCreation', 'Cache write tokens', (r) => r.tokens.cacheCreation, (v) => Math.round(v).toLocaleString('en-US')],
  ['cacheRead', 'Cache read tokens', (r) => r.tokens.cacheRead, (v) => Math.round(v).toLocaleString('en-US')],
  ['output', 'Output tokens', (r) => r.tokens.output, (v) => Math.round(v).toLocaleString('en-US')],
  ['apiCalls', 'API calls', (r) => r.apiCalls, (v) => String(v)],
  ['toolCalls', 'Tool calls', (r) => r.toolCalls, (v) => String(v)],
  ['vApiCalls', 'Verifier: API calls', (r) => r.verifier.apiCalls, (v) => String(v)],
  ['vToolCalls', 'Verifier: tool calls', (r) => r.verifier.toolCalls, (v) => String(v)],
];

function loadRuns(label) {
  const file = join(RESULTS, label, 'runs.jsonl');
  if (!existsSync(file)) throw new Error(`no runs for label "${label}" (${file})`);
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

function summarize(label) {
  const runs = loadRuns(label);
  const groups = { all: runs };
  for (const v of Object.keys(VARIANTS)) {
    const g = runs.filter((r) => r.variant === v);
    if (g.length) groups[v] = g;
  }
  const meta = runs[0].meta;
  const lines = [];
  lines.push(`### ${label}`, '');
  lines.push(`- Plugin: \`sdd-engineering@${meta.pluginVersion}\` at \`${meta.sha}\`${meta.pluginsDirty ? ' (plugins/ had uncommitted changes)' : ''}`);
  lines.push(`- Model requested: \`${meta.model}\`; models used: ${[...new Set(runs.flatMap((r) => r.models))].map((m) => `\`${m}\``).join(', ')}`);
  lines.push(`- Claude Code: ${[...new Set(runs.map((r) => r.claudeVersion))].join(', ')}`);
  lines.push(`- Mode: ${meta.mode ?? 'agent'}`);
  lines.push(`- Runs: ${Object.keys(VARIANTS).map((v) => `${v} × ${groups[v]?.length ?? 0}`).join(', ')}, sequential`, '');
  lines.push(`| Metric | ${Object.keys(groups).map((g) => `${g}: median [min–max]`).join(' | ')} |`);
  lines.push(`|---|${Object.keys(groups).map(() => '---').join('|')}|`);
  for (const [, name, get, fmt] of METRICS) {
    const cells = Object.values(groups).map((g) => {
      const xs = g.map(get);
      const [lo, hi] = range(xs);
      return `${fmt(median(xs))} [${fmt(lo)}–${fmt(hi)}]`;
    });
    lines.push(`| ${name} | ${cells.join(' | ')} |`);
  }
  const passCells = Object.values(groups).map((g) => `${g.filter((r) => r.grade.pass).length}/${g.length}`);
  lines.push(`| Pass rate | ${passCells.join(' | ')} |`, '');
  const crit = runs.flatMap((r) => r.grade.critical.map((c) => `${r.variant} #${r.n}: ${c}`));
  const issues = runs.flatMap((r) => r.grade.issues.map((c) => `${r.variant} #${r.n}: ${c}`));
  lines.push(`Critical errors: ${crit.length ? '' : 'none'}`);
  for (const c of crit) lines.push(`- ${c}`);
  lines.push('', `Other failures: ${issues.length ? '' : 'none'}`);
  for (const c of issues) lines.push(`- ${c}`);
  const md = lines.join('\n') + '\n';
  writeFileSync(join(RESULTS, label, 'summary.md'), md);
  return md;
}

function compare(a, b) {
  const ra = loadRuns(a);
  const rb = loadRuns(b);
  const lines = [`### ${a} → ${b}`, ''];
  lines.push(`| Variant | Metric | ${a} median [min–max] | ${b} median [min–max] | Δ median | Ranges overlap? |`);
  lines.push('|---|---|---|---|---|---|');
  for (const v of ['all', ...Object.keys(VARIANTS)]) {
    const ga = v === 'all' ? ra : ra.filter((r) => r.variant === v);
    const gb = v === 'all' ? rb : rb.filter((r) => r.variant === v);
    if (!ga.length || !gb.length) continue;
    for (const [, name, get, fmt] of METRICS) {
      const xa = ga.map(get), xb = gb.map(get);
      const [ma, mb] = [median(xa), median(xb)];
      const [la, ha] = range(xa), [lb, hb] = range(xb);
      const delta = ma ? `${(((mb - ma) / ma) * 100).toFixed(1)}%` : '—';
      const overlap = lb <= ha && la <= hb ? 'yes — within noise' : (hb < la ? 'no — lower' : 'no — higher');
      lines.push(`| ${v} | ${name} | ${fmt(ma)} [${fmt(la)}–${fmt(ha)}] | ${fmt(mb)} [${fmt(lb)}–${fmt(hb)}] | ${delta} | ${overlap} |`);
    }
    const pa = `${ga.filter((r) => r.grade.pass).length}/${ga.length}`;
    const pb = `${gb.filter((r) => r.grade.pass).length}/${gb.length}`;
    lines.push(`| ${v} | Pass rate | ${pa} | ${pb} | — | — |`);
  }
  const fn = (rs) => rs.flatMap((r) => r.grade.critical).filter((c) => c.startsWith('false negative')).length;
  lines.push('', `Critical false negatives: ${a} ${fn(ra)}, ${b} ${fn(rb)}.`);
  return lines.join('\n') + '\n';
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = args._;
  if (cmd === 'summarize') return process.stdout.write(summarize(rest[0]));
  if (cmd === 'compare') return process.stdout.write(compare(rest[0], rest[1]));
  if (cmd !== 'run' || !args.label || args.label === true) {
    process.stderr.write('usage: run.mjs run --label <name> [--runs 5] [--variant complete|gaps|all] [--model claude-opus-5-5] [--max-budget-usd 5] [--mode subagent|agent]\n       run.mjs summarize <label>\n       run.mjs compare <a> <b>\n');
    process.exit(2);
  }
  const runs = Number(args.runs ?? 5);
  const model = args.model ?? 'claude-opus-5-5';
  const mode = args.mode ?? 'subagent';
  if (!['subagent', 'agent'].includes(mode)) throw new Error(`--mode must be subagent or agent, got ${mode}`);
  const budget = Number(args['max-budget-usd'] ?? 5);
  const variants = !args.variant || args.variant === 'all' ? Object.keys(VARIANTS) : [args.variant];
  const timeoutMs = Number(args['timeout-min'] ?? 20) * 60_000;

  const git = (...a) => execFileSync('git', a, { cwd: REPO_ROOT, encoding: 'utf8' }).trim();
  const meta = {
    sha: git('rev-parse', '--short=12', 'HEAD'),
    pluginsDirty: git('status', '--porcelain', '--', 'plugins').length > 0,
    pluginVersion: JSON.parse(readFileSync(join(REPO_ROOT, 'plugins/sdd-engineering/.claude-plugin/plugin.json'), 'utf8')).version,
    model,
    mode,
    budgetUsd: budget,
    startedAt: new Date().toISOString(),
  };
  const dir = join(RESULTS, args.label);
  mkdirSync(dir, { recursive: true });
  const runsFile = join(dir, 'runs.jsonl');
  const existing = existsSync(runsFile) ? readFileSync(runsFile, 'utf8').split('\n').filter(Boolean).length : 0;
  process.stderr.write(`label=${args.label} sha=${meta.sha}${meta.pluginsDirty ? ' (plugins dirty)' : ''} model=${model} mode=${mode} runs=${runs}×[${variants}] existing=${existing}\n`);

  // Interleave variants so drift over time hits both equally.
  for (let n = 1; n <= runs; n++) {
    for (const variant of variants) {
      const stamp = `${variant}-${String(existing + n).padStart(2, '0')}-${Date.now()}`;
      const outFile = join(dir, `${stamp}.jsonl`);
      const proc = await runOnce({ mode, variant, model, budget, outFile, timeoutMs });
      const metrics = parseTranscript(outFile, mode);
      const g = grade(variant, metrics);
      const { report, ...kept } = metrics;
      writeFileSync(join(dir, `${stamp}.report.md`), report);
      const record = { label: args.label, variant, n, file: `${stamp}.jsonl`, meta, exit: proc.code, signal: proc.signal, wallMs: proc.wallMs, stderrTail: proc.stderr || undefined, ...kept, grade: g };
      writeFileSync(runsFile, JSON.stringify(record) + '\n', { flag: 'a' });
      process.stderr.write(`${variant} #${n}: ${g.pass ? 'PASS' : 'FAIL'} verdict=${g.verdict} rows=${g.rowCount} cost=$${metrics.costUsd?.toFixed(3)} ${(metrics.durationMs / 1000).toFixed(0)}s api=${metrics.apiCalls} tools=${metrics.toolCalls} verifier(api=${metrics.verifier.apiCalls} tools=${metrics.verifier.toolCalls}) skills=[${metrics.skills.join(',')}] denied=${metrics.permissionDenials}${g.critical.length ? ` CRITICAL: ${g.critical.join('; ')}` : ''}${g.issues.length ? ` issues: ${g.issues.join('; ')}` : ''}\n`);
    }
  }
  process.stdout.write(summarize(args.label));
}

main().catch((e) => { process.stderr.write(`${e.stack ?? e}\n`); process.exit(1); });
