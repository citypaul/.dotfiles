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
type OrderDecision =
  | { readonly accepted: true; readonly events: readonly OrderEvent[] }
  | { readonly accepted: false; readonly reason: 'order-not-draft' | 'order-not-placed' };

// 1. Decide: command + current state → an explicit acceptance or rejection
const decide = (command: OrderCommand, state: OrderState, now: Date): OrderDecision => {
  switch (command.type) {
    case 'place': {
      if (state.status !== 'draft') return { accepted: false, reason: 'order-not-draft' };
      return { accepted: true, events: [{ type: 'OrderPlaced', items: state.items, placedAt: now }] };
    }
    case 'ship': {
      if (state.status !== 'placed') return { accepted: false, reason: 'order-not-placed' };
      return { accepted: true, events: [{ type: 'OrderShipped', trackingNumber: command.trackingNumber }] };
    }
    default: { const _: never = command; return _; }
  }
};

// 2. Evolve: state + event → new state (pure state transformation).
// OrderState is a discriminated union of lifecycle phases (see "Make Illegal
// States Unrepresentable"), so each case builds the full target variant —
// spreading a draft state into a shipped shape would not type-check.
const evolve = (state: OrderState, event: OrderEvent): OrderState => {
  switch (event.type) {
    case 'OrderPlaced': {
      if (state.status !== 'draft') {
        throw new Error(`Corrupt order history: OrderPlaced cannot follow ${state.status}`);
      }
      return { status: 'placed', items: event.items, placedAt: event.placedAt };
    }
    case 'OrderShipped': {
      if (state.status !== 'placed') {
        throw new Error(`Corrupt order history: OrderShipped cannot follow ${state.status}`);
      }
      return { ...state, status: 'shipped', trackingNumber: event.trackingNumber };
    }
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
- Invalid commands are explicit rejections; known events in impossible states surface corrupt persisted history rather than becoming silent no-ops

## The Simpler Alternative: Explicit Returns

For many domains, returning the result directly from domain functions is clearer than publishing events:

```typescript
// No events needed — explicit return value
const pledgeContribution = (
  occasion: Occasion,
  eligibility: ContributorEligibility,
  pledge: { readonly amount: Money },
): PledgeDecision => {
  if (!eligibility.mayPledge) {
    return { success: false, reason: 'contributor-ineligible' };
  }
  if (occasion.isFundingClosed) {
    return { success: false, reason: 'funding-closed' };
  }
  if (
    pledge.amount.currency !== occasion.totalPledged.currency ||
    occasion.totalPledged.currency !== occasion.budget.currency
  ) {
    return { success: false, reason: 'currency-mismatch' };
  }
  const values = [
    occasion.totalPledged.minorUnits,
    occasion.budget.minorUnits,
    pledge.amount.minorUnits,
  ];
  if (!values.every(Number.isSafeInteger)) throw new Error('Invalid Money invariant');
  if (pledge.amount.minorUnits <= 0) {
    return { success: false, reason: 'non-positive-amount' };
  }
  if (occasion.totalPledged.minorUnits > occasion.budget.minorUnits) {
    throw new Error('Invalid Occasion funding invariant');
  }
  if (pledge.amount.minorUnits > occasion.budget.minorUnits - occasion.totalPledged.minorUnits) {
    return { success: false, reason: 'exceeds-budget' };
  }
  const totalPledged = occasion.totalPledged.minorUnits + pledge.amount.minorUnits;
  if (!Number.isSafeInteger(totalPledged)) throw new Error('Money addition overflowed');
  return {
    success: true,
    occasion: { ...occasion, totalPledged: createMoney(totalPledged, pledge.amount.currency) },
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
type StoredOrder = {
  readonly state: OrderState;
  readonly version: number;
};

interface OrderRepository {
  readonly findById: (id: OrderId) => Promise<StoredOrder | undefined>;
  readonly save: (
    state: OrderState,
    options: { readonly expectedVersion: number },
  ) => Promise<'saved' | 'conflict'>;
}

const handlePlaceOrder = async (
  orderRepo: OrderRepository,
  notifier: OrderNotifier,
  command: PlaceOrderCommand,
  now: Date,
): Promise<PlaceOrderResult> => {
  const stored = await orderRepo.findById(command.orderId);
  if (!stored) return { success: false, reason: 'not-found' };

  const decision = decide(command, stored.state, now);
  if (!decision.accepted) return { success: false, reason: decision.reason };
  const events = decision.events;
  const newState = events.reduce(evolve, stored.state);
  const saved = await orderRepo.save(newState, { expectedVersion: stored.version });
  if (saved === 'conflict') return { success: false, reason: 'concurrent-change' };

  // Dispatch in-process — simple but non-durable
  for (const event of events) {
    await notifier.notify(event);
  }
  return { success: true, order: newState };
};
```

The repository compare-and-save prevents two readers from both committing `OrderPlaced`; only the winner dispatches. This still provides no atomic boundary between save and notify. Good enough for stateless, non-critical reactions within the same service: a crash between save and notify can lose the reaction, while retrying after an uncertain response can duplicate it unless the command or handler deduplicates. This is best-effort, non-durable dispatch, not a delivery guarantee.

### Outbox Pattern (Reliable)

For reliable delivery, save events alongside the aggregate in the same transaction. A separate process reads the outbox and publishes to a message broker.

```typescript
// The application contract requires one atomic aggregate + outbox operation.
const handlePlaceOrder = async (
  persistence: PlaceOrderPersistence,
  command: PlaceOrderCommand,
  now: Date,
): Promise<PlaceOrderResult> => {
  const stored = await persistence.findOrderById(command.orderId);
  if (!stored) return { success: false, reason: 'not-found' };

  const decision = decide(command, stored.state, now);
  if (!decision.accepted) return { success: false, reason: decision.reason };
  const events = decision.events;
  const newState = events.reduce(evolve, stored.state);

  // One compare-and-save operation persists aggregate + outbox or neither.
  const saved = await persistence.saveWithOutbox(newState, events, {
    expectedVersion: stored.version,
  });
  if (saved === 'conflict') return { success: false, reason: 'concurrent-change' };

  return { success: true, order: newState };
};

// Application-owned persistence contract — a driven port when hexagonal architecture is used.
interface PlaceOrderPersistence {
  readonly findOrderById: (id: OrderId) => Promise<StoredOrder | undefined>;
  readonly saveWithOutbox: (
    state: OrderState,
    events: readonly OrderEvent[],
    options: { readonly expectedVersion: number },
  ) => Promise<'saved' | 'conflict'>;
}
```

The adapter implements `saveWithOutbox` with one database transaction that updates only where the stored version equals `expectedVersion`. A conflict writes neither aggregate nor outbox row, so concurrent requests cannot publish duplicate `OrderPlaced` events. A background worker polls the outbox table and retries publication to the message broker. This supports at-least-once delivery, so consumers must be idempotent.

Use when: events must not be lost, cross-service communication, audit requirements.

### When to Use Which

| Mechanism | Durability / delivery | Complexity | Use when |
|-----------|------------|------------|----------|
| Explicit returns (no events) | N/A | Lowest | Side effects within same aggregate |
| In-process dispatch | Best-effort / non-durable | Low | Stateless, non-critical reactions in one service |
| Outbox pattern | At-least-once | Medium | Cross-service, must not lose events |
| Full event sourcing | Complete history | High | Audit trail, temporal queries, replay |

Start with explicit returns. Move to in-process dispatch for stateless reactions when best-effort delivery is acceptable. Move to outbox when you need reliability. Move to event sourcing only when you need the event history itself — for that final rung (the Decider as a persisted write model, event stores, projections, and event versioning) load the `event-sourcing` skill.

## Process Managers (Long-Running Workflows)

When a business process spans messages or aggregates over time and must remember business-significant workflow state, use a process manager — a stateful coordinator that correlates events and issues commands. Compensation is one reason; ordering, timeouts, deduplication, and intermediate-state decisions are others.

```typescript
type GiftPurchasePhase =
  | { readonly step: 'awaiting-payment'; readonly occasionId: OccasionId }
  | { readonly step: 'awaiting-shipment'; readonly paymentId: string }
  | { readonly step: 'complete'; readonly trackingNumber: string }
  | { readonly step: 'failed'; readonly reason: string };

type GiftPurchaseProcess = {
  readonly phase: GiftPurchasePhase;
  readonly processedEventIds: readonly string[];
};

type ProcessReaction =
  | {
      readonly outcome: 'applied';
      readonly newState: GiftPurchaseProcess;
      readonly commands: readonly GiftPurchaseCommand[];
    }
  | {
      readonly outcome: 'duplicate' | 'out-of-order';
      readonly newState: GiftPurchaseProcess;
      readonly commands: readonly [];
    };

// Apply each event once and only in the phase that can consume it.
const advanceGiftPurchase = (
  state: GiftPurchaseProcess,
  event: GiftPurchaseEvent & { readonly id: string },
): ProcessReaction => {
  if (state.processedEventIds.includes(event.id)) {
    return { outcome: 'duplicate', newState: state, commands: [] };
  }

  const processedEventIds = [...state.processedEventIds, event.id];
  switch (event.type) {
    case 'PaymentSucceeded': {
      if (state.phase.step !== 'awaiting-payment') {
        return { outcome: 'out-of-order', newState: state, commands: [] };
      }
      return {
        outcome: 'applied',
        newState: {
          phase: { step: 'awaiting-shipment', paymentId: event.paymentId },
          processedEventIds,
        },
        commands: [{ type: 'ShipGift', paymentId: event.paymentId, idempotencyKey: event.id }],
      };
    }
    case 'PaymentFailed': {
      if (state.phase.step !== 'awaiting-payment') {
        return { outcome: 'out-of-order', newState: state, commands: [] };
      }
      return {
        outcome: 'applied',
        newState: {
          phase: { step: 'failed', reason: 'payment-declined' },
          processedEventIds,
        },
        commands: [{
          type: 'ReleaseBudgetHold',
          occasionId: state.phase.occasionId,
          idempotencyKey: event.id,
        }],
      };
    }
    case 'GiftShipped': {
      if (state.phase.step !== 'awaiting-shipment') {
        return { outcome: 'out-of-order', newState: state, commands: [] };
      }
      return {
        outcome: 'applied',
        newState: {
          phase: { step: 'complete', trackingNumber: event.trackingNumber },
          processedEventIds,
        },
        commands: [],
      };
    }
    default: { const _: never = event; return _; }
  }
};
```

Process managers are pure functions — same Decider-like pattern (state + event → new state + commands). They own business workflow policy: valid cross-message phase transitions and which commands follow. Aggregate-local invariants remain in the aggregates or their Deciders. Persist the new process state and emitted commands atomically (normally with an outbox), acknowledge `duplicate`, and retry or dead-letter `out-of-order`; never acknowledge an event whose prerequisite has not arrived. The command idempotency key protects downstream handlers if delivery repeats. Test duplicate and out-of-order inputs as well as the happy path.

**Use process managers when:**
- A workflow spans multiple aggregates and takes time (not a single request)
- Failure at step N requires compensating actions for steps 1..N-1
- The workflow has business-meaningful intermediate states
- Correct handling depends on cross-message ordering, correlation, timeouts, or deduplication

**Don't use process managers when:**
- The workflow completes in a single request (orchestrate it in an application service/use case; call a domain service only when stateless domain policy does not naturally belong to one entity or value object)
- Each reaction is stateless and independently idempotent (use a direct event handler or simple dispatch)

## Testing Domain Events

Events returned from `decide` are plain data — test them like any other return value:

```typescript
it('produces OrderPlaced event when placing a draft order', () => {
  const now = new Date('2026-03-20');
  const state: OrderState = { status: 'draft', items: [testItem] };
  const decision = decide({ type: 'place' }, state, now);
  expect(decision).toEqual({
    accepted: true,
    events: [{ type: 'OrderPlaced', items: [testItem], placedAt: now }],
  });
});

it('rejects placing an already-placed order with a reason', () => {
  const now = new Date('2026-03-20');
  const state: OrderState = { status: 'placed', items: [testItem], placedAt: someDate };
  const decision = decide({ type: 'place' }, state, now);
  expect(decision).toEqual({ accepted: false, reason: 'order-not-draft' });
});
```

No mocks, no event bus setup, no subscriber verification. Test the decision, not the plumbing.
