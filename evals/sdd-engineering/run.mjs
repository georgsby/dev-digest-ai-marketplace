#!/usr/bin/env node
// Cost and behaviour evals for sdd-engineering agents on fixed fixtures.
// No dependencies; Node >= 22.
//
//   node evals/sdd-engineering/run.mjs run --label <name> [--suite plan-verifier|spec-creator]
//                                          [--runs 5] [--variant <name>|all] [--model claude-opus-5-5]
//                                          [--max-budget-usd 5] [--mode subagent|agent]
//                                          [--plugins <dir>]   # default: this repo's plugins/
//   node evals/sdd-engineering/run.mjs summarize <label>
//   node evals/sdd-engineering/run.mjs compare <baseline-label> <candidate-label>
//   node evals/sdd-engineering/run.mjs regrade <label>   # re-grade saved reports with the current grader
//
// Each run materialises a fixture as a throwaway git repository, runs
// `claude -p` with the plugins loaded from a directory (this repository's
// working tree by default), records the stream-json transcript and grades the
// agent's report and whatever it wrote. Results go to results/<label>/.
//
// Suites:
//   plan-verifier — fixtures/csv-export: base on `main`, a variant's
//     implementation on `feat/csv-export`; the verifier must find seeded gaps.
//   spec-creator  — the same task tracker without specs; the agent gets a
//     resumed round of relayed answers and must not write a spec while a user
//     story lacks a Must acceptance criterion (sdd-engineering >= 1.1.0).
//
// --mode subagent (default) dispatches the agent through the Agent tool, the
// way /implement runs plan-verifier and the way a caller runs spec-creator
// without AskUserQuestion: frontmatter `skills:` are preloaded only for a
// subagent. --mode agent runs it as the main thread (`claude --agent`).
// Metrics are reported for the whole run and for the subagent alone
// (subagent messages carry parent_tool_use_id). Token totals come from
// the result event's modelUsage: stream-json usage on subagent messages is a
// partial snapshot, so per-scope token splits are not reported.

import { spawn, execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync, existsSync, createWriteStream } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const FIXTURES = join(HERE, 'fixtures');
const LINT = join(REPO_ROOT, 'plugins/sdd-engineering/skills/spec-authoring/scripts/spec-lint.mjs');
const RESULTS = join(HERE, 'results');

const PLAN_VERIFIER_TASK = `Verify the Implementation Plan \`specs/plans/2026-10-01-csv-export.md\` against the working tree.
The work is committed on branch \`feat/csv-export\`; the base branch is \`main\`.
Test environment: local Node 22, no services needed. Return your report.`;

const dispatchPrompt = (agent, task) => `Dispatch the \`${agent}\` subagent with the Agent tool, passing the task below word for word.
Do not inspect or verify anything yourself. When it returns, reply with the single word DONE.

Task:
${task}`;
const SPAWN_TOOLS = new Set(['Agent', 'Task']);

// Permissions. A Bash allowlist proved too narrow: rules match static command
// prefixes, so `git -C <dir> …`, `$(…)`, `for` loops and `${PIPESTATUS[…]}`
// were denied and the verifier sometimes gave up with VERDICT: BLOCKED.
// Instead every Bash command runs inside Claude Code's OS sandbox with no
// prompts: writes are confined to the throwaway fixture repo and the per-user
// temp dir, the network is closed, and nothing may fall back to running
// unsandboxed (or start at all without the sandbox). The file-writing tools
// are removed for the whole session; TREE in the report still has to stay
// `unchanged`.
const SANDBOX_SETTINGS = JSON.stringify({
  sandbox: {
    enabled: true,
    autoAllowBashIfSandboxed: true,
    allowUnsandboxedCommands: false,
    failIfUnavailable: true,
    network: { strictAllowlist: true },
  },
});
// plan-verifier is read-only: no file-writing tools at all. spec-creator has to
// write its spec, and the sandbox does not cover the file tools, so writes
// under the home directory and /tmp are denied instead; the fixture repo lives
// in the per-user temp dir.
const READ_ONLY_TOOLS_OFF = ['Write', 'Edit', 'NotebookEdit', 'WebFetch', 'WebSearch'];
const WRITES_OUTSIDE_FIXTURE_OFF = ['NotebookEdit', 'WebFetch', 'WebSearch', 'Edit(~/**)', 'Edit(//tmp/**)', 'Edit(//private/tmp/**)'];

const FLAGGED = new Set(['PARTIAL', 'MISSING', 'DEVIATED']);
const STATUS_RE = /^(MET|PARTIAL|MISSING|DEVIATED|UNVERIFIED|BLOCKED)\b/;

const SPEC_CREATOR_TASK = (storyTwoAnswer) => `Feature request for this repository (single module \`tasks\`): let callers of \`listTasks()\` filter tasks by status, and let a team lead see overdue tasks first.

This is your resumed round. Your first round returned the questions below; the user's answers are relayed under "## Answers".

## Clarification needed (your first round)
Feature: filter the task list by status; overdue tasks first for team leads · Likely path: specs/2026-10-14-task-filter.md
1. [Scope] Filter by which fields? — options: status only (Recommended) / status and assignee — affects: the filter requirement
2. [Scope] "Overdue tasks first" for team leads: is it a separate user story, and is it required for this release? — options: required / nice to have — affects: the ordering requirement and its priority
3. [Edge] Where do tasks without a due date go when overdue tasks come first? — options: last (Recommended) / first — affects: the ordering requirement
4. [Edge] When is a task overdue? — options: its \`due\` date is strictly before today's date in UTC, so a task due today is not overdue (Recommended) / on or before today — affects: the ordering requirement
5. [Edge] Can a task whose status is \`done\` be overdue? — options: no, it keeps its normal position (Recommended) / yes — affects: the ordering requirement
6. [Modules] How does a caller ask for overdue-first? — options: an option on \`listTasks()\`, e.g. \`listTasks({ status, overdueFirst: true })\`, combinable with the filter; the default order stays insertion order (Recommended) / always order overdue first — affects: the ordering requirement, Interfaces touched
7. [Edge] Order inside each group (overdue, the rest, no due date)? — options: insertion order, as \`listTasks()\` today (Recommended) / by due date — affects: the ordering requirement
Defaults I will assume unless told otherwise: status matching is exact and case-sensitive; an unknown status returns an empty list; filtering and ordering do not change the store; \`listTasks()\` without options behaves as today; a \`due\` value that is not a valid ISO date counts as no due date.

## Answers
1: status only
2: ${storyTwoAnswer}
3: last
4: strictly before today's date in UTC
5: no
6: an option on listTasks(), as recommended
7: insertion order
defaults: ok

Today is 2026-10-14. Write the spec as draft if nothing that changes a requirement is still open; otherwise return another "## Clarification needed" round and write no file.`;

const SUITES = {
  'plan-verifier': {
    agent: 'sdd-engineering:plan-verifier',
    disallowedTools: READ_ONLY_TOOLS_OFF,
    // What a correct report says for each variant. `seeded` rows must be
    // flagged (PARTIAL / MISSING / DEVIATED); missing one is a critical false negative.
    variants: {
      complete: { verdict: 'COMPLETE', seeded: {} },
      gaps: {
        verdict: 'INCOMPLETE',
        seeded: {
          'AC-3': 'formula-injection prefix not implemented and not tested',
          'AC-5': 'missing-due handling has no test',
          'NG-1': 'column picker parameter added (scope creep)',
        },
      },
    },
    task: () => PLAN_VERIFIER_TASK,
    materialise(dir, variant, git) {
      cpSync(join(FIXTURES, 'csv-export', 'base'), dir, { recursive: true });
      git('init', '-q', '-b', 'main');
      git('add', '-A');
      git('commit', '-q', '-m', 'chore: task tracker with CSV export spec and plan');
      git('switch', '-q', '-c', 'feat/csv-export');
      cpSync(join(FIXTURES, 'csv-export', 'variants', variant), dir, { recursive: true });
      git('add', '-A');
      git('commit', '-q', '-m', 'feat(tasks): add CSV exporter');
    },
    collect: () => ({}),
    grade: gradePlanVerifier,
  },
  'spec-creator': {
    agent: 'sdd-engineering:spec-creator',
    disallowedTools: WRITES_OUTSIDE_FIXTURE_OFF,
    variants: {
      // The user calls story 2 nice to have: every criterion it could get is a
      // Should, so 1.1.0 must ask for a Must criterion instead of writing.
      'ac-gap': {
        expect: 'clarify',
        answer: 'nice to have. It is a separate user story for team leads ("As a team lead, I want overdue tasks listed first, so that I can chase them"); make its criteria Should, we may cut it. No other requirement for it.',
      },
      // Control: both stories are required, so the spec must be written and lint clean.
      'ac-complete': {
        expect: 'write',
        answer: 'required. It is a separate user story for team leads ("As a team lead, I want overdue tasks listed first, so that I can chase them"), and listing overdue tasks first is a Must for this release.',
      },
    },
    task: (variant) => SPEC_CREATOR_TASK(SUITES['spec-creator'].variants[variant].answer),
    materialise(dir, _variant, git) {
      cpSync(join(FIXTURES, 'csv-export', 'base'), dir, { recursive: true });
      rmSync(join(dir, 'specs'), { recursive: true, force: true });
      git('init', '-q', '-b', 'main');
      git('add', '-A');
      git('commit', '-q', '-m', 'chore: task tracker');
    },
    collect: collectSpecs,
    grade: gradeSpecCreator,
  },
};

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

function materialise(suite, variant) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), `sdd-eval-${variant}-`)));
  const git = (...args) => execFileSync('git', args, { cwd: dir, env: { ...process.env, ...GIT_ENV }, stdio: 'pipe' });
  suite.materialise(dir, variant, git);
  return dir;
}

// What spec-creator left in the fixture: changed paths, and each new spec file
// with this repository's current spec-lint verdict on it.
function collectSpecs(dir) {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], { cwd: dir, encoding: 'utf8' })
    .split('\n').filter(Boolean).map((l) => l.slice(3));
  const specs = status.filter((p) => /^specs\/[^/]+\.md$/.test(p) && !p.endsWith('README.md')).map((path) => {
    const text = readFileSync(join(dir, path), 'utf8');
    let lint;
    try {
      lint = { exit: 0, out: execFileSync('node', [LINT, path], { cwd: dir, encoding: 'utf8', stdio: 'pipe' }) };
    } catch (e) {
      lint = { exit: e.status, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
    }
    return { path, status: text.match(/^Status:\s*(\S+)/m)?.[1] ?? null, stories: (text.match(/^- US-\d+/gm) ?? []).length, lint, text };
  });
  return { changed: status, specs };
}

// ---------------------------------------------------------------- run

function claudeArgs({ suite, mode, model, budget, pluginsDir }) {
  return [
    '-p',
    ...(mode === 'agent' ? ['--agent', suite.agent] : []),
    '--model', model,
    '--plugin-dir', pluginsDir,
    '--setting-sources', 'project',
    '--strict-mcp-config',
    '--permission-mode', 'bypassPermissions',
    '--disallowedTools', suite.disallowedTools.join(','),
    '--settings', SANDBOX_SETTINGS,
    '--output-format', 'stream-json', '--verbose',
    '--no-session-persistence',
    '--max-budget-usd', String(budget),
  ];
}

function runOnce({ suite, mode, variant, model, budget, pluginsDir, outFile, timeoutMs }) {
  const cwd = materialise(suite, variant);
  const env = { ...process.env };
  delete env.CLAUDECODE;
  // An empty ZDOTDIR keeps the user's zsh startup files (and whatever they
  // print) out of every Bash call; PATH is inherited as is.
  env.ZDOTDIR = realpathSync(mkdtempSync(join(tmpdir(), 'sdd-eval-zdotdir-')));
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn('claude', claudeArgs({ suite, mode, model, budget, pluginsDir }), { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    const out = createWriteStream(outFile);
    let stderr = '';
    child.stdout.pipe(out);
    child.stderr.on('data', (d) => { stderr += d; });
    const task = suite.task(variant);
    child.stdin.end(mode === 'agent' ? task : dispatchPrompt(suite.agent, task));
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      out.end(() => {
        const collected = suite.collect(cwd);
        rmSync(cwd, { recursive: true, force: true });
        rmSync(env.ZDOTDIR, { recursive: true, force: true });
        resolve({ code, signal, stderr: stderr.slice(-2000), wallMs: Date.now() - started, collected });
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
  const tree = report.match(/TREE:\s*\**\s*([a-zA-Z]+)/)?.[1]?.toLowerCase() ?? null;
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

function gradePlanVerifier(variant, metrics) {
  const spec = SUITES['plan-verifier'].variants[variant];
  const { verdict, tree, rows } = parseReport(metrics.report);
  const critical = [];
  const issues = [];
  if (metrics.isError) issues.push(`run ended abnormally (${metrics.resultSubtype})`);
  if (!metrics.dispatched) issues.push('plan-verifier was not dispatched');
  // Only a modified tree is critical; an unconfirmed one (e.g. the verifier
  // could not run git) fails the run but is not a missed defect.
  if (tree === 'modified') critical.push('TREE: MODIFIED');
  else if (tree !== 'unchanged') issues.push(`TREE not confirmed (${tree ?? 'absent'})`);
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

function gradeSpecCreator(variant, metrics) {
  const { expect } = SUITES['spec-creator'].variants[variant];
  const { changed = [], specs = [] } = metrics.collected ?? {};
  const report = metrics.report;
  const clarified = /##\s*Clarification needed/i.test(report);
  const critical = [];
  const issues = [];
  if (metrics.isError) issues.push(`run ended abnormally (${metrics.resultSubtype})`);
  if (!metrics.dispatched) issues.push('spec-creator was not dispatched');
  const outOfScope = changed.filter((p) => !/^specs\/[^/]+\.md$/.test(p));
  if (outOfScope.length) critical.push(`wrote outside its scope: ${outOfScope.join(', ')}`);
  for (const sp of specs) {
    if (sp.status !== 'draft') critical.push(`${sp.path}: Status ${sp.status ?? 'absent'}, expected draft (no user approval was relayed)`);
    if (/has no Must acceptance criterion/.test(sp.lint.out)) critical.push(`false negative: ${sp.path} has a user story without a Must criterion`);
  }
  if (expect === 'clarify') {
    if (specs.length) issues.push(`wrote ${specs.map((sp) => sp.path).join(', ')} instead of asking`);
    if (!clarified) issues.push('no "## Clarification needed" block');
    // It must ask for the missing Must criterion itself, not about something else.
    else if (!/\[Criterion\]|no\s+`?Must`?\s+(acceptance\s+)?criteri/i.test(report)) issues.push('clarification does not ask for a missing Must criterion');
  } else {
    if (specs.length !== 1) issues.push(`expected one spec file, found ${specs.length}`);
    for (const sp of specs) {
      if (sp.lint.exit !== 0) issues.push(`${sp.path}: spec-lint exit ${sp.lint.exit}`);
      if (sp.stories < 2) issues.push(`${sp.path}: ${sp.stories} user stories, expected 2`);
    }
    if (!specs.length && clarified) issues.push('false positive: asked again although every story has a Must criterion');
  }
  return {
    pass: critical.length === 0 && issues.length === 0,
    verdict: specs.length ? `wrote ${specs.length}` : clarified ? 'clarify' : 'none',
    tree: null,
    rowCount: specs.reduce((n, sp) => n + sp.stories, 0),
    critical,
    issues,
  };
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
  ['vApiCalls', 'Subagent: API calls', (r) => r.verifier.apiCalls, (v) => String(v)],
  ['vToolCalls', 'Subagent: tool calls', (r) => r.verifier.toolCalls, (v) => String(v)],
];

function loadRuns(label) {
  const file = join(RESULTS, label, 'runs.jsonl');
  if (!existsSync(file)) throw new Error(`no runs for label "${label}" (${file})`);
  return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}

const suiteOf = (runs) => SUITES[runs[0].meta.suite ?? 'plan-verifier'];

function summarize(label) {
  const runs = loadRuns(label);
  const suite = suiteOf(runs);
  const groups = { all: runs };
  for (const v of Object.keys(suite.variants)) {
    const g = runs.filter((r) => r.variant === v);
    if (g.length) groups[v] = g;
  }
  const meta = runs[0].meta;
  const lines = [];
  lines.push(`### ${label}`, '');
  lines.push(`- Agent: \`${suite.agent}\``);
  lines.push(`- Plugin: \`sdd-engineering@${meta.pluginVersion}\` at \`${meta.sha}\`${meta.pluginsDirty ? ' (plugins/ had uncommitted changes)' : ''}${meta.pluginsDir ? ` from \`${meta.pluginsDir}\`` : ''}`);
  lines.push(`- Model requested: \`${meta.model}\`; models used: ${[...new Set(runs.flatMap((r) => r.models))].map((m) => `\`${m}\``).join(', ')}`);
  lines.push(`- Claude Code: ${[...new Set(runs.map((r) => r.claudeVersion))].join(', ')}`);
  lines.push(`- Mode: ${meta.mode ?? 'agent'}`);
  lines.push(`- Runs: ${Object.keys(suite.variants).map((v) => `${v} × ${groups[v]?.length ?? 0}`).join(', ')}, sequential`, '');
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
  for (const v of ['all', ...Object.keys(suiteOf(ra).variants)]) {
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

function regrade(label) {
  const dir = join(RESULTS, label);
  const runs = loadRuns(label);
  const lines = runs.map((r) => {
    const report = readFileSync(join(dir, r.file.replace(/\.jsonl$/, '.report.md')), 'utf8');
    return JSON.stringify({ ...r, grade: suiteOf(runs).grade(r.variant, { ...r, report }) });
  });
  writeFileSync(join(dir, 'runs.jsonl.bak'), readFileSync(join(dir, 'runs.jsonl')));
  writeFileSync(join(dir, 'runs.jsonl'), lines.join('\n') + '\n');
  return summarize(label);
}

// ---------------------------------------------------------------- main

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [cmd, ...rest] = args._;
  if (cmd === 'summarize') return process.stdout.write(summarize(rest[0]));
  if (cmd === 'compare') return process.stdout.write(compare(rest[0], rest[1]));
  if (cmd === 'regrade') return process.stdout.write(regrade(rest[0]));
  if (cmd !== 'run' || !args.label || args.label === true) {
    process.stderr.write('usage: run.mjs run --label <name> [--suite plan-verifier|spec-creator] [--runs 5] [--variant <name>|all] [--model claude-opus-5-5] [--max-budget-usd 5] [--mode subagent|agent] [--plugins <dir>]\n       run.mjs summarize <label>\n       run.mjs compare <a> <b>\n       run.mjs regrade <label>\n');
    process.exit(2);
  }
  const suiteName = args.suite ?? 'plan-verifier';
  const suite = SUITES[suiteName];
  if (!suite) throw new Error(`--suite must be one of ${Object.keys(SUITES).join(', ')}, got ${suiteName}`);
  const pluginsDir = realpathSync(args.plugins && args.plugins !== true ? args.plugins : join(REPO_ROOT, 'plugins'));
  const runs = Number(args.runs ?? 5);
  const model = args.model ?? 'claude-opus-5-5';
  const mode = args.mode ?? 'subagent';
  if (!['subagent', 'agent'].includes(mode)) throw new Error(`--mode must be subagent or agent, got ${mode}`);
  const budget = Number(args['max-budget-usd'] ?? 5);
  const variants = !args.variant || args.variant === 'all' ? Object.keys(suite.variants) : [args.variant];
  for (const v of variants) if (!suite.variants[v]) throw new Error(`unknown variant ${v} for suite ${suiteName}`);
  const timeoutMs = Number(args['timeout-min'] ?? 20) * 60_000;

  // SHA, dirty flag and version describe the plugins actually loaded.
  const git = (...a) => execFileSync('git', a, { cwd: pluginsDir, encoding: 'utf8' }).trim();
  const meta = {
    suite: suiteName,
    pluginsDir: pluginsDir === realpathSync(join(REPO_ROOT, 'plugins')) ? undefined : pluginsDir,
    sha: git('rev-parse', '--short=12', 'HEAD'),
    pluginsDirty: git('status', '--porcelain', '--', '.').length > 0,
    pluginVersion: JSON.parse(readFileSync(join(pluginsDir, 'sdd-engineering/.claude-plugin/plugin.json'), 'utf8')).version,
    model,
    mode,
    budgetUsd: budget,
    startedAt: new Date().toISOString(),
  };
  const dir = join(RESULTS, args.label);
  mkdirSync(dir, { recursive: true });
  const runsFile = join(dir, 'runs.jsonl');
  const existing = existsSync(runsFile) ? readFileSync(runsFile, 'utf8').split('\n').filter(Boolean).length : 0;
  process.stderr.write(`label=${args.label} suite=${suiteName} sdd-engineering@${meta.pluginVersion} sha=${meta.sha}${meta.pluginsDirty ? ' (plugins dirty)' : ''} model=${model} mode=${mode} runs=${runs}×[${variants}] existing=${existing}\n`);

  // Interleave variants so drift over time hits both equally.
  for (let n = 1; n <= runs; n++) {
    for (const variant of variants) {
      const stamp = `${variant}-${String(existing + n).padStart(2, '0')}-${Date.now()}`;
      const outFile = join(dir, `${stamp}.jsonl`);
      const proc = await runOnce({ suite, mode, variant, model, budget, pluginsDir, outFile, timeoutMs });
      const metrics = { ...parseTranscript(outFile, mode), collected: proc.collected };
      const g = suite.grade(variant, metrics);
      const { report, ...kept } = metrics;
      writeFileSync(join(dir, `${stamp}.report.md`), report);
      const { collected, ...rest } = kept;
      for (const sp of collected?.specs ?? []) writeFileSync(join(dir, `${stamp}.${sp.path.replace(/\//g, '_')}`), sp.text);
      const record = {
        label: args.label, variant, n, file: `${stamp}.jsonl`, meta, exit: proc.code, signal: proc.signal, wallMs: proc.wallMs,
        stderrTail: proc.stderr || undefined, ...rest,
        collected: collected && { changed: collected.changed, specs: collected.specs?.map(({ text, ...sp }) => sp) },
        grade: g,
      };
      writeFileSync(runsFile, JSON.stringify(record) + '\n', { flag: 'a' });
      process.stderr.write(`${variant} #${n}: ${g.pass ? 'PASS' : 'FAIL'} verdict=${g.verdict} ${suiteName === 'spec-creator' ? 'stories' : 'rows'}=${g.rowCount} cost=$${metrics.costUsd?.toFixed(3)} ${(metrics.durationMs / 1000).toFixed(0)}s api=${metrics.apiCalls} tools=${metrics.toolCalls} subagent(api=${metrics.verifier.apiCalls} tools=${metrics.verifier.toolCalls}) skills=[${metrics.skills.join(',')}] denied=${metrics.permissionDenials}${g.critical.length ? ` CRITICAL: ${g.critical.join('; ')}` : ''}${g.issues.length ? ` issues: ${g.issues.join('; ')}` : ''}\n`);
    }
  }
  process.stdout.write(summarize(args.label));
}

main().catch((e) => { process.stderr.write(`${e.stack ?? e}\n`); process.exit(1); });
