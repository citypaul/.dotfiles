# Testing State Machines

A machine's public API is events in, observable results out: snapshots (`value`, `context`, `status`, `output`), emitted events, and the effects of provided implementations. Test through that API exclusively. This is what makes statecharts the AI-friendly modeling choice — the whole flow is provable in fast, headless unit tests before a component exists.

## The Layered Split

- **Machine unit tests** own the flow logic: every mode, guard branch, error path, timeout, and retry — exhaustively, headlessly, in milliseconds. Here `snapshot.matches(...)` is *not* an implementation detail: the snapshot is the machine module's contract, exactly as a reducer's return value is its contract.
- **Component tests** own rendering and wiring: the component shows what the snapshot says and sends the right events on interaction. Assert **DOM only** (Vitest Browser Mode / Testing Library); never reach into `actorRef.getSnapshot()` from a component test — at that layer, "the machine reached state X" *is* private wiring.
- Don't duplicate every machine case at the DOM level; a few wiring paths suffice once the machine suite covers the logic.

Prefer `snapshot.matches({ form: 'submitting' })` and `hasTag('busy')` over string equality on `snapshot.value` — they survive state-tree refactors, and tags decouple assertions from state names.

## The Canonical Machine Test

```ts
const createFetchMachine = ({ fetchUser = async () => userStub }: Overrides = {}) =>
  fetchMachine.provide({
    actors: { fetchUser: fromPromise(fetchUser) },
  });

test('a failed fetch surfaces the error and allows retry', async () => {
  const actor = createActor(
    createFetchMachine({ fetchUser: async () => { throw new Error('boom'); } }),
    { input: { userId: 'u1' } },
  ).start();

  actor.send({ type: 'fetch' });
  const failed = await waitFor(actor, (s) => s.matches('failure'));
  expect(failed.context.error).toBe('boom');

  actor.send({ type: 'retry' });
  expect(actor.getSnapshot().matches('loading')).toBe(true);
});
```

The pieces:

- **`machine.provide({ actors, actions, guards, delays })` is the test seam.** Production wires real implementations in `setup()`; tests substitute stubs without touching the config. A factory function wrapping `provide` (as above) is this repo's factory pattern applied to machines. No module mocking, ever.
- **`waitFor(actor, predicate, { timeout })`** for async settling (default timeout is Infinity — pass one). **`toPromise(actor)`** resolves with the machine's final `output` — the one-liner for testing flows that complete.
- **Error paths**: provide a rejecting `fromPromise` and assert the `onError` route and captured `event.error` — as first-class as the happy path.
- **Emitted events**: subscribe with `actor.on('type', handler)` *before* `start()`, assert the handler's payloads. Emitted events are designed to be the observable output for "the machine told the outside world X" — prefer them over spying on action internals.
- **Never assert on transient `always` states** — they emit no snapshot; a test that wants to see one is asserting a microstep. If the intermediate state matters, model it observably (`after: { 0: ... }`).

## Delays

Named delays + a controlled clock — never real waiting:

```ts
const clock = new SimulatedClock();
const actor = createActor(machine, { clock }).start();
clock.increment(30_000);
expect(actor.getSnapshot().matches('timedOut')).toBe(true);
```

`SimulatedClock` (exported from `xstate`) is per-actor and needs no global patching; `vi.useFakeTimers()` + `advanceTimersByTime` also works and additionally covers non-XState timers in the same test. For "this timeout exists but its length is irrelevant", override it: `machine.provide({ delays: { idleTimeout: 0 } })`.

## Pure Transition Testing

For guard-heavy branching, skip the actor entirely — `transition` is a pure function that returns the next snapshot plus the actions it *would* execute, without running them:

```ts
import { transition, initialTransition } from 'xstate';

const [initial] = initialTransition(machine, input); // input passed directly — unlike createActor(machine, { input })
const [next, actions] = transition(machine, initial, { type: 'submit' });
expect(next.matches('validating')).toBe(true);
```

No timers, no effects, fully deterministic — ideal for table-driven guard tests, and exactly the shape mutation testing rewards. `getMicrosteps` exposes transient states when you truly must characterize them.

## Model-Based Testing (`xstate/graph`)

Since xstate 5.20 the model-based utilities live in the core package at the **`xstate/graph`** subpath. `@xstate/test` is deprecated — never install it (its docs and old blog posts describe the v4 API; translate `createModel` → `createTestModel`).

```ts
import { createTestModel } from 'xstate/graph';

const model = createTestModel(wizardModel);
for (const path of model.getShortestPaths()) {
  it(path.description, async () => {
    await path.test({
      states: { review: () => expect(screen.getByText(/review/i)).toBeVisible() },
      events: { next: () => user.click(screen.getByRole('button', { name: /next/i })) },
    });
  });
}
```

- The model is **not** the production machine: it is a simplified, effect-free machine encoding expected *user-visible* behavior; the executors drive the real UI and the state callbacks assert the real DOM. Running the production machine against itself proves nothing.
- Worth it for combinatorial flows (wizards with back/skip, retry loops) where hand-writing every ordering is impractical — it finds sneak paths humans don't write. Not worth it for small machines, where a few example tests are clearer and failures are easier to read.
- Costs to manage: generated test names, suite-size explosion (`getShortestPaths` before `getSimplePaths`), and guard-dependent branching needs `filterEvents` (5.30+) / `serializeState` tuning.

## Testing Components That Use Machines

Two injection seams, both avoiding module mocks:

1. The component takes the machine (or actor ref) as a prop — tests pass `machine.provide({...})`.
2. `createActorContext`: the Provider's `logic` prop — `<Ctx.Provider logic={machine.provide({ actors: { loadItems: fromPromise(async () => stub) } })}>`.

Then interact and assert through the DOM per `react-testing`/`front-end-testing` (Vitest Browser Mode preferred): click, type, `await expect(locator).toBeVisible()`. StrictMode note: component tests exercising invoke-on-mount must tolerate the dev double-mount — which is a feature, since it catches missing `fromCallback` cleanups.

## Persistence Round-Trips

If snapshots are persisted, test the round-trip as behavior — and make the test cross the **real storage boundary**, because some restoration defects (e.g. history breakage, statelyai/xstate#5178) only appear after serialization, not on an in-memory snapshot:

```ts
const stored = JSON.parse(JSON.stringify(actorA.getPersistedSnapshot()));
const snapshot = persistedSnapshotSchema.parse(stored);
const restored = createActor(machine, { snapshot }).start();
// assert restored actor continues the flow correctly
```

Remember restored invocations **re-fire** (stub accordingly) while actions do not re-run. Add behavior-specific regressions where the flow depends on them: restore *during an active `after` delay* (timers are not restored — statelyai/xstate#5331) and restore *before re-entering through a history state* (#5178). If snapshots survive releases, keep a characterisation test restoring a fixture snapshot from the previous release — there is no built-in versioning.

`machine.resolveState({ value, context })` fabricates a snapshot to start a test deep in a flow without replaying events — a pragmatic arrange step; note it bypasses children/history fidelity.

## What Kills Mutants

Machine suites earn their mutation score from: asserting context values (not just state names) after each transition; covering every guard's boundary in both directions (pure `transition` tables shine here); asserting events are *ignored* where the model says they must be (`send` then assert unchanged snapshot); and error-path assertions on `event.error` content. A suite that only walks the happy path through `matches()` calls will let guard and assign mutants live.
