---
"@citypaul/dotfiles": minor
---

Skill evals batch 3: quality suites for five more skills, the fixes they drove, and the
tdd routing hub naming its companions

Batch 3 of the programme tracked in `evals/skills/COVERAGE.md`. Each of `xstate`,
`front-end-testing`, `react-testing`, `react-performance` and `event-sourcing` now has a
promptfoo quality suite built to the `AUTHORING.md` bar and proven against hand-written
references before its first agent run, with an independent verifier node refuting each
suite through up to three repair rounds. Where a real run then showed a grader marking
correct work down, the grader changed and the saved run was re-graded offline.

Highlights of what the graders check:

- `xstate` — the flow is a `setup().createMachine` with named implementations, the
  component is driven by an actor hook with no temporal `useState` left behind, effects
  are invoked actors with `onDone`/`onError`, events are named for what happened, no v4
  vocabulary, headless machine tests driven by events, a retry cooldown as a state-owned
  delay, cancellation as a state an event can leave, and a `stateDiagram-v2` render
  beside the machine whose states match it.
- `front-end-testing` — the lightest harness that proves the claim (a component-level
  claim never gets a Playwright journey; a journey claim never gets a DOM test), queries
  by role and label, no arbitrary waits, the network observed through MSW rather than a
  stubbed fetch or a mocked request module, the module under test never mocked, and a
  hand-back that names the harness and where its evidence stops.
- `react-testing` — role, label or visible-text queries even though every element
  carries a planted `data-testid`, `userEvent` over `fireEvent`, hooks through
  `renderHook`, no manual `act()` around interactions, the whole tree rendered rather
  than a mocked child, Browser Mode for a focus/clipping claim jsdom can only fake, and
  planted mutants caught.
- `react-performance` — a measurement before the first production edit and after the
  last, behaviour tests unchanged and green, one optimisation kind per diff, no `any`
  or shared mutation traded for speed, before/after numbers in the reply, and the
  fixture's own benchmark re-run over the committed harness and the agent's code so the
  number cannot be moved by editing the harness.
- `event-sourcing` — a pure decider, past-tense business events, state rebuilt by
  folding, optimistic concurrency on append, stored events never mutated, read models as
  projections, plus the four checklist rules no arm delivered on the first run: every
  stored event in an envelope separate from its payload, stored events validated by a
  tolerant reader before the fold, a versioning strategy before the first event ships,
  and a projection rebuildable from a checkpoint.

**What the evals caught, and what changed** (every edit anchored, verified by an
independent refuter node on Opus, and re-measured):

- `xstate` — 32/35 in both skill arms: every skill-loaded run drew a correct Mermaid
  chart and left it in the chat, because the skill commanded a render without naming a
  destination. Now the render is a file beside the machine, named in the reply, and the
  completion check asks for that path. 35/35 in both arms on two consecutive runs
  (no-skills 17–20/35).
- `front-end-testing` — 26–27/30 with the skill, level with no-skills: the reply never
  said where its evidence stopped, a journey spec re-walked a component claim, an
  ambiguous match was escaped by scoping to a CSS class, and one run module-mocked the
  app's own API wrapper to fake an error. Now every hand-back names the harness and its
  evidence boundary; one claim, one harness; ambiguity is resolved accessibly, never by
  class or id; and the MSW rule covers the app's own request module on error paths too.
  Forced arm 30/30 on runs 2 and 4; with-skills 30/30 when the skill routes.
- `react-testing` — 25/30 in both skill arms: a count line and a title span were found
  by their planted test id because the skill never said how to find an element with no
  role, and the child row was mocked when the request called it a dumb presenter
  because the skill's only shallow-rendering warning was about enzyme. Now role-less
  elements are found by their visible text and module-mocking a child is named as
  shallow rendering by another name. 30/30 in both arms on two consecutive runs
  (no-skills 21–22/30).
- `react-performance` — no skill edit needed: forced arm 20/20 on its first run, with
  no-skills at 17/20 (no measurement before the first edit; two optimisation kinds in
  one diff).
- `event-sourcing` — the first run scored 100% in every arm, no-skills included: once
  the repository declares the ledger event sourced a capable model writes a decider, a
  fold, an expected-version append and a projection unprompted, and the requests had
  explained the practice on top. The decider case is gone, the requests carry business
  facts instead of mechanism, and the suite now grades the four rules every arm had
  skipped. Reworked suite: no-skills 18–19/23, forced 23/23 on two consecutive runs,
  with-skills 20–22/23 — the skill needed no edit once the suite asked for what it
  actually mandates.
- `tdd` (routing) — the batch-2 routing gaps became routing cases: with tdd's
  description naming functional, refactoring, the declared architecture skills and now
  front-end-testing/react-testing as companions, data-shaping requests, "collapse the
  look-alikes", "tidy a module" and a browser bug report each route 3/3; tiered pricing
  rules remain a 1/3 partial.

Harness changes: a generic evidence builder merges offline re-grades over a saved run;
graders across the batch accept any identifier casing, inline or named return types,
function or arrow declarations, point-free validators and any file split, after the
verifier showed name-anchored scans marking correct solutions down.
