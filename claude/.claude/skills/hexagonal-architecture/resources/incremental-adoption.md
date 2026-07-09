# Incremental Adoption

How to introduce hexagonal architecture into an existing codebase. You don't need to rewrite everything — extract boundaries incrementally.

## The Strangler Fig Approach

Don't refactor the entire app at once. Wrap new boundaries around existing code, then migrate logic inward over time.

### Step 1: Identify the First Boundary

Pick a feature where business logic is tangled with infrastructure — typically a route handler that queries the database, applies business rules, and sends a response all in one function.

```typescript
// BEFORE — everything in the route handler
export async function POST(request: Request) {
  const body = await request.json();
  const user = await db.select().from(users).where(eq(users.id, body.userId)).get();
  if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
  if (user.balance < body.amount) return NextResponse.json({ error: 'insufficient' }, { status: 422 });
  await db.update(users).set({ balance: user.balance - body.amount }).where(eq(users.id, user.id));
  return NextResponse.json({ balance: user.balance - body.amount });
}
```

### Step 2: Extract the Domain Function

Pull the business rule into a pure function. No infrastructure, no async.

```typescript
// hexagon/billing/deduct-balance.ts — extracted pure function
type DeductResult =
  | { readonly success: true; readonly user: User }
  | { readonly success: false; readonly reason: 'insufficient-balance' | 'not-found' };

const deductBalance = (user: User, amount: Money): DeductResult => {
  if (amount.amount > user.balance.amount) {
    return { success: false, reason: 'insufficient-balance' };
  }
  return {
    success: true,
    user: { ...user, balance: createMoney(user.balance.amount - amount.amount, user.balance.currency) },
  };
};
```

### Step 3: Extract the Port Interface

Define the external conversation that application policy needs. Keep the contract inside and express it in domain language.

```typescript
// hexagon/billing/repository.ts — inside port
interface UserRepository {
  readonly findById: (id: UserId) => Promise<User | undefined>;
  readonly save: (user: User) => Promise<void>;
}
```

### Step 4: Create the Adapter

Wrap the existing database access behind the port interface.

```typescript
// adapters/driven/postgres/drizzle-user-repository.ts — driven adapter
const createDrizzleUserRepository = (db: Database): UserRepository => ({
  findById: async (id) => {
    const row = await db.select().from(users).where(eq(users.id, id)).get();
    return row ? toUser(row) : undefined;
  },
  save: async (user) => {
    await db.update(users).set(toRow(user)).where(eq(users.id, user.id));
  },
});
```

### Step 5: Create the Use Case

Wire the domain function to the port.

```typescript
// hexagon/billing/deduct-user-balance.ts — driving port + implementation
interface ForDeductingUserBalances {
  readonly deductUserBalance: (dto: { readonly userId: UserId; readonly amount: Money }) => Promise<DeductResult>;
}

const createUserBalanceDeduction = (
  userRepo: UserRepository,
): ForDeductingUserBalances => ({
  deductUserBalance: async (dto) => {
    const user = await userRepo.findById(dto.userId);
    if (!user) return { success: false, reason: 'not-found' };
    const result = deductBalance(user, dto.amount);
    if (result.success) await userRepo.save(result.user);
    return result;
  },
});
```

### Step 6: Thin Out the Executable Entry Point

```typescript
// AFTER — serverless executable entrypoint; inline composition is still trivial
export async function POST(request: Request) {
  const db = createDb(env.DB);
  const userRepo = createDrizzleUserRepository(db);
  const balanceDeduction: ForDeductingUserBalances = createUserBalanceDeduction(userRepo);
  const body = DeductSchema.parse(await request.json());
  const result = await balanceDeduction.deductUserBalance(body);
  if (!result.success) {
    return NextResponse.json({ error: result.reason }, { status: result.reason === 'not-found' ? 404 : 422 });
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

- **Don't create a complete `hexagon/` skeleton and migrate everything at once.** Use `structure-codebase` to establish the first honest inside/outside slice, write tests, verify it, then move to the next.
- **Don't introduce ports for things that don't need them.** A simple config lookup doesn't need a `ConfigPort` interface.
- **Don't force hex arch on CRUD endpoints.** If a route handler just reads from a database and returns JSON with no business logic, leave it alone.
- **Don't create abstract base classes** (`BaseRepository<T>`). Each port is specific to its aggregate.

## The Test is the Proof

After each extraction, you should be able to write a use case test with fakes that proves the feature works — without touching the database. If you can, the boundary is correct. If you can't, something is still tangled.
