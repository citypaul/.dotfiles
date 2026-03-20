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
