# Cost baseline — sdd-engineering

What one fixed SDD scenario costs, how well it does its job, and whether one
prompt optimization changed either. Numbers come from
[`evals/sdd-engineering`](../evals/sdd-engineering/README.md); rerun them
with the commands at the end.

## Scenario

| | |
|---|---|
| Plugin | `sdd-engineering@1.0.0` (with `engineering-paved-path@1.0.0`, `research-tools@1.1.0`, `architecture-review@1.0.0`), loaded from the working tree with `--plugin-dir plugins` |
| Agent under test | `sdd-engineering:plan-verifier`, dispatched as a subagent through the Agent tool — the way `/implement` runs it |
| Model | `claude-opus-5-5` for the main thread and the subagent (the agent's frontmatter says `opus`); no other model appeared in `modelUsage` |
| Claude Code | 2.1.299 |
| Isolation | `--setting-sources project --strict-mcp-config`: no user settings, user plugins or MCP servers; `--permission-mode dontAsk` with a read-only Bash allowlist |
| Eval set | fixture `csv-export`: a spec (`spec-lint` 0 errors) + a single-agent plan + one of two implementations, committed on `feat/csv-export` over `main` |
| Runs | 10 × `complete` + 10 × `gaps` per series, sequential, variants interleaved |

**Variants.** `complete` implements and tests every requirement; a correct
report is `VERDICT: COMPLETE` with every row `MET`. `gaps` keeps all tests
green but seeds three defects: `AC-3` formula-injection prefix missing (a
security requirement), `AC-5` implemented without a test, and `NG-1` a
column picker the spec rules out. A correct report is `VERDICT: INCOMPLETE`
with all three flagged.

**Quality gate.** A run passes when the verdict is the expected one,
`TREE: unchanged`, no row is a false positive (`complete`) and every seeded
defect is flagged (`gaps`). A **critical false negative** is a seeded defect
reported `MET` or not reported, or `VERDICT: COMPLETE` on `gaps`.

**Metrics.** Cost is Claude Code's list-price estimate (`total_cost_usd`) for
the whole run, the dispatching main-thread turn included. Tokens come from
`modelUsage`. API calls are distinct assistant message ids; tool calls are
distinct `tool_use` blocks; both are also counted for the verifier alone.
Latency is `duration_ms` of the run.

**Noise rule.** A change counts only when the min–max ranges of the two
series do not overlap. Anything else is reported as within noise.

## Baseline — `8961ef8`

Started 2026-10-14 16:11 UTC. Total spend for 20 runs: $8.25.

| Metric | all (20): median [min–max] | complete (10) | gaps (10) |
|---|---|---|---|
| Cost, USD | 0.412 [0.356–0.468] | 0.382 [0.356–0.465] | 0.435 [0.409–0.468] |
| Latency, s | 76.8 [55.3–119.0] | 66.1 [55.3–84.5] | 80.6 [73.1–119.0] |
| Input tokens (uncached) | 20 [16–24] | 19 [16–24] | 20 [18–24] |
| Cache write tokens | 31,428 [29,251–39,619] | 30,409 [29,251–39,619] | 31,875 [30,044–33,507] |
| Cache read tokens | 245,883 [178,083–305,520] | 228,146 [178,083–299,165] | 246,554 [214,482–305,520] |
| Output tokens | 7,990 [6,178–9,950] | 7,016 [6,178–7,997] | 8,759 [7,902–9,950] |
| API calls | 9 [7–11] | 8.5 [7–11] | 9 [8–11] |
| Tool calls | 14 [7–21] | 14 [7–21] | 15 [10–19] |
| Verifier: API calls | 7 [5–9] | 6.5 [5–9] | 7 [6–9] |
| Verifier: tool calls | 13 [6–20] | 13 [6–20] | 14 [9–18] |
| Pass rate | 19/20 | 9/10 | 10/10 |

**Critical false negatives: 0.** All 10 `gaps` runs flagged all three seeded
defects.

**The one failure (`complete` #9)** was caused by the eval harness, not by a
missed defect. The verifier's first command chained `find` and `$(…)`, which
the allowlist does not cover; its retry `git -C <dir> status --porcelain` did
not match the `Bash(git status:*)` pattern either. After two denials it
concluded that Bash was unavailable and returned `VERDICT: BLOCKED` with 19
`UNVERIFIED` rows and `TREE: not checked`. That is an honest report, not a
false `COMPLETE`. The grader counted `TREE: not checked` as critical because
it only accepts `unchanged`; it is not a false negative. The allowlist was
kept unchanged for the candidate series so both series ran on the same
harness.

**Other observations**

- Almost all input is served from the prompt cache: ~246k cache-read and
  ~31k cache-write tokens per run against ~20 uncached input tokens. Prompt
  length therefore costs through cache writes once per run and cache reads
  on every API call.
- In subagent mode the verifier never called the Skill tool (0 of 20 runs),
  although its Step 1 told it to invoke `engineering-insights`: the
  preloaded body was already in context and the model skipped the reload.
- The inventory size varies from 22 to 27 rows between runs of the same
  input, although Hard rule 3 asks for a complete, fixed inventory. The
  verdicts were unaffected, but the matrix is not deterministic.
- Every run but one had 1–4 permission denials, mostly chained shell
  commands. They add API calls and are part of the noise.

## Optimization — `73847b0`

**One change:** remove the instructions in `plan-verifier.md` › Step 1 that
duplicate its skills. Step 1 no longer tells the agent to invoke the two
skills its frontmatter already preloads, points to `spec-authoring` for the
spec template instead of restating its headings, and reads
`implementation-planner.md` › Output only when the plan uses a field the
inline vocabulary does not cover. Model, routing, tools, frontmatter and the
report format are unchanged. The prompt shrank from 2,127 to 2,097 words.

A wider cut was ruled out first: of the passages in `plan-verifier.md` that
look duplicated, only about 140 words are fully covered by a skill the agent
loads. The rest are rules stated only in this agent (the `PARTIAL` lane
rule, `OQ-n` exclusion, the `TREE` and `Ruling:` rules the `/implement`
runner relies on) or the report format callers parse.

### Candidate series

Started 2026-10-14 16:37 UTC, same harness, model and eval set. Total spend:
$8.10.

| Metric | all (20): median [min–max] | complete (10) | gaps (10) |
|---|---|---|---|
| Cost, USD | 0.403 [0.372–0.437] | 0.394 [0.372–0.428] | 0.422 [0.378–0.437] |
| Latency, s | 71.8 [57.9–83.7] | 65.6 [57.9–74.5] | 75.9 [67.4–83.7] |
| Input tokens (uncached) | 18 [14–22] | 18 [16–22] | 18 [14–22] |
| Cache write tokens | 30,867 [28,591–42,596] | 30,691 [28,591–42,596] | 30,964 [28,957–37,934] |
| Cache read tokens | 212,873 [157,155–279,184] | 209,917 [170,633–275,669] | 212,873 [157,155–279,184] |
| Output tokens | 7,930 [6,435–9,093] | 7,141 [6,435–8,135] | 8,522 [6,988–9,093] |
| API calls | 8 [6–10] | 8 [7–10] | 8 [6–10] |
| Tool calls | 10 [8–19] | 11 [8–18] | 10 [8–19] |
| Verifier: API calls | 6 [4–8] | 6 [5–8] | 6 [4–8] |
| Verifier: tool calls | 9 [7–18] | 10 [7–17] | 9 [7–18] |
| Pass rate | 18/20 | 8/10 | 10/10 |

**Critical false negatives: 0.** All 10 `gaps` runs flagged all three seeded
defects. Both failures (`complete` #2 and #9) are the same harness pattern
as the baseline failure: a chained command with `find`/`for` denied, then
`git -C <dir> …` denied, then `VERDICT: BLOCKED` with every row
`UNVERIFIED`.

### Comparison (all 20 runs per series)

| Metric | Baseline | Candidate | Δ median | Ranges overlap? | Mann–Whitney p |
|---|---|---|---|---|---|
| Cost, USD | 0.412 | 0.403 | −2.1% | yes | 0.56 |
| Latency, s | 76.8 | 71.8 | −6.5% | yes | 0.16 |
| Cache read tokens | 245,883 | 212,873 | −13.4% | yes | 0.011 |
| Output tokens | 7,990 | 7,930 | −0.8% | yes | 0.76 |
| API calls | 9 | 8 | −11.1% | yes | 0.026 |
| Tool calls | 14 | 10 | −28.6% | yes | 0.009 |
| Verifier: tool calls | 13 | 9 | −30.8% | yes | 0.009 |
| Pass rate | 19/20 | 18/20 | — | — | — |
| Critical false negatives | 0 | 0 | — | — | — |

The per-variant comparison points the same way and is also within noise
everywhere (`node evals/sdd-engineering/run.mjs compare baseline candidate`).

## Result

**The optimization does not pass.** By the rule fixed before the runs, every
metric is within noise: the min–max ranges overlap for cost, latency, tokens
and call counts.

- **Cost and latency** — the metrics the pass criterion names — show no
  detectable change: −2.1% cost (p = 0.56) and −6.5% latency (p = 0.16). We
  do not claim a saving.
- **Tool calls, API calls and cache reads** dropped by 11–31% with
  p ≈ 0.01–0.03. That is probably a real but small behavioural effect: the
  verifier batches more and reads less. It does not survive a correction for
  the seven metrics tested (Bonferroni threshold 0.007), and fewer calls
  did not turn into a measurable cost or latency change: output tokens and
  cache writes, which do not shrink with the call count, stayed flat.
- **Quality gate** — not green in either series: 19/20 in the baseline,
  18/20 in the candidate. All three failures are the same harness artifact
  on `complete`, so 1 against 2 cannot be told apart at n = 10. No critical
  false negative appeared.
- **Why the effect is small:** the duplication cost less than it looked. In
  subagent mode the verifier never called the Skill tool, even in the
  baseline, so the redundant "invoke the skill" instruction never caused a
  second load. What was left to remove was about 30 words of text.

The change stays in the tree as a cleanup: it removes contradictory
instructions and showed no regression. It is not counted as a cost saving.

## Next steps

1. Fix the harness: allow `git -C <dir> …`, `find` and loop constructs in
   the allowlist, and teach the grader that `TREE: not checked` with
   `VERDICT: BLOCKED` is a harness failure, not a false negative. Then rerun
   both series to get a green gate.
2. Another candidate is the per-call prefix: the ~30k-token cache
   write (the system prompt plus the preloaded `spec-authoring` and
   `engineering-insights`) is paid on every run and read on every API call.
   Preloading only the `spec-authoring` sections the verifier uses would
   shrink the cache-write prefix every run pays, and would need its own
   experiment.
3. The inventory size varies (22–27 rows on the same input) in both series.
   That is a determinism gap in Hard rule 3, separate from cost.

## Reproduce

```sh
git checkout 8961ef8 && node evals/sdd-engineering/run.mjs run --label baseline --runs 10
git checkout 73847b0 && node evals/sdd-engineering/run.mjs run --label candidate --runs 10
node evals/sdd-engineering/run.mjs compare baseline candidate
```

About $8 and 25–30 minutes per series on Opus. The runs use your Claude
Code credentials.
