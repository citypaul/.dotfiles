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
| testing | A | improved | 2 | 3 cases; no-skills 21/30 → 30/30 and 29/30 across the two skill arms on consecutive runs (one-case real-schema miss alternates arms); edits: touched-file state discipline, mechanical factory trigger, enumerate comparisons and normalising calls, reuse the production schema at the factory |
| typescript-strict | A | improved | 2 | 3 cases; no-skills 25/31 → forced 31/31 and with-skills 30/31, then 29/31 both (one-case misses vary: one owner, boundary re-declaration, branded ids); edits: derive value sets from one owner, branded-id cue |
| functional | A | max | 2 | 3 cases; no-skills 10/21 → forced 21/21 (confirmed twice), with-skills 19/21 — the one miss is routing: "bulk prices" loaded tdd only; edits: new value even when asked to mutate in place, readonly contracts, loop rules at the point of writing, description names data-reshaping requests |
| refactoring | A | max | 2 | 3 cases; no-skills 21/28 → forced 28/28 (confirmed twice), with-skills 25/28 — the miss is routing: "collapse the two look-alikes" loaded nothing; edits: labelled Critical/High/Nice/Skip lines and a Decision line in the reply, restated at the checkpoint, baseline run even when declining, keep look-alikes separate, description fires on collapse/tidy |
| mutation-testing | A | improved | 2 | 2 cases; no-skills 16/27 → 27/27 both arms, then 27/27 and 26/27 (one reply omitted the killed count); edits: rerun budget incl. crashed attempts, config proof, triage with equivalence pass, no break threshold before baseline, gitignore, scripts |
| characterisation-tests | A | improved | 2 | 3 cases; no-skills 20/29 → forced 29/29 twice, with-skills 28/29 twice (one-case misses vary); edits: observe the oracle by running, snapshot for large text |
| finding-seams | A | max | 2 | 3 cases; no-skills 19/28 → forced 28/28 (confirmed twice), with-skills 24–28/28 across runs; edits: fallback seam recognised, never a module mock, only a hand-written fake goes through the seam, hand-back names the seam and its enabling point |
| event-sourcing | A | proven | 3 | 3 cases on a greenfield wallet ledger with a glossary; the 11 graders pass on 15 hand-written references that differ only in spelling — one module per role, the same code as a single `src/wallet/index.ts`, `function` declarations with inline result types, renamed decider/store/write method (`decideWallet`, `commitEvents`), the stream field spelled `facts` and reached through a chained `history.facts.reduce`, seed named `nothingYet`, conflict reasons `wallet-busy`/`lost-the-race`/`conflict`, the skill's own bounded reload-and-re-decide retry loop, a zod `discriminatedUnion` event schema, an options object carrying the expected version, a store that throws on a lost race, `for…of` folds, a store whose `load` answers a tuple, a class-based store, a snapshot cache, and a maintained view rebuilt by a replay function — all tsc-clean with the hidden tests green (8/5/5); no rule is decided by a name the agent was free to choose, and 12 breaks (clock in `decide`, CRUD event names, append without the version, check-then-act instead of an asserted version, an append whose answer is discarded, `splice` over a stored stream, a balance column beside the events, a stored current state instead of a fold, a maintained screen with no rebuild, spy-based tests, plus the naive no-skills shape and the untouched fixture) each fail only the rules they break |
| xstate | A | proven | 3 | 3 cases on a checkout flow hand-rolled in useState; 13 graders (10 rules + behaviour/suite/typecheck) all pass on a hand-written reference in a workspace mounted as run-quality.sh mounts it (skills at .claude/skills), all 10 rule graders and all 3 hidden tests fail on the untouched fixture, and the default flag-hardening fix delivers case 1's behaviour while scoring 0/10 on the rules |
| react-testing | A | proven | 3 | 3 cases on a React app that plants a `data-testid` on every element and configures both a jsdom and a real-Chromium Vitest project; one rule carries each case and a different grader decides it — the harness rule on the subscribe form (`browserHarnessForBrowserClaim`, weight 2, attached to that case alone), the shallow-rendering rule on the task board (`noMockedChildComponents` plus `rows-not-rendered`, a bug planted in the child the request invites you to stand something in for), and "do not fake what the harness should answer" on the clipped title (`noFakedLayoutOrEnvironment`, weight 2); hand-written references score 10/10, 9/9 and 10/10 and re-spellings of them (another directory, function declarations, a renamed helper, `within`, a two-file split, Browser Mode for the board, `renderHook` with its returned `act`) score the same, while a jsdom answer to case 1 scores 8/10, a board test that stands the row in — by module mock or by parameter injection — scores 7/9 and 8/9, and a layout fake scores 9/10; graders run the suite with their own TMPDIR, reap the browsers they started, retry a browser-session failure once, and hold a workspace lock that a killed process no longer strands |
| front-end-testing | A | todo | 3 | lightest harness for the claim, Playwright boundary |
| react-performance | A | proven | 3 | 2 cases on a genuinely slow React 19 app whose cost is real work over real data — no repeat counts, no sleeps, nothing to delete on sight; graders and the hand-written references score 10/10 in every spelling tried (in place, a helper in `src/`, a helper outside `src/`, a `const ranked: T[] = []` accumulator, a removal with no memo at all), and `measuredImprovement` re-runs `src/perf/*.bench.ts` over HEAD and over the agent's whole working tree with the harness — sample-data generator, vitest config, tsconfig, package.json — from HEAD in both, so the reflex fixes fail on the number however confident the reply: a single `useMemo` keyed on the query (0.95×-0.98×), `memo(TagBreakdown)` on a context consumer (1.04×-1.10×) and one `useMemo` over an aggregation the clock feeds (0.95×-1.01×) |
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
| 2 | `skill-evals-batch-2` | [#250](https://github.com/citypaul/.dotfiles/pull/250) | testing, typescript-strict, functional, refactoring, mutation-testing, characterisation-tests, finding-seams | forced arm at max for all seven (three confirmed twice); with-skills gaps are routing (tdd wins ordinary feature requests) |
| 3 | `skill-evals-batch-3` | — | event-sourcing, xstate, react-testing, front-end-testing, react-performance; plus the batch-2 routing gaps as routing cases and a tdd companion cue | in progress |
| 4 | — | — | api-design, cli-design, bff-entry-points, secure-oauth-oidc, twelve-factor, observability | todo |
| 5 | — | — | structure-codebase, codebase-design, reduce-system-complexity, improve-codebase-architecture | todo |
| 6 | — | — | planning, story-splitting, specification, find-gaps, acceptance-review, stack-pull-requests | todo |
| 7 | — | — | debugging, ci-debugging, technical-writing, diagrams, expectations, ubiquitous-language | todo |
| 8 | — | — | render-code-shape, evaluate-existing-solutions, bff-design, test-design-reviewer, production-parity-skill-builder, teach-me | todo |
| 9 | — | — | double-check, panel-review, graph-engineering, find-skills, storyboard | todo |

## Routing suite

Batch 3 turned the batch-2 routing gaps into four routing cases and fixed them at
bundle level: tdd's description now says it is the workflow, not the toolkit, and names
functional, refactoring and the declared architecture skills as companions. Result over
three repeats: data-shaping request 3/3 (tdd and functional co-load), "collapse the
look-alikes" 3/3, "tidy a module" 3/3, "tiered pricing rules" 1/3 (tdd alone twice) —
the one remaining partial.

48 cases over 46 skills; 47/48 on the last full run (the miss: `functional` lost a
mutation-bug request to `tdd` + `testing` in one of two runs). Two descriptions fixed
in batch 1 (`expectations`, `technical-writing`). Known gap from the quality suites:
`hexagonal-architecture` and `domain-driven-design` do not fire when only the
repository's README/CLAUDE.md declares the practice — batch 1 fix target.
