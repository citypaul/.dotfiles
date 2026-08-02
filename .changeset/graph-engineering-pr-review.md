---
"@citypaul/dotfiles": minor
---

Replace the legacy PR machinery with two new skills: graph-engineering and pr-review

`graph-engineering` is a generic multi-agent orchestration skill: compose any
installed skills into one agent graph where each node is a sub-agent that loads
exactly one skill, edges carry schema-shaped data, and stages fan out,
adversarially verify, and synthesize. It documents the node-brief discipline
(one skill, one bounded scope, structured output with file:line evidence), a
topology catalog (fan-out/fan-in, pipeline vs barrier, adversarial verify,
judge panel, loop-until-dry, completeness critic), and three execution runtimes
(the Workflow tool's dynamic workflows preferred, Agent-tool fan-out, labelled
sequential degraded mode). Grounded in Anthropic's orchestrator-workers and
multi-agent research-system guidance, ultrareview's per-finding verification,
and LangGraph's agent-graph vocabulary; the skills-as-nodes mechanic was
verified live against this distribution.

`pr-review` is the flagship instance: a composable multi-agent PR review
invoked as `/pr-review [#PR] [lens...]` where every review lens is an installed
skill (hexagonal-architecture, domain-driven-design, structure-codebase, ...).
Defaults plus project-trait auto-detection, `only`/remove/`thorough`/`post`
modifiers, one sub-agent per lens with isolated context, adversarial
per-finding verification (unverifiable ≠ refuted), cross-lens conflict
surfacing, and one severity-ranked report with explicit clean/not-covered
accounting. It also owns the PR-readiness evidence gate
(`references/pr-readiness.md`): change-path classification and the
mutation-evidence freshness model migrated verbatim from the retired `/pr`
command, keeping the tested policy phrases intact.

Removed: the `pr-reviewer` agent, the `/generate-pr-review` command, and the
`/pr` command (PR creation is now ordinary agent-led work gated by the
pr-readiness reference). All cross-references updated: CLAUDE.md routing and
skills list, README catalogs and counts (3 commands, 9 agents), agents/README,
sibling agent descriptions, /setup generation steps, double-check, tdd,
planning, install-claude.sh arrays, and the mutation-workflow/tdd-watch test
assertions now point at the pr-review skill's pr-readiness reference.

Note for existing installs: the installer no longer ships the removed files but
does not delete previously installed copies of ~/.claude/commands/pr.md,
~/.claude/commands/generate-pr-review.md, ~/.claude/agents/pr-reviewer.md, or
their OpenCode mirrors — remove them manually if present.
