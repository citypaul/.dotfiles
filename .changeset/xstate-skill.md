---
"@citypaul/dotfiles": minor
---

Add the xstate skill and register it everywhere it has to be registered

Models front-end flow logic as XState v5 statecharts and actors. Prefers
statecharts by default for wizards, checkout/auth/upload flows, and async
orchestration with retries and timeouts on AI-assisted-development grounds:
machines are headlessly provable before any UI exists, impossible states become
unrepresentable, the whole behavior surface is one reviewable artifact, and
humans get the Stately diagram for free.

Six deep-dive references: the when-to-model complexity ladder (useState →
@xstate/store → discriminated union → machine → actor system) with flag-smell
signals and the finite-state vs context split; event-first machine design with
naming conventions, v5 transition/re-entry semantics, and an anti-pattern
catalog; actors and systems (invoke vs spawn, spawn hygiene, systemId
receptionist, persistence semantics, inspection); @xstate/react integration
(hook selection, createActorContext, StrictMode, @xstate/store tier);
behavior-driven machine testing (provide() as the seam, SimulatedClock, pure
transition, model-based paths via xstate/graph, mutation-score guidance); and
the setup() typing model with the full v4→v5 migration table.

The skill is now aimed at the failure that actually happens. Field review of a
production actor-based front end found a `submitting` flag left in component
`useState` — classified as presentational because it rendered as a disabled
button, while an existing actor already owned that command's lifecycle,
retries and errors. Six changes address it:

- **It fires before XState is chosen.** A write-time smell list triggers on
  ordinary React: a `submitting`/`isLoading` `useState`, a promise chain
  setting state in sequence, a double-submit guard, an error cleared before a
  retry, a `useEffect` sequencing the next step or needing an ignore flag in its
  cleanup, a timer something must clear, a gesture handler binding document
  listeners it must unbind, or handling for a response arriving after cancel or
  unmount. Any one is the entry point, however small the request, and whether or
  not the file imports `xstate`. A skill that only loads inside machine files
  can never catch the decision to hand-roll one.
- **Two lifetime tests, never appearance.** Test 1: did an external answer
  change it — server, BFF, socket, timer, another actor? Test 2: does the
  interaction have an interruptible middle — a drag holding pointer capture
  that cancels on Escape, a panel with a closing animation, a gesture binding
  document listeners it must unbind? A disabled button or spinner is the
  presentation *of* temporal state. State stays in React only when both come
  back empty: one event sets it completely, nothing to interrupt or dispose.
  Test 2 matters because a drag is user-driven, so an external-cause test alone
  misfiles it.
- **State the verdict, ask on genuine ties.** Run both tests over every
  `useState` and report the call in one line so the user can overrule it. Where
  it is genuinely close, name the state and the phase that makes it a lifecycle
  and put the choice to the user before building.
- **Criteria for when a new machine is justified** — a distinct unit of
  functionality with its own inputs and outputs, typically its own connection,
  resource, or authority. The question to answer out loud is not "does this
  deserve a machine?" but "why does this not belong to the machine that already
  owns this edge?"
- **An existing owner ends the ladder discussion.** The complexity ladder
  answers a greenfield question; when an actor already owns the lifecycle, the
  state goes in it. Rungs 1 and 3 no longer read as permission to hand-roll.
- **Step zero checks who owns machines here.** Repository architecture tests,
  import rules, and conventions outrank the skill's colocation default; a
  correct machine in a forbidden layer still fails CI.

Anti-patterns now lead with under-modeling rather than over-modeling, matching
how agents actually fail, and a violation-sweep procedure covers finding the
same mistake across a feature. A Mermaid `stateDiagram-v2` render is
regenerated from the final definition whenever a machine is designed or
changed, not just when asked for, because a committed diagram the code has
moved past is worse than none.

Registration completes the skill: it was previously reachable only as a
`panel-review` lens and shipped to nobody. It is now selected by
`install-claude.sh`, routed from `CLAUDE.md` (which carries the classify-by-cause
rule directly, so it applies even when the skill is not loaded), catalogued in
the README, and documented in `skills/REFERENCES.md`. `structure-codebase` now
owns declaring which layer may hold machines, and `react-testing` points at
`xstate` when a component holds a flow flag. A new test guard fails the build
when any first-party skill directory exists without being selected by the
installer.

Grounded in primary sources (Harel 1987, statecharts.dev, Stately v5 docs
verified against xstate 5.32.x and the npm registry, SCXML, Khourshid, Dodds,
Pocock, Shevlin, Redux Style Guide).

Adam Bulmer fixed the same trigger inversion upstream on the same day, from the
same incident (mintuz/skills PR #47). His merged version contributed the second
lifetime test, the precise negative test, the "presentation *of* temporal state"
phrasing, four further smells (ignore-flag cleanup, timers something must clear,
document listeners needing unbinding, responses arriving after cancel or
unmount), the verdict-and-ask-on-ties rule, and the named ownership-guard tools.
His practitioner review supplied the new-machine criteria, and his diagram
policy — regenerate on every machine change rather than on request — is matched
here. No content vendored; full attribution in `skills/REFERENCES.md`.
