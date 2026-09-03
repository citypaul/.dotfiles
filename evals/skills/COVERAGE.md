# Skill evaluation coverage

The programme: every skill in `claude/.claude/skills` gets an evaluation that
discriminates — a case both the no-skills arm and the skill-forced arm pass is not
measuring the skill — and each skill is edited until its forced-arm score is as high
as the harness can show. Work ships in batches so PRs stay reviewable. This file is
the tracker: update it in the same commit as the work it describes.

**Status values**, in order: `todo` → `authored` (fixture, cases, graders, hidden
tests written) → `proven` (graders and hidden tests pass against a hand-written
reference implementation) → `baseline` (three-arm run recorded) → `improved`
(skill edited from the evidence, re-run shows the gain) → `max` (no with-skills or
forced metric fails across two consecutive runs).

**Tier**: `A` = implementation skill, graded deterministically from the agent's
tool-call trail and the workspace it leaves. `B` = advisory or document-producing
skill, graded by a rubric against the skill's own stated promises (model-graded,
so run with `--repeat` and read the reasons). `—` = not worth a suite (alias,
meta-skill, or one-liner); routing coverage only.

| Skill | Tier | Status | Batch | Notes |
|---|---|---|---|---|
| tdd | A | max | 1 | 4 cases; no-skills 27/44, forced 40→44/44, with-skills 34→44/44 after four edits (RED named in reply, mutation gate stated, checklist unconditional, description fires on "one-liner fix"); 44/44 in both arms on two consecutive runs |
| hexagonal-architecture | A | max | 1 | 3 cases on a declared-but-not-hexagonal fixture; no-skills 16/33; with-skills 19→33/33, forced 14→33/33 after a "Before You Write Code" procedure (SDK client is never a port, order of work, port every SDK dep of a touched file as a REFACTOR step before RED, adapters beside the feature, fakes not mocks, composition root keeps its SDK-client signature) and a description that fires on every change in an opted-in repo; 33/33 in both arms on two consecutive runs |
| domain-driven-design | A | max | 1 | 2 cases on a greenfield lending domain with a glossary; no-skills 18/22; with-skills 21→22/22, forced 18→22/22 after three edits (assertion budget, test titles by concept, glossary over request wording); 22/22 in both arms on two consecutive runs |
| testing | A | improved | 2 | 3 cases; graders: fresh state, factories, real schema, public interface, no own-module mocks, no 1:1 mirror, planted mutants caught; no-skills 21/30 → after two rounds forced 30/30, with-skills 29/30 |
| typescript-strict | A | improved | 2 | 3 cases; graders: schema at boundary, no any, assertions only in brand factories, one owner per contract, branded ids, exhaustive switches; regraded 28/25/28 of 31 (with/none/forced); edits: derive value sets from one owner, branded-id cue; re-run pending |
| functional | A | improved | 2 | 3 cases; graders: inputs not mutated (reachability + frozen input), array methods, early returns, options objects, readonly contracts; regraded 16/12/20 of 21; edits: readonly contracts; merge case reworded to tempt in-place mutation; re-run pending |
| refactoring | A | improved | 2 | 3 cases; graders: baseline before edit, behaviour preserved incl. quirk, look-alikes kept separate, no commit, assessment classified; regraded 22/21/23 of 28; edits: state the classification in the reply, keep look-alikes separate; re-run pending |
| mutation-testing | A | improved | 2 | 2 cases; Stryker pre-installed; graders: vitest runner config, ran, score reported, survivors below baseline, focused reruns, triage; no-skills 16/27 → after two rounds 25/27 both arms before round 2 (re-run pending) |
| characterisation-tests | A | improved | 2 | 3 cases; graders: no production edit, tests pass on the unmodified module, quirks pinned, recognisable as characterisation, lifecycle documented, oracle observed, snapshot used; regraded 24/20/26 of 29; edits: observe the oracle by running, snapshot for large text; re-run pending |
| finding-seams | A | improved | 2 | 3 cases; graders: enabling point (default or ??/|| fallback), call sites unchanged, no module mock, fakes through the seam, seam type named; regraded 21/19/27 of 28; edits: fallback seam recognised, never a module mock; re-run pending |
| event-sourcing | A | todo | 3 | decider, event store concurrency, projections, upcasting |
| xstate | A | todo | 3 | hand-rolled statechart detection, machine tests, mermaid render |
| react-testing | A | todo | 3 | browser mode vs RTL by claim, role queries |
| front-end-testing | A | todo | 3 | lightest harness for the claim, Playwright boundary |
| react-performance | A | todo | 3 | measure first, one rule per diff, house rules win |
| api-design | A | todo | 4 | RFC 9457 errors, pagination, idempotency, versioning |
| cli-design | A | todo | 4 | stream separation, --json/--plain, exit codes, TTY |
| bff-entry-points | A | todo | 4 | access classification, registrar, CSRF/Origin, SSE |
| secure-oauth-oidc | A | todo | 4 | PKCE, state/nonce, ID token validation, replay |
| twelve-factor | A | todo | 4 | env config, stateless, graceful shutdown, logs to stdout |
| observability | A | todo | 4 | wide events, OTel propagation, SLO/alert design |
| structure-codebase | A | todo | 5 | tree by boundary, import direction, migrations |
| codebase-design | A | todo | 5 | deep modules, contract burden, information hiding |
| reduce-system-complexity | A | todo | 5 | conservation ledger, mechanism accounting, gates |
| improve-codebase-architecture | B | todo | 5 | ranked candidates, HTML report |
| planning | B | todo | 6 | vertical slices, delivery shape per slice |
| story-splitting | B | todo | 6 | child stories, no component tasks |
| specification | B | todo | 6 | one question at a time, example map, AC written back |
| find-gaps | B | todo | 6 | adversarial review written back into the artifact |
| acceptance-review | B | todo | 6 | criterion-by-criterion proof, exact verdict |
| stack-pull-requests | B | todo | 6 | independent vs stacked decision, safe merge |
| debugging | B | todo | 7 | evidence preserved, one hypothesis, fix only when asked |
| ci-debugging | B | todo | 7 | hypothesis first, environment delta, local repro |
| technical-writing | B | todo | 7 | reader-first, falsifiable claims, agent-readable |
| diagrams | B | todo | 7 | renderer-aware, validated, accessible text |
| expectations | B | todo | 7 | routes each fact to its durable owner |
| ubiquitous-language | B | todo | 7 | five-step protocol, glossary authority, safe rename |
| render-code-shape | B | todo | 8 | cited names only, bodies pseudo, read-only |
| evaluate-existing-solutions | B | todo | 8 | local/platform preflight, bespoke baseline |
| bff-design | B | todo | 8 | adoption signals, granularity, identity mediation |
| test-design-reviewer | B | todo | 8 | eight properties, unknowns unscored |
| production-parity-skill-builder | B | todo | 8 | app-specific parity skill, harness questions |
| teach-me | B | todo | 8 | mission-grounded plan, Socratic, HTML lesson |
| double-check | B | todo | 9 | cross-provider, scope-fidelity check |
| panel-review | B | todo | 9 | lens fan-out, verified ranked report |
| graph-engineering | B | todo | 9 | scout inline, one skill per node, adversarial verify |
| find-skills | B | todo | 9 | ecosystem search, provenance and licence inspection |
| storyboard | B | todo | 9 | mock audit page, gap cards |
| wtf | — | routing only | — | one-line re-explain skill |
| folder-structure | — | routing only | — | deprecated alias for structure-codebase |

## Batches

| Batch | Branch | PR | Scope | State |
|---|---|---|---|---|
| 1 | `promptfoo-skill-evals` | [#248](https://github.com/citypaul/.dotfiles/pull/248) | harness, routing suite, tdd / hexagonal-architecture / domain-driven-design | all three at max; PR open |
| 2 | `skill-evals-batch-2` | — | testing, typescript-strict, functional, refactoring, mutation-testing, characterisation-tests, finding-seams | in progress |
| 3 | — | — | event-sourcing, xstate, react-testing, front-end-testing, react-performance | todo |
| 4 | — | — | api-design, cli-design, bff-entry-points, secure-oauth-oidc, twelve-factor, observability | todo |
| 5 | — | — | structure-codebase, codebase-design, reduce-system-complexity, improve-codebase-architecture | todo |
| 6 | — | — | planning, story-splitting, specification, find-gaps, acceptance-review, stack-pull-requests | todo |
| 7 | — | — | debugging, ci-debugging, technical-writing, diagrams, expectations, ubiquitous-language | todo |
| 8 | — | — | render-code-shape, evaluate-existing-solutions, bff-design, test-design-reviewer, production-parity-skill-builder, teach-me | todo |
| 9 | — | — | double-check, panel-review, graph-engineering, find-skills, storyboard | todo |

## Routing suite

48 cases over 46 skills; 47/48 on the last full run (the miss: `functional` lost a
mutation-bug request to `tdd` + `testing` in one of two runs). Two descriptions fixed
in batch 1 (`expectations`, `technical-writing`). Known gap from the quality suites:
`hexagonal-architecture` and `domain-driven-design` do not fire when only the
repository's README/CLAUDE.md declares the practice — batch 1 fix target.
