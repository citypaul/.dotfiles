# Modelling Events

Events are the most permanent artefact in an event-sourced system — you will replay them for the life of the system. Time spent modelling them well is repaid many times over. This resource covers discovering events (EventStorming), the command/event distinction, granularity, and the naming anti-patterns.

## Discovering Events: EventStorming

EventStorming (Alberto Brandolini) is a collaborative workshop for discovering the events, commands, and boundaries of a domain on a wall of sticky notes. It is the recommended front-end to event-sourced (and DDD) modelling because its output *is* the shape of a write model.

**Run it at increasing resolution:**
- **Big Picture** — the whole business line end-to-end. Surfaces boundaries and gaps fast; used to find bounded contexts.
- **Process Modelling** — one process in detail, adding commands, actors, policies, read models, and external systems.
- **Design-Level** — per-aggregate detail that feeds the write model directly. Here an aggregate emerges as a **cluster of commands and the events they produce**.

**The colour grammar** (the colours are load-bearing — keep them consistent):

| Sticky | Colour | Meaning |
|--------|--------|---------|
| Domain Event | Orange | A verb in the past tense — something that happened that experts care about. The timeline backbone. |
| Command | Blue | A decision, action, or intent that triggers an event. |
| Actor | Small yellow | The person or role that issues a command. |
| Aggregate | Large yellow | The consistency boundary that receives commands and emits events. |
| Policy | Lilac / purple | "Whenever X happens, do Y" — the reactive rule that turns an event into the next command. |
| Read Model | Green | The information an actor needs to decide. |
| External System | Pink | A third party or other context at the edge. |
| Hotspot | Rotated neon pink | A conflict, open question, or disagreement — parked for later. |

**The core loop** is the single most important thing to take away, because it is literally the shape of an event-sourced write model:

```
Actor → Command (blue) → Aggregate (yellow) → Domain Event (orange) → Policy (purple) → Command → …
```

with Read Models (green) feeding the actor's decisions and External Systems (pink) at the edges.

**Pivotal events** are the few most significant events (Order Placed, Payment Received, Shift Closed) that mark major state transitions. They are the primary signal for **bounded-context and stream boundaries** — they usually mark where one aggregate's lifecycle ends and the next begins. Place them first, then fill in between them. This directly feeds the short-stream / "closing the books" modelling in `production-concerns.md`.

## Commands vs Events

The command/event distinction is the axis the whole model turns on. Confusing them produces the "passive-aggressive event" anti-pattern below.

| | Command | Event |
|--|---------|-------|
| Intent | Imperative request to *do* something | A fact that *already happened* |
| Naming | Imperative — `PlaceOrder` | Past tense — `OrderPlaced` |
| Recipients | One handler | Broadcast to 0..N subscribers |
| Outcome | **May be rejected** | Can only be **ignored** |
| Stored? | No | Yes — it is the source of truth |

The tell, from Dudycz: *"commands can be rejected by the command handler. Events can only be ignored."* If a message must be acknowledged or refused on a blocking path (payment, shipment), it is a command — model it explicitly. If it merely announces a fact that others may react to, it is an event.

## Naming Events

- **Past tense, business language.** `SubscriptionCancelled`, `SeatReserved`, `FundsWithdrawn`. Greg Young: *"All events should be represented as verbs in the past tense such as CustomerRelocated, CargoShipped, or InventoryLossageRecorded."*
- **Intention-revealing, not technical.** The name should carry the business reason. `OrderShippingAddressCorrected` says why; `OrderUpdated` says nothing.
- **Never put "and" in an event name.** It signals two facts crammed into one and guarantees future versioning pain. Split into two events.

## What Goes In an Event

An event must be a **self-contained business fact** — interpretable on its own, years later, without joining to mutable tables.

- **Capture the values that were true at the moment it happened** — the price charged, the tax rate applied, the result returned by an external service. Not a foreign key to a row that will have changed, and not a value the projection must recompute later. Greg Young's rule: bake behaviour-determining data into the event at creation time, so replay stays deterministic even if the algorithm changes.
- **Always include the relevant IDs**, and prefer copying immutable values over references.
- **Model events as discriminated unions** with a `type` discriminant and exhaustive `never`-guarded handling — the same shape as commands and state (see `typescript-strict` and the `functional` skill).

## Granularity: Thin, Fat, and Summary

Event size is a real design decision with named patterns (Mathias Verraes):

- **Thin event** — carries only what the fact needs. Default for internal events. The failure mode is the *clickbait event*: an event carrying only an id, forcing subscribers to call back to the producer, which reintroduces coupling and race conditions.
- **Fat event** — deliberately adds redundant data so consumers need fewer event types and are better isolated from the producer. Verraes's heuristic: *"consider the number of consumers and their ownership. If a single team owns both the producer and consumer, Fat Events pose less of a risk."* The risk is events that bloat and accrete fields nobody can prove are still used.
- **Summary event** — a single coarse event that concludes a process (`ShiftClosed` with the day's totals), built by a projection over the fine-grained events, for consumers who only care about the outcome.

There is no universal right size; choose per consumer and per boundary.

## Internal vs External Events

The most important granularity decision is the **internal/external split**, and it is the one teams most often skip. Your fine-grained internal events are an implementation detail of your bounded context; the events you publish to *other* contexts are a **contract** and must be designed with the same rigour as a public API.

Dudycz: *"We'll shoot ourselves in the foot if we don't split our events into internal and external. We'll have a leaking abstraction that creates coupling, and it's a first step to the distributed monolith."* Verraes calls the same idea **Segregated Event Layers**: *"Keep all internal events strictly private. Set up an adapter that listens to internal events, and emits a new stream of different events."* The public stream is effectively a different bounded context with its own language — an anti-corruption layer.

Practically: keep internal events free to change; expose a coarse, enriched, versioned external event (often a *summary* or *fat* event) on a separate channel. This is also what buys you versioning freedom internally (`event-versioning.md`).

## Anti-Patterns

- **CRUD / property sourcing** — `Created`/`Updated`/`Deleted` events, or one-event-per-field-change. They record *that data changed*, not *what happened or why*. Dudycz's *State Obsession*: storing `BalanceUpdated {amount}` loses the fact that it was a deposit — *"change your mindset of thinking 'what has changed?' to 'what has happened?'"* Model `MoneyDeposited`, not `BalanceUpdated`.
- **Clickbait event** — an event carrying only an id, so subscribers must query back. Put the fact in the event.
- **Passive-aggressive event** — an event whose real intent is to *trigger* an action in a specific consumer. That is a command in disguise; if the relationship is real and blocking, make it an explicit command.
- **Exposing internal events as your integration contract** — see the internal/external split above; it couples other contexts to your write model's shape.
