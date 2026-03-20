---
name: hexagonal-architecture
description: Hexagonal (ports and adapters) architecture patterns for TypeScript. Use when implementing ports, adapters, dependency inversion, or domain isolation. Only applies to projects that explicitly use hexagonal architecture. Do NOT use for projects without ports/adapters structure.
---

# Hexagonal Architecture (Ports & Adapters)

This skill applies only to projects that have opted in to hexagonal architecture. Do not apply these patterns to projects that use a different architecture. For introducing hex arch into an existing codebase incrementally, see `resources/incremental-adoption.md`.

For domain modeling (entities, value objects, aggregates, ubiquitous language), load the `domain-driven-design` skill. Hex arch and DDD are complementary but independent — hex arch provides structural isolation (how the outside connects), DDD provides the domain model (what lives in the center). A project may use one without the other.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `worked-example.md` | Need a full feature traced through every layer with tests and file map |
| `testing-hex-arch.md` | Writing tests, creating fakes, setting up `createTestDb`, swappability test |
| `cqrs-lite.md` | Reads need to JOIN across aggregates, separating read/write paths |
| `cross-cutting-concerns.md` | Placing auth, logging, transactions, or error formatting |
| `incremental-adoption.md` | Introducing hex arch into an existing codebase |

For authoritative sources, see `../REFERENCES.md`.

---

## Core Concept

Business logic lives in the center. External systems connect through ports (interfaces) and adapters (implementations). Dependencies point inward — the domain never knows about the outside world.

```
         Driving (left)                    Driven (right)
    ┌──────────────────┐            ┌──────────────────┐
    │  Route handlers  │            │  Repositories    │
    │  CLI commands    │──────┐┌────│  API clients     │
    │  Event listeners │      ││    │  Email services  │
    └──────────────────┘      ││    └──────────────────┘
         call into ──────►  ┌────┐  ◄────── implement
                            │    │
                            │ DO │
                            │ MA │
                            │ IN │
                            │    │
         call into ──────►  └────┘  ◄────── implement
    ┌──────────────────┐      ││    ┌──────────────────┐
    │  Cron triggers   │──────┘└────│  File storage    │
    │  Message queues  │            │  Payment gateway │
    └──────────────────┘            └──────────────────┘
```

**Driving adapters** (left): initiate actions on the application. They *call* use cases.
**Driven adapters** (right): the application reaches out to them. They *implement* port interfaces.

This asymmetry is fundamental. Driving adapters depend on use case interfaces. Driven adapters implement repository/gateway interfaces defined by the domain.

---

## Ports = Interfaces

Ports define contracts between layers. They are always `interface` types (behavior contracts, not data shapes).

```typescript
// Driven port — defined in domain, implemented by adapters
interface UserRepository {
  readonly findById: (id: UserId) => Promise<User | undefined>;
  readonly save: (user: User) => Promise<void>;
}

// Driven port — defined in domain, implemented by adapters
interface PaymentGateway {
  readonly charge: (amount: Money, paymentInfo: PaymentInfo) => Promise<ChargeResult>;
}

// Driven port — event publishing (outbound to message brokers)
interface OrderEventPublisher {
  readonly publish: (event: OrderEvent) => Promise<void>;
}
```

**Port design principles:**
- Name ports by business purpose, not technology (`UserRepository`, not `DatabasePort`)
- Keep ports focused — one per aggregate or capability, not one god port
- Port methods use domain types, never infrastructure types (no `SqlRow`, no `HttpResponse`)
- Creation param schemas co-locate with the repository port they describe

---

## Adapters = Implementations

Adapters implement ports for specific technologies. A good adapter is simple — it translates between the port's domain types and the technology's native types. No business logic.

```typescript
// Driven adapter — implements the repository port using Drizzle/D1
const createDrizzleUserRepository = (db: D1Database): UserRepository => ({
  findById: async (id) => {
    const row = await db.select().from(users).where(eq(users.id, id)).get();
    return row ? toUser(row) : undefined;
  },
  save: async (user) => {
    await db.insert(users).values(toRow(user)).onConflictDoUpdate({ ... });
  },
});

// Driven adapter — implements the same port for tests
const createFakeUserRepository = (initial: readonly User[] = []): UserRepository => {
  const store = new Map(initial.map(u => [u.id, u]));
  return {
    findById: async (id) => store.get(id),
    save: async (user) => { store.set(user.id, user); },
  };
};
```

**Adapter error handling:** Infrastructure errors (connection lost, timeout, constraint violation) should either propagate as exceptions to a top-level handler or be translated into domain-appropriate results at the adapter boundary. The domain never catches infrastructure errors — it doesn't know infrastructure exists.

```typescript
// Driven adapter: expected infrastructure outcomes become domain results
const createDrizzleUserRepository = (db: Database): UserRepository => ({
  save: async (user) => {
    const existing = await db.select().from(users).where(eq(users.id, user.id)).get();
    if (existing) return { success: false, reason: 'already-exists' as const };
    await db.insert(users).values(toRow(user));
    return { success: true };
  },
  // Unexpected infrastructure errors (connection lost, disk full) propagate
  // as exceptions to the top-level error handler — don't catch those
});
```

**Key principle:** If swapping an adapter requires changing domain code, the boundary is wrong.

---

## Reads vs Writes (CQRS-lite)

Not all reads need to go through repositories. The repository pattern enforces aggregate boundaries — essential for writes, but reads often need to JOIN across aggregates for display.

| Operation | Pattern | Example |
|-----------|---------|---------|
| Write | Repository (one aggregate) | `userRepo.save(user)` |
| Read (single aggregate) | Repository | `userRepo.findById(id)` |
| Read (cross-aggregate, display) | Query function (JOINs freely) | `getEventDetail(db, eventId)` |

Query functions are driven adapters too — they live in the adapter layer (e.g., `db/queries/`) and return read-optimized DTOs. They bypass the repository pattern intentionally.

```typescript
// Query function — JOINs across aggregates for display
// Lives in db/queries/, NOT in domain/
const getParticipantEventView = async (db: Database, eventId: string) => {
  return db.select({ ... })
    .from(events)
    .innerJoin(occasions, ...)
    .leftJoin(giftClaims, ...)
    .where(eq(events.id, eventId))
    .all();
};
```

Domain-layer pure functions can transform query results into display types — these encode business rules about what data means (e.g., "is this item claimed by the current user?"). The query fetches; the domain function interprets.

For detailed CQRS-lite guidance, see `resources/cqrs-lite.md`.

---

## Dependency Injection

Inject all dependencies via function parameters. No DI container needed. This is Seemann's "dependency rejection" — in functional TypeScript, the use case is a pure function that receives everything it needs.

```typescript
// WRONG — creates dependencies internally (untestable, tightly coupled)
const createOrder = async (order: NewOrder) => {
  const repo = new DrizzleOrderRepo(getDb());          // hardcoded
  const gateway = new StripeGateway(process.env.KEY);   // hardcoded
  // ...
};

// RIGHT — dependencies as parameters (testable, swappable)
const createOrder = async (
  repo: OrderRepository,
  gateway: PaymentGateway,
  order: NewOrder,
): Promise<OrderResult> => {
  const charge = await gateway.charge(order.total, order.payment);
  if (!charge.success) return { success: false, reason: charge.error };
  const saved = await repo.save({ ...order, chargeId: charge.id });
  return { success: true, order: saved };
};
```

**Composition root:** Wiring happens at the application entry point — where adapters are created from environment/config and injected into use cases. This is the only place that knows about concrete implementations.

```typescript
// Route handler = composition root + driving adapter
export async function POST(request: Request) {
  const { env } = getCloudflareContext();
  const db = createDb(env.DB);

  // Wire adapters
  const repo = createDrizzleOrderRepository(db);
  const gateway = createStripeGateway(env.STRIPE_KEY);

  // Call use case
  const body = CreateOrderSchema.parse(await request.json());
  const result = await createOrder(repo, gateway, body);
  return NextResponse.json(result);
}
```

The route handler is thin glue: parse input → wire adapters → call use case → return response. No business logic.

**Non-HTTP driving adapters** follow the same pattern — parse, wire, delegate:

```typescript
// Queue consumer = driving adapter (same structure as route handler)
const handlePledgeMessage = async (message: SQSMessage, env: Env) => {
  const db = createDb(env.DB);
  const occasionRepo = createDrizzleOccasionRepository(db);
  const contributorRepo = createDrizzleContributorRepository(db);

  const dto = PledgeSchema.parse(JSON.parse(message.body));
  await handlePledge(occasionRepo, contributorRepo, dto);
};
```

The use case doesn't know or care whether it was triggered by an HTTP request, a queue message, a cron job, or a CLI command. Every driving adapter is thin glue.

**Naming:** Use cases are named after the business operation — `createOrder`, `placeOrder`, `handlePledge`. Never `createOrderUseCase` or `PlaceOrderHandler`. Pattern suffixes are technical jargon, not domain language. You can tell a use case from a domain function by its signature — use cases take ports (repositories, gateways) as parameters; domain functions take only domain types.

---

## File Organization

| Layer | Location | Contains | Tests |
|-------|----------|----------|-------|
| Domain | `src/domain/` | Pure business logic, types, port interfaces, use cases | Unit tests (no mocks) |
| Adapters (driven) | `src/db/`, `src/infrastructure/` | Repository impls, API clients, query functions | Integration tests (real DB/MSW) |
| Adapters (driving) | `src/app/` | Route handlers, event listeners | E2E tests (Playwright) |
| Wiring | `src/lib/`, `src/context.ts` | Adapter factories, config, composition | Covered by E2E |

**Key rules:**
- Domain has zero external dependencies (no framework, database, or HTTP imports)
- Port interfaces live in domain alongside the entity they serve
- Schemas co-locate with their entity in domain
- Adapters import from domain, never the reverse
- Route handlers are thin — parse, wire, delegate, respond

---

## Testing Strategy

Hex arch's primary benefit is testability. The primary test boundary is the **use case** — call it with driven ports replaced by in-memory **fakes** (not mocks). This proves the feature works as a whole.

| Priority | Boundary | What it proves |
|----------|----------|----------------|
| **Primary** | Use case (faked driven ports) | Feature works end-to-end within the hexagon |
| **Complement** | Domain pure functions | Complex business rules in isolation |
| **Secondary** | Driven adapters (real DB/MSW) | Adapter translates correctly |
| **Verification** | E2E (full stack) | User experience works |

**Fakes over mocks:** Fakes implement the real interface and maintain state. Mocks verify call sequences and break on refactoring. See `resources/testing-hex-arch.md` for detailed patterns.

For a complete worked example showing one feature traced through every layer (glossary → types → domain → use case → adapters → tests → file locations), see `resources/worked-example.md`.

---

## Cross-Cutting Concerns

| Concern | Where | Why |
|---------|-------|-----|
| Authentication (who are you?) | Driving adapter | Protocol-specific (JWT, session, API key) |
| Authorization (are you allowed?) | Domain | Business rule about permissions |
| Logging | Adapters (both sides) | Side effect, not business logic |
| Transactions | Adapter / composition root | Infrastructure concern, domain unaware |
| Error formatting | Driving adapter | Translates domain results to HTTP/gRPC |

**The domain never imports a logger, catches HTTP errors, or manages transactions.** It returns results; adapters handle the rest. See `resources/cross-cutting-concerns.md` for detailed patterns.

---

## Anti-Patterns

### Domain Depending on Infrastructure

The most common hex arch violation. Domain code imports from frameworks, databases, or external services.

```typescript
// ❌ Domain imports Drizzle
import { eq } from 'drizzle-orm';
export const findActiveUsers = async (db) => db.select()...

// ✅ Domain defines the contract; adapter implements it
interface UserRepository {
  readonly findActive: () => Promise<readonly User[]>;
}
```

### Business Logic in Adapters

Route handlers or repositories contain business rules instead of delegating to domain.

```typescript
// ❌ Business rule in route handler
export async function POST(request: Request) {
  const order = await orderRepo.findById(id);
  if (order.total > 1000) { await requireManagerApproval(order); } // business rule!
  ...
}

// ✅ Business rule in domain
const placeOrder = (order: Order): PlaceOrderResult => {
  if (order.total > 1000) return { success: false, reason: 'requires-approval' };
  ...
};
```

### Bypass Adapters

Route handler accesses the database directly instead of going through a port.

```typescript
// ❌ Route handler hits DB directly
export async function GET(request: Request) {
  const users = await db.select().from(users).where(eq(users.active, true));
  ...
}

// ✅ Route handler calls use case, which uses a port
const result = await getActiveUsers(userRepo);
```

### Port Proliferation

Creating a port for every tiny abstraction. Ports should represent meaningful boundaries — one per aggregate (repositories) or per external capability (payment, email, auth).

### Technology-Shaped Ports

Port methods that expose technology details. Port methods should use domain language.

```typescript
// ❌ Technology leaks into port
interface UserRepository {
  readonly findBySqlQuery: (sql: string) => Promise<User[]>;
  readonly getFromRedisCache: (key: string) => Promise<User>;
}

// ✅ Business language
interface UserRepository {
  readonly findActive: () => Promise<readonly User[]>;
  readonly findById: (id: UserId) => Promise<User | undefined>;
}
```

---

## Checklist

- [ ] Domain logic has zero framework/infrastructure dependencies
- [ ] All external boundaries use ports (interfaces)
- [ ] Driving adapters (routes) are thin — parse, wire, delegate, respond
- [ ] Driven adapters (repos) implement ports, contain no business logic
- [ ] Dependencies injected via parameters, never created internally
- [ ] Port interfaces live in domain, named by business purpose
- [ ] Schemas defined in domain, not duplicated in adapters
- [ ] Reads that JOIN across aggregates use query functions (CQRS-lite)
- [ ] Each layer has behavioral tests at the appropriate level
- [ ] Swapping any adapter requires zero domain code changes
- [ ] Cross-cutting concerns (auth, logging, transactions) live in adapters, not domain
- [ ] Domain returns result types for expected outcomes, never throws for business rules
