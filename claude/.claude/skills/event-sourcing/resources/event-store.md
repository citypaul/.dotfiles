# The Event Store and Storage

The event store is the append-only, ordered, optimistic-concurrency-aware persistence for streams. In hexagonal terms it is a **driven port** with an adapter — the domain depends on the interface, not the technology. This resource covers the port, a concrete Postgres implementation, the event envelope, serialization, and the TS/Node tooling landscape.

## What an Event Store Must Provide

Every event store, whatever the backing technology, must offer four capabilities:

1. **Append-only writes** — events are inserted, never updated or deleted.
2. **Ordering within a stream** — a stream's events have a strict, gapless per-stream version.
3. **Optimistic concurrency** — appends assert an *expected version* and are rejected on mismatch.
4. **Read a stream** — load an aggregate's events (forward, optionally from a version) to rehydrate it.

Production stores add **global ordering** (a store-wide monotonic position for projections) and **subscriptions** (catch-up and/or persistent) so read models can follow the log. Greg Young's minimal framing: an event store *"at its simplest level has only two operations"* — append events for an aggregate, and read events for an aggregate; the get-by-id read is *"the only query that should be executed by a production system against the Event Storage."*

## The Port

Define the port in the domain in application language. Keep it small; this repo models the concurrency failure as a **returned value**, not a thrown exception (per the error-modelling rule):

```typescript
// port (domain layer) — interface because it is a behaviour contract.
// Typed to one aggregate's event family E (like a repository). One physical
// store holds many stream types; the adapter parses stored JSON into E on read,
// so each typed EventStore<E> is a view over the streams of that family.
interface EventStore<E> {
  readonly readStream: (
    streamId: StreamId,
  ) => Promise<{ readonly events: readonly E[]; readonly version: number }>;

  readonly appendToStream: (
    streamId: StreamId,
    events: readonly E[],
    options: { readonly expectedVersion: number },
  ) => Promise<'ok' | 'version-conflict'>;
}
```

Typing the port to `E` (rather than a per-call `readStream<E>`) keeps call sites cast-free and matches the repo's typed-repository convention. `version` is the stream's current version — the number of events it holds. A brand-new stream is version `0`; append with `expectedVersion: 0` to require it not yet exist. Some libraries (Emmett, KurrentDB) **throw** a `ConcurrencyError`/`WrongExpectedVersionException` instead of returning a status; if you adopt one of those, translate the throw into a result at the adapter boundary so the domain stays exception-free for expected outcomes.

A fuller port adds `subscribe`/`readAll` for async projections — keep those on a separate port so a use case that only writes does not depend on subscription machinery.

## A Postgres Event Store

Postgres is the pragmatic default: one table, a concurrency constraint, transactional appends. The canonical single-table schema (after Kasey Speakman, with a first-class event `id`):

```sql
CREATE TABLE event (
    global_position  bigserial   NOT NULL,          -- store-wide order (projections)
    id               uuid        NOT NULL,           -- unique event id (idempotency + causation target)
    stream_id        uuid        NOT NULL,           -- the aggregate instance
    version          int         NOT NULL,           -- per-stream position (1, 2, 3, …)
    type             text        NOT NULL,           -- event type name, e.g. 'MoneyDeposited'
    data             jsonb       NOT NULL,           -- domain payload
    metadata         jsonb       NOT NULL,           -- envelope: correlation/causation/etc.
    logged_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (global_position),
    UNIQUE (stream_id, version),                      -- ← this IS optimistic concurrency
    UNIQUE (id)                                       -- event id unique store-wide (dedupe + causation)
);
```

**The `UNIQUE (stream_id, version)` constraint is the concurrency-control mechanism.** To append with expected version `N`, insert rows at versions `N+1, N+2, …` inside a transaction. If a concurrent writer already took version `N+1`, the unique constraint raises a violation, the transaction rolls back, and your adapter returns `'version-conflict'`. No explicit locks required.

```sql
BEGIN;
-- expectedVersion = N; insert the new events at N+1, N+2, …
INSERT INTO event (id, stream_id, version, type, data, metadata)
VALUES ($1, $2, $3, $4, $5, $6);  -- a (stream_id, version) violation here means version-conflict → rollback
COMMIT;
```

Two caveats worth knowing: a bare `bigserial` can commit out of order under concurrency (gaps/reordering as seen by a reader), so if a projection needs a strictly gapless global order, use a dedicated transactional counter or a store that guarantees it. And the alternative to the constraint approach is a `write_message`-style stored function (message-db, Marten) that centralises the version check server-side — equivalent guarantee, different place.

## The Event Envelope

Separate the **domain payload** from the **envelope** of storage/tracing metadata. A good stored shape:

```typescript
type EventEnvelope<T extends string, TData> = {
  readonly id: string;             // unique event id (UUID) — idempotency + causation target
  readonly type: T;                // event type name (a string, for tolerant deserialization)
  readonly streamId: string;       // the aggregate instance
  readonly version: number;        // per-stream position (optimistic concurrency)
  readonly globalPosition: bigint;  // store-wide order (subscriptions/projections)
  readonly timestamp: string;      // ISO-8601, assigned on commit
  readonly data: TData;            // the domain payload
  readonly metadata: {
    readonly correlationId: string; // ties one whole business transaction together
    readonly causationId: string;   // the id of the message that directly caused this event
    // + optional: userId, tenantId, schemaVersion
  };
};
```

**Correlation vs causation** is the pair that makes an event log traceable, and the rule (Greg Young, popularised by Arkency) is precise:

> *"If you are responding to a message, copy its correlation id as your correlation id, its message id is your causation id."*

So when a handler emits new events in response to an incoming message: `correlationId` = the incoming message's correlationId (or, if it is the first, its own id) — this lets you see an entire business transaction; `causationId` = the incoming message's id — this lets you reconstruct the exact causal tree of what caused what. EventStoreDB/KurrentDB and Marten both surface `$correlationId`/`$causationId` as first-class metadata, so this is the de-facto standard.

## Serialization and Validation on Read

Events are stored as JSON (`jsonb` in Postgres) with the **type name travelling as a string**, not a language type — that string is what lets you deserialize tolerantly and evolve versions. On the way in, stored events are untrusted data crossing a trust boundary, so **validate them on read** before `evolve` ever sees them. The order matters: **validate first, then upcast.** Parse the raw record against a *tolerant* schema for the shape that was actually persisted (possibly an old version), then run upcasters on that validated value to reach the current shape — so the upcaster never receives unchecked JSON. This is the **tolerant reader**, and it is exactly the `typescript-strict` rule of schema-first at boundaries, plain types inside.

```typescript
// on read: raw jsonb → validate the stored (possibly old) shape → upcast to current
const toDomainEvent = (raw: unknown): AccountEvent =>
  upcastAccountEvent(StoredAccountEventSchema.parse(raw));
// StoredAccountEventSchema is a tolerant union of every persisted version (unknown
// fields ignored, missing ones defaulted); parse validates what is on disk, then the
// upcaster maps it to the current shape. parse throws only on genuinely corrupt data
// (a bug, not a business case). See event-versioning.md for the upcaster.
```

Never let unvalidated stored JSON flow into an upcaster or into `evolve`; a single malformed row would otherwise corrupt every rehydration of that stream.

## The TS/Node Tooling Landscape

Choose deliberately; the space is young and moving. Balanced summary as of this writing — **verify versions and licences before adopting**:

- **Emmett** (`@event-driven-io/emmett`, Oskar Dudycz) — "event sourcing made simple" for TS/Node. Gives you the `Event`/`Command` types, the Decider trio, a `CommandHandler` wrapping read→decide→append, an `EventStore` abstraction (`readStream`, `aggregateStream`, `appendToStream` with `expectedStreamVersion`), and projections. Pluggable stores: in-memory, PostgreSQL, EventStoreDB, MongoDB, SQLite. **Caveats:** pre-1.0 (the API still moves) and the **licence is unresolved** (an open RFC around AGPLv3/SSPL). Best when you want idiomatic, low-boilerplate deciders with pluggable storage.
- **EventStoreDB / KurrentDB** — the purpose-built, event-native database with server-side subscriptions and projections. The Node client is `@kurrent/kurrentdb-client` (1.x, GA — the rebrand of the legacy `@eventstore/db-client`; construction went connection-string-only at v1, and symbol names like `expectedRevision`/`NO_STREAM` differ across the rebrand, so pin the client and follow its current docs rather than older samples). Best when you want a managed event-sourcing-first store rather than hand-rolling on Postgres.
- **message-db** (Eventide) — an event store that is *just* a Postgres schema plus SQL functions (`write_message` with `expected_version`, `get_stream_messages`, `get_category_messages`). Mature and language-agnostic; richest client tooling is Ruby, so from Node you call the SQL functions directly. Best when you want a well-specified SQL contract on plain Postgres.
- **Marten** (.NET, Postgres) — **reference design only**, not TS. The most mature open-source Postgres event store; excellent to mine for schema (`mt_events`/`mt_streams`), inline/async projections, correlation/causation metadata, and concurrency handling.
- **DynamoDB single-table** (AWS) — a well-supported serverless pattern: table keyed by aggregate id + version, **optimistic concurrency via a conditional write** on the version attribute, fan-out via DynamoDB Streams. You hand-roll more (no built-in fold, no gapless global position). Best for serverless AWS-native stacks.

For most TypeScript projects the honest default is **Postgres** (the table above, or via Emmett/message-db) until scale or an explicit event-native requirement justifies KurrentDB. Do not adopt a pre-1.0 library or an unresolved licence into a long-lived system without a deliberate decision.
