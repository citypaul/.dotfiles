# Cross-Cutting Concerns

Where logging, authentication, transactions, and error formatting live in hexagonal architecture.

## The Principle

Cross-cutting concerns live in adapters, never in domain. The domain is pure business logic — it doesn't know about HTTP status codes, log levels, database transactions, or auth tokens.

## Authentication & Authorization

**Auth lives in driving adapters** (middleware, route handlers). The domain receives already-validated identity as a domain type.

```typescript
// Driving adapter: extract and validate auth
export async function POST(request: Request) {
  const userId = await authenticateRequest(request);  // middleware / adapter concern
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const pledging: ForPledgingToOccasions = createPledgingToOccasions(occasionRepo, contributorRepo);

  // Pass validated identity to use case as a domain type
  const result = await pledging.pledgeToOccasion({
    ...body,
    contributorId: userId,  // already a branded ContributorId
  });
  ...
}
```

```typescript
// Domain: receives identity, applies business rules
const createPledgingToOccasions = (
  occasionRepo: OccasionRepository,
  contributorRepo: ContributorRepository,
): ForPledgingToOccasions => ({
  pledgeToOccasion: async (dto: { readonly contributorId: ContributorId; ... }) => {
    // The domain doesn't check JWT tokens or session cookies.
    // It receives a ContributorId and applies business rules.
  },
});
```

**Authorization (business rules about who can do what)** is domain logic:

```typescript
// Domain: "only the organizer can close funding" is a business rule
const closeFunding = (occasion: Occasion, requesterId: ContributorId): CloseResult => {
  if (occasion.organizerId !== requesterId) {
    return { success: false, reason: 'not-organizer' };
  }
  return { success: true, occasion: { ...occasion, isFundingClosed: true } };
};
```

**Authentication** (who are you?) = adapter. **Authorization** (are you allowed?) = domain.

## Logging

**Logging lives in adapters.** Domain functions are pure — they return values, not side effects. Log at the boundaries:

```typescript
// Driving adapter: log the request/response cycle
export async function POST(request: Request) {
  const body = PledgeSchema.parse(await request.json());
  const pledging: ForPledgingToOccasions = createPledgingToOccasions(occasionRepo, contributorRepo);
  const result = await pledging.pledgeToOccasion(body);

  if (!result.success) {
    logger.warn('Pledge rejected', { reason: result.reason, occasionId: body.occasionId });
  }
  return NextResponse.json(...);
}

// Driven adapter: log infrastructure interactions
const createDrizzleOccasionRepository = (db: Database, logger: Logger): OccasionRepository => ({
  save: async (occasion) => {
    await db.insert(occasions).values(toRow(occasion))...;
    logger.debug('Occasion saved', { id: occasion.id });
  },
});
```

**Never import a logger into domain code.** If you need to observe domain behavior, the return values tell you everything — the driving adapter inspects the result and logs accordingly.

## Transactions

**Transactions are an adapter concern.** The use case doesn't know whether saves are transactional. The adapter layer decides.

```typescript
// Driving adapter wraps the use case in a transaction
const createTransactionalPledgingToOccasions = (db: Database): ForPledgingToOccasions => ({
  pledgeToOccasion: async (dto) =>
    db.transaction(async (tx) => {
      const occasionRepo = createDrizzleOccasionRepository(tx);
      const contributorRepo = createDrizzleContributorRepository(tx);
      const pledging = createPledgingToOccasions(occasionRepo, contributorRepo);
      return pledging.pledgeToOccasion(dto);
    }),
});
```

The driving port (`ForPledgingToOccasions`) is unchanged — the transactional implementation still satisfies the same interface. The domain doesn't know or care.

**When transactions aren't needed:** For single-aggregate saves, no transaction wrapper is necessary. Only add transactions when multiple aggregates must be saved atomically. See the `domain-driven-design` skill's `resources/aggregate-design.md` for guidance on one-aggregate-per-transaction.

## Error Formatting

**The driving adapter translates domain results to protocol-specific responses.** The domain returns business-language results; the adapter maps them to HTTP, gRPC, or whatever protocol the client speaks.

```typescript
// Domain returns: { success: false, reason: 'funding-closed' }
// Route handler translates:
const toHttpResponse = (result: PledgeResult): NextResponse => {
  if (result.success) {
    return NextResponse.json({ pledged: result.occasion.totalPledged }, { status: 200 });
  }
  const statusMap: Record<Extract<PledgeResult, { success: false }>['reason'], number> = {
    'not-found': 404,
    'insufficient-balance': 422,
    'funding-closed': 422,
  };
  return NextResponse.json({ error: result.reason }, { status: statusMap[result.reason] });
};
```

**The domain never returns HTTP status codes, error messages for users, or protocol-specific types.** It returns business reasons. The adapter translates.

## Summary

| Concern | Where | Why |
|---------|-------|-----|
| Authentication (who are you?) | Driving adapter | Protocol-specific (JWT, session, API key) |
| Authorization (are you allowed?) | Domain | Business rule about permissions |
| Logging | Adapters (both driving and driven) | Side effect, not business logic |
| Transactions | Adapter / composition root | Infrastructure concern, domain unaware |
| Error formatting | Driving adapter | Protocol-specific translation |
| Input validation (schema) | Driving adapter boundary | Parse at the edge, trust inside |
| Business validation | Domain | Business rules are domain logic |
