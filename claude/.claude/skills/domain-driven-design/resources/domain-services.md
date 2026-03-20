# Domain Services

When business logic doesn't naturally belong to a single entity or value object, it belongs in a **domain service**.

## When to Use a Domain Service

- Logic spans multiple aggregates (e.g., checking a contributor's balance against an occasion's budget)
- Logic doesn't fit naturally on any single entity
- The operation is a core business concept that domain experts talk about (e.g., "pledging a contribution")

## When NOT to Use a Domain Service

- Logic belongs on a single entity (put it there as a pure function)
- Logic is orchestration (loading from repos, calling services, saving) — that's a use case
- Logic is presentation (formatting for display) — that's `lib/` or the view layer
- Logic is infrastructure (sending emails, calling APIs) — that's an adapter

## Domain Service vs Use Case

```typescript
// DOMAIN SERVICE — contains business logic, operates on domain types
// Lives in domain/ alongside the entities it operates on
const pledgeContribution = (
  occasion: Occasion,
  contributor: Contributor,
  amount: Money,
): PledgeResult => {
  if (amount.amount > contributor.walletBalance.amount) {
    return { success: false, reason: 'insufficient-balance' };
  }
  if (occasion.isFundingClosed) {
    return { success: false, reason: 'funding-closed' };
  }
  return {
    success: true,
    occasion: addContribution(occasion, { contributorId: contributor.id, amount }),
    contributor: deductBalance(contributor, amount),
  };
};

// USE CASE — orchestration only, no business logic
// Lives in domain/ — identifiable by taking ports as parameters
const handlePledge = async (
  occasionRepo: OccasionRepository,
  contributorRepo: ContributorRepository,
  dto: PledgeDto,
): Promise<PledgeResult> => {
  const occasion = await occasionRepo.findById(dto.occasionId);
  const contributor = await contributorRepo.findById(dto.contributorId);
  if (!occasion || !contributor) return { success: false, reason: 'not-found' };

  const result = pledgeContribution(occasion, contributor, dto.amount);
  if (result.success) {
    await occasionRepo.save(result.occasion);
    await contributorRepo.save(result.contributor);
  }
  return result;
};
```

## Naming

All domain functions — domain services, use cases, entity operations — are named after the business operation: `pledgeContribution`, `transferMoney`, `placeOrder`. Never after technical patterns: `ContributionService`, `PlaceOrderUseCase`, `ShippingCalculator`. Your domain experts say "place an order", not "execute the place order use case."

You can tell a use case from a domain function by its signature, not its name:

```typescript
// Use case — takes ports (infrastructure interfaces)
const placeOrder = async (repo: OrderRepository, gateway: PaymentGateway, order: NewOrder) => ...

// Domain service — takes only domain types
const pledgeContribution = (occasion: Occasion, contributor: Contributor, amount: Money) => ...
```

## Testing

Domain services are pure functions — test them with unit tests, same as entity functions. No mocking needed. Pass in the domain objects, assert the result.

```typescript
describe('pledgeContribution', () => {
  it('rejects pledge when contributor has insufficient balance', () => {
    const occasion = getTestOccasion();
    const contributor = getTestContributor({ walletBalance: createMoney(10, 'GBP') });
    const result = pledgeContribution(occasion, contributor, createMoney(50, 'GBP'));
    expect(result.success).toBe(false);
  });
});
```
