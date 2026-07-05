# Testing Strategy for Hexagonal Architecture

Hex arch's primary value is testability. The architecture creates natural test boundaries — but the primary boundary is the **use case**, not each layer in isolation. This approach follows Use Case Driven Development (UCDD) — see `references.md` for sources.

## A Port Is Only Real If It Is Tested

Every port needs a test interactor: a test driver at each driving port, a fake at each driven port. Without one, the "port" is an arbitrary interface line — nothing enforces it as a boundary. The tests double as the leak detector: business logic drifting into an adapter, or technology detail drifting into the domain, breaks a boundary test the moment it happens. When reviewing, ask of each port: what drives it, or fakes it, in the test suite?

## Primary Boundary: The Use Case

Test by calling the driving port implementation with driven ports replaced by in-memory fakes. This exercises the full business logic path without touching infrastructure.

```typescript
describe('place order', () => {
  it('saves order and charges payment on success', async () => {
    const orderRepo = createFakeOrderRepo();
    const paymentGateway = createFakePaymentGateway({ alwaysSucceeds: true });
    const orderPlacement = createOrderPlacement(orderRepo, paymentGateway);

    const result = await orderPlacement.placeOrder(testOrder);

    expect(result.success).toBe(true);
    expect(orderRepo.savedEntities).toHaveLength(1);
  });

  it('does not save order when payment fails', async () => {
    const orderRepo = createFakeOrderRepo();
    const paymentGateway = createFakePaymentGateway({ alwaysFails: true });
    const orderPlacement = createOrderPlacement(orderRepo, paymentGateway);

    const result = await orderPlacement.placeOrder(testOrder);

    expect(result.success).toBe(false);
    expect(orderRepo.savedEntities).toHaveLength(0);
  });
});
```

This proves the feature works — not just that individual components return correct values.

## Fakes, Not Mocks

Replace driven ports with in-memory fakes that implement the real interface and maintain state.

```typescript
const createFakeOrderRepo = (): OrderRepository & { readonly savedEntities: readonly Order[] } => {
  const saved: Order[] = [];
  const store = new Map<string, Order>();
  return {
    findById: async (id) => store.get(id),
    save: async (order) => { store.set(order.id, order); saved.push(order); },
    get savedEntities() { return saved; },
  };
};
```

**Why fakes over mocks:**
- Fakes implement the real interface — if the interface changes, the fake breaks at compile time
- Fakes test behavior ("was the data saved?"), not implementation ("was `.save()` called?")
- Mocks create untyped stubs that silently drift from the real contract
- Changing a repository method signature breaks all mocks but is caught by fake type errors

**Note on mutability in fakes:** Fakes use mutable internal state (`Map.set`, `Array.push`) to simulate a data store. This is a deliberate testing-only exception to the immutability rule — fakes are test infrastructure, not domain code. The domain types they store remain immutable.

## Fakes for Instrumentation Ports (Domain Probes)

A Domain Probe (see `cross-cutting-concerns.md`, Tier 2) is a driven port, so it gets a recording fake like any other. Use-case tests then assert observations as behavior — "placing a rejected pledge announces the rejection" — the same way they assert a save happened.

```typescript
const createRecordingPledgeInstrumentation = (): PledgeInstrumentation & {
  readonly observed: readonly Record<string, unknown>[];
} => {
  const observed: Record<string, unknown>[] = [];
  return {
    pledgeRejected: (reason, occasionId) => { observed.push({ kind: 'pledge-rejected', reason, occasionId }); },
    pledgeAccepted: (amount, occasionId) => { observed.push({ kind: 'pledge-accepted', amount, occasionId }); },
    get observed() { return observed; },
  };
};

it('announces the rejection when funding is closed', async () => {
  const instrumentation = createRecordingPledgeInstrumentation();
  const pledging = createPledgingToOccasions(
    createFakeOccasionRepo({ occasions: [closedOccasion] }),
    createFakeContributorRepo(),
    instrumentation,
  );

  await pledging.pledgeToOccasion(getMockPledge({ occasionId: closedOccasion.id }));

  expect(instrumentation.observed).toContainEqual({
    kind: 'pledge-rejected',
    reason: 'funding-closed',
    occasionId: closedOccasion.id,
  });
});
```

The probe's adapter — translating observations into log lines, metrics, or span attributes — is tested separately as adapter code (see the `observability` skill's `resources/testing-telemetry.md` for in-memory exporter patterns). Mutation-testing note: an unasserted probe call is a surviving-mutant farm; asserting observations through the fake is what makes instrumentation mutation-proof behavior.

## Domain Unit Tests: A Complement

Pure domain functions (business rules, calculations) can also be tested directly. This is behavioral testing — the domain function IS the public API. Use this for complex rules with many edge cases. For property-based testing of domain invariants with `fast-check`, see the DDD skill's `resources/testing-by-layer.md`.

```typescript
it('rejects contribution exceeding available balance', () => {
  const result = pledgeContribution(occasion, poorContributor, largePledge);
  expect(result.success).toBe(false);
});
```

## Narrow Integration Tests: Driven Adapters

Driven adapters (repositories, API clients) need integration tests to verify they translate between domain types and infrastructure correctly. These are secondary to use case tests.

The `createTestDb` helper creates a fresh in-memory database per test:

```typescript
// test/helpers/create-test-db.ts — fresh database per test, no shared state
const createTestDb = async (): Promise<Database> => {
  const db = createDb(':memory:'); // or Testcontainers for real Postgres
  await migrate(db, migrations);
  return db;
};
```

```typescript
// Real database — fresh DB per test, no shared state
describe('DrizzleOrderRepository', () => {
  it('round-trips an order through persistence', async () => {
    const db = await createTestDb();
    const repo = createDrizzleOrderRepository(db);
    await repo.save(testOrder);
    expect(await repo.findById(testOrder.id)).toEqual(testOrder);
  });
});

// Real HTTP via MSW
describe('StripePaymentGateway', () => {
  it('returns success on valid charge', async () => {
    worker.use(http.post('https://api.stripe.com/v1/charges', () =>
      HttpResponse.json({ id: 'ch_123', status: 'succeeded' })
    ));
    const gateway = createStripeGateway('sk_test');
    const result = await gateway.charge(testAmount, testPayment);
    expect(result.success).toBe(true);
  });
});
```

## E2E Tests: Proving Delivery

E2E tests (Playwright) prove the full stack works from the user's perspective. They're the final verification, not the primary testing strategy.

## The Swappability Test

The ultimate validation of hex arch boundaries: can you swap an adapter without changing domain code or use case tests?

- Swap PostgreSQL for DynamoDB → only the repository adapter changes
- Swap Stripe for PayPal → only the payment adapter changes
- Use case tests continue to pass with any adapter (they use fakes)

If any swap requires changing domain code or use case tests, the boundary is wrong.

## Strategy Summary

| Priority | What | How | Speed |
|----------|------|-----|-------|
| **Primary** | Use cases | Driving port + faked driven ports | Fast |
| **Complement** | Domain logic | Direct unit tests for complex rules | Very fast |
| **Secondary** | Driven adapters | Integration tests (real DB/MSW) | Slower |
| **Verification** | Full stack | E2E (Playwright) | Slowest |
