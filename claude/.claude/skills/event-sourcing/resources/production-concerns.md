# Production Concerns

Event sourcing's hardest lessons are operational. This resource covers snapshots, cross-aggregate consistency, delivery guarantees, correcting mistakes, GDPR in an append-only log, and the full anti-patterns catalogue.

## Snapshots

A snapshot is a stored fold result — `{ version: 240, state: {…} }` — so you can rehydrate from the snapshot plus the events *after* it instead of from event zero. It is a memoization of the fold; Greg Young: *"a snapshot is just a memoization of the foldLeft operation at a given point."*

- **Snapshot every N events**, not every write. To load, read the snapshot then the (at most N) events after it, and fold those forward.
- **A snapshot is a cache, never the source of truth.** You must be able to delete every snapshot and rebuild identically from events. Test the system both with and without snapshots.
- **You usually do not need one.** Dudycz: *"The need to use snapshots may hint to the model's design flaw."* Prefer **short streams** (below) over snapshots — a stream of a few dozen events replays in microseconds. Reach for snapshots only when a stream is genuinely long-lived and replay is measurably slow, and never pre-emptively.

## Keep Streams Short

Long streams hurt on four axes: replay performance, versioning burden (an old event's schema must be supported for as long as the stream lives), operational cost, and cognitive load. Model streams with an explicit **lifetime — a start event and an end event** — instead of one stream that grows forever.

**Closing the books** (from accounting) is the key pattern: at a natural business boundary (a day, a shift, a billing period) emit a **summary event** capturing the closing totals, and start a fresh stream whose opening balance is that summary. Replays then read the summary plus recent events, never all of history. This is the modelling-level answer to long streams; snapshots are only the performance-level fallback. Nuance (Dudycz): streams that model slow-changing entities (a company's address) are fine long — short-stream discipline is for entities with an active business lifecycle.

## Cross-Aggregate Consistency: Sagas and Process Managers

The stream/aggregate is the consistency boundary: **you never rely on a cross-stream transaction to keep an aggregate's invariants true** (some stores *can* append to several streams atomically, but a well-modelled aggregate never needs it). When one command must affect several aggregates, use eventual consistency across the boundary (Vaughn Vernon: *"If executing a command on one Aggregate instance requires that additional business rules execute on one or more other Aggregates, use eventual consistency"*).

Coordinate multi-aggregate, possibly long-running work with a **process manager / saga** — a stateful reactor that consumes events and issues commands, decomposing the work into locally-atomic steps with **compensating actions** for rollback. Keep it as a pure function of `(state, event) → [newState, commands]`, exactly the shape the DDD skill's `domain-events.md` describes. Never reach for a distributed transaction across aggregates.

## Delivery Guarantees and Idempotency

There are three delivery semantics, and only two are achievable:

- **At-most-once** — a failed message is lost.
- **At-least-once** — the message always arrives, but possibly more than once. **This is what you build on.**
- **Exactly-once delivery is a myth** (Two Generals / FLP). Tyler Treat: *"Within the context of a distributed system, you cannot have exactly-once message delivery … The way we achieve exactly-once delivery in practice is by faking it."*

You "fake" exactly-once with **idempotent processing plus deduplication**: give every event a store-wide-unique id (or use its global position), and make consumers no-op on one they have already processed — a unique constraint on processed event ids, or the checkpoint-in-the-same-transaction trick from `projections-and-read-models.md`. (A bare stream `version` is not a safe dedupe key across streams — it repeats — so use it only paired with the stream id, or when the consumer's state is scoped to one stream.) Effective exactly-once *processing* on top of at-least-once *delivery* is achievable; exactly-once delivery is not.

**The outbox pattern** solves the dual-write problem when publishing events to other services: save the events to an outbox table **in the same transaction** as the state change, and a background process publishes them afterwards, so a crash between "save state" and "publish" cannot lose them. (Covered in the DDD skill's `domain-events.md`; it applies unchanged here.)

## Correcting Mistakes: There Is No Delete

If a bug writes wrong events, or a user makes a mistake, you **do not edit or delete** the events — the past does not change. You append a **compensating event** that corrects the record going forward, exactly as an accountant posts a reversing entry rather than erasing ink. Greg Young: a delete must be modelled *"as a new transaction … a Reversal Transaction."* Savvas Kleanthous advises a **full reversal event** plus a corrected replacement (correlated via metadata) over a partial reversal, and *"Deleting events, even wrong ones, is also something I would advise you to avoid."*

The operational tax is real: fixing the *code* does not fix *history*. Bad events already written must be handled by compensating events and/or tolerated by upcasters during replay. Budget for this — it is the flip side of an immutable audit trail.

## GDPR and PII: Crypto-Shredding

An append-only, immutable log collides head-on with the GDPR "right to erasure". The standard **technical** answer is **crypto-shredding** (Mathias Verraes):

> *"Encrypt the sensitive attributes, with a different encryption key for each resource (such as a customer). … When the sensitive information needs to be erased, delete the encryption key instead, to ensure the information can never be accessed again."*

Deleting one small key makes all of that subject's PII across the whole log permanently unreadable, without mutating a single event — *"it makes deletions extremely cheap."* The cost is on-the-fly encrypt/decrypt on every read/write of PII fields.

Important caveats to carry, not bury:
- **Encrypted PII may still be PII in law.** Harrison Brown, quoted by Verraes: *"encrypted personal data is still personal data, regardless of whether anyone has the key."* Crypto-shredding is the accepted engineering technique, but treat the legal sufficiency as unsettled and get compliance sign-off.
- **Consumers may have copied the data.** Shredding the source key does nothing about a downstream system that decrypted and stored the plaintext, or computed a derived value from it.
- **Today's encryption is tomorrow's break.** Verraes: *"Today's unbreakable encryption could be tomorrow's infosec disaster."*

Complementary techniques (Dudycz): the **forgettable payload** (store PII behind a URN/link you can revoke, keeping only the reference in the event); **data segregation** (never mix personal and non-personal data in the same stream) and **retention policies** (short retention can itself satisfy erasure timelines). Whichever you pick, remember erasing PII means you must also **rebuild the read models** derived from it.

## Operability

- **The event log is what you back up** — it is the source of truth. Read models, snapshots, and projections are derived and rebuildable, so they are recovery conveniences, not backup obligations.
- **Replay is a superpower and a safety net.** A corrupted or buggy read model is dropped and rebuilt from the log; a new read model is populated retroactively the same way. This is both disaster recovery and how you ship new views.
- **Beware replay and external side effects.** Fowler: replaying events must not re-fire real-world effects (emails, payments) — *"those external systems don't know the difference between real processing and replays."* Side effects live in handlers/process managers that run once on the live event, never in `evolve` or in a projection rebuild.

## Anti-Patterns Catalogue

Each with its fix. (The `SKILL.md` lists the headline set; this is the fuller catalogue with sources.)

- **Event sourcing everywhere** — applying it beyond the contexts whose history is part of the domain. *Fix:* one or two bounded contexts; leave the rest CRUD (`when-to-use-event-sourcing.md`).
- **CRUD / state-obsessed events** — `Created`/`Updated`/`Deleted` mirroring table writes. *Fix:* model business facts — "what happened?", not "what changed?" (`modelling-events.md`).
- **Clickbait / thin events** — an event carrying only an id, forcing callbacks. *Fix:* put the fact in the event.
- **The event store as an integration bus** — letting other contexts subscribe to your internal events, so *"your persistence becomes your public API"* (Libutzki). *Fix:* publish separate, versioned external events (`modelling-events.md`).
- **Giant / unbounded streams** — one ever-growing stream. *Fix:* short streams + closing the books.
- **No versioning strategy** — v1 events with no plan to read them from v2 code. *Fix:* tolerant reader + upcasters from day one (`event-versioning.md`).
- **Rejecting or validating in `evolve`** — so replay of old events can fail. *Fix:* rules live in `decide`; `evolve` is total.
- **Editing or deleting events to "fix" bugs** — destroys replay trust. *Fix:* compensating events.
- **Snapshot as source of truth** — a snapshot you cannot rebuild. *Fix:* snapshots are a rebuildable cache.
- **Chasing exactly-once delivery** — *Fix:* at-least-once + idempotent, deduplicated processing.
- **Querying the event store for reads** — ad-hoc queries against the log for current state. *Fix:* purpose-built projections.
- **Ignoring eventual consistency** — UIs that assume async read models are instant. *Fix:* design for lag (`projections-and-read-models.md`).
- **Skipping optimistic concurrency** — appends without an expected version, so concurrent commands violate invariants. *Fix:* always append with expected version and reload-re-decide on conflict.
