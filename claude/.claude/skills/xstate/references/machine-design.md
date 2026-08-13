# Machine Design

How to model a statechart well in XState v5: the modeling workflow, naming, state-node types, transition semantics, actions, guards, delays — and the smells that mean the model is wrong.

All examples assume `setup()` (see `typescript-and-migration.md` for why typegen is dead and `setup()` replaced it).

## Modeling Workflow: Events First, Then Modes

1. **List the events** the outside world can produce — user intents, actor results, timeouts. Events are the vocabulary; get them before drawing any state.
2. **Discover the modes**: group by "when does the same event mean something different, or nothing at all?" Those differences are your top-level states (statecharts.dev: "Start by discovering the modes of the component in question").
3. **Wire transitions** — for each state, which events are handled, which are deliberately ignored.
4. **Refine with hierarchy**: cluster states that share transitions under a parent (one parent-level handler replaces N identical ones); split independent concerns into parallel regions instead of multiplying states.
5. **Push effects to the edges**: side effects become named actions and invoked/spawned actors declared in `setup()`, so the model stays a pure, reviewable description.

Scope one machine to one *flow* (checkout, auth, upload) — statecharts.dev: model "the behaviour of each component in isolation". Cross-flow coordination is an actor-system concern, not a bigger machine.

## Naming

From Stately's own conventions ("State Machines — What's in a name?"):

| Thing | Form | Examples |
|-------|------|----------|
| States | nouns/adjectives (gerunds for in-progress modes) | `idle`, `authenticated`, `submitting` |
| Events | verbs, **`dot.case` namespaced** | `feedback.good`, `battery.inserted`, `submit` |
| Actions | verb phrases | `notifySuccess`, `trackPageview` |
| Guards | boolean-variable style | `isValid`, `hasRetriesLeft` |
| Invoked actors | noun/gerund of the work | `fetchUser`, `userAuthentication` |

Dot-namespacing events is not cosmetic — it enables partial-wildcard handlers (`'feedback.*'`). Whatever tense you pick for events, be consistent across the machine.

## State-Node Types

- **Atomic / compound** — compound states require `initial`. Use nesting when substates only make sense inside the parent (`valid`/`invalid` only under `changed`), and to cluster shared handlers: an event handled on the parent applies to every child unless a child overrides it (child handlers win) or explicitly blocks it with a **forbidden transition** `'event': {}`.
- **Parallel** (`type: 'parallel'`) — the answer to state explosion: k independent boolean aspects need 2^k flat states but only k additive regions. Every region is active at once; events reach all regions; the snapshot value becomes an object (`{ upload: 'busy', network: 'online' }`); `onDone` fires when *all* regions reach final states. Coordinate across regions with `guard: stateIn('#id')` — sparingly; heavy `stateIn` usage means the regions were not independent.
- **Final** (`type: 'final'`) — no transitions out. A child final state triggers the parent's `onDone`; a *top-level* final state terminates the whole actor (children stopped, cleanup run) and resolves the machine's `output`. Do not confuse state-level `onDone` (child reached final) with `invoke.onDone` (invoked actor completed). Known defect as of 5.32.x: a final child of a parallel region can still be transitioned out of (statelyai/xstate#5460) — if a flow relies on parallel-region finality, pin the intended behavior with a regression test.
- **History** (`type: 'history'`, `history: 'shallow' | 'deep'`) — re-entering resumes where you left off; give it a `target` as the no-history default. The pause/resume and "return from settings" pattern.

## Transition Semantics You Must Know

- **Selection**: per active branch, deepest state first — the first enabled transition wins for that branch, bubbling to ancestors otherwise. In parallel states every active region selects independently, so one event can legitimately take several non-conflicting transitions in the same microstep (conflicts resolve in favor of the deeper/earlier source — the SCXML optimal-transition-set rules). Unhandled events are silently dropped (add a `'*'` handler where that is a bug — v5 has no strict mode).
- **Guard fall-through**: a failed guard doesn't consume the event — later transitions in the array and ancestor handlers are still tried. Order guarded transitions most-specific first with an unguarded fallback last.
- **All transitions are internal by default** (v5). The three self-transition flavors:
  - *targetless* (`actions` only, no `target`) — children preserved, no entry/exit, invocations untouched. Use for "update context, stay put".
  - *targeted self* (`target: 'sameState'`) — children reset to initial, entry/exit **not** re-run.
  - *`reenter: true`* — exit/entry re-run and invoked actors **restarted**. The common mistake is adding `target` on a parent self-transition when you only wanted actions — omit `target` entirely.
- **Eventless (`always`)** — evaluated after every transition and context change. An unguarded `always` targeting a *different* state is a canonical, safe pass-through; the infinite-loop shapes are targetless unguarded `always`, cycles, and guards that stay true while only actions run. Transient pass-through states **emit no snapshot** to subscribers; if the intermediate state must be observable (UI or tests), use `after: { 0: ... }` instead.
- **Wildcards** — `'*'` is lowest priority; partial wildcards need the full trailing segment (`'mouse.*'` valid; `'mouse*'`, `'*.click'` invalid).

## Actions

Built-in action creators are **declarative — they return action objects**. Calling `assign()` inside a custom function body does nothing:

```ts
// WRONG — no-op
entry: ({ context }) => { assign({ count: context.count + 1 }); }
// RIGHT
entry: assign({ count: ({ context }) => context.count + 1 })
```

- `assign` — the only way context changes; never mutate. Object assigner per-key or function assigner returning a partial.
- `raise` (to self, FIFO before external events), `sendTo(targetRefOrId, event)` (prefer over `sendParent`, which couples a child to a parent's shape — pass the parent ref via `input` instead), `emit` (outward to `actor.on()` listeners — the machine's outbound event API), `log`, `cancel(id)` (cancels a delayed raise/sendTo), `stopChild(id)` (pair with `assign({ ref: undefined })` — stopping does not clean context).
- `enqueueActions(({ enqueue, check }) => { ... })` replaces v4 `pure()`/`choose()` for conditional/composed action lists; must stay synchronous.
- **Parameterize shared actions and guards**: `{ type: 'notify', params: ({ context }) => ({ message: context.error }) }` with implementation `(args, params) => ...`. Implementations then depend only on their params type — reusable and independently testable.
- **Ordering**: exit (deepest first) → transition actions → entry. Entry/exit actions see the *union* event type — narrow with `assertEvent`.

Keep actions thin: fire-and-forget effects only. Anything with a result, a lifetime, or a failure mode is an actor (`actors-and-systems.md`).

## Guards

Pure, synchronous, boolean, side-effect-free. Named in `setup({ guards })`, combined with `and([...])` / `or([...])` / `not(...)`, parameterized like actions, `stateIn()` for cross-region checks. Never hide a state in a guard: when several transitions on one event carry mutually exclusive guards over the same context field, that field is a finite state trying to get out.

## Delays

`after: { RETRY_TIMEOUT: { target: 'retrying' } }` with the delay named in `setup({ delays })` — named delays are overridable in tests via `machine.provide({ delays })` and readable in the chart. Delays may be dynamic (`({ context }) => context.attempt * 1000`). Timers cancel automatically on state exit — timeout-and-cancel logic you never have to write. Delayed `raise`/`sendTo` take `{ delay, id }` and are cancelable with `cancel(id)`.

## Anti-Pattern Catalog

| Smell | Diagnosis | Fix |
|-------|-----------|-----|
| God machine modeling the whole app | Flows forced into one chart | One machine per flow; actor system for coordination |
| Context as dumping ground, 1–2 states | Machine-as-reducer (Pocock's tell: every event does the same thing in every state) | Demote to `@xstate/store` |
| Boolean flags accumulating in context, gating behavior via guards | Hidden finite states | Promote to explicit states |
| One event, five guarded transitions on the same field | Same as above | Promote the field to states |
| Mirroring every keystroke into machine context | Form *values* in the flow machine | Keep field values in the form layer; machine holds flow state only |
| Class instances / promises / DOM nodes in context | Breaks persistence, inspection, and the visual editor | IDs + rehydration; rich objects live outside |
| `reenter: true` sprinkled to "fix" behavior | Misunderstood internal-by-default semantics | Re-read the self-transition table above |
| Effects in entry actions with results the machine needs | Untestable, unobservable side channel | Invoke an actor; consume `onDone`/`onError` |
| `always` used for observable steps | Invisible to subscribers and tests | `after: { 0: ... }` |
| One transition per component concern, states named after UI | Chart mirrors the view tree, not behavior | Re-derive modes from events (workflow above) |
