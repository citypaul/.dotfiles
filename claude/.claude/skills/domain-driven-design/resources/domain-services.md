# Domain Services

When business logic doesn't naturally belong to a single entity or value object, it belongs in a **domain service**.

## When to Use a Domain Service

- A pure decision combines domain facts or read-only snapshots that do not naturally belong to one entity
- Logic doesn't fit naturally on any single entity
- The operation is a core business concept that domain experts talk about (e.g., "pledging a contribution")

A domain service does not make a two-aggregate write atomic. If one invariant
requires two aggregates to change synchronously, reconsider the aggregate
boundary. Otherwise update one aggregate per transaction and coordinate the
other outcome through a domain event or process manager.

## When NOT to Use a Domain Service

- Logic belongs on a single entity (put it there as a pure function)
- Logic is orchestration (loading from repos, calling services, saving) — that's a use case
- Logic is presentation (formatting for display) — that's presentation code under the selected client/application structure
- Logic is infrastructure (sending emails, calling APIs) — that's integration/infrastructure code; a driven adapter only when hexagonal architecture is used

## Domain Service vs Use Case

```typescript
// DOMAIN SERVICE — contains business logic, operates on domain types
// Colocate with the domain concepts it serves under the selected physical structure
const pledgeContribution = (
  occasion: Occasion,
  eligibility: ContributorEligibility,
  pledge: { readonly id: PledgeId; readonly amount: Money },
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
    occasion: {
      ...occasion,
      totalPledged: createMoney(totalPledged, pledge.amount.currency),
    },
    events: [{
      type: 'PledgeRecorded',
      id: pledge.id,
      occasionId: occasion.id,
      contributorId: eligibility.contributorId,
      amount: pledge.amount,
    }],
  };
};

// USE CASE — application orchestration only, no business rules
// Place as application policy; never assume it belongs in a domain/ folder
const handlePledge = async (
  persistence: PledgePersistence,
  eligibilityGateway: ContributorEligibilityGateway,
  dto: PledgeDto,
): Promise<PledgeResult> => {
  const stored = await persistence.findOccasionById(dto.occasionId);
  const eligibility = await eligibilityGateway.findFor(dto.contributorId);
  if (!stored || !eligibility) return { success: false, reason: 'not-found' };

  const result = pledgeContribution(stored.value, eligibility, {
    id: dto.pledgeId,
    amount: dto.amount,
  });
  if (result.success) {
    const saved = await persistence.saveWithOutbox(
      result.occasion,
      result.events,
      stored.version,
    );
    if (saved === 'conflict') {
      return { success: false, reason: 'concurrent-change' };
    }
  }
  return result;
};
```

## Naming

Name domain operations and use cases after the business operation: `pledgeContribution`, `transferMoney`, `placeOrder`. Never after technical patterns: `ContributionService`, `PlaceOrderUseCase`, `ShippingCalculator`. Your domain experts say "place an order", not "execute the place order use case."

You can tell a use case from a domain function by its signature, not its name:

```typescript
// Use case — takes application-owned collaboration contracts when needed
const placeOrder = async (repo: OrderRepository, gateway: PaymentGateway, order: NewOrder) => ...

// Domain service — takes only domain types
const pledgeContribution = (
  occasion: Occasion,
  eligibility: ContributorEligibility,
  pledge: { readonly id: PledgeId; readonly amount: Money },
) => ...
```

Pure domain services are the default. A domain-owned driven port is a rare exception when the model itself, rather than an application use case, owns the conversation. Treat the consuming service as effectful despite keeping it provider-free, isolate the pure decision where practical, and do not move application repository or gateway orchestration into the domain under this exception.

## Testing

Test pure domain services like entity functions: pass domain values and assert the result without mocks. For the explicit port-consuming exception, test the collaboration through a small fake while keeping the underlying decision separately testable as a pure function.

```typescript
describe('pledgeContribution', () => {
  it('rejects pledge when the contributor is ineligible', () => {
    const occasion = getTestOccasion();
    const eligibility = getTestContributorEligibility({ mayPledge: false });
    const result = pledgeContribution(occasion, eligibility, {
      id: createPledgeId('pledge-1'),
      amount: createMoney(5_000, 'GBP'),
    });
    expect(result.success).toBe(false);
  });
});
```
