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
skill, graded from the artifact with deterministic checks where possible and an
`llm-rubric` only for promises that require judgement (run model-graded cases with
`--repeat` and read the reasons). `—` = not worth a suite (alias, meta-skill, or
one-liner); routing coverage only.

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
| event-sourcing | A | max | 3 | 2 cases on a greenfield wallet ledger with a glossary (the decider case was dropped: its pins handed over the practice); the first suite scored 100% in every arm including no-skills, so the requests lost their practice-shaped hints and four graders were added for the checklist rules no arm delivered (envelopes, schema-validated reads, a versioning strategy, a rebuildable projection checkpoint); reworked suite: no-skills 18–19/23 → forced 23/23 on runs 2 and 3, with-skills 20–22/23 (an envelope without a unique event id; one run demanded an extra caller-supplied string and failed the hidden test); no skill edit needed; grader fixes from real output: point-free validators, rebuilders whose shape lives in a helper, a trailing comma after a fold's seed, envelopes assembled from a spread field set, folds over whatever the store returned |
| xstate | A | max | 3 | 3 cases on a checkout flow hand-rolled in useState; no-skills 17–20/35 → forced 35/35 and with-skills 35/35 on runs 2 and 3 (run 1: 32/35 both arms — every skill-loaded run drew a correct stateDiagram-v2 and left it in the chat); edits: the render is a file beside the machine named in the reply, and the completion check asks for that path; grader fixes: event names in any case, actors provided from the component, interruptibility for any event key |
| react-testing | A | max | 3 | 3 cases on a React app that plants a `data-testid` on every element and configures jsdom and real-Chromium Vitest projects; no-skills 21–22/30 → 25/30 in both skill arms on run 1 (test ids for a count line and a title span; the child row mocked when the request called it a dumb presenter; the rows-not-rendered mutant survived as a result) → 30/30 in both skill arms on runs 2 and 3; edits: role-less elements are found by their visible text, never by test id; module-mocking a child is shallow rendering by another name |
| front-end-testing | A | max | 3 | 3 cases on a plain-DOM app with MSW and a Playwright journey; no-skills 24–28/30 → forced 30/30 on runs 2 and 4 (run 3: 28/30, one module mock of the app's api wrapper, fixed by an edit), with-skills 30/30 on runs 2–3 and 25/30 on run 4 when only tdd routed for the spinner bug (tdd's description now names front-end-testing as a browser companion; routing case added); edits: every hand-back names the harness and its evidence boundary, one claim one harness, ambiguity resolved accessibly never by class/id scope, the MSW rule covers the app's own request module on error paths too; grader fixes: boundary check needs a negation governing a proof verb or a 'proves X, not Y' sentence |
| react-performance | A | max | 3 | 2 cases on a genuinely slow React 19 app with a committed benchmark that types a different query every keystroke; no-skills 16–17/20 (no measurement before the first edit; two optimisation kinds in one diff) → forced 20/20 on runs 1 and 2; with-skills 20/20 and 19/20 (one routing miss: nothing loaded for 'stutters while typing' — the description now names symptom phrasings and a routing case covers it); no skill rule edit needed; grader fixes: 'from X to Y' and bold numbers count as a before/after report |
| api-design | A | proven | 4 | 3 cases on a live order API whose house style is the opposite of the skill (200 plus an ad-hoc `{ error }` on a rejected order, hand-rolled `typeof` rules, unbounded offset slicing); graders drive the agent's own app in process through hidden probes. A hand-written reference passes all 17 grader invocations across the three cases; six deliberate breaks each fail exactly their own grader, and the skill's own mandatory-`Idempotency-Key` example still scores 5/5. Hand-written no-skills answers score case 1 4/5 (only the reused-key mismatch separates the arms), case 2 5/7 (problem+json, 400/422 mapping), case 3 3/5 (the shipped `total` removed, no deprecation recorded) |
| cli-design | A | todo | 4 | stream separation, --json/--plain, exit codes, TTY |
| bff-entry-points | A | proven | 4 | 3 cases on a session-cookie orders BFF whose registrar knows only `public` and `protected-read`, with no mutation, no Origin/CSRF/content-type policy, no realtime endpoint, no tenant check and `GET /api/orders` still mounted straight on the app reading `?tenantId=`; 27 grader invocations green across three hand-written references, plus 8 again on a second case-1 reference that inlines the chain in the registrar instead of injecting a policy, and six deliberate breaks each failing only their own grader. Repaired after refutation: `mutationPolicyInstalledByRegistrar` grades construction, not file position — the checks may live in the injected `browserPolicy` collaborator the skill's own reference prescribes, found through the registrar's imports and the collaborators composition passes it, and the grader instead fails an endpoint leaf that re-decides the chain; the application/adapter classifier is now graph-based, so a composition-layer CSRF or Origin policy module is adapter code the skill explicitly assigns to the adapter, not "provider material in the application"; `crossTenantRefusalIsNotDisclosed` needs a real tenancy comparison or a principal-scoped read (the untouched fixture used to pass it while leaking every tenant's orders); `directRefusalTestExists` searches `it` blocks, so the direct test may sit beside the HTTP tests of the same feature. Case 2 was rewritten to ask out loud for the two things the skill forbids (dependency names and a version on a public probe, the session id in the stream URL) and gained `publicAllowlistPinsTheNewEntry` for the reviewed public snapshot. No agent run yet: the no-skills gap is unmeasured |
| secure-oauth-oidc | A | proven | 4 | 3 cases on a hack-day sign-in spike (constant `state`, no PKCE, no nonce, ID token trusted on its signature, access token logged and returned in the redirect URL, no session); proven against a hand-written reference: 8/8 case-1 graders, 5/5 case-3 graders on a two-provider variant, 9/9 case-2 graders on a hand-written review, and each deliberate break fails only its own grader. Repaired after refutation: the log scan reads the expressions a `console.*` call is given rather than its prose (the skill asks for decision reasons in the log), the leak scan no longer skips all of `src/lib`, the attack-path grader reads attacker-plus-impact in any wording instead of a closed verb list, the false-assurance patterns are word-bounded and negation-aware, `reviewDemandsHostileTests` was added because two case-2 graders are floors both arms clear, and `reviewNamesConcreteDefects` lost its weight 2 for the same reason. No agent run yet: the no-skills gap is unmeasured |
| twelve-factor | A | proven | 4 | 4 cases on a sessions service that reads `process.env` wherever it likes with silent defaults, picks its database host by `NODE_ENV`, logs English sentences through a file transport, never handles a stop signal and declares one `web` process; 19 graders green on a hand-written reference (shared `wireProcess` composition module, the skill's own ternary console dispatch), each break confirmed |
| observability | A | proven | 4 | 4 cases on a checkout service with console.log noise, a card token and an email in it; graders and hidden tests proven against a hand-written reference (span in `startActiveSpan` ended in `finally`, semconv names, `_OTHER` route label, `propagation.inject`, a Prometheus multiwindow page + runbook that never says "burn rate"); metric-label graders resolve the value reaching the label rather than matching identifier spellings, and the paging grader parses the rule's `expr` (long/short window pair, `and`, burn-rate-calibrated threshold) so anti-pattern #11 fails whatever the prose says |
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
| graph-engineering | B | proven | 9 | 2 cases for bounded fan-in and persisted checkpoints; reference and negative grader proof pass; live baseline pending |
| find-skills | B | proven | 9 | 2 cases for authoritative package channels, CLI versions, and flags; reference and negative grader proof pass; live baseline pending |
| storyboard | B | todo | 9 | mock audit page, gap cards |
| wtf | — | routing only | — | one-line re-explain skill |
| folder-structure | — | routing only | — | deprecated alias for structure-codebase |

## Batches

| Batch | Branch | PR | Scope | State |
|---|---|---|---|---|
| 1 | `promptfoo-skill-evals` | [#248](https://github.com/citypaul/.dotfiles/pull/248) | harness, routing suite, tdd / hexagonal-architecture / domain-driven-design | all three at max; PR open |
| 2 | `skill-evals-batch-2` | [#250](https://github.com/citypaul/.dotfiles/pull/250) | testing, typescript-strict, functional, refactoring, mutation-testing, characterisation-tests, finding-seams | forced arm at max for all seven (three confirmed twice); with-skills gaps are routing (tdd wins ordinary feature requests) |
| 3 | `skill-evals-batch-3` | [#255](https://github.com/citypaul/.dotfiles/pull/255) | event-sourcing, xstate, react-testing, front-end-testing, react-performance; plus the batch-2 routing gaps as routing cases and tdd naming its companions | forced arm at max for all five (each confirmed twice); with-skills at max when the skill routes; merged |
| 4 | `skill-evals-batch-4` | — | api-design, cli-design, bff-entry-points, secure-oauth-oidc, twelve-factor, observability | in progress |
| 5 | — | — | structure-codebase, codebase-design, reduce-system-complexity, improve-codebase-architecture | todo |
| 6 | — | — | planning, story-splitting, specification, find-gaps, acceptance-review, stack-pull-requests | todo |
| 7 | — | — | debugging, ci-debugging, technical-writing, diagrams, expectations, ubiquitous-language | todo |
| 8 | — | — | render-code-shape, evaluate-existing-solutions, bff-design, test-design-reviewer, production-parity-skill-builder, teach-me | todo |
| 9 | — | — | double-check, panel-review, graph-engineering, find-skills, storyboard | in progress — graph-engineering and find-skills proven offline; live baseline pending |

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
