# The Decider and Rehydration

The Decider (Jérémie Chassaing, 2021) is the pure functional core of an event-sourced write model. It is the same pattern the `domain-driven-design` skill introduces in `resources/domain-events.md` — this resource goes deeper on the type, rehydration, the command-handler loop, and composition. Read the DDD version first.

## The Decider Type

A Decider bundles the pure functions and seed value for one aggregate. Adopt **one generic order and keep it repo-wide**; the dominant TypeScript convention (Emmett, delta-base) is `<State, Command, Event>`:

```typescript
type Decider<State, C extends { readonly type: string }, E extends { readonly type: string }> = {
  readonly initialState: State;
  readonly decide: (command: C, state: State) => Decision<E>;
  readonly evolve: (state: State, event: E) => State;
  readonly isTerminal?: (state: State) => boolean;
};
```

The elements Chassaing enumerates are Command, Event, State, `initialState`, `decide`, `evolve`, and the optional `isTerminal`. Each does exactly one job:

| Element | Type | Responsibility |
|---------|------|----------------|
| `initialState` | `State` | The state of a stream with zero events. |
| `decide` | `(command, state) => Decision<Event>` | **All business rules.** Accept (emit events) or reject (a reason). Pure. |
| `evolve` | `(state, event) => State` | Apply one already-happened event to state. **No rules, total, never rejects.** |
| `isTerminal` | `(state) => boolean` | Optional. True when the aggregate has reached an end state (closed account, finished saga) and accepts no more commands. |

**Note on `initialState` as a value vs a factory.** A frozen immutable literal (`{ status: 'unopened' }`) is safe to share as a constant. If your initial state contains a **mutable container** (a `Map`, a `Set`, an array you spread into), use a factory `() => State` instead, so instances never share one mutable seed.

## `decide` Returns a Decision, Not Just Events

The classic decider signature is `decide: (command, state) => Event[]`, where an empty array means "nothing to do". That works, but it cannot say *why* a command was refused. This repo models expected business outcomes as **result types**, not exceptions or silent empties (see the DDD skill's error-modelling section and Scott Wlaschin's `Command → Result<Event list, Error>`). So `decide` returns a `Decision`:

```typescript
type Decision<E, R extends string = string> =
  | { readonly accepted: true; readonly events: readonly E[] }
  | { readonly accepted: false; readonly reason: R };

const accept = <E>(events: readonly E[]): Decision<E, never> => ({ accepted: true, events });
const reject = <R extends string>(reason: R): Decision<never, R> => ({ accepted: false, reason });
```

The `R` type parameter carries the rejection reasons. `accept`/`reject` widen from `never`, so a `decide` annotated with a **union of literal reasons** keeps them for exhaustive handling — `reject('not-open')` is well-typed only if `'not-open'` is in `R`:

```typescript
type WithdrawRejection = 'not-open' | 'insufficient-funds' | 'non-positive-amount';

const decideWithdraw = (command: Withdraw, state: AccountState): Decision<AccountEvent, WithdrawRejection> => {
  if (state.status !== 'open') return reject('not-open');
  if (command.amount <= 0) return reject('non-positive-amount');
  if (command.amount > state.balance) return reject('insufficient-funds');
  return accept([{ type: 'MoneyWithdrawn', amount: command.amount }]);
};
```

(The `SKILL.md` example uses the `R = string` default to stay terse; annotate the reason union like this when you want the compiler to enforce that callers handle every rejection.)

**When a rejection is itself a domain fact, model it as an event instead.** "A withdrawal was declined for insufficient funds" may be something the business wants to keep, analyse for fraud, or notify on. In that case `decide` *accepts* and emits a `WithdrawalDeclined` event rather than returning a rejection. The rule: if downstream needs a durable record of the refusal, it is an event; if the refusal is just this caller's problem right now, it is a `Decision` rejection.

## Rehydration Is a Left Fold

Because `evolve` has the exact shape of a reducer, rebuilding current state ("rehydration" / "replay") is a single fold. This is the identity that makes the whole pattern click — Greg Young's *"Current State is a Left Fold of previous behaviours"*:

```typescript
const rehydrate = <State, C extends { type: string }, E extends { type: string }>(
  decider: Decider<State, C, E>,
  events: readonly E[],
): State => events.reduce(decider.evolve, decider.initialState);
```

There is no stored current state to keep in sync — there is only the fold. That is why `evolve` **must be total**: it will be handed every event the stream has ever contained, including ones written years ago by an older version of `decide`. An `evolve` that throws on an unrecognised or now-invalid event breaks replay permanently. Return state unchanged for events that no longer affect it; never reject.

## The Command Handler Loop

The command handler is the one impure seam that connects the decider to the event store. It is identical for every aggregate — load, fold, decide, append with optimistic concurrency:

```typescript
const makeCommandHandler =
  <State, C extends { type: string }, E extends { type: string }>(
    decider: Decider<State, C, E>,
    store: EventStore<E>,
    maxAttempts = 3,
  ) =>
  async (streamId: StreamId, command: C): Promise<CommandResult> => {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { events, version } = await store.readStream(streamId);       // load
      const state = events.reduce(decider.evolve, decider.initialState);  // rehydrate (pure)

      const decision = decider.decide(command, state);                    // decide (pure)
      if (!decision.accepted) return { success: false, reason: decision.reason };

      const outcome = await store.appendToStream(streamId, decision.events, { expectedVersion: version });
      if (outcome === 'ok') return { success: true, events: decision.events };
      // version-conflict: the stream moved under us — loop to reload and re-decide against fresh state
    }
    return { success: false, reason: 'concurrent-modification' };
  };
```

**Why the loop re-decides rather than re-appending.** A conflict means another writer appended between your read and your append, so the state you decided against is stale. The loop reloads and re-runs `decide` against fresh state — which may now legitimately reject (e.g. the funds are gone). Never retry by blindly re-appending the events you already computed. The loop is bounded (3 attempts) so a hot stream cannot spin forever; after that it surfaces `concurrent-modification` to the caller. (The `SKILL.md` version omits the loop to show the bare load→decide→append shape; this is the production form.)

## Keep `decide` Deterministic

`decide` must be a pure function of `(command, state)` — no `Date.now()`, no random IDs, no I/O. Pass time and identifiers **in through the command** so tests are deterministic and replay is reproducible:

```typescript
type DepositMoney = { readonly type: 'Deposit'; readonly amount: number; readonly at: Date };
```

The application layer stamps `at`/ids when it builds the command; the domain stays pure. This is the same discipline the `functional` skill applies everywhere. (The DDD skill's `domain-events.md` threads `now` in as an explicit `decide` parameter instead — both keep the decider deterministic. Prefer the command-carried form in an event-sourced handler: the retry loop re-runs `decide` on a version conflict, and a timestamp carried by the command is structurally the same on every attempt.)

## Composition (Advanced)

Deciders compose — Chassaing showed they form a category. You rarely need this, but when one process must coordinate several aggregates it beats hand-rolled glue. Three combinators:

- **`compose(a, b)`** — combine two deciders into one over the **product of their states** and the **sum of their commands/events** (`Either<A, B>`). Routes each message to the decider that owns it.
- **`adapt(...)`** — retarget an existing decider onto a different command/event/state shape via mapping functions (a profunctor `dimap`). Lets you reuse a generic decider in a specific context.
- **`many(decider)`** — lift a single-instance decider to a **keyed collection** (`Map<Id, State>`), routing `(id, command)` to the right instance. This is the functional analogue of an aggregate repository.

A **process manager / reaction** then turns one decider's events into another's commands — the same pure `(state, event) => [newState, commands]` shape the DDD `domain-events.md` describes. Keep these as plain functions over data; do not reach for classes.

## Checklist

- [ ] One generic order chosen and used everywhere (`<State, Command, Event>` recommended)
- [ ] `decide` is pure, holds all rules, returns `Decision` (accept-with-events or reject-with-reason)
- [ ] Rejections that must be remembered are modelled as events, not `Decision` rejections
- [ ] `evolve` is total — returns unchanged state for irrelevant events, never throws or validates
- [ ] Time and ids enter through the command; `decide` calls no clock, random, or I/O
- [ ] Rehydration is `events.reduce(evolve, initialState)` — no separately stored current state
- [ ] The command handler appends with `expectedVersion` and reload-re-decides on conflict
- [ ] `isTerminal` used where an aggregate has a genuine end state
