# Worked Example: Full Request Lifecycle

One feature traced through every role, showing how hex arch and DDD fit together in practice. The paths use an illustrative capability-first monorepo shape. They are not a universal directory template; the invariant is bounded context or business capability before technical layer.

**Feature:** "Pledge a contribution to an occasion's gift fund"

## 1. Glossary

| Term | Definition |
|------|-----------|
| Occasion | A gift-giving event (birthday, holiday) |
| Contribution | Money pledged toward an occasion's gift fund |
| Contributor | A person who pledges money |

## 2. Domain Types

```text
packages/
  gifting/
    hexagon/
      domain/
        src/
          types.ts          ← types + branded IDs
          occasion.ts       ← entity functions
          pledge.ts         ← aggregate operation + domain event
```

```typescript
// packages/gifting/hexagon/domain/src/types.ts
type OccasionId = string & { readonly __brand: 'OccasionId' };
type ContributorId = string & { readonly __brand: 'ContributorId' };
type PledgeId = string & { readonly __brand: 'PledgeId' };
type Currency = 'GBP' | 'USD' | 'EUR';
type Money = { readonly minorUnits: number; readonly currency: Currency };

const createMoney = (minorUnits: number, currency: Currency): Money => {
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) throw new Error('Invalid money');
  return { minorUnits, currency };
};

type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly budget: Money;
  readonly totalPledged: Money;
  readonly isFundingClosed: boolean;
};

type PledgeRecorded = {
  readonly type: 'PledgeRecorded';
  readonly id: PledgeId;
  readonly occasionId: OccasionId;
  readonly contributorId: ContributorId;
  readonly amount: Money;
};

type PledgeDecision =
  | {
      readonly success: true;
      readonly occasion: Occasion;
      readonly events: readonly PledgeRecorded[];
    }
  | { readonly success: false; readonly reason: 'non-positive-amount' | 'currency-mismatch' | 'exceeds-budget' | 'funding-closed' };
```

## 3. Domain Function (Pure Business Rule)

```typescript
// packages/gifting/hexagon/domain/src/pledge.ts — aggregate operation, pure function
const recordPledge = (
  occasion: Occasion,
  pledge: {
    readonly id: PledgeId;
    readonly contributorId: ContributorId;
    readonly amount: Money;
  },
): PledgeDecision => {
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

  const updatedOccasion = {
    ...occasion,
    totalPledged: createMoney(
      totalPledged,
      occasion.totalPledged.currency,
    ),
  };

  return {
    success: true,
    occasion: updatedOccasion,
    events: [{
      type: 'PledgeRecorded',
      id: pledge.id,
      occasionId: occasion.id,
      contributorId: pledge.contributorId,
      amount: pledge.amount,
    }],
  };
};
```

No ports, no infrastructure, no async. One aggregate changes, and the domain returns the event that describes the accepted pledge.

## 4. Port Interfaces (Inside Application Boundary)

```typescript
// packages/gifting/hexagon/application/src/pledging.ts — driving port + application result
type PledgeResult =
  | PledgeDecision
  | { readonly success: false; readonly reason: 'not-found' | 'concurrent-change' };

type StoredOccasion = {
  readonly value: Occasion;
  readonly version: number;
};

declare const authenticatedPledger: unique symbol;
type AuthenticatedPledger = {
  readonly [authenticatedPledger]: true;
  readonly contributorId: ContributorId;
};

interface ForPledgingToOccasions {
  readonly pledgeToOccasion: (dto: {
    readonly pledgeId: PledgeId;
    readonly occasionId: OccasionId;
    readonly principal: AuthenticatedPledger;
    readonly amount: Money;
  }) => Promise<PledgeResult>;
}

// packages/gifting/hexagon/application/src/pledge-persistence.ts
interface PledgePersistence {
  readonly findOccasionById: (id: OccasionId) => Promise<StoredOccasion | undefined>;
  readonly saveWithOutbox: (
    occasion: Occasion,
    events: readonly PledgeRecorded[],
    expectedVersion: number,
  ) => Promise<'saved' | 'conflict'>;
}

// packages/gifting/hexagon/application/src/pledge-projection.ts
interface PledgeProjection {
  // Input is a validated immutable log record: one ID permanently names one payload.
  readonly recordFrom: (event: PledgeRecorded) => Promise<void>;
}
```

## 5. Use Case (Orchestration)

```typescript
// packages/gifting/hexagon/application/src/pledge-to-occasion.ts — use case
const createPledgingToOccasions = (
  persistence: PledgePersistence,
): ForPledgingToOccasions => ({
  pledgeToOccasion: async (dto) => {
    const stored = await persistence.findOccasionById(dto.occasionId);
    if (!stored) return { success: false, reason: 'not-found' };

    const result = recordPledge(stored.value, {
      id: dto.pledgeId,
      contributorId: dto.principal.contributorId,
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
  },
});

// packages/gifting/hexagon/application/src/pledge-recorded-handler.ts
const handlePledgeRecorded = async (
  projection: PledgeProjection,
  event: PledgeRecorded,
): Promise<void> => {
  await projection.recordFrom(event);
};
```

The use case implementation is identifiable by its dependencies — it takes an
application-owned driven port and returns the driving port interface. This
operation's policy permits any authenticated pledger, so the provider-free
principal is both the authorization precondition and the source of the recorded
actor; the body cannot forge it. A narrower product rule would be checked here
before `recordPledge`. The use case loads one versioned aggregate, delegates to
the aggregate operation, and requests one atomic compare-and-save plus outbox
write. A concurrent change becomes an explicit application outcome instead of
a lost update.

The outbox worker retries delivery, so `PledgeRecorded` can arrive more than once. `PledgeProjection` accepts records from a validated immutable log where the same event ID permanently identifies the same payload; `recordFrom` inserts the first occurrence and ignores an identical redelivery. If an adapter cannot rely on that boundary contract, it must compare a canonical payload fingerprint and surface same-ID/different-payload corruption. Another handler that performs a side effect needs an equivalent idempotency key or inbox record. Transaction mechanics remain in the driven adapter — see `cross-cutting-concerns.md`.

## 6. Driven Adapters

```text
packages/gifting/adapters/driven/postgres/src/
  drizzle-pledge-persistence.ts
  drizzle-pledge-projection.ts
  schema.ts
```

```typescript
// packages/gifting/adapters/driven/postgres/src/drizzle-pledge-persistence.ts
const createDrizzlePledgePersistence = (db: Database): PledgePersistence => ({
  findOccasionById: async (id) => {
    const row = await db.select().from(occasions).where(eq(occasions.id, id)).get();
    return row ? { value: toOccasion(row), version: row.version } : undefined;
  },
  saveWithOutbox: async (occasion, events, expectedVersion) =>
    db.transaction(async (tx) => {
      const updated = await tx.update(occasions)
        .set({ ...toRow(occasion), version: expectedVersion + 1 })
        .where(and(
          eq(occasions.id, occasion.id),
          eq(occasions.version, expectedVersion),
        ))
        .returning({ id: occasions.id });
      if (updated.length !== 1) return 'conflict';

      await tx.insert(outbox).values(events.map(toOutboxRow));
      return 'saved';
    }),
});

// packages/gifting/adapters/driven/postgres/src/drizzle-pledge-projection.ts
const createDrizzlePledgeProjection = (db: Database): PledgeProjection => ({
  recordFrom: async (event) => {
    await db.insert(pledgeProjection).values(toProjectionRow(event))
      .onConflictDoNothing({
        target: pledgeProjection.eventId,
      });
  },
});
```

The persistence adapter translates between domain types and database rows, and implements the application's atomic optimistic `saveWithOutbox` contract with one transaction. The version predicate prevents two readers from overwriting each other; a conflict inserts no outbox row. A successful call saves one aggregate plus durable delivery instructions — never a second aggregate. Under the validated immutable-event contract, the projection adapter makes redelivery idempotent by inserting on `eventId` and doing nothing on conflict; it never overwrites an existing event's projection with incoming data. Neither adapter contains business logic.

## 7. Driving Adapter at a Serverless Executable Entry Point

```text
packages/gifting/adapters/driving/http/src/occasions/by-id/pledge/post.ts
```

```typescript
// packages/gifting/adapters/driving/http/src/occasions/by-id/pledge/post.ts
const PledgePathSchema = z.object({ id: z.string().trim().min(1) }).strict();

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { env } = getCloudflareContext();
  const db = createDb(env.DB);

  // The authentication adapter is the only production constructor for this
  // provider-free principal. The request body cannot choose the actor.
  const principal = await authenticatePledger(request);
  if (!principal) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const parsedPath = PledgePathSchema.safeParse(params);
  if (!parsedPath.success) {
    return NextResponse.json({ error: 'invalid-path' }, { status: 422 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'malformed-json' }, { status: 400 });
  }
  // Strict schema declares amount only; contributor/tenant fields are rejected.
  const parsedBody = PledgeBodySchema.strict().safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 422 });
  }

  // Inline composition: this handler is the executable entrypoint and the graph is trivial
  const persistence = createDrizzlePledgePersistence(db);
  const pledging: ForPledgingToOccasions = createPledgingToOccasions(persistence);

  // Call use case
  const result = await pledging.pledgeToOccasion({
    pledgeId: createPledgeId(crypto.randomUUID()),
    occasionId: createOccasionId(parsedPath.data.id),
    principal,
    amount: parsedBody.data.amount,
  });

  // Translate result to HTTP
  if (!result.success) {
    const status = result.reason === 'not-found'
      ? 404
      : result.reason === 'concurrent-change'
        ? 409
        : 422;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ pledged: result.occasion.totalPledged });
}
```

This deliberately small serverless handler combines a driving adapter with inline composition because it is the executable deployment entrypoint and its graph is trivial. Keep those roles visibly separate in the file. The narrowly scoped JSON parse maps malformed transport syntax to `400`; the path and body schemas map syntactically valid but invalid request data to `422`. Authentication still supplies the actor, and domain results retain their separate `404`/`409`/`422` mappings. An ordinary route module receives a prepared application capability and only parses → delegates → translates. When several endpoints share an object graph, configuration families, or resource lifecycle, move wiring into the host's explicit `composition/` directory. The status selection here is protocol translation, not business policy.

## 8. Fakes for Testing

```typescript
// packages/gifting/testing/fakes/src/fake-pledge-persistence.ts
const createFakePledgePersistence = (
  initial: readonly Occasion[] = [],
): PledgePersistence & {
  readonly savedEntities: readonly Occasion[];
  readonly outboxEvents: readonly PledgeRecorded[];
} => {
  const store = new Map(initial.map(o => [o.id, { value: o, version: 0 }]));
  const saved: Occasion[] = [];
  const outbox: PledgeRecorded[] = [];
  return {
    findOccasionById: async (id) => store.get(id),
    saveWithOutbox: async (occasion, events, expectedVersion) => {
      const current = store.get(occasion.id);
      if (!current || current.version !== expectedVersion) return 'conflict';
      store.set(occasion.id, { value: occasion, version: expectedVersion + 1 });
      saved.push(occasion);
      outbox.push(...events);
      return 'saved';
    },
    get savedEntities() { return saved; },
    get outboxEvents() { return outbox; },
  };
};

// packages/gifting/testing/fakes/src/fake-pledge-projection.ts
const createFakePledgeProjection = (): PledgeProjection & {
  readonly records: readonly PledgeRecorded[];
} => {
  const records = new Map<PledgeId, PledgeRecorded>();
  return {
    recordFrom: async (event) => {
      if (!records.has(event.id)) records.set(event.id, event);
    },
    get records() { return [...records.values()]; },
  };
};
```

Fakes implement the real interface and maintain state. If the interface changes, the fake breaks at compile time.

A fake is a driven *actor* that needs no adapter — it meets the port interface directly. It lives outside the production hexagon under `testing/fakes/`, separate from concrete production adapters.

## 9. Tests

### Use Case Test (Primary)

```typescript
// packages/gifting/hexagon/application/src/pledge-contribution.test.ts
describe('pledge contribution', () => {
  const testOccasion = getTestOccasion({ totalPledged: createMoney(0, 'GBP') });
  const testPledgeId = createPledgeId('pledge-1');
  const testContributorId = createContributorId('contributor-1');
  const testPrincipal = getTestAuthenticatedPledger(testContributorId);

  it('updates one aggregate and records its outbox event', async () => {
    const persistence = createFakePledgePersistence([testOccasion]);
    const pledging = createPledgingToOccasions(persistence);

    const result = await pledging.pledgeToOccasion({
      pledgeId: testPledgeId,
      occasionId: testOccasion.id,
      principal: testPrincipal,
      amount: createMoney(2_500, 'GBP'),
    });

    expect(result).toMatchObject({
      success: true,
      occasion: expect.objectContaining({ totalPledged: createMoney(2_500, 'GBP') }),
    });
    expect(persistence.savedEntities).toHaveLength(1);
    expect(persistence.outboxEvents).toEqual([{
      type: 'PledgeRecorded',
      id: testPledgeId,
      occasionId: testOccasion.id,
      contributorId: testContributorId,
      amount: createMoney(2_500, 'GBP'),
    }]);
  });

  it('rejects a pledge that would exceed the occasion budget', async () => {
    const nearlyFunded = getTestOccasion({
      budget: createMoney(10_000, 'GBP'),
      totalPledged: createMoney(9_000, 'GBP'),
    });
    const persistence = createFakePledgePersistence([nearlyFunded]);
    const pledging = createPledgingToOccasions(persistence);

    const result = await pledging.pledgeToOccasion({
      pledgeId: testPledgeId,
      occasionId: nearlyFunded.id,
      principal: testPrincipal,
      amount: createMoney(2_500, 'GBP'),
    });

    expect(result).toEqual({ success: false, reason: 'exceeds-budget' });
    expect(persistence.savedEntities).toHaveLength(0);
    expect(persistence.outboxEvents).toHaveLength(0);
  });

  it('rejects a pledge in a different currency', async () => {
    const persistence = createFakePledgePersistence([testOccasion]);
    const pledging = createPledgingToOccasions(persistence);

    const result = await pledging.pledgeToOccasion({
      pledgeId: testPledgeId,
      occasionId: testOccasion.id,
      principal: testPrincipal,
      amount: createMoney(2_500, 'USD'),
    });

    expect(result).toEqual({ success: false, reason: 'currency-mismatch' });
    expect(persistence.savedEntities).toHaveLength(0);
    expect(persistence.outboxEvents).toHaveLength(0);
  });

  it('rejects one of two concurrent writes from the same version', async () => {
    const persistence = createFakePledgePersistence([testOccasion]);
    const pledging = createPledgingToOccasions(persistence);

    const results = await Promise.all([
      pledging.pledgeToOccasion({
        pledgeId: createPledgeId('pledge-1'),
        occasionId: testOccasion.id,
        principal: testPrincipal,
        amount: createMoney(2_500, 'GBP'),
      }),
      pledging.pledgeToOccasion({
        pledgeId: createPledgeId('pledge-2'),
        occasionId: testOccasion.id,
        principal: testPrincipal,
        amount: createMoney(3_000, 'GBP'),
      }),
    ]);

    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => !result.success)).toEqual([
      { success: false, reason: 'concurrent-change' },
    ]);
    expect(persistence.savedEntities).toHaveLength(1);
    expect(persistence.outboxEvents).toHaveLength(1);
  });

  it('rejects pledge when funding is closed', async () => {
    const closedOccasion = getTestOccasion({ isFundingClosed: true });
    const persistence = createFakePledgePersistence([closedOccasion]);
    const pledging = createPledgingToOccasions(persistence);

    const result = await pledging.pledgeToOccasion({
      pledgeId: testPledgeId,
      occasionId: closedOccasion.id,
      principal: testPrincipal,
      amount: createMoney(2_500, 'GBP'),
    });

    expect(result).toEqual({ success: false, reason: 'funding-closed' });
  });

  it('handles a redelivered PledgeRecorded event once', async () => {
    const projection = createFakePledgeProjection();
    const event: PledgeRecorded = {
      type: 'PledgeRecorded',
      id: testPledgeId,
      occasionId: testOccasion.id,
      contributorId: testContributorId,
      amount: createMoney(2_500, 'GBP'),
    };

    await handlePledgeRecorded(projection, event);
    await handlePledgeRecorded(projection, event);

    expect(projection.records).toEqual([event]);
  });
});
```

One test file covers the use case, the aggregate operation, atomic persistence intent, and idempotent event handling. No mocks. The tests describe business behavior and delivery guarantees, not call order.

### Domain Unit Test (Complement)

```typescript
// packages/gifting/hexagon/domain/src/pledge-rules.test.ts
describe('recordPledge', () => {
  it('adds the exact amount and records what happened', () => {
    const occasion = getTestOccasion({ totalPledged: createMoney(5_000, 'GBP') });

    const result = recordPledge(occasion, {
      id: createPledgeId('pledge-1'),
      contributorId: createContributorId('contributor-1'),
      amount: createMoney(3_000, 'GBP'),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.occasion.totalPledged).toEqual(createMoney(8_000, 'GBP'));
      expect(result.events).toEqual([expect.objectContaining({
        type: 'PledgeRecorded',
        amount: createMoney(3_000, 'GBP'),
      })]);
    }
  });
});
```

Direct domain tests complement use case tests for complex rules with many edge cases. This function is pure — no setup, no fakes, just values in and values out.

## File Map

```text
packages/
  gifting/                                      ← BOUNDED CONTEXT / CAPABILITY
    hexagon/                                    ← INSIDE
      domain/
        src/
          types.ts                  ← domain types and branded IDs
          occasion.ts               ← entity functions
          pledge.ts                 ← aggregate operation + domain event
          pledge-rules.test.ts
      application/
        src/
          pledging.ts               ← driving port + application result
          pledge-persistence.ts     ← application-owned atomic driven port
          pledge-projection.ts      ← application-owned idempotent driven port
          pledge-to-occasion.ts     ← use case orchestration
          pledge-recorded-handler.ts ← idempotent event handler
          pledge-contribution.test.ts
    adapters/                                   ← OUTSIDE
      driven/postgres/src/
        drizzle-pledge-persistence.ts
        drizzle-pledge-projection.ts
        schema.ts
      driving/http/src/occasions/by-id/pledge/
        post.ts
    testing/                                    ← OUTSIDE TEST INTERACTORS
      fakes/src/
        fake-pledge-persistence.ts
        fake-pledge-projection.ts
        test-factories.ts
```

## What Lives Where (Summary)

| What | Where | Why |
|------|-------|-----|
| Business rules | `<capability>/hexagon/domain/` pure functions | Testable without infrastructure, the core value |
| Application policy and ports | `<capability>/hexagon/application/` | Use cases own their repository/gateway abstractions |
| Persistence/projection implementations | `<capability>/adapters/driven/` | Driven adapters translate domain ↔ DB and implement atomicity/idempotency contracts |
| Route handlers | `<capability>/adapters/driving/` | Driving adapters remain thin glue |
| Fakes | `<capability>/testing/` | Outside in-memory actors shared across use-case tests |
| Focused tests | Colocated with inside behavior | Organized by behavior and protected from implementation coupling |
| Concrete wiring | `composition/` or this tiny route entrypoint | Only the executable host selects implementations |
