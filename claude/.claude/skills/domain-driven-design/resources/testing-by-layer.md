# Testing Strategy for DDD

> For fakes implementation patterns, `createTestDb` helper, and the Swappability Test, see the hexagonal-architecture skill's `resources/testing-hex-arch.md`. This resource focuses on DDD-specific testing concerns.

This testing approach follows Valentina Jemuović's Use Case Driven Design (UCDD) — see `../../REFERENCES.md` for sources.

## Primary Test Boundary: The Use Case

The primary test boundary is the **use case** (application service / driving port). Test by calling the use case with driven ports replaced by in-memory fakes. This exercises domain entities, domain services, value objects, and orchestration together — proving the feature works as a whole.

```typescript
describe('pledge contribution', () => {
  it('rejects pledge when contributor has insufficient balance', async () => {
    const occasionRepo = createFakeOccasionRepo([testOccasion]);
    const contributorRepo = createFakeContributorRepo([
      getTestContributor({ walletBalance: createMoney(10, 'GBP') }),
    ]);

    const result = await handlePledge(occasionRepo, contributorRepo, {
      occasionId: testOccasion.id,
      contributorId: testContributor.id,
      amount: createMoney(50, 'GBP'),
    });

    expect(result.success).toBe(false);
    expect(result.reason).toBe('insufficient-balance');
    expect(occasionRepo.savedEntities).toHaveLength(0);
  });
});
```

This single test exercises:
- The use case orchestration (loading, calling domain service, conditional save)
- The domain service business rule (balance check)
- The entity invariant (budget not exceeded)
- The repository contract (nothing saved on failure)

Testing each of these in isolation would require 4 separate tests that individually pass but don't prove the feature works together.

## Fakes, Not Mocks

Replace driven ports with **in-memory fakes** that maintain state — not mocks that verify call sequences.

| Double | Purpose | Use for |
|--------|---------|---------|
| **Fake** | In-memory implementation with real logic | Repositories — stores/retrieves data in a Map |
| **Stub** | Returns configured responses | Payment gateways — success/failure scenarios |
| **Spy** | Records what happened for inspection | Email services — collect sent messages |
| **Mock** | Avoid | Creates brittle tests coupled to implementation |

```typescript
// ✅ Fake — maintains state, implements the real interface
const createFakeRepo = (initial: readonly User[] = []): UserRepository => {
  const store = new Map(initial.map(u => [u.id, u]));
  return {
    findById: async (id) => store.get(id),
    save: async (user) => { store.set(user.id, user); },
  };
};

// ❌ Mock — verifies calls, not behavior
vi.mock('../repositories/user-repository');
```

**Why fakes over mocks:** Fakes implement the real interface. If the interface changes, the fake breaks at compile time. Mocks create untyped stubs that silently drift from the real contract. Fakes test behavior ("was the data saved correctly?"). Mocks test implementation ("was `.save()` called with these arguments?").

**Note on mutability in fakes:** Fakes use mutable internal state (`Map.set`, `Array.push`) to simulate a data store. This is a deliberate testing-only exception to the immutability rule — fakes are test infrastructure, not domain code.

## Domain Unit Tests: A Complement, Not the Primary Strategy

Pure domain functions (business rules, calculations, invariants) CAN be tested directly — they are the public API of the domain. This is legitimate behavioral testing when the test describes a business rule.

```typescript
// ✅ Behavioral — tests a business rule
it('event with a past date is considered past', () => {
  const now = new Date('2026-03-20');
  expect(isPastEvent('2026-03-19', now)).toBe(true);
  expect(isPastEvent('2026-03-21', now)).toBe(false);
});

// ✅ Behavioral — tests a business calculation
it('committed total includes only non-idea items', () => {
  const items = [
    getTestItem({ status: 'committed', pricePence: 5000 }),
    getTestItem({ status: 'idea', pricePence: 3000 }),
  ];
  expect(calculateCommittedTotal(items)).toBe(5000);
});
```

These are fast, focused, and directly test business rules. They complement use case tests — they don't replace them.

**When to test domain functions directly:**
- Complex business rules with many edge cases (boundary conditions, state transitions)
- Pure calculations that benefit from exhaustive input testing
- Invariant enforcement where the rule itself is the primary concern

**When to test through the use case instead:**
- Simple logic that's already exercised by the use case test
- Logic where the correctness depends on the orchestration context (order of operations matters)
- Anything where testing directly would mean testing implementation rather than behavior

**Property-based testing** is a natural fit for pure domain functions with many edge cases. Libraries like `fast-check` generate random inputs and verify invariants hold across thousands of cases:

```typescript
import fc from 'fast-check';

it('pledged amount never exceeds contributor balance', () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 10000 }),
    fc.integer({ min: 0, max: 10000 }),
    (balance, pledge) => {
      const contributor = getTestContributor({ walletBalance: createMoney(balance, 'GBP') });
      const occasion = getTestOccasion();
      const result = pledgeContribution(occasion, contributor, createMoney(pledge, 'GBP'));
      if (result.success) {
        return result.contributor.walletBalance.amount >= 0;
      }
      return true; // rejected pledges are always valid
    },
  ));
});
```

Use property-based tests for domain invariants that must hold for all inputs. Use example-based tests for specific business scenarios.

## Adapter Tests: Narrow Integration Tests

Driven adapters (repositories, API clients) need their own integration tests to verify they correctly translate between domain types and infrastructure. These are secondary to use case tests.

```typescript
// Repository against real database — fresh DB per test
describe('DrizzleOrderRepository', () => {
  it('persists and retrieves an order', async () => {
    const db = await createTestDb();
    const repo = createDrizzleOrderRepository(db);
    await repo.save(testOrder);
    const found = await repo.findById(testOrder.id);
    expect(found).toEqual(testOrder);
  });
});
```

## End-to-End Tests: Proving Delivery

E2E tests (Playwright) prove the full stack works — from UI interaction through routing, use case, domain, adapter, and back. They are the final verification that the feature works as the user experiences it.

These are not a substitute for use case tests. Use case tests are fast and deterministic (in-memory fakes). E2E tests are slow and touch real infrastructure. Both are needed.

## The Testing Strategy

| Priority | Boundary | What it proves | Speed |
|----------|----------|----------------|-------|
| **Primary** | Use case (driving port + faked driven ports) | Feature works as a whole | Fast (in-memory) |
| **Complement** | Domain pure functions directly | Complex business rules in isolation | Very fast |
| **Secondary** | Driven adapters (real infrastructure) | Adapter translates correctly | Slower |
| **Verification** | E2E (full stack) | User experience works | Slowest |
