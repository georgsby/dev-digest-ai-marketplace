#!/usr/bin/env node
// Prints a compact, readable narrative of ONE transcript (the main thread or a
// subagent) so the retro can be written without loading raw JSONL into context:
// prompts, the agent's visible text, each tool call with a short argument, and
// failed tool results. Thinking blocks and successful tool output are omitted.
//
//   node narrate.mjs --agent <main|agentId|prefix> [--session <id|path|latest>]
//                    [--project-dir <dir>] [--max-text 400]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = {};
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
}
if (args.help || process.argv.includes('-h')) {
  process.stdout.write(`usage: node narrate.mjs --agent <main|agentId|prefix> [--session <id|path|latest>]
                         [--project-dir <dir>] [--max-text 400]

Prints one transcript (main thread or one subagent) as a compact narrative:
prompts, visible text, tool calls with their main argument, failed results.
`);
  process.exit(0);
}
const projectDir = args['project-dir']
  ?? path.join(os.homedir(), '.claude', 'projects', process.cwd().replace(/[^a-zA-Z0-9]/g, '-'));
const maxText = Number(args['max-text'] ?? 400);

const mainFile = resolveSession(args.session ?? 'latest');
const sessionId = path.basename(mainFile, '.jsonl');
const who = args.agent ?? 'main';
let file = mainFile;
if (who !== 'main') {
  const dir = path.join(path.dirname(mainFile), sessionId, 'subagents');
  const hit = fs.existsSync(dir) && fs.readdirSync(dir).find((n) => n.startsWith(`agent-${who}`) && n.endsWith('.jsonl'));
  if (!hit) fail(`no subagent transcript agent-${who}*.jsonl in ${dir}`);
  file = path.join(dir, hit);
}

const clip = (s, n = maxText) => {
  const t = String(s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const text = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => x.text ?? '').join(' ') : '');
const arg = (i = {}) => i.file_path ?? i.command ?? i.pattern ?? i.skill ?? i.query ?? i.url ?? i.description ?? i.to ?? '';

const seen = new Set();
for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let r;
  try { r = JSON.parse(line); } catch { continue; }
  const ts = (r.timestamp ?? '').slice(11, 19);
  const content = r.message?.content;
  if (r.type === 'user') {
    if (Array.isArray(content) && content.some((b) => b.type === 'tool_result')) {
      for (const b of content) if (b.type === 'tool_result' && b.is_error) console.log(`${ts}   ✗ ${clip(text(b.content), 300)}`);
      continue;
    }
    if (r.isMeta) continue;
    const kind = r.origin?.kind ? `[${r.origin.kind}] ` : '';
    const t = text(content);
    if (/^\s*<(system-reminder|local-command|command-name)/.test(t)) continue;
    console.log(`\n${ts} ▶ ${kind}USER: ${clip(t, maxText * 2)}`);
  } else if (r.type === 'assistant') {
    for (const b of Array.isArray(content) ? content : []) {
      const key = `${r.requestId}:${b.id ?? b.text?.slice(0, 40)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      if (b.type === 'text' && b.text.trim()) console.log(`${ts} ◆ ${clip(b.text)}`);
      if (b.type === 'tool_use') console.log(`${ts}   → ${b.name}(${clip(arg(b.input), 140)})`);
    }
  }
}

function resolveSession(s) {
  if (s.endsWith('.jsonl') && fs.existsSync(s)) return s;
  if (s !== 'latest') {
    const f = path.join(projectDir, `${s}.jsonl`);
    if (!fs.existsSync(f)) fail(`no transcript ${f}`);
    return f;
  }
  if (!fs.existsSync(projectDir)) fail(`no project transcript dir ${projectDir} (pass --project-dir)`);
  const files = fs.readdirSync(projectDir).filter((n) => n.endsWith('.jsonl'))
    .map((n) => path.join(projectDir, n)).sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  if (!files.length) fail(`no transcripts in ${projectDir}`);
  return files[0];
}

function fail(msg) {
  process.stderr.write(`narrate.mjs: ${msg}\n`);
  process.exit(2);
}
