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
| api-design | A | max | 4 | 3 cases on a partner-facing orders API written naively; no-skills 10–13/17 (no idempotency-key mismatch refusal, ad-hoc error bodies, 400 for everything, a breaking rename) → run 1: forced 15/17 and with-skills 14/17 (asked to rename a shipped field, the forced arm stopped to ask and with-skills renamed with a warning) → 17/17 in both skill arms on runs 2 and 3; edits: the additive rule outranks the wording of the request, record a supersession the moment it happens, a request never authorises the break, a verification step for removals |
| cli-design | A | max | 4 | 3 cases on a build-report CLI that prints everything to stdout; no-skills 23–25/31 → run 1: forced 22/31 (handlers printing and exiting, a required flag that made plain invocations exit 2, the success envelope on stdout for a failed gate) → run 2: forced 30/31 → runs 3 and 4: forced 31/31; with-skills 24–28/31 across runs (the same slips when routing lands on tdd first); edits: the entry point is the only file that writes a stream or ends the process, any non-zero exit keeps stdout empty with the JSON error envelope on stderr, exit codes and the TTY/NO_COLOR check at the point of action, status lines TTY-gated on the stream-contract row; graders: net-new lines only, NO_COLOR required only of a tool that emits colour |
| bff-entry-points | A | max | 4 | 3 cases on a session-cookie orders BFF whose registrar knows only `public` and `protected` and whose oldest route sits on the app; run 1: no-skills ~27/33 → forced 30/33 (the mutation chain lacked a session-bound CSRF token, a touched legacy route stayed on the app, no direct provider-free refusal test) → run 2: forced 31/33 → runs 3 and 4: forced 33/33; with-skills 29/33 on both (the skill loaded, yet the mutation chain's Origin and CSRF checks were left out twice) → after the whole-chain rule, a skill-arms run scored with-skills 33/33 and forced 32/33 (policy checked inside one endpoint); no-skills 27–28/33; edits: the CSRF token has a path when the session store is fixed, editing a bypass route migrates it in the same change, the chain lives in the registrar and nowhere else, authorization is proven by direct calls, tenant-leak phrasing in the description plus a routing case |
| secure-oauth-oidc | A | max | 4 | 3 behaviour cases on a hack-day sign-in spike (constant state, no PKCE, no nonce, token in the redirect); run 1: the forced arm delivered the narrow ask on the returnTo and partner cases and listed PKCE, nonce, issuer validation and token exposure as 'pre-existing, out of scope' (pkce 0/2, issuer 0/1, token exposure 0/2); two request defects fixed (a required signing secret the hidden test could not supply; the partner request read as keep /me at 401); edits: the flow you touch comes up to the RFC 9700 baseline in the same change, an existing token leak on the path you edit is removed; runs 2 and 3: forced 18/18 metrics, with-skills 18/18 on run 3; no-skills fails pkce, id-token claims, issuer binding and token exposure |
| twelve-factor | A | max | 4 | 4 cases on a sessions service that reads process.env wherever it likes; run 1: no-skills ~24/33 → forced ~26/33 (environment-name branches and deep process.env reads left in place, no .env.example, a logger with a fixed level and no correlation id); edits: a config module moves every env read in the same change and the sweep is grepped, an environment-name branch becomes a named setting and is deleted, .env.example ships with the config module, configurable log threshold, a logging change ships the request id (stated at the top of the Logs factor); graders: an injected signal source counts, a stream chosen by computed access counts; run 2: forced 32/33 → runs 3 and 4: forced 33/33; with-skills 27–30/33 (tdd routes first on some cases), no-skills 22–25/33 |
| observability | A | improved | 4 | 4 cases on a checkout service with console.log noise; run 1: allowlist, semconv, label and alerting rules pass in every arm; forced misses: the canonical event lost on the exception path, console calls left in the touched file, a home-made x-trace-id instead of W3C traceparent; edits: exception-path construction rule (one exit, proved by a throw), console removal scoped to the file, inject trace context on outbound calls, correlation phrasings in the description plus a routing case; harness: hidden tests run under their own vitest config because an agent setup file registered a global tracer provider; graders: a handler passed beside a route is not a label value, string literals blanked; runs 2–5: forced 19–20/20 (the exception-path event still slips in 2 of 5 runs), with-skills 18–20/20, no-skills 17–20/20 — the suite discriminates weakly because a capable model delivers most of these rules once the README names OpenTelemetry; open item: sharpen the cases toward rules the no-skills arm misses consistently (error-trace retention under sampling, an error-budget policy, redaction at source) |
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
| 4 | `skill-evals-batch-4` | [#258](https://github.com/citypaul/.dotfiles/pull/258) | api-design, cli-design, bff-entry-points, secure-oauth-oidc, twelve-factor, observability | forced arm at max for five (each confirmed twice); observability 19–20/20 with weak discrimination, open item; PR open |
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
