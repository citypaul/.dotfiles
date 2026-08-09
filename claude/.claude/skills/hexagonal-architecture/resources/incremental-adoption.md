# Incremental Adoption

How to introduce hexagonal architecture into an existing codebase. You don't need to rewrite everything — extract boundaries incrementally.

## The Strangler Fig Approach

Don't refactor the entire app at once. Wrap new boundaries around existing code, then migrate logic inward over time.

### Step 1: Identify the First Boundary

Pick a feature where business logic is tangled with infrastructure — typically a route handler that queries the database, applies business rules, and sends a response all in one function.

```typescript
// BEFORE — everything in the route handler
export async function POST(request: Request) {
  const principal = await authenticateRequest(request);
  if (!principal) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'malformed-json' }, { status: 400 });
  }
  const parsedBody = DeductBodySchema.strict().safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 422 });
  }
  const body = parsedBody.data;
  const user = await db.select().from(users).where(eq(users.id, principal.userId)).get();
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (!Number.isSafeInteger(body.amountMinorUnits) || body.amountMinorUnits <= 0) {
    return NextResponse.json({ error: 'invalid amount' }, { status: 422 });
  }
  if (body.currency !== user.currency) return NextResponse.json({ error: 'currency mismatch' }, { status: 422 });
  if (user.balanceMinorUnits < body.amountMinorUnits) return NextResponse.json({ error: 'insufficient' }, { status: 422 });
  const balanceMinorUnits = user.balanceMinorUnits - body.amountMinorUnits;
  await db.update(users).set({ balanceMinorUnits }).where(eq(users.id, user.id));
  return NextResponse.json({ balanceMinorUnits, currency: user.currency });
}
```

### Step 2: Extract the Domain Function

Pull the business rule into a pure function. No infrastructure, no async.

```typescript
// packages/billing/hexagon/domain/src/deduct-balance.ts — extracted pure function
type DeductResult =
  | { readonly success: true; readonly user: User }
  | { readonly success: false; readonly reason: 'non-positive-amount' | 'currency-mismatch' | 'insufficient-balance' };

const deductBalance = (user: User, amount: Money): DeductResult => {
  if (!Number.isSafeInteger(amount.minorUnits) || !Number.isSafeInteger(user.balance.minorUnits)) {
    throw new Error('Invalid Money invariant');
  }
  if (amount.minorUnits <= 0) {
    return { success: false, reason: 'non-positive-amount' };
  }
  if (amount.currency !== user.balance.currency) {
    return { success: false, reason: 'currency-mismatch' };
  }
  if (amount.minorUnits > user.balance.minorUnits) {
    return { success: false, reason: 'insufficient-balance' };
  }
  return {
    success: true,
    user: {
      ...user,
      balance: createMoney(user.balance.minorUnits - amount.minorUnits, user.balance.currency),
    },
  };
};
```

### Step 3: Extract the Port Interface

Define the external conversation that application policy needs. Keep the contract inside and express it in domain language.

```typescript
// packages/billing/hexagon/application/src/user-repository.ts — application-owned port
type StoredUser = { readonly value: User; readonly version: number };

interface UserRepository {
  readonly findById: (id: UserId) => Promise<StoredUser | undefined>;
  readonly save: (user: User, expectedVersion: number) => Promise<'saved' | 'conflict'>;
}
```

### Step 4: Create the Adapter

Wrap the existing database access behind the port interface.

```typescript
// packages/billing/adapters/driven/postgres/src/drizzle-user-repository.ts — driven adapter
const createDrizzleUserRepository = (db: Database): UserRepository => ({
  findById: async (id) => {
    const row = await db.select().from(users).where(eq(users.id, id)).get();
    return row ? { value: toUser(row), version: row.version } : undefined;
  },
  save: async (user, expectedVersion) => {
    const updated = await db.update(users)
      .set({ ...toRow(user), version: expectedVersion + 1 })
      .where(and(eq(users.id, user.id), eq(users.version, expectedVersion)))
      .returning({ id: users.id });
    return updated.length === 1 ? 'saved' : 'conflict';
  },
});
```

### Step 5: Create the Use Case

Wire the domain function to the port.

```typescript
// packages/billing/hexagon/application/src/deduct-user-balance.ts — driving port + use case
type DeductUserBalanceResult =
  | DeductResult
  | { readonly success: false; readonly reason: 'not-found' | 'concurrent-change' };

declare const authenticatedPrincipal: unique symbol;
type AuthenticatedPrincipal = {
  readonly [authenticatedPrincipal]: true;
  readonly userId: UserId;
};

interface ForDeductingUserBalances {
  readonly deductUserBalance: (
    dto: { readonly principal: AuthenticatedPrincipal; readonly amount: Money },
  ) => Promise<DeductUserBalanceResult>;
}

const createUserBalanceDeduction = (
  userRepo: UserRepository,
): ForDeductingUserBalances => ({
  deductUserBalance: async (dto) => {
    const stored = await userRepo.findById(dto.principal.userId);
    if (!stored) return { success: false, reason: 'not-found' };
    const result = deductBalance(stored.value, dto.amount);
    if (!result.success) return result;
    const saved = await userRepo.save(result.user, stored.version);
    return saved === 'saved' ? result : { success: false, reason: 'concurrent-change' };
  },
});
```

### Step 6: Thin Out the Executable Entry Point

```typescript
// AFTER — serverless executable entrypoint; inline composition is still trivial
export async function POST(request: Request) {
  // Authentication owns the provider-free principal; the body cannot select a user.
  const principal = await authenticateRequest(request);
  if (!principal) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const db = createDb(env.DB);
  const userRepo = createDrizzleUserRepository(db);
  const balanceDeduction: ForDeductingUserBalances = createUserBalanceDeduction(userRepo);
  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'malformed-json' }, { status: 400 });
  }
  const parsedBody = DeductBodySchema.strict().safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: 'invalid-body' }, { status: 422 });
  }
  const body = parsedBody.data;
  const result = await balanceDeduction.deductUserBalance({
    principal,
    amount: createMoney(body.amountMinorUnits, body.currency),
  });
  if (!result.success) {
    const status = result.reason === 'not-found' ? 404 : result.reason === 'concurrent-change' ? 409 : 422;
    return NextResponse.json({ error: result.reason }, { status });
  }
  return NextResponse.json({ balance: result.user.balance });
}
```

Inline construction is valid here only when the framework makes this handler the executable deployment entrypoint and the graph remains trivial and unshared. In a conventional or shared host, move database, repository, and use-case construction to `main.ts` or `composition/`; inject the prepared `ForDeductingUserBalances` into an ordinary route adapter.

## What to Migrate First

| Signal | Priority |
|--------|----------|
| Business logic in route handlers | High — extract domain functions |
| Direct DB queries in multiple places | High — extract repository port |
| Untestable code (needs real DB to test) | High — extract port + create fake |
| Simple CRUD with no business rules | Low — hex arch adds overhead without benefit |
| Stable code that rarely changes | Low — migration risk exceeds benefit |

## What NOT to Do

- **Don't create a complete repository-root `hexagon/` skeleton and migrate everything at once.** Use `structure-codebase` to establish one capability's first honest inside/outside slice, write tests, verify it, then move to the next.
- **Don't introduce ports for things that don't need them.** A simple config lookup doesn't need a `ConfigPort` interface.
- **Don't force hex arch on CRUD endpoints.** If a route handler just reads from a database and returns JSON with no business logic, leave it alone.
- **Don't create abstract base classes** (`BaseRepository<T>`). Each port is specific to its aggregate.

## The Test is the Proof

After each extraction, you should be able to write a use case test with fakes that proves the feature works — without touching the database. If you can, the boundary is correct. If you can't, something is still tangled.
