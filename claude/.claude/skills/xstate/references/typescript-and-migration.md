# TypeScript and Versions

## Version Facts (verified July 2026)

- **`xstate` 5.32.x is current and production-recommended.** v6 exists only as npm alphas with breaking type-level changes planned (typestates, `machine.withInput`, forbidding partial `assign`) — do not target it.
- `@xstate/react` v6 (React 16.8–19), `@xstate/store` v4 (framework bindings split into `@xstate/store-react` etc.), `@xstate/graph` merged into core as `xstate/graph` (≥ 5.20), `@xstate/test` deprecated.
- TypeScript minimums differ: xstate core ≥ 5.0, `@xstate/store` v4 ≥ 5.4 — both with `strictNullChecks` (this repo's strict mode covers it); `skipLibCheck: true` recommended by Stately.

## `setup()` Is the Typing Model

Typegen (v4's `tsTypes` codegen) is deprecated and unsupported in v5. All typing flows through `setup()`:

```ts
const machine = setup({
  types: {
    context: {} as { attempt: number; error: string | null },
    events: {} as { type: 'submit' } | { type: 'retry' },
    input: {} as { orderId: string },
    output: {} as { confirmationId: string },
    emitted: {} as { type: 'order.confirmed'; id: string },
    tags: {} as 'busy',
  },
  actors: { placeOrder: fromPromise(async ({ input }: { input: { orderId: string } }) => ({ id: '' })) },
  guards: { hasRetriesLeft: ({ context }) => context.attempt < 3 },
  actions: { recordError: assign({ error: ({ event }) => String(event) }) },
  delays: { retryBackoff: ({ context }) => context.attempt * 1000 },
}).createMachine({ /* string references below are now type-checked */ });
```

- The `{} as Type` idiom is type-only and erased at runtime — it is the sanctioned pattern here, not an unjustified assertion.
- Every string reference in the config (`guard: 'hasRetriesLeft'`, `src: 'placeOrder'`, `after: { retryBackoff: ... }`) is checked against the setup keys — misspellings are compile errors. This is the whole reason `setup()` exists; never pass implementations inline in the config when they can be named.
- `setup.extend({...})` (5.24+) merges additional actions/guards/delays into an existing setup — the composition mechanism for sharing implementations across machines.
- Schema-first at trust boundaries still applies, at three distinct doorways: **events** from outside the process (WebSocket messages, URL state) are schema-parsed before `actor.send`; **input** from external sources is parsed before `createActor(machine, { input })`; **persisted snapshots** read from storage are validated (and versioned/migrated) before being passed as the `snapshot` option. `types.*` types the inside; the schemas guard the doorways.

## Patterns That Keep Types Honest

- **`assertEvent(event, 'submit')`** — entry/exit actions and `invoke.input` functions see the union of all events; `assertEvent` narrows at compile time and throws at runtime on mismatch. Use it instead of an `as` cast, which would hide a real modeling gap.
- **Dynamic params over closed-over types**: implement shared actions/guards as `(args, params) => ...` and feed them `params: ({ context, event }) => ({...})`. The implementation depends only on its params type — reusable across machines and independently testable.
- **Type helpers**: `ActorRefFrom<typeof machine>` (for props/context fields holding refs), `SnapshotFrom<typeof machine>` (selector signatures), `EventFromLogic<typeof logic>`.
- **`fromPromise<Output, Input>`** — output generic first.
- **No typestates in v5**: `snapshot.matches('failure')` does not narrow `snapshot.context`. Where a state guarantees a context shape, encode the invariant in a selector (`selectError = (s) => { assert(s.matches('failure')); return s.context.error; }`) or model the data so the impossible shape can't be written (nullable field owned by exactly one state). v6's typestates will address this; do not fake them with casts today.
- Context and events stay immutable data structures (`readonly` where practical) — `assign` returns new values, never mutates.

## v4 → v5 Migration Cheat Sheet

Old code and old blog posts are everywhere; when you see the left column, you are reading v4 — translate:

| v4 | v5 |
|----|----|
| `Machine()` / `interpret()` | `createMachine()` / `createActor()` |
| `machine.withConfig()` / `.withContext()` | `machine.provide()` / `input` |
| `services:` | `actors:` |
| `cond:` | `guard:` |
| `in: 'stateName'` | `guard: stateIn(...)` |
| `internal: false` | `reenter: true` (all transitions internal by default) |
| `on: { '': ... }` | `always:` |
| activities | invoked `fromCallback` actors with cleanup |
| `send()` / `respond()` / `pure()` / `choose()` / `escalate()` | `raise()`/`sendTo()` / `sendTo` / `enqueueActions()` / throw |
| `invoke.data`, `onDone.data`, `event.data` | `invoke.input`, `output`, `event.output` / `event.error` |
| `actor.onTransition()` | `actor.subscribe()` |
| `actor.start(state)` | `createActor(m, { snapshot })` |
| `state.done`, string events | `status === 'done'`, event objects only |
| `strict: true` | `'*': { actions: ({ event }) => { throw new Error(\`unhandled: ${event.type}\`); } }` — a bare `'*'` merely *handles* unknown events; throwing reproduces strict mode |
| `schema`, `tsTypes` (typegen) | `setup({ types })` |
| `useInterpret` (@xstate/react) | `useActorRef` |
| `useActor(ref)` | `useSelector(ref, s => s)` — `useActor` now takes logic |
| `@xstate/test` `createModel` | `xstate/graph` `createTestModel` |

Treat any generated or recalled XState code containing the left column as suspect and rewrite it in v5 idiom before it ships.
