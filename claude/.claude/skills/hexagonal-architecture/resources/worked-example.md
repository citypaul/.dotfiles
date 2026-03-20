# Worked Example: Full Request Lifecycle

One feature traced through every layer, showing how hex arch and DDD fit together in practice.

**Feature:** "Pledge a contribution to an occasion's gift fund"

## 1. Glossary

| Term | Definition |
|------|-----------|
| Occasion | A gift-giving event (birthday, holiday) |
| Contribution | Money pledged toward an occasion's gift fund |
| Contributor | A person who pledges money |

## 2. Domain Types

```
src/domain/occasion/
  types.ts          ← types + branded IDs
  occasion.ts       ← entity functions
  pledge.ts         ← domain service (cross-aggregate logic)
  repository.ts     ← port interface
```

```typescript
// domain/occasion/types.ts
type OccasionId = string & { readonly __brand: 'OccasionId' };
type ContributorId = string & { readonly __brand: 'ContributorId' };
type Currency = 'GBP' | 'USD' | 'EUR';
type Money = { readonly amount: number; readonly currency: Currency };

type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly budget: Money;
  readonly totalPledged: Money;
  readonly isFundingClosed: boolean;
};

type Contributor = {
  readonly id: ContributorId;
  readonly name: string;
  readonly walletBalance: Money;
};

type PledgeResult =
  | { readonly success: true; readonly occasion: Occasion; readonly contributor: Contributor }
  | { readonly success: false; readonly reason: 'insufficient-balance' | 'funding-closed' | 'not-found' };
```

## 3. Domain Function (Pure Business Rule)

```typescript
// domain/occasion/pledge.ts — domain service, pure function
const pledgeContribution = (
  occasion: Occasion,
  contributor: Contributor,
  amount: Money,
): PledgeResult => {
  if (occasion.isFundingClosed) {
    return { success: false, reason: 'funding-closed' };
  }
  if (amount.amount > contributor.walletBalance.amount) {
    return { success: false, reason: 'insufficient-balance' };
  }
  return {
    success: true,
    occasion: {
      ...occasion,
      totalPledged: createMoney(
        occasion.totalPledged.amount + amount.amount,
        occasion.totalPledged.currency,
      ),
    },
    contributor: {
      ...contributor,
      walletBalance: createMoney(
        contributor.walletBalance.amount - amount.amount,
        contributor.walletBalance.currency,
      ),
    },
  };
};
```

No ports, no infrastructure, no async. Just domain types in and domain types out.

## 4. Port Interfaces (Domain Layer)

```typescript
// domain/occasion/repository.ts
interface OccasionRepository {
  readonly findById: (id: OccasionId) => Promise<Occasion | undefined>;
  readonly save: (occasion: Occasion) => Promise<void>;
}

// domain/contributor/repository.ts
interface ContributorRepository {
  readonly findById: (id: ContributorId) => Promise<Contributor | undefined>;
  readonly save: (contributor: Contributor) => Promise<void>;
}
```

## 5. Use Case (Orchestration)

```typescript
// domain/occasion/handle-pledge.ts — use case function
const handlePledge = async (
  occasionRepo: OccasionRepository,
  contributorRepo: ContributorRepository,
  dto: { readonly occasionId: OccasionId; readonly contributorId: ContributorId; readonly amount: Money },
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

The use case is identifiable by its signature — it takes ports as parameters. It contains zero business logic. It loads, delegates to the domain service, and saves.

**Note:** This use case saves two aggregates. For atomicity, the driving adapter should wrap it in a transaction — see `resources/cross-cutting-concerns.md` for the transaction pattern. The use case itself is unaware of transactions.

## 6. Driven Adapter (Repository Implementation)

```
src/db/
  repositories/
    drizzle-occasion-repository.ts
  schema.ts
```

```typescript
// db/repositories/drizzle-occasion-repository.ts
const createDrizzleOccasionRepository = (db: Database): OccasionRepository => ({
  findById: async (id) => {
    const row = await db.select().from(occasions).where(eq(occasions.id, id)).get();
    return row ? toOccasion(row) : undefined;
  },
  save: async (occasion) => {
    await db.insert(occasions).values(toRow(occasion))
      .onConflictDoUpdate({ target: occasions.id, set: toRow(occasion) });
  },
});
```

The adapter translates between domain types (`Occasion`) and infrastructure types (database rows). No business logic.

## 7. Driving Adapter (Route Handler)

```
src/app/api/occasions/[id]/pledge/route.ts
```

```typescript
// app/api/occasions/[id]/pledge/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { env } = getCloudflareContext();
  const db = createDb(env.DB);

  // Wire adapters (composition root)
  const occasionRepo = createDrizzleOccasionRepository(db);
  const contributorRepo = createDrizzleContributorRepository(db);

  // Parse input at the boundary
  const body = PledgeSchema.parse(await request.json());

  // Call use case
  const result = await handlePledge(occasionRepo, contributorRepo, {
    occasionId: createOccasionId(params.id),
    contributorId: body.contributorId,
    amount: body.amount,
  });

  // Translate result to HTTP
  if (!result.success) {
    const status = result.reason === 'not-found' ? 404 : 422;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ pledged: result.occasion.totalPledged });
}
```

The route handler is thin glue: parse → wire → delegate → translate to HTTP. Business logic decisions (what status code for what reason) are the only logic here, and even that is mechanical translation.

## 8. Fakes for Testing

```typescript
// test/fakes/fake-occasion-repository.ts
const createFakeOccasionRepository = (
  initial: readonly Occasion[] = [],
): OccasionRepository & { readonly savedEntities: readonly Occasion[] } => {
  const store = new Map(initial.map(o => [o.id, o]));
  const saved: Occasion[] = [];
  return {
    findById: async (id) => store.get(id),
    save: async (occasion) => { store.set(occasion.id, occasion); saved.push(occasion); },
    get savedEntities() { return saved; },
  };
};
```

Fakes implement the real interface and maintain state. If the interface changes, the fake breaks at compile time.

## 9. Tests

### Use Case Test (Primary)

```typescript
// tests/occasions/pledge-contribution.test.ts
describe('pledge contribution', () => {
  const testOccasion = getTestOccasion({ totalPledged: createMoney(0, 'GBP') });
  const testContributor = getTestContributor({ walletBalance: createMoney(100, 'GBP') });

  it('deducts from contributor and adds to occasion', async () => {
    const occasionRepo = createFakeOccasionRepository([testOccasion]);
    const contributorRepo = createFakeContributorRepository([testContributor]);

    const result = await handlePledge(occasionRepo, contributorRepo, {
      occasionId: testOccasion.id,
      contributorId: testContributor.id,
      amount: createMoney(25, 'GBP'),
    });

    expect(result).toEqual({
      success: true,
      occasion: expect.objectContaining({ totalPledged: createMoney(25, 'GBP') }),
      contributor: expect.objectContaining({ walletBalance: createMoney(75, 'GBP') }),
    });
    expect(occasionRepo.savedEntities).toHaveLength(1);
    expect(contributorRepo.savedEntities).toHaveLength(1);
  });

  it('rejects pledge when contributor has insufficient balance', async () => {
    const poorContributor = getTestContributor({ walletBalance: createMoney(10, 'GBP') });
    const occasionRepo = createFakeOccasionRepository([testOccasion]);
    const contributorRepo = createFakeContributorRepository([poorContributor]);

    const result = await handlePledge(occasionRepo, contributorRepo, {
      occasionId: testOccasion.id,
      contributorId: poorContributor.id,
      amount: createMoney(50, 'GBP'),
    });

    expect(result).toEqual({ success: false, reason: 'insufficient-balance' });
    expect(occasionRepo.savedEntities).toHaveLength(0);
  });

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
  });
});
```

One test file, three scenarios. Each test exercises the use case → domain service → entity update → repository save chain together. No mocks. The tests describe business behavior, not implementation details.

### Domain Unit Test (Complement)

```typescript
// tests/occasions/pledge-rules.test.ts
describe('pledgeContribution', () => {
  it('transfers exact amount from contributor to occasion', () => {
    const occasion = getTestOccasion({ totalPledged: createMoney(50, 'GBP') });
    const contributor = getTestContributor({ walletBalance: createMoney(100, 'GBP') });

    const result = pledgeContribution(occasion, contributor, createMoney(30, 'GBP'));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.occasion.totalPledged).toEqual(createMoney(80, 'GBP'));
      expect(result.contributor.walletBalance).toEqual(createMoney(70, 'GBP'));
    }
  });
});
```

Direct domain tests complement use case tests for complex rules with many edge cases. This function is pure — no setup, no fakes, just values in and values out.

## File Map

```
src/
  domain/
    occasion/
      types.ts              ← Occasion, Contributor, PledgeResult, Money, branded IDs
      occasion.ts           ← Entity functions (renameOccasion, etc.)
      pledge.ts             ← Domain service (pledgeContribution)
      repository.ts         ← OccasionRepository interface (port)
    contributor/
      repository.ts         ← ContributorRepository interface (port)
  db/
    repositories/
      drizzle-occasion-repository.ts    ← Driven adapter
      drizzle-contributor-repository.ts ← Driven adapter
    schema.ts               ← Drizzle table definitions
  app/
    api/occasions/[id]/
      pledge/route.ts       ← Driving adapter (route handler)

tests/
  occasions/
    pledge-contribution.test.ts  ← Use case tests (primary)
    pledge-rules.test.ts         ← Domain unit tests (complement)
  fakes/
    fake-occasion-repository.ts  ← Shared fakes
    fake-contributor-repository.ts
    test-factories.ts            ← getTestOccasion, getTestContributor
```

## What Lives Where (Summary)

| What | Where | Why |
|------|-------|-----|
| Business rules | `domain/` pure functions | Testable without infrastructure, the core value |
| Port interfaces | `domain/` alongside entities | Domain defines what it needs |
| Use cases | `domain/` (takes ports as params) | Orchestration of domain operations |
| Repository impls | `db/repositories/` | Driven adapters, translate domain ↔ DB |
| Route handlers | `app/api/` | Driving adapters, thin glue |
| Fakes | `tests/fakes/` | Shared across use case tests |
| Tests | `tests/{concept}/` | Organized by domain concept, not file |
