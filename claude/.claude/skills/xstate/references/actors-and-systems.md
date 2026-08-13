# Actors and Systems

XState v5 is actor-based: a running machine is an actor, and everything with a lifetime, a result, or a failure mode — fetches, subscriptions, WebSockets, child flows — is modeled as an actor rather than an effect smuggled into an action. This reference covers actor logic types, invoke vs spawn, communication, app-level systems, persistence, and inspection.

## Actor Logic Creators

`invoke.src` and `spawn` accept machine logic or one of these creators:

| Creator | Receives events | Sends to parent | Output | Use for |
|---|---|---|---|---|
| `fromPromise(async ({ input, signal }) => value)` | no | no | resolved value | one-shot async work; `signal` aborts on stop |
| `fromCallback(({ sendBack, receive, input }) => cleanup)` | yes | yes | no | subscriptions, WebSockets, intervals — v4 "activities" live here; must return a cleanup fn, must not be async |
| `fromObservable(({ input }) => obs$)` | no | no | no | value streams; snapshot = latest emission |
| `fromEventObservable(({ input }) => eventObs$)` | no | each emitted event goes to parent | no | event streams straight into the parent |
| `fromTransition((state, event) => state, initial)` | yes | no | no | reducer-shaped child state |
| a machine | yes | yes | final-state `output` | full child flows |

`createActor(logic, { input, snapshot, systemId, inspect })` runs any of these standalone (replaces v4 `interpret()`). Data goes **in via `input`** (never a closed-over variable), comes **out via `output`** (final state), **snapshots** (`subscribe`/`getSnapshot`), and **emitted events** (`emit()` + `actor.on('type', handler)` — the outbound API that lets listeners react without being the parent).

## Invoke vs Spawn

- **`invoke`** — the actor's lifetime *is* the state: started on entry, stopped on exit (a state entered and exited within one microstep never starts it; a promise resolving after exit is discarded). Declare in `setup({ actors })`, reference by name, wire `onDone` (`event.output`), `onError` (`event.error`), `onSnapshot`. This is the default choice: self-cancelling fetches, per-state subscriptions, child flows scoped to a mode.
- **`spawn`** — dynamic counts or lifetimes spanning states: a list of upload actors, a notification per toast. Prefer the `spawnChild(logic, { id, input })` action when nothing needs the ref; use `assign({ ref: ({ spawn }) => spawn(logic, { id, input }) })` when the parent must talk to the child. Spawn **only** inside `assign`/`spawnChild` — never in custom action bodies.

**Spawn hygiene** (the leak class): children live until explicitly stopped or the parent stops. Spawning per event without `stopChild` leaks actors and subscriptions; `stopChild(id)` does *not* clear the context ref — pair it with `assign({ ref: undefined })`. Prefer parent-scoped lifetimes (children die with the parent) over manual bookkeeping wherever possible.

## Communication Rules

- Parent → child: `sendTo('childId', event)` or `sendTo(({ context }) => context.ref, event)`.
- Child → parent: prefer receiving the parent ref via `input` and using `sendTo` over `sendParent` — `sendParent` hard-couples the child to having a parent of a given shape, which also breaks standalone testing.
- Sibling → sibling: through the parent, or via the system receptionist below. Actors share nothing; all coordination is events and observed snapshots.
- Machine → outside world: `emit()` + `actor.on(...)`, typed by `types.emitted`. Emitted events go *out* to listeners; `send` goes *in* to transitions.

## App-Level Actor Systems

Every root `createActor().start()` implicitly creates a **system**. Register well-known actors with `systemId` (on `createActor`, `invoke`, or spawn options) and reach them from anywhere in the tree: `sendTo(({ system }) => system.get('notifier'), { type: 'toast.show' })` — the receptionist pattern, replacing prop-drilling of refs.

The scale-up architecture ("actors all the way down"): one root actor started at app boot, spawning a child per domain — auth, router, notifications, sync. Each domain machine stays flow-sized; the root only supervises. In React the root lives in module scope **only for client-only apps** — in SSR or any multi-tenant runtime a module-scope actor is shared across requests and leaks user state; there, create one root per request/app instance and provide it via context. Components subscribe with `useSelector`. Duplicate `systemId`s collide — treat them as global names. Only the root actor may be stopped directly; stopping it tears down the whole system.

XState needs no framework: the same actor system runs in Node, and persisted snapshots make long-running backend flows *modelable* — but XState supplies only the state-machine mechanics. Durable workflow execution additionally needs external storage transactions, concurrency control/locking, idempotent side effects, and durable scheduling; see the persistence caveats below before treating a machine as a workflow engine.

## Persistence

- `actor.getPersistedSnapshot()` — JSON-serializable internal state, **deep**: invoked and spawned children are included recursively. (`getSnapshot()` is the last *emitted* value — not the thing to persist.)
- Restore: `createActor(logic, { snapshot: parsedAndValidated }).start()` — never raw `JSON.parse` output; see the trust-boundary bullet below.
- Semantics to plan around: **actions are not re-executed** on restore (assumed already run), but **invocations restart** — a machine restored into `loading` re-fires its invoke, so invoked actors must be safe to re-run. Context must be JSON-only.
- There is **no built-in snapshot versioning**: a snapshot saved under old machine logic may be incompatible with new logic. If you persist across releases, version the storage key or keep an upcast step — and keep a characterisation test that restores a fixture snapshot from the previous release.
- Open defects to design around as of 5.32.x: **active `after` timers are not restored** from a snapshot — a machine restored mid-delay can hang in that state (statelyai/xstate#5331; persist absolute deadlines or use an external durable timer) — and **history behavior breaks after a JSON round-trip** of the persisted snapshot (statelyai/xstate#5178). Catch these with round-trip tests that cross a real JSON serialization boundary plus the behavior-specific regressions in `testing.md` — an in-memory `getPersistedSnapshot()` → `createActor` test does not reproduce #5178.
- Validate before restoring: a snapshot read from storage is a trust boundary like any other input — schema-check it before passing it as the `snapshot` option, don't feed raw `JSON.parse` output in.
- `machine.resolveState({ value, context })` builds a synthetic snapshot from a state value — handy for tests and tools, but it bypasses children/history fidelity.
- Event-sourcing alternative: record events (via inspection) and replay them with `send` — more replay cost, less schema-compatibility risk, and actions *do* re-run.

## Inspection

`createActor(machine, { inspect })` observes the entire system from the root. Inspection events: `@xstate.actor` (lifecycle), `@xstate.event` (who sent what to whom), `@xstate.snapshot` (macrostep results), `@xstate.microstep` (the only way to observe transient `always` pass-throughs).

Live visual debugging with `@statelyai/inspect`:

```ts
const inspect = import.meta.env.DEV
  ? (await import('@statelyai/inspect')).createBrowserInspector().inspect
  : undefined;
createActor(machine, { inspect }).start();
```

The import and the `createBrowserInspector()` call must both sit inside the dev-only branch: the creator auto-starts and opens the inspector popup as a side effect, and a static import keeps the package in the production bundle.

Opens the Stately inspector with the live statechart, actor hierarchy, and a sequence diagram of inter-actor events — the human-review surface for what an agent built. `createWebSocketInspector`/`createSkyInspector` do the same for Node/backend actors. Gate the inspector to dev builds; options `filter`/`serialize` tame noisy systems. Stately Studio additionally round-trips machine code to an editable diagram — useful for design review, imperfect with heavily `setup()`-typed machines, so treat code as the source of truth and the diagram as the view.
