# Report template

Headings and their order are fixed so retros can be compared; an empty
section reads `None — <reason>.` Keep the whole report readable in five
minutes — the tables carry the detail, the prose carries the judgement.

~~~markdown
# Retro: <workflow subject>

Date: <YYYY-MM-DD>
Session: <session id> · window <since → until, or "whole session">
Workflow: <e.g. sdd-engineering:spec-creator (2 phases) → approval>
Artifacts: <links to the spec / plan / PR it produced>

## Summary

3–5 bullets: outcome, total cost in the terms that matter (output, peak
context, wall clock), the single biggest problem, the single best thing.

## Numbers

<the "Agents (spawn order)" table and the totals lines from collect.mjs,
verbatim>

## Timeline

Ordered list, one line per event: spawn, resume, question round, handback,
gate, user decision — `HH:MM:SS  who  what`. Mark waits on the human.

## Per agent

### <agent label> — <one-line role>
- **Went well:** … (evidence)
- **Hard:** … (evidence)
- **Duplicated:** … (evidence)
- **Missed:** … (evidence)
- **Handoff:** in … / out …

## Orchestration

Order, parallelism, agent fit, human gates, tool friction, context pressure —
only the lenses that found something.

## Recommendations

| # | Change | Target | Why (evidence) | Expected effect |
|---|---|---|---|---|
| 1 | … | e.g. `sdd-engineering:implementer` (plugin — override or upstream issue) / a project file | … | e.g. −40 tool calls per run |

## Proposed edits

### E-1 — <title> (from recommendation 1) — status: proposed
Target: `<project path>` · or, for a plugin component: `<plugin>:<name>` →
project-level override `<path>` / issue or PR to the plugin's marketplace
```diff
- old line
+ new line
```

## Routed elsewhere

Code/product lessons sent to `engineering-paved-path:engineering-insights`
(one line each), or `None`.
~~~
