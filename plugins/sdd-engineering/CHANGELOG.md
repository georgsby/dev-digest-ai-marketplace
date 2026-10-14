# Changelog

All notable changes to this plugin are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-10-14

- spec-creator no longer writes or finishes a spec while a user story has no Must acceptance criterion; it asks a Criterion question instead (also in subagent mode)
- spec-lint: a US-n whose Covered by lists no Must AC-n is an error; spec-authoring documents the rule. Specs where every story has a Must criterion are unaffected

## [1.0.1] - 2026-10-14

- plan-verifier: Step 1 no longer re-invokes the skills its frontmatter preloads and no longer restates the spec template; reads implementation-planner.md only when the plan uses an unlisted field (no behaviour change; see docs/COST-BASELINE.md)

## [1.0.0] - 2026-10-14

- Initial release: spec-creator, implementation-planner, implementer and plan-verifier agents; /implement pipeline; /workflow-retro retrospective; spec-authoring (with spec-lint) and mermaid-diagram skills
- Project paths and gate commands come from .claude/sdd-engineering.json or defaults instead of a fixed repository layout
- Requires: engineering-paved-path ^1.0.0, research-tools ^1.0.0, architecture-review ^1.0.0
