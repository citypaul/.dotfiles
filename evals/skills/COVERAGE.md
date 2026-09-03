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
| event-sourcing | A | proven | 3 | 2 cases on a greenfield wallet ledger with a glossary: the store and command handler, and the wallet screen. A third case, the decider on its own, was DELETED after the recorded run of 2026-09-03 — its no-skills arm scored 7/7 (past-tense facts, a `decide` with no clock or id minting, an `evolve` that refuses impossible history, tests with no mocks), so it measured nothing, and AUTHORING.md's bar is "if the answer is 'the same thing', the case does not belong". The headroom now rests on four graders for rules every arm of that run missed: `eventsHaveEnvelopes` (id + timestamp + stream position outside the payload, stamped from a clock at write time), `storedEventsValidatedOnRead` (a schema or hand-written parse reached from the read whose ANSWER is used — a parse whose result is thrown away no longer counts, and the fold function is never mistaken for a validator however it is spelled), `versioningStrategyExists` (a per-event schema version that is actually branched on, or a reader that is not strict) and `projectionRebuildableFromCheckpoint` (a screen folded from zero on every read passes trivially; a maintained view needs a checkpoint and a rebuild). Both requests were rewritten to give those rules a business reason with no mechanism named: the lines end up as JSON in a database column, older ones written by earlier versions of this code, what a top-up records grows next month, support must be able to say of any single line when it happened and which request put it there. Proof, all offline: two independently written references — three files with zod, and a one-file re-spelling with `function` declarations, `for…of` folds, a hand-rolled tolerant reader and the envelope spelled eventId/writtenAt/streamPosition/payloadVersion/fact — each score 13/13 and 14/14 with the hidden tests green and tsc clean, as does a maintained view that keeps a checkpoint and can be rebuilt; six breaks each fail only what they break (envelope with no id, rows cast instead of parsed on the way out, strict reader with no schema version, maintained view with no checkpoint, and in both spellings a parse whose answer is discarded); the untouched fixture fails 10 of 14. DISCRIMINATION IS NOT YET SHOWN: against the recorded run every arm — no-skills, with-skills and skill-forced — fails exactly the same three new graders (3 of 13 on the history case, 3 of 14 on the screen), which is why the requests changed; the next three-arm run is what decides whether the headroom is real |
| xstate | A | max | 3 | 3 cases on a checkout flow hand-rolled in useState; no-skills 17–20/35 → forced 35/35 and with-skills 35/35 on runs 2 and 3 (run 1: 32/35 both arms — every skill-loaded run drew a correct stateDiagram-v2 and left it in the chat); edits: the render is a file beside the machine named in the reply, and the completion check asks for that path; grader fixes: event names in any case, actors provided from the component, interruptibility for any event key |
| react-testing | A | improved | 3 | 3 cases on a React app that plants a `data-testid` on every element and configures jsdom and real-Chromium Vitest projects; no-skills 21/30 → 25/30 in both skill arms on run 1 (test ids for a count line and a title span; the child row mocked when the request called it a dumb presenter; the rows-not-rendered mutant survived as a result); edits: role-less elements are found by their visible text, never by test id; module-mocking a child is shallow rendering by another name; second run pending |
| front-end-testing | A | max | 3 | 3 cases on a plain-DOM app with MSW and a Playwright journey; no-skills 24–28/30 → forced 30/30 on runs 2 and 4 (run 3: 28/30, one module mock of the app's api wrapper, fixed by an edit), with-skills 30/30 on runs 2–3 and 25/30 on run 4 when only tdd routed for the spinner bug (tdd's description now names front-end-testing as a browser companion; routing case added); edits: every hand-back names the harness and its evidence boundary, one claim one harness, ambiguity resolved accessibly never by class/id scope, the MSW rule covers the app's own request module on error paths too; grader fixes: boundary check needs a negation governing a proof verb or a 'proves X, not Y' sentence |
| react-performance | A | improved | 3 | 2 cases on a genuinely slow React 19 app with a committed benchmark that types a different query every keystroke; no-skills 17/20 (no measurement before the first edit; two optimisation kinds in one diff) → forced 20/20 and with-skills 20/20 on run 1 (after a grader fix so 'from X to Y' counts as a before/after report); no skill edit needed so far; second run pending |
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
