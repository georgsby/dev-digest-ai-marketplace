// Run: node --test spec-lint.test.mjs (from this folder, or pass its full path;
// Node 22 needs the file path, not the folder).
// Every negative case mutates the worked example, which must itself lint clean.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintSpec } from './spec-lint.mjs';

const EXAMPLE_NAME = '2026-10-01-csv-task-export.md';
const EXAMPLE_PATH = fileURLToPath(new URL(`../examples/${EXAMPLE_NAME}`, import.meta.url));
const LINT_PATH = fileURLToPath(new URL('./spec-lint.mjs', import.meta.url));
const EXAMPLE = readFileSync(EXAMPLE_PATH, 'utf8');

function lint(text, name = EXAMPLE_NAME, options) {
  return lintSpec(text, name, options);
}

function mutate(from, to) {
  assert.ok(EXAMPLE.includes(from), `fixture no longer contains: ${from}`);
  return EXAMPLE.replace(from, to);
}

function expectError(text, pattern, name, options) {
  const { errors } = lint(text, name, options);
  assert.ok(
    errors.some((e) => pattern.test(e.msg)),
    `expected an error matching ${pattern}, got:\n${errors.map((e) => `  ${e.line}: ${e.msg}`).join('\n') || '  (none)'}`,
  );
}

function expectWarning(text, pattern) {
  const { errors, warnings } = lint(text);
  assert.deepEqual(errors, []);
  assert.ok(
    warnings.some((w) => pattern.test(w.msg)),
    `expected a warning matching ${pattern}, got:\n${warnings.map((w) => `  ${w.line}: ${w.msg}`).join('\n') || '  (none)'}`,
  );
}

test('the worked example lints clean', () => {
  const { errors, warnings, counts } = lint(EXAMPLE);
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
  assert.equal(counts.AC, 6);
  assert.equal(counts.D, 2);
});

test('Spec ID must match the file name', () => {
  expectError(EXAMPLE, /Spec ID must be "SPEC-2026-10-02-csv-task-export"/, '2026-10-02-csv-task-export.md');
});

test('file name must be dated kebab-case', () => {
  expectError(EXAMPLE, /must be <YYYY-MM-DD>-<slug>\.md/, 'csv-export.md');
});

test('unknown status is an error', () => {
  expectError(mutate('Status: approved', 'Status: done'), /Status must be one of/);
});

test('modules: free-form names unless a module list is given', () => {
  expectError(mutate('Modules: api, web', 'Modules: api, my web app'), /module "my web app" must be a package or folder name/);
  assert.deepEqual(lint(mutate('Modules: api, web', 'Modules: api, packages/web')).errors, []);
  expectError(mutate('Modules: api, web', 'Modules: api, mobile'), /unknown module "mobile" — allowed: api, web/, EXAMPLE_NAME, { modules: ['api', 'web'] });
});

test('a missing section is an error', () => {
  expectError(mutate('## Decisions', '## Choices'), /missing section "## Decisions"/);
});

test('sections out of order are an error', () => {
  const swapped = EXAMPLE
    .replace('## Edge cases', '## TMP')
    .replace('## Non-functional requirements', '## Edge cases')
    .replace('## TMP', '## Non-functional requirements');
  expectError(swapped, /sections out of order/);
});

test('an AC without "shall" is an error', () => {
  expectError(mutate('the web app shall download a file', 'the web app downloads a file'), /AC-1: needs exactly one "shall", found 0/);
});

test('an AC with two "shall" is an error', () => {
  expectError(mutate('and re-enable the\n  button', 'and shall re-enable the\n  button'), /AC-6: needs exactly one "shall", found 2/);
});

test('pattern label must agree with the keywords', () => {
  expectError(mutate('AC-4 (Unwanted · Must)', 'AC-4 (Event-driven · Must)'), /AC-4 \(Event-driven\): must start with "WHEN"/);
  expectError(mutate('AC-5 (State-driven · Should) — WHILE', 'AC-5 (State-driven · Should) — WHEN'), /AC-5 \(State-driven\): must start with "WHILE"/);
});

test('an unknown priority or lane is an error', () => {
  expectError(mutate('AC-3 (Ubiquitous · Must)', 'AC-3 (Ubiquitous · Nice)'), /AC-3: priority must be/);
  expectError(mutate('per RFC 4180.\n  Verify: unit (api).', 'per RFC 4180.\n  Verify: storybook.'), /unknown verify lane "storybook"/);
});

test('an AC without Verify is an error', () => {
  expectError(mutate('per RFC 4180.\n  Verify: unit (api).', 'per RFC 4180.'), /AC-3 needs "Verify: <lanes>"/);
});

test('a lane qualifier outside the Modules header is a warning', () => {
  expectWarning(mutate('per RFC 4180.\n  Verify: unit (api).', 'per RFC 4180.\n  Verify: unit (mobile).'), /AC-3: lane "unit \(mobile\)" names "mobile"/);
});

test('a manual lane without a reason is a warning', () => {
  expectWarning(mutate('per RFC 4180.\n  Verify: unit (api).', 'per RFC 4180.\n  Verify: manual.'), /"manual" lane should say why/);
});

test('a vague word without a number is an error', () => {
  expectError(mutate('and re-enable the\n  button', 'and quickly re-enable the\n  button'), /AC-6: vague word\(s\) "quickly"/);
});

test('IDs must be sequential and defined', () => {
  expectError(mutate('- AC-6 (Unwanted · Should)', '- AC-7 (Unwanted · Should)'), /AC-7 out of sequence — expected AC-6/);
  expectError(mutate('a double quote or a line break. → AC-3.\n', 'a double quote or a line break. → AC-12.\n'), /AC-12 is referenced but not defined/);
});

test('edge cases, decisions and untrusted inputs need their arrows', () => {
  expectError(mutate('more than 10,000 tasks. → OQ-1.', 'more than 10,000 tasks.'), /EC-4 needs "→ AC-n" or "→ OQ-n"/);
  expectError(mutate('user, 2026-10-01. → NG-2, AC-2.', 'user, 2026-10-01.'), /D-1 needs "→"/);
  expectError(mutate('Handling: → NFR-2.', 'Handling: escape it.'), /UI-1 needs "Handling: → AC-n \/ NFR-n"/);
});

test('an untrusted input row without any UI-n is an error', () => {
  const start = EXAMPLE.indexOf('## Untrusted inputs');
  const end = EXAMPLE.indexOf('## Decisions');
  const text = EXAMPLE.slice(0, start) + '## Untrusted inputs\n\nNone — nothing untrusted.\n\n' + EXAMPLE.slice(end);
  expectError(text, /untrusted input\(s\) but no UI-n/);
});

test('an approved spec cannot keep a blocking open question', () => {
  expectError(mutate('Blocking: no.', 'Blocking: yes.'), /OQ-1 is blocking — a spec with a blocking open question cannot be approved/);
  const draft = mutate('Blocking: no.', 'Blocking: yes.').replace('Status: approved', 'Status: draft');
  assert.deepEqual(lint(draft).errors, []);
});

test('an open question without Blocking is an error', () => {
  expectError(mutate(' Blocking: no.', ''), /OQ-1 needs "Blocking: yes" or "Blocking: no"/);
});

test('a changed contract without named consumers is a warning', () => {
  expectWarning(mutate('| `Task` | contract | read-only | api | — |', '| `Task` | contract | extended | api | — |'), /contract `Task` changes — Notes should name every consumer/);
  assert.deepEqual(lint(mutate('| `Task` | contract | read-only | api | — |', '| `Task` | contract | extended | api | web reads the new field |')).warnings, []);
});

test('hygiene patterns are errors', () => {
  const marker = 'TO' + 'DO';
  expectError(mutate('## Problem and user', `## Problem and user\n\n${marker} write this`), /hygiene: unfinished-work marker/);
});

test('CLI: exit codes, --modules and the project config file', () => {
  const run = (args, cwd) => {
    try {
      return { code: 0, out: execFileSync(process.execPath, [LINT_PATH, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' }) };
    } catch (e) {
      return { code: e.status, out: `${e.stdout}${e.stderr}` };
    }
  };
  const dir = mkdtempSync(join(tmpdir(), 'spec-lint-'));
  try {
    assert.equal(run([EXAMPLE_PATH], dir).code, 0);
    assert.equal(run([], dir).code, 2);
    const bad = run(['--modules', 'api', EXAMPLE_PATH], dir);
    assert.equal(bad.code, 1);
    assert.match(bad.out, /unknown module "web"/);
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'sdd-engineering.json'), JSON.stringify({ modules: ['api', 'worker'] }));
    const fromConfig = run([EXAMPLE_PATH], dir);
    assert.equal(fromConfig.code, 1);
    assert.match(fromConfig.out, /unknown module "web" — allowed: api, worker/);
    assert.equal(run(['--modules', 'api,web', EXAMPLE_PATH], dir).code, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
