---
"@citypaul/dotfiles": minor
---

Replace the legacy PR machinery with two new skills: graph-engineering and review

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

Beyond read-mostly analysis graphs, graph-engineering also covers dependent
*write* work, adapting mintuz's graph-engineering skill (MIT, credited in
skills/REFERENCES.md): a typed edge taxonomy (`needs` releases only on
verified-and-integrated, `informs` never blocks, `excludes` bars co-running),
frontier scheduling with writes-serial-by-default and four explicit
concurrency conditions, a structured write-node handoff (real exit codes —
a claimed check is not a check; all-empty honesty signal), a repair loop that
sends the largest gap back to the context-holding worker and judges with a
fresh verifier, static-vs-behavioral verification lanes
(tests-written-alongside-implementation as weakest evidence), a Mermaid
render-and-approve gate before dispatching write graphs, one-workflow-per-
checkpoint execution, and what the Workflow runtime does not enforce
(integration, exclusion, approval).

`review` is the flagship instance: a composable multi-agent code review of any change boundary — working tree, branch, stacked layer, or PR —
invoked as `/review [target] [lens...]` where every review lens is an installed
skill (hexagonal-architecture, domain-driven-design, structure-codebase, ...).
Defaults plus project-trait auto-detection, `only`/remove/`thorough`/`post`
modifiers, one sub-agent per lens with isolated context, adversarial
per-finding verification (unverifiable ≠ refuted), cross-lens conflict
surfacing, and one severity-ranked report with explicit clean/not-covered
accounting. The skill is deliberately named `review`, not
`pr-review`: a PR is one kind of target, not a precondition — a `wip` token
reviews uncommitted work mid-development, and the built-in `readiness` lens
runs only for boundaries actually heading to a PR. It also owns the
PR-readiness evidence gate (`references/pr-readiness.md`): per-path change
classification (each changed path classified by every applicable type; mixed
PRs may use several; no ceremonial fields for gates a path type does not own)
and the mutation-evidence freshness model carried over from the retired PR
machinery, plus a finding-discipline section (ownership-based mutation
findings, adapter-aware console findings, contract-based `readonly`) ported
from the retired reviewer agent.

Removed: the `pr-reviewer` agent, the `/generate-pr-review` command, and the
`/pr` command (PR creation is now ordinary agent-led work gated by the
pr-readiness reference). All cross-references updated: CLAUDE.md routing and
skills list, README catalogs and counts (3 commands, 9 agents), agents/README,
sibling agent descriptions, /setup generation steps, double-check, tdd,
planning, install-claude.sh arrays, and the mutation-workflow/tdd-watch test
assertions now point at the review skill's pr-readiness reference.

Note for existing installs: the installer no longer ships the removed files but
does not delete previously installed copies of ~/.claude/commands/pr.md,
~/.claude/commands/generate-pr-review.md, ~/.claude/agents/pr-reviewer.md, or
their OpenCode mirrors — remove them manually if present.
