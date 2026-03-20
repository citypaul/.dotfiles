# Error Modeling

How to represent and propagate errors across architectural layers.

## The Default: Discriminated Union Results

For expected business outcomes (validation failures, business rule violations, not-found), return a discriminated union. This is the functional approach — errors are data, not control flow.

```typescript
type PledgeResult =
  | { readonly success: true; readonly occasion: Occasion; readonly contributor: Contributor }
  | { readonly success: false; readonly reason: 'insufficient-balance' | 'funding-closed' | 'not-found' };
```

**Why not exceptions?** Exceptions are invisible in the type signature. A function that returns `Occasion` but can throw `InsufficientBalanceError` has a hidden return path that the compiler doesn't track. Callers can forget to handle it. A discriminated union makes every outcome explicit — the compiler enforces exhaustive handling.

## When Exceptions Are Appropriate

Exceptions are for truly unexpected errors — things that indicate a bug or an infrastructure failure that no business rule can handle:

- **Programmer mistakes:** accessing a null reference, index out of bounds, type coercion failures
- **Infrastructure failures:** database connection lost, network timeout, disk full
- **Invariant violations:** an entity is constructed in an invalid state (this means the factory function has a bug)

These should crash or propagate up to a top-level error handler. They are not business outcomes — they are defects or outages.

```typescript
// ✅ Exception — invariant violation means a bug
const createMoney = (amount: number, currency: Currency): Money => {
  if (amount < 0) throw new Error('Money cannot be negative');
  return { amount, currency };
};

// ✅ Result type — expected business outcome
const pledgeContribution = (...): PledgeResult => {
  if (amount.amount > contributor.walletBalance.amount) {
    return { success: false, reason: 'insufficient-balance' };
  }
  ...
};
```

**The test:** Could a user's action legitimately cause this outcome? If yes, it's a result type. If no (it would mean a bug), it's an exception.

## How Errors Propagate Through Layers

```
Domain function    → returns PledgeResult (discriminated union)
       ↓
Use case           → inspects result, decides whether to save
       ↓
Route handler      → translates result.reason to HTTP status code
       ↓
HTTP response      → { error: "insufficient-balance" } with 422
```

Each layer handles errors at its own level of abstraction:

```typescript
// Domain: returns result with business reason
const pledgeContribution = (...): PledgeResult => {
  if (occasion.isFundingClosed) return { success: false, reason: 'funding-closed' };
  ...
};

// Use case: propagates result, controls save
const handlePledge = async (repos, dto): Promise<PledgeResult> => {
  ...
  const result = pledgeContribution(occasion, contributor, dto.amount);
  if (result.success) {
    await repos.occasion.save(result.occasion);
    await repos.contributor.save(result.contributor);
  }
  return result;
};

// Route handler: translates to HTTP
const status = result.success ? 200
  : result.reason === 'not-found' ? 404
  : 422;
return NextResponse.json(
  result.success ? { pledged: result.occasion.totalPledged } : { error: result.reason },
  { status },
);
```

**The domain never knows about HTTP.** The route handler never knows about business rules. Each layer translates errors into its own vocabulary.

## Modeling Multiple Error Types

For domains with many possible outcomes, use specific reason strings rather than error classes:

```typescript
type CreateOrderResult =
  | { readonly success: true; readonly order: Order }
  | { readonly success: false; readonly reason:
      | 'empty-cart'
      | 'item-out-of-stock'
      | 'payment-declined'
      | 'address-invalid'
      | 'daily-limit-exceeded'
    };
```

The `reason` field is a string literal union — exhaustive switch handling catches missing cases at compile time. No error class hierarchies, no inheritance, no `instanceof` checks.

## What NOT To Do

**Don't use exceptions for business rules:**
```typescript
// WRONG — invisible failure mode, caller must remember to catch
const pledgeContribution = (...): Occasion => {
  if (amount > balance) throw new InsufficientBalanceError();
  ...
};
```

**Don't use generic error types:**
```typescript
// WRONG — { success: false, error: string } tells you nothing
// Use specific reason literals so the compiler can help
type Result<T> = { success: true; data: T } | { success: false; error: string };
```

**Don't catch and re-throw to add context:**
```typescript
// WRONG — wrapping exceptions adds noise, not clarity
try { ... } catch (e) { throw new PledgeError('Failed to pledge', { cause: e }); }
```

If infrastructure fails (database down), let it propagate to the top-level handler. The use case doesn't need to know why the database is down.

## Testing Errors

Test error paths through the same use case boundary as success paths:

```typescript
it('rejects pledge when funding is closed', async () => {
  const closedOccasion = getTestOccasion({ isFundingClosed: true });
  const occasionRepo = createFakeOccasionRepository([closedOccasion]);
  const contributorRepo = createFakeContributorRepository([testContributor]);

  const result = await handlePledge(occasionRepo, contributorRepo, {
    occasionId: closedOccasion.id,
    contributorId: testContributor.id,
    amount: createMoney(25, 'GBP'),
  });

  expect(result).toEqual({ success: false, reason: 'funding-closed' });
  expect(occasionRepo.savedEntities).toHaveLength(0);
});
```

The test proves both the rejection AND the side-effect absence (nothing saved). This is behavioral testing — not "does the function throw?", but "does the feature behave correctly when the business rule is violated?"
