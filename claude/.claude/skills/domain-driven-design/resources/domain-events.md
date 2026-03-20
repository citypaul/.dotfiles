# Domain Events

Domain events represent something that happened in the domain that other parts of the system may need to react to. They are named in past tense using business language: `OrderPlaced`, `ContributionPledged`, `BudgetExceeded`.

## When Domain Events Earn Their Complexity

Domain events add indirection. Use them when the benefit outweighs that cost:

- **Cross-aggregate side effects** — placing an order needs to update inventory (different aggregate)
- **Cross-context communication** — the ordering context needs to notify the shipping context
- **Open/Closed principle** — new reactions to an event without modifying the original code
- **Audit/compliance** — recording what happened and when

## When to Avoid Domain Events

- **Same-aggregate logic** — if the side effect is within the aggregate, just do it in the state transition
- **Same-transaction scope** — if all consumers are in the same transaction, explicit return values are simpler and more traceable
- **Simple domains** — CRUD with no cross-aggregate coordination doesn't need events

As Khorikov notes: "If all the consumers of an event reside within the same database transaction, domain events add very little value." Prefer explicit, traceable code over indirection.

## The Decider Pattern (Functional Approach)

The Decider (Chassaing, 2021) separates business decisions from state changes. Three pure functions:

```typescript
// 1. Decide: command + current state → events (the business decision)
const decide = (command: OrderCommand, state: OrderState, now: Date): readonly OrderEvent[] => {
  switch (command.type) {
    case 'place': {
      if (state.status !== 'draft') return [];
      return [{ type: 'OrderPlaced', items: state.items, placedAt: now }];
    }
    case 'ship': {
      if (state.status !== 'placed') return [];
      return [{ type: 'OrderShipped', trackingNumber: command.trackingNumber }];
    }
    default: { const _: never = command; return _; }
  }
};

// 2. Evolve: state + event → new state (pure state transformation)
const evolve = (state: OrderState, event: OrderEvent): OrderState => {
  switch (event.type) {
    case 'OrderPlaced': return { ...state, status: 'placed', placedAt: event.placedAt };
    case 'OrderShipped': return { ...state, status: 'shipped', trackingNumber: event.trackingNumber };
    default: { const _: never = event; return _; }
  }
};

// 3. Initial state
const initialState: OrderState = { status: 'draft', items: [] };
```

**Why Decider works for functional TypeScript:**
- `decide` and `evolve` are pure functions — trivially testable
- Events are immutable data — discriminated unions with exhaustive handling
- The pattern separates "what should happen?" (decide) from "what does this mean for state?" (evolve)

## The Simpler Alternative: Explicit Returns

For many domains, returning the result directly from domain functions is clearer than publishing events:

```typescript
// No events needed — explicit return value
const pledgeContribution = (
  occasion: Occasion,
  contributor: Contributor,
  amount: Money,
): PledgeResult => {
  if (amount.amount > contributor.walletBalance.amount) {
    return { success: false, reason: 'insufficient-balance' };
  }
  return {
    success: true,
    occasion: addContribution(occasion, { contributorId: contributor.id, amount }),
    contributor: deductBalance(contributor, amount),
  };
};
```

The use case receives the result and decides what to do next. No event bus, no subscribers, no indirection. Start here. Add events when explicit returns can't express the coordination you need.

## Domain Events vs Integration Events

| | Domain Event | Integration Event |
|--|-------------|-------------------|
| Scope | Within a bounded context | Across bounded contexts or services |
| Delivery | In-process, possibly synchronous | Message bus, always asynchronous |
| Payload | Domain types | Serializable DTOs (shared schema) |
| Example | `OrderPlaced` triggers inventory check | `OrderPlaced` notifies shipping service |

## Naming Conventions

- **Past tense**: `OrderPlaced`, not `PlaceOrder` (that's a command)
- **Business language**: `BudgetExceeded`, not `ThresholdBreached`
- **Specific**: `ContributionPledged`, not `DataUpdated`

## Dispatching Events

Producing events (via `decide` or explicit returns) is only half the picture. Events must reach their consumers. Choose the simplest mechanism that meets your reliability needs.

### In-Process Dispatch (Simplest)

The use case collects events and passes them to handlers directly. No infrastructure needed.

```typescript
const handlePlaceOrder = async (
  orderRepo: OrderRepository,
  notifier: OrderNotifier,
  command: PlaceOrderCommand,
  now: Date,
): Promise<PlaceOrderResult> => {
  const order = await orderRepo.findById(command.orderId);
  if (!order) return { success: false, reason: 'not-found' };

  const events = decide(command, order, now);
  const newState = events.reduce(evolve, order);
  await orderRepo.save(newState);

  // Dispatch events in-process — simple, but events are lost if the process crashes
  for (const event of events) {
    await notifier.notify(event);
  }
  return { success: true, order: newState };
};
```

Good enough for: side effects within the same service where eventual delivery is acceptable. If the process crashes between save and notify, events are lost.

### Outbox Pattern (Reliable)

For reliable delivery, save events alongside the aggregate in the same transaction. A separate process reads the outbox and publishes to a message broker.

```typescript
// Use case saves aggregate + events in one transaction
const handlePlaceOrder = async (
  orderRepo: OrderRepository,
  eventOutbox: EventOutbox,
  command: PlaceOrderCommand,
  now: Date,
): Promise<PlaceOrderResult> => {
  const order = await orderRepo.findById(command.orderId);
  if (!order) return { success: false, reason: 'not-found' };

  const events = decide(command, order, now);
  const newState = events.reduce(evolve, order);

  // Both saved in the same transaction — events can't be lost
  await orderRepo.save(newState);
  await eventOutbox.save(events);

  return { success: true, order: newState };
};

// EventOutbox port — driven adapter
interface EventOutbox {
  readonly save: (events: readonly OrderEvent[]) => Promise<void>;
}
```

A background worker polls the outbox table and publishes to the message broker. This guarantees at-least-once delivery — consumers must be idempotent.

Use when: events must not be lost, cross-service communication, audit requirements.

### When to Use Which

| Mechanism | Reliability | Complexity | Use when |
|-----------|------------|------------|----------|
| Explicit returns (no events) | N/A | Lowest | Side effects within same aggregate |
| In-process dispatch | At-most-once | Low | Non-critical notifications, same service |
| Outbox pattern | At-least-once | Medium | Cross-service, must not lose events |
| Full event sourcing | Complete history | High | Audit trail, temporal queries, replay |

Start with explicit returns. Move to in-process dispatch when you need cross-aggregate coordination. Move to outbox when you need reliability. Move to event sourcing only when you need the event history itself.

## Process Managers (Long-Running Workflows)

When a business process spans multiple aggregates over time and may need compensation on failure, use a process manager — a stateful coordinator that reacts to events and issues commands.

```typescript
// Process manager state tracks workflow progress
type GiftPurchaseProcess =
  | { readonly step: 'awaiting-payment'; readonly occasionId: OccasionId }
  | { readonly step: 'awaiting-shipment'; readonly paymentId: string }
  | { readonly step: 'complete'; readonly trackingNumber: string }
  | { readonly step: 'failed'; readonly reason: string };

// React to events, issue next command or compensate
const advanceGiftPurchase = (
  state: GiftPurchaseProcess,
  event: GiftPurchaseEvent,
): { readonly newState: GiftPurchaseProcess; readonly commands: readonly GiftPurchaseCommand[] } => {
  switch (event.type) {
    case 'PaymentSucceeded':
      return {
        newState: { step: 'awaiting-shipment', paymentId: event.paymentId },
        commands: [{ type: 'ShipGift', paymentId: event.paymentId }],
      };
    case 'PaymentFailed': {
      if (state.step !== 'awaiting-payment') return { newState: state, commands: [] };
      return {
        newState: { step: 'failed', reason: 'payment-declined' },
        commands: [{ type: 'ReleaseBudgetHold', occasionId: state.occasionId }],
      };
    }
    case 'GiftShipped':
      return {
        newState: { step: 'complete', trackingNumber: event.trackingNumber },
        commands: [],
      };
    default: { const _: never = event; return _; }
  }
};
```

Process managers are pure functions — same Decider-like pattern (state + event → new state + commands). They coordinate; they don't own business rules. Test them the same way: pass events in, assert state and commands out.

**Use process managers when:**
- A workflow spans multiple aggregates and takes time (not a single request)
- Failure at step N requires compensating actions for steps 1..N-1
- The workflow has business-meaningful intermediate states

**Don't use process managers when:**
- The workflow completes in a single request (use a domain service)
- There's no compensation needed (use simple event dispatch)

## Testing Domain Events

Events returned from `decide` are plain data — test them like any other return value:

```typescript
it('produces OrderPlaced event when placing a draft order', () => {
  const now = new Date('2026-03-20');
  const state: OrderState = { status: 'draft', items: [testItem] };
  const events = decide({ type: 'place' }, state, now);
  expect(events).toEqual([
    { type: 'OrderPlaced', items: [testItem], placedAt: now },
  ]);
});

it('produces no events when placing an already-placed order', () => {
  const now = new Date('2026-03-20');
  const state: OrderState = { status: 'placed', items: [testItem], placedAt: someDate };
  const events = decide({ type: 'place' }, state, now);
  expect(events).toEqual([]);
});
```

No mocks, no event bus setup, no subscriber verification. Test the decision, not the plumbing.
