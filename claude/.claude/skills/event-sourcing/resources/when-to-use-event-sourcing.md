# When to Use Event Sourcing

Event sourcing is a high-ceiling, high-cost pattern. Applied to the right bounded context it is transformative; applied by default it is the thing a later team rips out. This resource is the decision framework and the vocabulary to tell event sourcing apart from the patterns it is most often confused with.

## The One Question

**Is the history of what happened part of the domain — not just a nice-to-have?**

If the business genuinely reasons in terms of past events ("the policy lapsed", "the shipment was rerouted", "the limit was raised then breached"), needs to reconstruct or audit past state, or wants to derive several independent views from the same facts, event sourcing pays for itself. If the business only cares about the *current* state and history is at most a log you occasionally read, it does not.

Greg Young: *"The largest failure I see from people using event sourcing is that they try to use it everywhere."* Martin Fowler, on the retroactive-correction machinery: *"Clearly this stuff can get very messy, don't go down this path unless you really need to."* Take both seriously. Event sourcing is a **per-bounded-context** choice, never a system-wide default.

## Decision Framework

| Question | If yes → |
|----------|----------|
| Is a complete, immutable audit trail / full domain history a hard requirement (finance, health, compliance)? | Event sourcing is a strong fit |
| Do you need to reconstruct past state, replay to reproduce bugs, or answer questions not anticipated when the data was written? | Event sourcing is a strong fit |
| Does the domain have rich behaviour and lifecycle (not just fields being edited)? | Event sourcing is a candidate |
| Do you need multiple read models over the same facts, added retroactively? | Event sourcing is a candidate |
| Is it CRUD — forms over data, no meaningful history? | **No.** Store current state |
| Do you only need "who changed what when"? | **No.** Add an append-only audit table |
| Do you only need to notify other services of changes? | **No.** Domain events + outbox (event-*driven*, not event-*sourced*) |

Two "strong fit" answers, or a genuinely event-shaped domain, justify the cost. Otherwise climb a cheaper rung.

**A note on "tamper-evident."** Event sourcing gives you a *complete* domain history by construction, but append-only application logic is not by itself tamper-*evidence*: a DBA, a schema migration, or a compromised credential can still alter rows. If you need provable integrity, add controls on top — hash-chaining the events, WORM/immutable storage, restricted write permissions, or external audit logging. Event sourcing makes those easier; it does not supply them for free.

## The Complexity Ladder

The DDD skill's `domain-events.md` ends where this skill begins. The full ladder:

1. **Explicit return values** — a domain function returns its result; the use case acts on it. No events, no indirection. Most code lives here.
2. **In-process domain events** — cross-aggregate coordination within one transaction, dispatched in-process.
3. **Outbox pattern** — reliable at-least-once delivery of events to other services, saved in the same transaction as the state change.
4. **Event sourcing** — events *are* the persistence. The state is a fold of the log.

Climb one rung at a time, and only when the rung you are on cannot express what you need. Rungs 1–3 keep current state as the source of truth and treat events as *outputs*. Rung 4 inverts that: events become the *input* to state. That inversion is the whole cost and the whole power — do not pay it for coordination you can get from rung 3.

## The Costs You Are Signing Up For

Adopt event sourcing with eyes open. You are taking on, permanently:

- **Eventual consistency.** Read models lag writes. The UI must be designed for it (see `projections-and-read-models.md`).
- **Event versioning.** Events are immutable and live forever, so old shapes must be readable by new code — decide the strategy on day one (`event-versioning.md`).
- **No ad-hoc queries.** You cannot `SELECT ... WHERE` against the log for current state; every query needs a projection. Young: *you need read models because the event store only answers get-by-id.*
- **The replay/external-effects hazard.** Fowler: *"if these events cause update messages to be sent to external systems … things will go wrong because those external systems don't know the difference between real processing and replays."* Side effects belong in handlers, never in `evolve`.
- **A steeper learning curve** and a smaller hiring pool who have done it well.

## Event Sourcing Is Not…

These are the four confusions that cause the most damage. Get the distinctions crisp.

### …CQRS
**Orthogonal patterns, frequently combined.** CQRS separates the write model from read models; event sourcing chooses events as the write model's storage. You can do CQRS without event sourcing — that is the hexagonal skill's **CQRS-lite** (one database, query functions that JOIN freely). In practice event sourcing almost always *drives* CQRS: because the log only answers get-by-id, you project events into read models to serve queries. Young's directional rule of thumb: *"You can use CQRS without Event Sourcing, but with Event Sourcing you must use CQRS"* — treat it as practical advice, not a formal law (the patterns are independent; Fowler considers CQRS optional and warns it *"adds risky complexity"*).

### …event-driven architecture
*"Event-driven"* is an overloaded umbrella. Fowler names four different patterns hiding under it: **event notification**, **event-carried state transfer**, **event sourcing**, and **CQRS**. Notification and carried-state-transfer are about *messaging between systems*; event sourcing is about *persistence within one system*. Publishing an event to tell another service something happened is event-*driven* and needs no event store. Only storing events as your source of truth is event sourcing.

### …event streaming (Kafka)
Different tools that merely integrate. Oskar Dudycz: *"Event Sourcing is about durable state stored and read as events, and Event Streaming is about moving events from one place to another."* Kafka lacks the two operations an event store exists to provide — **load a single aggregate's events** and **append with optimistic concurrency** — so it is a poor primary event store, though excellent for propagating events *between* services once they leave your context.

### …an audit log or CDC
The difference is the **direction of truth**. In event sourcing, events are primary and state is derived. In change-data-capture / an audit log, database *state* is primary and the log is a derived side effect. A 100%-reliable audit log is a *free benefit* of event sourcing, but it is not the point — and the reverse (treating a CDC row-change stream as your domain event stream) couples every consumer to your physical schema. Kislay Verma: *"some people propose to use the CDC stream as a system's event stream, and this is where I completely disagree."*

## If You Decide Against It

That is the common, correct outcome. Reach instead for: current-state storage with the DDD/hexagonal patterns; an append-only history table for audit; the **outbox pattern** for reliable cross-service events (DDD `domain-events.md`); and **CQRS-lite** for read/write separation (hexagonal `cqrs-lite.md`). You can adopt event sourcing later for one context without rewriting the rest — the Decider you already wrote is the migration path.
