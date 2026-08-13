# When to Model with a State Machine

State machines are not a library choice; they are a decision to make behavior explicit. This reference gives the decision rules: when finite states earn their cost, when a store or a discriminated union is the honest tool, and what belongs in finite state versus context.

## Why This Skill Defaults to Modeling Front-End Flows

In AI-assisted development the statechart's classic benefits compound:

- **Headless testability.** A machine is a pure behavior contract: events in, snapshot out. An agent proves flow logic correct with fast unit tests before any UI exists — no browser, no mocking framework, no component harness. `xstate/graph` can generate paths through every transition, covering sequences a human wouldn't think to write.
- **Impossible states are unrepresentable.** Finite states plus guarded transitions delete the boolean-flag bug class (`isLoading && isError`, the FaceTime bug's audio-before-accept). The model *forbids* drift instead of relying on discipline across scattered handlers.
- **The whole behavior surface is one reviewable artifact.** Logic lives in a single declarative structure rather than distributed across event handlers, so reviewers — human or agent — reason about every state × event combination at once. Harel: with 3 states and 5 events, implicit handling means 15 combinations in your head; explicit modeling means 5 written transitions.
- **Humans get the diagram for free.** Stately Studio and the inspector render exactly the machine that ships. Review becomes "look at the chart", a materially better verification loop than reading handler diffs.

So for front-end **flow logic** — wizards, checkout, auth, upload, undoable editors, anything with modes, sequencing, cancellation, timeouts, or retries — reach for a statechart *by default*. The ladder below is the floor that keeps trivial state honest, not a reason to hesitate on real flows.

## Two Overrides That Come Before the Ladder

The ladder below ranks options by *apparent complexity*. Apparent complexity is exactly what misleads on the most common misclassification, so resolve both of these first.

### Override 1: two lifetime tests, never appearance

A `submitting` flag renders as a disabled button; that tells you nothing. Two tests decide ownership, and both must come back empty before state stays in React.

**Test 1 — did an external answer change it?** A network response, timer, another actor, or the platform makes state temporal whatever it looks like on screen. **A disabled button or a spinner is the presentation *of* temporal state, not presentation state.** This catches requests, responses, errors, retries, timeouts, cancellation, stream messages, and anything sent to a BFF or server.

**Test 2 — does the interaction have an interruptible middle?** Direct user input still creates a lifecycle when a phase sits between start and end that something can interrupt, cancel, or must dispose: a drag holding pointer capture that cancels on Escape and releases on unmount; a panel with a closing animation; a gesture binding document listeners it must unbind.

**React owns the value only when both come back empty** — one event sets it completely, no phase to interrupt, nothing to dispose. A toolbar toggle, a controlled input's text, hover, a focus flag, a plain open/closed disclosure.

| Example | Test 1 | Test 2 | Owner |
|---------|--------|--------|-------|
| `submitting` around a command | Yes | — | Machine |
| Spinner visibility | Yes | — | Machine |
| Canvas node drag | No | Yes | Machine |
| Panel with a closing animation | No | Yes | Machine |
| Toolbar open/closed | No | No | React |
| Controlled input text | No | No | React |

Test 2 is the one most often missed: a drag is user-driven, so test 1 alone would wrongly file it in React. Domain interaction with real rules — canvas or editor edits, linking nodes, permission-gated actions — generally trips one test or the other.

### Override 2: an existing owner ends the discussion

**The ladder answers a greenfield question.** If an actor already owns the lifecycle a piece of state belongs to, that state goes in the actor, and the ladder does not reopen it.

A submission flag sitting beside a machine that already dispatches the command, models its failure, and owns the retry policy is not a fresh rung-1 decision — it is one state that escaped its machine. Splitting a single lifecycle between a machine and a component's `useState` creates two sources of truth for one fact, which is precisely the bug class the machine was adopted to delete.

Search the feature for an existing machine, actor, or `createActorContext` provider before adding flow state to a component.

The same override applies across entity kinds. If a machine already models this lifecycle for a *sibling kind of thing* — the add/edit/delete shape is usually identical for every kind a surface manages — the answer is to generalize that machine so the kind becomes context or input, not to author a per-kind copy whose states repeat it. Copied states drift apart exactly the way split state does; the machine that already exists is the owner, ungeneralized.

## The Complexity Ladder

Stop at the first rung that genuinely holds — but apply both overrides above first, and read the signals table below; flow logic almost always climbs past rung 2.

1. **Component-local value** — a controlled input, a toggle with no consequences. `useState`. An 80-line machine wrapping a modal boolean is the canonical over-modeling failure. "No consequences" means no I/O, no sequencing, nothing outside the component can change it, and no interruptible middle — one event sets the value completely. A value written inside a promise callback, or an interaction that must dispose a listener or timer, has already failed this rung.
2. **Data-shaped shared state** — no meaningful modes, no orchestration, every event just writes data. Use `@xstate/store` (~1–2 kB): event-driven, typed, pure transitions, `emits` for side-channel events. Its event vocabulary is deliberately machine-compatible, so upgrading later is mechanical (see the migration path below).
3. **Request state** — one async call with `idle | pending | resolved | rejected`. A discriminated union + reducer suffices *when that is truly all there is*; the moment retry, cancellation, timeout, debounce, or "refetch while showing stale data" appears, it is a flow — rung 4. This rung is void when override 2 applies: if an actor already owns this command's lifecycle, the request state belongs to it, not to a second local union. And "all there is" must be checked against the code that will exist, not the first line written — a double-submit guard or an error cleared before retrying is retry-and-cancellation logic arriving in disguise.
4. **Flow logic** — modes exist; events must be ignored or behave differently by mode; there are sequences, deadlines, or impossible combinations to exclude. **Model it as a machine.**
5. **Multiple communicating flows** — several independent sources of state/events (auth, router, notifications, uploads) that coordinate. An actor system: parent machines invoking/spawning children, `systemId` for app-level registration. "Your front-end app is always a distributed system" (Stately).

## Signals That Flags Have Become an Implicit Machine

Any one of these means the state machine already exists — it is just scattered and unverified. Read this table while *writing*, not only while reviewing: the first four rows fire on code an agent produces by reflex, before any of it looks like a flow.

| Signal | Why it condemns the flags |
|--------|---------------------------|
| A `submitting`/`saving`/`inFlight` boolean set around an `await` | The two states are already there; only the guarantees are missing |
| A promise chain that sets state in sequence — flag on, call, flag off, error set | Entry actions of success and failure states, written by hand |
| A double-submit guard — an early return while a flag holds | A transition the model would simply not define |
| An error cleared immediately before a retry | A `retrying` transition re-entering the invoking state |
| Two booleans that can contradict (`isLoading && isError`) | n booleans = 2^n combinations; only a handful are valid. Kent C. Dodds: "Use a state machine or an enum. Not a boolean." |
| Event handlers that check flags before acting | The handler is making mode decisions the model should make. statecharts.dev: the handler should *inform* the chart, not decide |
| An action that must be a no-op sometimes (`FETCH` while already loading) | Redux Style Guide "treat reducers as state machines": validity of an action depends on current state |
| Bugs from things happening in the wrong order | The FaceTime eavesdropping bug — a transition an explicit model would make unrepresentable |
| A `status` string that guards keep re-deriving from other fields | The finite state is present but denormalized |
| useEffect chains that fire on flag combinations to trigger the "next step" | A wizard trying to escape from effects — the transitions want to be declared |

## Finite State vs Context (Extended State)

The split that makes or breaks a machine design:

- **Finite state** = *mode*: enumerable, gates which events are legal, excludes impossible combinations. If events behave differently depending on it, or some events must be impossible while it holds, it is a state.
- **Context** = *data*: unbounded values the modes operate on — form values, fetched payloads, counters, error details. Matt Pocock: "You should be keeping most of your state in context… Use states when you want to express your logic visually, or gate events to certain states."
- **Promotion rule**: the moment a context field starts gating events through guards everywhere, it was a state all along — promote it. Conversely, a state per possible value of a number is a context field wearing a costume.
- Context must stay **JSON-serializable data** (persistence, inspection, and the visual editor all assume it): no class instances, DOM nodes, promises, or functions. Store IDs and rehydrate; keep rich objects outside the machine. Spawned `ActorRef`s in context are the sanctioned exception.

## When NOT to Use a Machine

- **Not enumerable** — if you cannot list the states and the events, it is not a finite-state problem (Kyle Shevlin's enumerability test).
- **Machine-as-reducer** — every event does the same thing regardless of current state; all transitions are unconditional `assign`s. That is a store with ceremony; use `@xstate/store` (Matt Pocock's negative test).
- **A status enum already suffices** — a single discriminated union field consumed in one place, with no sequencing or effects to orchestrate.
- **The cost is real**: xstate core is ~13 kB gzipped (fine app-wide, heavy per-widget), and the team must be able to read statecharts. `@xstate/store` covers the small end at ~1–2 kB.

## Store → Machine Migration Path

Both are event-driven, so the upgrade when a store slice grows modes is mechanical:

1. Event handlers become `assign()` actions on same-named events under `setup()`.
2. `enqueue.effect` calls become invoked/spawned actors (or `enqueueActions`).
3. `emits` maps directly to the `emit()` action + `types.emitted`.
4. Or skip the rewrite: `fromStore()` wraps a store definition as actor logic, so a machine can invoke/spawn the existing store as-is while you migrate incrementally.

The reverse tell — a machine that should be demoted — is one where the states have collapsed to one or two and all value lives in `assign` calls.

## Where Machines Live in a Codebase

**Check the repository before applying any default here.** Architecture or boundary tests, import/lint rules, an established `machine`/`actor` directory convention, `CLAUDE.md`, or the project's own layout guidance all outrank this section — a correct machine in a layer the repository forbids still fails the build, and finding that out from CI costs a round trip. `structure-codebase` owns the general question of which layer owns what.

Absent a repository rule, colocate the machine with the feature it drives: `feature/checkoutMachine.ts` beside the components that render it — a machine *is* feature logic. Large machines may become a folder (`checkout/machine/` with the `setup()` assembly plus actions/actors/guards modules). Avoid a global `machines/` dumping ground for the same reason a global `utils/` fails — it hides feature boundaries. One machine per *flow* (checkout, auth, upload), never per component, never per entity kind when the flows differ only in the kind of thing they manage, and never one app-god-machine; cross-flow coordination is an actor-system concern (`references/actors-and-systems.md`).
