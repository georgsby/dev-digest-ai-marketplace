# sdd-engineering cost and quality eval

A fixed scenario for measuring what `sdd-engineering:plan-verifier` costs and
whether it still catches what it must. Repo-level, so it never ships in the
plugin cache (`docs/specs/sdd-plugins.md` §9). Results feed
[`docs/COST-BASELINE.md`](../../docs/COST-BASELINE.md).

## Scenario

`fixtures/csv-export/` is a tiny Node 22 project (module `tasks`, `npm test`)
with an approved spec (`spec-lint`: 0 errors) and a single-agent
Implementation Plan. Each run copies it to a temp directory, commits `base/`
on `main` and one variant on `feat/csv-export`, then runs:

```sh
claude -p --model <model> \
  --plugin-dir plugins --setting-sources project --strict-mcp-config \
  --permission-mode bypassPermissions --disallowedTools Write,Edit,NotebookEdit,WebFetch,WebSearch \
  --settings '{"sandbox":{"enabled":true,"autoAllowBashIfSandboxed":true,"allowUnsandboxedCommands":false,"failIfUnavailable":true,"network":{"strictAllowlist":true}}}' \
  --output-format stream-json --verbose --no-session-persistence
```

The prompt asks the main thread to dispatch `sdd-engineering:plan-verifier`
through the Agent tool and reply `DONE`; the grader reads the subagent's own
report from the tool result. This is how `/implement` runs the verifier, and
only a subagent gets its frontmatter `skills:` preloaded. `--mode agent`
runs it as the main thread (`claude --agent`) instead.

The plugins load from this working tree, so a run measures the current
commit. User settings, user plugins and MCP servers are not loaded, and an
empty `ZDOTDIR` keeps your zsh startup files out of the Bash tool.

**Permissions.** Bash runs inside Claude Code's OS sandbox (Seatbelt on
macOS, bubblewrap on Linux) without prompts: it can write only to the
throwaway fixture repo and the per-user temp dir, has no network, and can
neither fall back to running unsandboxed nor start when the sandbox is
unavailable. The file-writing tools are removed. An earlier version used a
`dontAsk` Bash allowlist; it denied `git -C <dir> …`, `$(…)`, loops and
`${PIPESTATUS[…]}`, and the verifier sometimes returned `VERDICT: BLOCKED`
(3 of 40 runs in `docs/COST-BASELINE.md`).

| Variant | Implementation | A correct report |
|---|---|---|
| `complete` | every AC, EC and NFR implemented and tested | `VERDICT: COMPLETE`, every row `MET` |
| `gaps` | three seeded defects, all tests still green | `VERDICT: INCOMPLETE`; `AC-3` (no formula-injection prefix), `AC-5` (no test), `NG-1` (column picker = scope creep) flagged `PARTIAL`/`MISSING`/`DEVIATED` |

A run **passes** when the verdict is the expected one, `TREE: unchanged`, no
row is a false positive (`complete`) and every seeded row is flagged
(`gaps`). A seeded row reported `MET` or missing, `VERDICT: COMPLETE` on
`gaps`, or `TREE: MODIFIED` is a **critical error**. A tree the verifier
could not confirm fails the run without being critical.

## Run

```sh
node evals/sdd-engineering/run.mjs run --label baseline --runs 10   # variants interleaved, sequential
node evals/sdd-engineering/run.mjs summarize baseline                # median [min–max], pass rate
node evals/sdd-engineering/run.mjs compare baseline candidate        # Δ median, range overlap
node evals/sdd-engineering/run.mjs regrade baseline                  # re-grade saved reports after a grader change
```

Options: `--variant complete|gaps|all`, `--model` (default
`claude-opus-5-5`), `--max-budget-usd` per run (default 5),
`--timeout-min` (default 20). Runs use your Claude Code credentials and
count against your plan or API bill: about $0.36–0.47 per run on Opus.

Raw stream-json transcripts, reports and `runs.jsonl` go to `results/<label>/`
(git-ignored). Cost is Claude Code's list-price estimate (`total_cost_usd`);
API calls are distinct assistant message ids; tool calls are distinct
`tool_use` blocks, also reported for the verifier alone. Token totals come
from `modelUsage` for the whole run (the orchestrator turn included).

**Noise rule.** A difference counts only when the two series' min–max ranges
do not overlap. With 10 runs per series that is a strict test; anything else
is reported as within noise.
