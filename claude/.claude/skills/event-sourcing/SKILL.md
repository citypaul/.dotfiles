---
name: event-sourcing
description: Event sourcing patterns for functional TypeScript — persist state as an append-only log of past events and rebuild it by folding them. Use when implementing a Decider write model, an event store, projections and read models, event versioning, or snapshots. Builds on the Decider from domain-driven-design and the ports/adapters from hexagonal-architecture. Do NOT reach for it on CRUD, or when an audit log or the outbox pattern already suffices.
---

# Event Sourcing

Event sourcing stores every change to application state as an immutable, append-only sequence of **past-tense domain events**. The current state is never stored directly — it is a **left fold** of the events: `state = events.reduce(evolve, initialState)`. The event log is the source of truth; every other representation (aggregate state, read models, search indexes) is a derived, disposable projection you can rebuild by replaying events.

This skill applies only to projects — or the specific bounded contexts within them — that have deliberately opted in to event sourcing. **It is the top of the complexity ladder, not a default.** Read "When to Use Event Sourcing" first; most features should stop at explicit returns, an audit table, or the outbox pattern.

**This skill builds on three others — load them alongside it:**
- `domain-driven-design` — the **Decider** (`decide`/`evolve`/`initialState`) is defined in its `resources/domain-events.md`. Event sourcing *persists and replays* that same decider. This skill assumes you have read it.
- `hexagonal-architecture` — the event store is a **driven port** with an adapter; the domain stays pure. Reads use the **CQRS-lite** split (`resources/cqrs-lite.md`).
- `typescript-strict` — events cross a trust boundary on the way out of and back into storage, so they are **schema-first** with branded IDs.

**Deep-dive resources** are in `resources/`. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `when-to-use-event-sourcing.md` | Deciding whether to adopt it; comparing against CQRS, event-driven architecture, streaming, and audit logs |
| `modelling-events.md` | Discovering and naming events (EventStorming), event granularity, what data belongs in an event |
| `decider-and-rehydration.md` | Writing the decide/evolve pair, rehydration, the command handler loop, decider composition |
| `event-store.md` | Designing the EventStore port, the Postgres schema, optimistic concurrency, the event envelope, the TS/Node tooling landscape |
| `projections-and-read-models.md` | Building read models, inline vs async projections, rebuilds, checkpoints, eventual consistency |
| `event-versioning.md` | Evolving event schemas — upcasting, tolerant readers, weak schema, stream copy-transform |
| `testing-event-sourced-systems.md` | Testing deciders, projections, and upcasters as behaviour, not with a given-when-then DSL |
| `production-concerns.md` | Snapshots, GDPR/crypto-shredding, idempotent delivery, operability, the anti-patterns catalog |
| `references.md` | Checking the rationale and primary sources behind this guidance |

For authoritative sources, see `claude/.claude/skills/REFERENCES.md` in the source repo (https://github.com/citypaul/.dotfiles) — that file is not bundled when this skill is installed standalone.

---

## When to Use Event Sourcing

Event sourcing earns its considerable complexity only when **the history of changes is itself part of the domain**. It is not a storage optimisation; it is a modelling decision.

**Use event sourcing when:**
- The **audit trail is a first-class requirement** — finance, healthcare, compliance — and "what did the state look like on this date, and why?" is a real question.
- You need **temporal queries or time-travel** — reconstruct past state, replay to reproduce a bug, or answer questions nobody thought to ask when the data was written.
- The domain is **genuinely event-driven** — the business talks in events ("the payment was captured", "the policy lapsed") and multiple downstream models react to them.
- You need **multiple, independently-evolving read models** over the same facts, and you want to add new ones retroactively by replaying history.

**Do NOT use event sourcing when:**
- The domain is **CRUD** — forms over data with no meaningful history. Store the current state.
- You only need an **audit log** — add an append-only history table next to your current-state table. Far cheaper.
- You only need **cross-aggregate side effects** — use domain events with the **outbox pattern** (see `domain-driven-design/resources/domain-events.md`). That is event-*driven*, not event-*sourced*.
- The team has **no experience with it** and the domain does not demand it. The failure mode is a half-built event store with no versioning strategy that becomes impossible to change.

**The complexity ladder** (from the DDD `domain-events.md`, extended): explicit return values → in-process domain events → outbox pattern → **event sourcing**. Climb one rung at a time, and only when the current rung cannot express what you need. Event sourcing is the last rung; step onto it deliberately, and usually for **one bounded context**, not the whole system.

**Event sourcing is not CQRS.** They are orthogonal. CQRS separates the write model from read models; event sourcing chooses events as the write model's storage. You can do CQRS without event sourcing (that is the hexagonal skill's CQRS-lite) and — rarely — event sourcing without CQRS. In practice event sourcing almost always drives CQRS, because the stored events are a poor shape for queries, so you project them into read models. See `when-to-use-event-sourcing.md` for the full comparison against event-driven architecture, streaming (Kafka), and audit logs.

---

## Core Mental Model

Four ideas carry the whole pattern.

1. **Events are the source of truth.** They are immutable facts, named in the past tense, that record *what happened* and *why*. You never `UPDATE` or `DELETE` an event — you only `append`. Correcting a mistake means appending a new compensating event, exactly as an accountant never erases a ledger entry.

2. **State is a left fold of events.** There is no stored "current state". You rebuild it on demand by folding the `evolve` function over the stream — this rebuild is called **rehydration** or **replay**. Greg Young's formulation: *"Current State is a Left Fold of previous behaviours."*

   ```typescript
   const rehydrate = (events: readonly AccountEvent[]): AccountState =>
     events.reduce(evolve, initialState);
   ```

3. **The stream is the consistency boundary.** One aggregate instance maps to exactly one stream (e.g. `account-4f3c…`). All invariants for that aggregate are enforced within its stream, and appends use **optimistic concurrency** on the stream's version. You never rely on a cross-stream transaction to keep an aggregate's invariants true — the stream is the consistency boundary, and cross-aggregate work is a process manager / saga (some stores *can* append to several streams atomically, but a well-modelled aggregate never needs it).

4. **Read models are disposable derivations.** Because state is `fold(events)`, any read-optimised view is just a different fold. You can delete a projection and rebuild it from event zero. This is what makes "add a new report retroactively" trivial.

**Vocabulary** (used consistently across this skill):

| Term | Meaning |
|------|---------|
| Event | An immutable past-tense fact: `MoneyDeposited`, `OrderShipped`. The unit of storage. |
| Command | A request to *attempt* a change: `DepositMoney`. May be rejected. Never stored. |
| Stream | The ordered sequence of events for one aggregate instance. The consistency boundary. |
| Decider | The pure write model: `decide` (command + state → events) and `evolve` (state + event → state). |
| Rehydrate / replay | Rebuild state by folding `evolve` over a stream's events. |
| Projection | A fold of events into a read model (a query-optimised view). |
| Snapshot | A cached fold result stored to avoid replaying long streams. An optimisation, never the source of truth. |
| Event store | The append-only, ordered, optimistic-concurrency-aware persistence for streams. A driven port. |
| Expected version | The stream version a command was decided against; used to detect concurrent writes on append. |

---

## The Decider Is the Write Model

You do not write new domain logic for event sourcing — you **persist the Decider you already have** from the DDD skill. The functions are the same three, with one refinement for this skill: `decide` returns an explicit `Decision` (accept-with-events or reject-with-reason) rather than the DDD example's bare event array:

```typescript
// domain/account/account.ts — pure, no infrastructure imports

type AccountState =
  | { readonly status: 'unopened' }
  | { readonly status: 'open'; readonly balance: number; readonly currency: Currency };

type AccountCommand =
  | { readonly type: 'Open'; readonly currency: Currency }
  | { readonly type: 'Deposit'; readonly amount: number }
  | { readonly type: 'Withdraw'; readonly amount: number };

type AccountEvent =
  | { readonly type: 'AccountOpened'; readonly currency: Currency }
  | { readonly type: 'MoneyDeposited'; readonly amount: number }
  | { readonly type: 'MoneyWithdrawn'; readonly amount: number };

const initialState: AccountState = { status: 'unopened' };

// decide: what SHOULD happen? Returns events (or a rejection). Enforces invariants.
const decide = (command: AccountCommand, state: AccountState): Decision<AccountEvent> => {
  switch (command.type) {
    case 'Open':
      if (state.status === 'open') return reject('already-open');
      return accept([{ type: 'AccountOpened', currency: command.currency }]);
    case 'Deposit':
      if (state.status !== 'open') return reject('not-open');
      if (command.amount <= 0) return reject('non-positive-amount');
      return accept([{ type: 'MoneyDeposited', amount: command.amount }]);
    case 'Withdraw':
      if (state.status !== 'open') return reject('not-open');
      if (command.amount <= 0) return reject('non-positive-amount');
      if (command.amount > state.balance) return reject('insufficient-funds');
      return accept([{ type: 'MoneyWithdrawn', amount: command.amount }]);
    default: { const _: never = command; return _; }
  }
};

// evolve: what does an event MEAN for state? Pure fold step. Never rejects, never validates.
const evolve = (state: AccountState, event: AccountEvent): AccountState => {
  switch (event.type) {
    case 'AccountOpened':
      return { status: 'open', balance: 0, currency: event.currency };
    case 'MoneyDeposited':
      return state.status === 'open' ? { ...state, balance: state.balance + event.amount } : state;
    case 'MoneyWithdrawn':
      return state.status === 'open' ? { ...state, balance: state.balance - event.amount } : state;
    default: { const _: never = event; return _; }
  }
};
```

**The division of labour is strict** (get this wrong and the whole model rots):
- `decide` holds **all the business rules**. It reads current state, validates the command, and either **accepts** (returning events) or **rejects** (returning a business reason). It has no side effects and does not touch storage.
- `evolve` holds **no rules**. It is a total function that applies an already-decided fact to state. Events are things that *already happened*, so `evolve` must never reject one — replaying history must always succeed, even for events written years ago by an older `decide`.

Modelling `decide`'s outcome as an explicit `Decision` result (accept-with-events or reject-with-reason) follows the DDD skill's error-modelling rule: expected business outcomes are result types, not exceptions. See `decider-and-rehydration.md` for `Decision`, `isTerminal`, and how deciders compose.

---

## The Command Handler Loop

The application service ties the pure decider to the impure event store. This loop is the heart of every event-sourced write, and it is the same every time:

```typescript
// use-case: load → decide → append (with optimistic concurrency)
const handleCommand = async (
  store: EventStore<AccountEvent>,
  streamId: StreamId,
  command: AccountCommand,
): Promise<CommandResult> => {
  // 1. LOAD the stream's events (and the version we read at)
  const { events, version } = await store.readStream(streamId);

  // 2. REHYDRATE current state by folding — pure
  const state = events.reduce(evolve, initialState);

  // 3. DECIDE — pure business logic
  const decision = decide(command, state);
  if (!decision.accepted) return { success: false, reason: decision.reason };

  // 4. APPEND the new events, asserting the stream has not moved since we read it
  const outcome = await store.appendToStream(streamId, decision.events, { expectedVersion: version });
  if (outcome === 'version-conflict') return { success: false, reason: 'concurrent-modification' };

  return { success: true, events: decision.events };
};
```

Everything pure (`evolve`, `decide`) is trivially testable with no mocks. Everything impure is behind the `EventStore` port. The **expected version** on append is what makes concurrent writes safe: if another writer appended to the stream between step 1 and step 4, the append fails and the caller retries from step 1 (load fresh state, re-decide). This snippet shows the **bare shape**; the production form wraps steps 1–4 in a bounded reload/re-decide retry loop (see `decider-and-rehydration.md`). Never skip the expected version — without it, two concurrent withdrawals can both pass the balance check and overdraw the account.

---

## The Event Store Port

The event store is a **driven port** (hexagonal skill). Define the interface in the domain in application language; implement it in an adapter. The minimal contract is small:

```typescript
// port (domain layer) — interface because it is a behaviour contract.
// Typed to one aggregate's event family, like a repository (the underlying
// adapter can hold many streams; it parses stored JSON into E on read).
interface EventStore<E> {
  readonly readStream: (streamId: StreamId) => Promise<{ readonly events: readonly E[]; readonly version: number }>;
  readonly appendToStream: (
    streamId: StreamId,
    events: readonly E[],
    options: { readonly expectedVersion: number },
  ) => Promise<'ok' | 'version-conflict'>;
}
```

A production store adds subscriptions (for async projections) and reading the global event order, but every event store must provide: **append-only writes, ordering within a stream, and optimistic concurrency via expected version.** The canonical Postgres implementation is a single `events` table with a `UNIQUE (stream_id, version)` constraint — that constraint *is* the optimistic-concurrency check. See `event-store.md` for the full schema, the event envelope (with correlation/causation IDs), and where Emmett, KurrentDB (EventStoreDB), and message-db fit.

**Events are stored as data across a trust boundary,** so on the way out they are validated with a schema (a **tolerant reader**) before `evolve` ever sees them. This is where event sourcing meets `typescript-strict`: the stored JSON is untrusted input, parsed into branded domain events on read. It is also where **versioning** lives — see below.

---

## Events as Data

Events are the most permanent thing you will ever write. A row in a table can be migrated; an event is a historical fact that will be replayed for as long as the system lives. Design them with care (full guidance in `modelling-events.md`):

- **Name them in the past tense, in business language.** `SubscriptionCancelled`, not `UpdateStatus`. `FundsWithdrawn`, not `RowUpdated`. An event names something that *happened* in the domain.
- **Avoid CRUD events.** `AccountCreated` / `AccountUpdated` / `AccountDeleted` is a database changelog wearing an event-sourcing costume — it captures *that data changed* but not *what happened or why*. Model the intent: `AccountOpened`, `AddressCorrected`, `AccountClosed`.
- **Put the facts in the event, not references to look up later.** An event must be interpretable on its own, years later, without joining to mutable tables. Capture the values that were true at the moment it happened (the price charged, the rate applied) — not a foreign key to a row that will have changed.
- **Give every event an envelope:** a unique id, type, stream id, version, timestamp, and metadata (correlation and causation ids for tracing a command through the events it caused). The domain payload is separate from this envelope.
- **Model events as a discriminated union** with a `type` discriminant and exhaustive handling, exactly like commands and state — the same `never`-guarded switches the DDD skill uses.

---

## Projections and Read Models (CQRS)

You almost never query the event store to answer a user's question — folding a stream per read does not scale, and cross-aggregate queries need data the streams deliberately keep apart. Instead, **project** events into read models: a projection is just another fold, `events.reduce(apply, emptyReadModel)`, whose result is a query-shaped table.

```typescript
// A projection is a fold from events → a read-optimised row
const applyToBalanceView = (view: BalanceView, event: AccountEvent): BalanceView => {
  switch (event.type) {
    case 'AccountOpened':   return { ...view, currency: event.currency, balance: 0 };
    case 'MoneyDeposited':  return { ...view, balance: view.balance + event.amount };
    case 'MoneyWithdrawn':  return { ...view, balance: view.balance - event.amount };
    default: { const _: never = event; return _; }
  }
};
```

- **Inline (synchronous) projections** update in the same transaction as the append — no lag, but they couple write throughput to projection work. **Async projections** subscribe to the event stream and update separately — they scale and isolate failures, at the cost of **eventual consistency** (a read model may lag the write by milliseconds).
- **Eventual consistency is the headline trade-off.** A user who just issued a command may not immediately see it reflected in an async read model. Design the UI for it (return the just-written state from the command, show optimistic UI) rather than pretending the lag does not exist.
- **Projections are disposable.** Track a **checkpoint** (the last event position processed); to rebuild, reset the read model and the checkpoint to zero and replay. This is how you add a brand-new read model over years of existing history, and how you fix a buggy projection.
- **Projections must be idempotent.** Delivery is at-least-once, so applying the same event twice must not double-count. Key on the **event id** or **global position** (unique store-wide); a bare stream `version` only suffices when the read-model row is scoped to a single stream, because versions repeat across streams.

This is the write/read split from the hexagonal skill's CQRS-lite, taken to its full form: writes go through the decider + event store; reads go through projected read models. See `projections-and-read-models.md`.

---

## Testing Event-Sourced Systems

Event sourcing is one of the most testable patterns there is, because the write model is pure: **events in → state → command → events out**, all plain data.

The event-sourcing literature almost universally reaches for a **given-when-then** shape here — *given* these past events, *when* this command is handled, *then* expect these new events — often as a fluent `given(...).when(...).then(...)` DSL or Gherkin scenarios. It reaches for it for a good reason: **that shape is the decider's algebra.** Past events fold to state, a command is applied, and the assertion is on the resulting events. It is worth understanding *why* the pattern fits so well.

**But in this repo we do not write given-when-then, and we do not use that DSL.** We do behaviour-driven testing (see the `testing` skill): call the public function, assert on the observed output, name the test after the business behaviour, build data with factories. The decider's shape maps onto that cleanly — no new machinery required:

- **"given past events"** → build the starting state with a factory, or fold event factories with `evolve`. (Past events are just data.)
- **"when a command"** → call the public function directly (`decide`, or the command handler).
- **"then expect events"** → `expect(...)` on the returned events — the events *are* the observable output of `decide`.

```typescript
// ✅ Ordinary behaviour-driven test — no given/when/then DSL, no Gherkin.
// The returned events are the observable behaviour of the public `decide` function.

const openAccount = (currency: Currency = 'GBP'): AccountEvent =>
  ({ type: 'AccountOpened', currency });
const deposited = (amount: number): AccountEvent => ({ type: 'MoneyDeposited', amount });

it('should reject a withdrawal that exceeds the balance', () => {
  const state = [openAccount(), deposited(50)].reduce(evolve, initialState);

  const decision = decide({ type: 'Withdraw', amount: 100 }, state);

  expect(decision).toEqual({ accepted: false, reason: 'insufficient-funds' });
});

it('should record a deposit as a MoneyDeposited event on an open account', () => {
  const state = [openAccount()].reduce(evolve, initialState);

  const decision = decide({ type: 'Deposit', amount: 50 }, state);

  expect(decision).toEqual({ accepted: true, events: [{ type: 'MoneyDeposited', amount: 50 }] });
});
```

The starting state comes from folding factory-built events, the "action" is a direct call, and the assertion is on the returned data — behaviour through the public API, per the `testing` skill. No event bus, no mocks, no DSL. Use a factory for *every* event in the fold, not inline literals — an inline event literal in the array widens its `type` discriminant to `string`, the array stops being `AccountEvent[]`, and `reduce(evolve, …)` no longer type-checks. Test **projections** and **upcasters** the same way (they are folds and pure functions): feed events, assert on the read model or the upcast event. Full patterns — including testing the command handler against an in-memory `EventStore` fake and property-testing the fold — are in `testing-event-sourced-systems.md`.

---

## Snapshots (Briefly)

A snapshot is a stored fold result — `{ version: 240, state: {…} }` — so you can rehydrate from the snapshot plus the events *after* it, instead of from event zero. **A snapshot is a cache, never the source of truth:** delete every snapshot and the system must be identical after rebuilding them from events. Most streams are short enough that you never need one — reach for snapshots only when a stream grows large enough that replay is measurably slow, and never before. See `production-concerns.md`.

---

## Anti-Patterns

- **Event sourcing everywhere.** Applying it to the whole system instead of the one or two contexts whose history is part of the domain. Most contexts are CRUD; leave them CRUD.
- **CRUD events.** `Created`/`Updated`/`Deleted` events that mirror table writes. They capture that data changed, not what happened. Model intent.
- **No versioning strategy.** Shipping v1 events with no plan for evolving them. Because events are immutable and permanent, you *will* need to read old shapes with new code — decide the tolerant-reader / upcasting strategy on day one (`event-versioning.md`).
- **Rejecting in `evolve`.** Putting validation or business rules in `evolve`, so replaying old history can fail. `evolve` must total over every event the store could ever hand it. Rules live in `decide`.
- **Mutable events.** "Fixing" a bug by editing or deleting past events. The fix is a new compensating event. The moment you edit history, replay is no longer trustworthy and the pattern's core promise is broken.
- **Snapshot as source of truth.** Treating snapshots as authoritative rather than a rebuildable cache. If you cannot delete all snapshots and rebuild, you have lost the event log's guarantee.
- **The event store as an integration bus.** Letting other services subscribe directly to your internal domain events couples them to your write model's shape. Publish deliberate, versioned integration events instead (the distinction is in the DDD `domain-events.md`).
- **Fat events / God streams.** Events carrying huge blobs, or one giant stream for everything instead of one stream per aggregate. Both destroy the consistency-boundary and replay-cost model.
- **Ignoring eventual consistency.** Building UIs that assume async read models are instantly up to date. Design for the lag.
- **Skipping expected version.** Appending without optimistic concurrency, so concurrent commands silently violate invariants.

---

## Checklist

- [ ] Event sourcing was chosen because history is part of the domain — not as a default, and scoped to specific bounded contexts
- [ ] A cheaper rung (explicit returns, audit table, outbox) was ruled out first
- [ ] Events are past-tense, business-named, and intention-revealing — no CRUD events
- [ ] Events are self-contained data (values captured, not mutable references), modelled as discriminated unions
- [ ] Every event has an envelope (id, type, stream id, version, timestamp, correlation/causation metadata)
- [ ] `decide` holds all business rules and returns accept-with-events or reject-with-reason
- [ ] `evolve` is total — it never rejects or validates, so replay of old events always succeeds
- [ ] State is rebuilt by folding `evolve`; nothing stores current state as the source of truth
- [ ] Appends use optimistic concurrency (expected version); conflicts are handled by reload-and-retry
- [ ] The event store is a driven port; the domain has zero infrastructure imports
- [ ] Stored events are validated with a schema (tolerant reader) on read, at the trust boundary
- [ ] A versioning strategy exists before the first event ships (tolerant reader and/or upcasters)
- [ ] Read models are projections (folds) that can be rebuilt from event zero via a checkpoint
- [ ] Projections are idempotent and the UI accounts for eventual consistency
- [ ] Snapshots (if any) are a rebuildable cache, never authoritative
- [ ] Tests are behaviour-driven — public API, observed events/state/result, factories — not a given-when-then DSL
- [ ] PII strategy decided if events hold personal data (see crypto-shredding in `production-concerns.md`)
