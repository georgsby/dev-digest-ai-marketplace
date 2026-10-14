# Lenses — what to look for

Use these as questions, not as a form to fill. Skip a lens that has nothing to
say; one well-evidenced finding beats five generic ones.

## Per agent

**Hard for it (difficulties)**
- Failed tool calls and what they were: a wrong path, a zsh glob on `[id]`,
  a permission or hook block, an `Edit` whose `old_string` did not match.
  Did the agent recover in one step, or loop?
- Retries: the same command twice (`repeatedBash`), a lint gate that failed
  first time — and why it failed (format rule it did not know?).
- Long stretches of exploration before the first useful output: count tool
  calls before its first write or first question.
- Places where it asked the orchestrator or user something the prompt or the
  repo docs already answered.

**Easy for it**
- Steps done in one pass with no error: which inputs made that possible
  (a precise prompt, a skill, an INSIGHTS entry it quoted)? These are the
  patterns to keep — say so, so nobody "fixes" them away.

**Duplicated information**
- The same files read by several agents (`duplicateReads`) or the same
  `rg`/`sed` exploration repeated. Would a handoff note have saved it?
- The orchestrator's prompt restating what the agent's own definition
  already says, or the agent re-deriving facts the orchestrator already had.
- The agent's report repeating its input back instead of adding to it; very
  long reports (`finalReportChars`) that the orchestrator then summarised
  again for the user.

**Missed**
- Things a later step had to fix or add: the next agent, the orchestrator,
  a reviewer, or the user correcting it. The later correction is the evidence.
- Its own definition's steps it skipped (gate not run, index row not added,
  skill not loaded).
- Out-of-scope items it handed back ("outside my write scope") — fine, but
  were they then done by someone, or dropped?

**Handoff quality**
- Input: did the prompt carry goal, constraints, paths, what "done" means,
  and how to report? Missing pieces show up as early exploration or questions.
- Output: was the report structured so the orchestrator could act on it
  without re-reading the transcript?

## Orchestration

- **Order and parallelism.** Spawn order vs dependency order; agents run in
  sequence that could have run in parallel (`maxParallel` 1 with independent
  tasks), or in parallel while sharing files.
- **Agent fit.** A general agent used where a specialised (project or plugin) agent exists, or a
  heavy agent (full model, many tools) for a lookup a cheaper model or a
  single `rg` would answer.
- **Human gates.** Question rounds: how many, how many options each, how many
  answered "all defaults". Many "all defaults" answers mean the defaults are
  good and the questions could be fewer or batched.
- **Tool friction.** Permission prompts, classifier errors, hooks firing on
  commands they were not meant for. These are fixed in settings or hooks, not
  in prompts.
- **Context pressure.** Peak context per agent; compactions; an orchestrator
  whose context was filled by pasting subagent reports verbatim.
- **Resumes.** A resumed agent (SendMessage) keeps its context — cheaper than a
  fresh spawn that re-reads everything. Were fresh spawns used where a resume
  would do, or vice versa?

## Scorecard (optional, for comparing runs)

Rate 1–5 with one line of evidence each; only if the user wants trends.

| Dimension | 1 | 5 |
|---|---|---|
| Correctness of output | needed major rework | accepted as is |
| Efficiency | many retries / re-reads | straight path |
| Autonomy | many avoidable questions | asked only real decisions |
| Handoff | report needed digging | directly actionable |
| Scope discipline | wandered / edited outside scope | stayed in scope |
