# React Integration

`@xstate/react` (v6, React 16.8–19, built on `useSyncExternalStore` — tear-free under concurrent rendering) plus `@xstate/store` for the tier below machines. Components stay dumb renderers of snapshots; all logic lives in the machine, which is what keeps the flow testable without a browser.

## Hook Selection

| Situation | Hook |
|---|---|
| Small component, whole snapshot is fine | `useMachine(machine)` / `useActor(logic)` → `[snapshot, send, actorRef]`; re-renders on every snapshot change |
| Perf-sensitive or many consumers | `useActorRef(logic)` (never re-renders) + `useSelector(ref, selector, compare?)` per consumer |
| Subscribing to a child/spawned/global actor ref | `useSelector(ref, selector)` — the only hook that takes an existing ref |
| Sharing one actor across a subtree | `createActorContext(machine)` |

Details that bite:

- `useMachine` is an alias of `useActor`; both **create** an actor from logic. Subscribing to an *existing* ref is `useSelector` (in @xstate/react v3 `useActor` subscribed to refs — that meaning is gone).
- `useSelector` compares with `===` by default; pass `shallowEqual` for object selections. Select the narrowest value: `useSelector(ref, s => s.matches('editing'))`, `s => s.context.items.length` — not the whole snapshot.
- Since @xstate/react 6.1, `useActor`/`useSelector` **throw when the actor errors**, so actor failures surface in React error boundaries instead of hanging silently.
- Implementations can no longer be passed as hook options — use `machine.provide({...})`: `useMachine(machine.provide({ actors: {...} }))`. Provided implementations stay current across renders (no stale closures). The options argument is for actor options: `{ input, snapshot, systemId, inspect }`; `input` is type-required when the machine declares `types.input`.

## Shared Actors: `createActorContext`

```ts
const CheckoutContext = createActorContext(checkoutMachine);

// app
<CheckoutContext.Provider>...</CheckoutContext.Provider>
// consumers
const step = CheckoutContext.useSelector((s) => s.value);
const actorRef = CheckoutContext.useActorRef();
```

The context object exposes only `useSelector` and `useActorRef` — whole-snapshot subscription from shared context was deliberately removed. The Provider accepts `logic={machine.provide({...})}` (per-subtree overrides — also the test seam) and `options={{ input, snapshot }}`. For genuinely app-global actors in **client-only** apps, a module-scope root actor + `useSelector` beats context; under SSR (Next.js et al.) module scope is shared across requests and leaks user state — create the root per request/app instance and provide it via context. Reserve `createActorContext` for subtree-scoped instances (one per checkout, one per wizard instance).

## StrictMode

React StrictMode's dev-only effect cycle (mount → cleanup → re-run) does **not** create a fresh actor: `@xstate/react` keeps the same actor reference in state and, on effect cleanup, stops it while capturing every actor's snapshot (`stopRootWithRehydration`); the effect re-run restarts the same reference from those snapshots. Consequences:

- Entry actions are **not** replayed — restore semantics apply. But stopped-and-restarted **invocations and `fromCallback` resources reconnect**: subscriptions, sockets, and intervals are torn down and re-created, so callback actors **must return cleanup functions** (the classic missing-cleanup symptom is a doubled WebSocket connection).
- Actor identity survives Strict Effects reconnection; a *genuine* unmount/remount (e.g. a key change) does create a fresh actor — don't rely on identity across that.

Write invoked/callback effects idempotent-with-cleanup; do not disable StrictMode.

## The Tier Below: `@xstate/store`

For data-shaped shared state with no modes (see `when-to-model.md`), `@xstate/store` (~1–2 kB, v4, React bindings in the separate `@xstate/store-react` package) is the default:

```ts
const cartStore = createStore({
  context: { items: [] as CartItem[] },
  on: {
    added: (ctx, ev: { item: CartItem }) => ({ ...ctx, items: [...ctx.items, ev.item] }),
  },
});
// component
const items = useSelector(cartStore, (s) => s.context.items);
cartStore.trigger.added({ item });
```

Pure transitions returning full context, typed event senders via `store.trigger.*`, `emits` for outbound events, `enqueue.effect` for structured async, atoms for derived values, and `.with()` extensions (`persist`, `undoRedo`). Because the event vocabulary matches XState's, promotion to a machine is mechanical — or wrap the store with `fromStore()` and invoke it from a machine as-is. `@xstate/react`'s `useSelector` accepts stores directly.

## Production Pitfalls Checklist

- **Form values in machine context** — keep field values in the form layer (form library or uncontrolled inputs); the machine owns *flow* state (which step, validation gate, submission lifecycle). Mirroring keystrokes into `assign` is a known perf and ergonomics mistake. Read the split precisely, because it is routinely over-applied: the *values* stay local, the *submission lifecycle* does not. A `submitting` flag in component `useState` is not the form layer owning its values — it is the machine's state living in the wrong place.
- **Whole-snapshot subscriptions everywhere** — a large machine consumed by many components via `useMachine` re-renders all of them on every transition; move to `useActorRef` + narrow selectors.
- **Reaching machine state through rendered components only** — inverts the architecture's benefit; test flow logic headlessly on the actor and keep component tests about rendering (see `testing.md`).
- **Bundle placement** — xstate core is ~13 kB gzipped: fine as an app-level dependency, wrong per-widget; the store tier exists for the small end.
- **Spawn leaks in long-lived UIs** — see `actors-and-systems.md`; toasts and modals spawned per event need `stopChild` + ref cleanup.
- **Inspector left on in production** — gate `inspect` behind a dev flag.

## Beyond React

Official, maintained integrations follow the same shape: `@xstate/vue` (composables returning refs), `@xstate/svelte` (snapshot as a readable store), `@xstate/solid` (fine-grained reactive snapshots). There is no `@xstate/angular` for machines — actors interop with RxJS directly (`actor.subscribe`); `@xstate/store-angular` exists for stores.
