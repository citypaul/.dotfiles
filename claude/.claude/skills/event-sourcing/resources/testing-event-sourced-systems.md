# Testing Event-Sourced Systems

Event sourcing is one of the most testable patterns there is: the write model is pure data in and pure data out. This resource shows how to test deciders, projections, and upcasters as **behaviour through the public API** — the `testing` skill's approach — and how that relates to the "given-when-then" idiom the event-sourcing literature reaches for.

## Why the Literature Reaches for Given-When-Then

Almost every event-sourcing text tests deciders in a **given-when-then** shape: *given* these past events, *when* this command is handled, *then* expect these new events — frequently as a fluent `given(events).when(command).then(events)` DSL (Emmett's `DeciderSpecification`, Dudycz's C# `Given/When/Then`) or as Gherkin scenarios.

It is worth understanding **why** it fits so naturally, because the reason is real: that shape *is the decider's algebra*. Past events fold through `evolve` to a state; a command runs through `decide` against that state; the output is new events. "Given events / when command / then events" is just those three moves named. The insight is genuine and worth keeping.

## How We Write It Here

**This repo does behaviour-driven testing, and that is not the same as given-when-then.** We do not use a `given().when().then()` DSL and we do not write Gherkin. We follow the `testing` skill: call the public function, assert on the observed output, name the test after the business behaviour, and build data with factory functions. The decider's algebra maps onto that with no new machinery — because the three moves are already plain function calls on plain data:

| The literature's idiom | Our translation (behaviour-driven) |
|------------------------|-------------------------------------|
| *given* past events | Build the starting state — fold event factories with `evolve`, or a state factory. Past events are just data. |
| *when* a command | Call the public function directly (`decide`, or the command handler). |
| *then* expect events | `expect(...)` on the returned events — the events **are** the observable output of `decide`. |

No DSL, no bus, no mocks. Just the `testing` skill applied to a decider.

## Testing the Decider

`decide` returns its events (or a rejection) as a value, so asserting on that return value is behaviour testing through the public API — the events are the observable behaviour. Build the "prior state" by folding factory-built events with `evolve`:

```typescript
// Event factories — complete, valid data with overrides (testing skill's factory pattern)
const opened = (currency: Currency = 'GBP'): AccountEvent => ({ type: 'AccountOpened', currency });
const deposited = (amount: number): AccountEvent => ({ type: 'MoneyDeposited', amount });
const withdrawn = (amount: number): AccountEvent => ({ type: 'MoneyWithdrawn', amount });

it('should record a deposit as MoneyDeposited on an open account', () => {
  const state = [opened()].reduce(evolve, initialState);

  const decision = decide({ type: 'Deposit', amount: 50 }, state);

  expect(decision).toEqual({ accepted: true, events: [{ type: 'MoneyDeposited', amount: 50 }] });
});

it('should reject a withdrawal that exceeds the balance', () => {
  const state = [opened(), deposited(50)].reduce(evolve, initialState);

  const decision = decide({ type: 'Withdraw', amount: 100 }, state);

  expect(decision).toEqual({ accepted: false, reason: 'insufficient-funds' });
});

it('should reject any operation on an account that was never opened', () => {
  const decision = decide({ type: 'Deposit', amount: 50 }, initialState);

  expect(decision).toEqual({ accepted: false, reason: 'not-open' });
});
```

The starting state is a fold of factory events, the action is a direct call, and the assertion is on the returned data. Test names describe business behaviour, not the mechanics. Use a factory for *every* event in the fold — an inline event literal in the array widens its `type` discriminant to `string`, so the array stops being `AccountEvent[]` and `reduce(evolve, …)` no longer type-checks. Cover the branches that matter (the `mutation-testing` skill's mutator awareness applies — avoid identity values like a withdrawal of exactly the balance unless the boundary *is* the behaviour under test).

## Testing `evolve` Through Behaviour, Not Directly

Do not write a 1:1 `evolve.test.ts` asserting each transition in isolation — that is testing an implementation detail (the `testing` skill's "no 1:1 mapping" rule). `evolve` is exercised thoroughly by the decider tests above (every one folds events through it) and by rehydration tests. If you want to pin down rehydration as a behaviour, assert on what the folded state *lets you do*:

```typescript
it('should reflect deposits and withdrawals in the balance available to withdraw', () => {
  const state = [opened(), deposited(100), withdrawn(30)].reduce(evolve, initialState);

  // behaviour: 70 is available, 71 is not
  expect(decide({ type: 'Withdraw', amount: 70 }, state).accepted).toBe(true);
  expect(decide({ type: 'Withdraw', amount: 71 }, state).accepted).toBe(false);
});
```

## Testing the Command Handler With an In-Memory Store

The command handler is impure (it touches the store), so test it against an **in-memory `EventStore` fake** — a real implementation of the port backed by a `Map`, not a mock (the DDD/hex skills' "fakes, not mocks" rule). This proves load → rehydrate → decide → append works end to end, including optimistic concurrency.

```typescript
// A real implementation of the port backed by a Map — not a mock. Because the
// port is typed EventStore<E>, the fake needs no casts anywhere.
const makeInMemoryStore = <E>(): EventStore<E> => {
  const streams = new Map<string, E[]>();
  return {
    readStream: async (id) => {
      const events = streams.get(id) ?? [];
      return { events, version: events.length };
    },
    appendToStream: async (id, events, { expectedVersion }) => {
      const current = streams.get(id) ?? [];
      if (current.length !== expectedVersion) return 'version-conflict';
      streams.set(id, [...current, ...events]);
      return 'ok';
    },
  };
};

it('should persist a deposit so a later withdrawal sees the funds', async () => {
  const handle = makeCommandHandler(accountDecider, makeInMemoryStore<AccountEvent>());
  await handle(streamId, { type: 'Open', currency: 'GBP' });
  await handle(streamId, { type: 'Deposit', amount: 100 });

  const result = await handle(streamId, { type: 'Withdraw', amount: 60 });

  expect(result).toEqual({ success: true, events: [{ type: 'MoneyWithdrawn', amount: 60 }] });
});

it('should reject a concurrent append made against a stale version', async () => {
  const store = makeInMemoryStore<AccountEvent>();
  await store.appendToStream(streamId, [opened()], { expectedVersion: 0 });

  const outcome = await store.appendToStream(streamId, [deposited(10)], { expectedVersion: 0 }); // stale

  expect(outcome).toBe('version-conflict');
});
```

## Testing Projections

A projection is a fold, so test it as behaviour: feed a sequence of events, assert the resulting read model.

```typescript
it('should reflect net balance from a sequence of account events', () => {
  const view = [opened(), deposited(100), withdrawn(30)]
    .reduce(apply, emptyBalanceView(accountId));

  expect(view.balance).toBe(70);
});
```

**Then prove idempotency with a redelivery**, because at-least-once delivery guarantees it will happen in production. An idempotent projector no-ops on an event it has already applied — assert the balance does not double-count. This projector row is **scoped to one account (one stream)**, so the stream `version` is a valid dedupe key; a projection that folds across many streams would instead key on the **event id** or **global position**, because versions repeat across streams:

```typescript
// per-account (single-stream) read-model row — version is unique within it
type BalanceRow = { readonly balance: number; readonly appliedThrough: number };

// idempotent apply: ignore any event at or below the version already applied
const project = (row: BalanceRow, event: { readonly amount: number }, version: number): BalanceRow =>
  version <= row.appliedThrough
    ? row
    : { balance: row.balance + event.amount, appliedThrough: version };

it('should not double-count a redelivered event', () => {
  const event = { type: 'MoneyDeposited', amount: 100 };

  const once = project({ balance: 0, appliedThrough: 0 }, event, 1);
  const twice = project(once, event, 1); // the same event, redelivered at the same version

  expect(once.balance).toBe(100);
  expect(twice.balance).toBe(100); // not 200
});
```

## Testing Upcasters

Upcasters are pure functions from an old event shape to the next, so test them directly as behaviour (old shape in, new shape out) — and add a test that an old event, once upcast, folds correctly through the *current* `evolve`. That second test is the one that catches a versioning bug before it corrupts a replay:

```typescript
it('should upcast a V1 OrderPlaced into the current shape the domain can fold', () => {
  const v1 = { type: 'OrderPlaced', version: 1, orderId: 'o-1', total: 40 } as const;

  const current = upcastOrderPlaced(v1);

  expect(current).toEqual({
    type: 'OrderPlaced', version: 2, orderId: 'o-1', totalAmount: { amount: 40, currency: 'GBP' },
  });
});
```

## Property-Based Testing (Optional, High Value)

Because deciders are pure algebra, they invite property tests for invariants that must hold across *any* history:

- **`evolve` is total** — folding any generated sequence of valid events from `initialState` never throws.
- **Rehydration determinism** — folding the same events yields the same state every time.
- **Business invariants** — e.g. after any sequence of accepted deposits and withdrawals, the balance never goes negative (because `decide` rejects overdrafts).

These complement, and never replace, the behaviour tests above.
