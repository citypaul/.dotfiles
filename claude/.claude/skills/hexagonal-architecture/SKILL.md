---
name: hexagonal-architecture
description: Hexagonal (ports and adapters) architecture patterns for TypeScript. Use when implementing ports, adapters, dependency inversion, or domain isolation. Only applies to projects that explicitly use hexagonal architecture. Do NOT use for projects without ports/adapters structure.
---

# Hexagonal Architecture (Ports & Adapters)

This skill applies only to projects that have opted in to hexagonal architecture. Do not apply these patterns to projects that use a different architecture.

For domain modeling (entities, value objects, aggregates, ubiquitous language), load the `domain-driven-design` skill. Hex arch and DDD are complementary but independent — hex arch provides structural isolation (how the outside connects), DDD provides the domain model (what lives in the center). A project may use one without the other.

**Deep-dive resources** are in the `resources/` directory within this skill folder.

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

Inject all dependencies via function parameters. No DI container needed.

```typescript
// Use case accepts ports via parameters — testable with fakes
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

---

## File Organization

| Layer | Location | Contains | Tests |
|-------|----------|----------|-------|
| Domain | `src/domain/` | Pure business logic, types, port interfaces | Unit tests (no mocks) |
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

### Bypass Adapters

Route handler accesses the database directly instead of going through a port.

### Port Proliferation

Creating a port for every tiny abstraction. Ports should represent meaningful boundaries — one per aggregate (repositories) or per external capability (payment, email, auth).

### Technology-Shaped Ports

Port methods that expose technology details (`findBySqlQuery`, `getFromRedis`). Port methods should use domain language (`findActiveUsers`, `getUpcomingEvents`).

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
