# Testing Strategy for DDD

DDD does not require ports and adapters, a root `tests/` folder, a use case for every model, or one universal testing pyramid. Keep tests organized by domain behavior under the physical shape selected for the project. If the project also adopts hexagonal architecture, see that skill's `resources/testing-hex-arch.md` for test interactors, adapter contracts, and swappability.

This testing approach follows Valentina Jemuović's Use Case Driven Design (UCDD) — see `../../REFERENCES.md` for sources.

## Choose the Primary Behavioral Boundary

Use the broadest stable public behavior the selected architecture actually exposes:

| Project shape | Primary boundary |
|---------------|------------------|
| Domain-only model or library | Aggregate operation, domain service, or Decider |
| Application with use cases | Use case/application service with collaboration substitutes |
| DDD plus hexagonal architecture | Driving port with outside test interactors replacing driven actors |
| Event-sourced domain | Decider and projection public APIs using given/when/then behavior |

Do not manufacture a use case or port solely to satisfy a test template. When a real use case coordinates repositories or integrations, test it with in-memory fakes or focused stubs so domain entities, services, value objects, and orchestration run together.

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

    expect(result).toEqual({ success: false, reason: 'insufficient-balance' });
    expect(occasionRepo.savedEntities).toHaveLength(0);
  });
});
```

For an application that owns these repository contracts, this single test exercises:
- The use case orchestration (loading, calling domain service, conditional save)
- The domain service business rule (balance check)
- The entity invariant (budget not exceeded)
- The repository contract (nothing saved on failure)

Testing each of these in isolation would require 4 separate tests that individually pass but don't prove the feature works together.

## Collaboration Substitutes: Prefer Fakes to Interaction Mocks

When application policy has repository or integration contracts, prefer **in-memory fakes** that maintain state over mocks that verify call sequences. In hexagonal architecture these contracts are driven ports and reusable fakes are outside test interactors; another architecture may give them different roles and locations.

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

## Domain Tests: Primary or Complementary

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

These are fast, focused, and directly test business rules. They complement use-case tests when application orchestration exists; for a domain-only model they may be the primary suite.

**When to test domain functions directly:**
- Complex business rules with many edge cases (boundary conditions, state transitions)
- Pure calculations that benefit from exhaustive input testing
- Invariant enforcement where the rule itself is the primary concern

**When to test through a real use case instead:**
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

## Integration Tests for Concrete Boundaries

Concrete repositories and API integrations need narrow integration tests to verify that they translate between domain types and infrastructure correctly. They are driven adapters only when hexagonal architecture is selected.

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

## Delivery Tests When Risk Justifies Them

Use an HTTP contract test, message-consumer test, CLI test, or browser E2E test as appropriate to prove the delivered behavior. Playwright is relevant only when a browser journey is the real boundary.

Delivery tests do not replace fast domain/application tests, but neither are they mandatory for every DDD package. Add them where integration risk or user-visible workflow warrants the cost.

## The Testing Strategy

| Priority | Boundary | What it proves | Speed |
|----------|----------|----------------|-------|
| **Primary** | Selected public domain or application behavior | Business capability works | Very fast to fast |
| **Complement** | Focused pure domain functions | Complex rules and edge cases | Very fast |
| **Integration** | Concrete repository/API boundary | Infrastructure translation works | Slower |
| **Verification** | Appropriate delivery boundary | User/system workflow works | Slowest |
