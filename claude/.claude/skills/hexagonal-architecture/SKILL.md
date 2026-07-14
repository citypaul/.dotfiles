---
name: hexagonal-architecture
description: Use only when the user or project explicitly adopts hexagonal (ports and adapters) architecture. Implements TypeScript ports, driving/driven adapters, dependency inversion, and domain isolation. Do NOT infer hexagonal architecture from a generic adapter, interface, test seam, or isolation request.
---

# Hexagonal Architecture (Ports & Adapters)

This skill applies only to projects that have opted in to hexagonal architecture. Do not apply these patterns to projects that use a different architecture. For introducing hex arch into an existing codebase incrementally, see `resources/incremental-adoption.md`.

For domain modeling (entities, value objects, aggregates, ubiquitous language), load the `domain-driven-design` skill. Hex arch and DDD are complementary but independent — hex arch provides structural isolation (how the outside connects), DDD provides the domain model (what lives in the center). A project may use one without the other.

Use the `structure-codebase` skill when designing or changing the physical source tree. For an opted-in hexagonal backend it makes the entire provider-free inside visible under `hexagon/`, keeps concrete driving/driven technology and reusable test interactors outside, and defines proportional package/import enforcement. If physical restructuring is not requested, preserve the repo's existing layout while enforcing the dependency direction described here.

Use `codebase-design` for the coherent responsibility and full caller burden behind a port or in-process module. Not every module interface or test seam is a hexagonal port, and intentionally thin driving/driven adapters should remain thin. Use `finding-seams` for the minimum enabling point needed to characterize hard-coupled legacy behavior before deciding whether a durable port is warranted.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `worked-example.md` | Need a full feature traced through every layer with tests and file map |
| `testing-hex-arch.md` | Writing tests, creating fakes, setting up `createTestDb`, swappability test |
| `cqrs-lite.md` | Reads need to JOIN across aggregates, separating read/write paths |
| `cross-cutting-concerns.md` | Placing auth, logging, transactions, or error formatting |
| `incremental-adoption.md` | Introducing hex arch into an existing codebase |
| `greenfield-sequence.md` | Starting a hex project from scratch — ordering the first ports, adapters, and tests |
| `references.md` | Checking source rationale, especially port/public interface naming |

For authoritative sources and naming rationale, see `resources/references.md`.

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

The pattern itself is symmetric: one rule — inside versus outside — and the application knows nothing about what is connected on either side. The left/right asymmetry appears only in implementation, as who knows whom: driving adapters know the application and call the driving port interfaces it exposes; the application knows its driven adapters only as injected parameters implementing the port interfaces it defines. That is why driving ports are provided interfaces and driven ports are required interfaces.

The pattern defines exactly two zones — inside and outside — and says nothing about how either is structured internally. The domain/use-case layering in this skill is our recommended way to keep the inside honest, not part of the pattern.

**Vocabulary:** An *actor* is anything with behavior outside the boundary — a human, a database, another program, a test. *Driving* (= *primary*) actors initiate a conversation with the application; *driven* (= *secondary*) actors are the ones the application calls. These are the only adjective pairs that apply equally to actors, ports, and adapters (inbound/outbound works for ports, adapters, and folders — but not actors). An *interactor* is an actor or its adapter, whichever touches the port directly: not every actor needs an adapter — tests, sibling hexagonal apps, and program-to-program callers can meet a port's interface as-is. Driving ports form the application's *provided interface* (API); driven ports form its *required interface* (SPI).

---

## Ports = Public Contracts

A port is a named, purposeful conversation at the application boundary. In TypeScript, represent ports as explicit `interface` types when the boundary is public or architectural: driving adapters call driving port interfaces, and driven adapters/fakes implement driven port interfaces.

Use case implementations satisfy the driving port. The driving adapter should depend on the port's role-shaped interface, not a framework-specific controller, handler class, or concrete adapter.

### Naming Ports and Public Interfaces

Name every port from the application's point of view, using the domain language of the conversation. The source pattern names *every* port — driving and driven — for the intention of the conversation: `ForPlacingOrders`, `ForGettingTaxRates`, `ForStoringTickets`. The pattern legislates no naming at all, though. This skill keeps intention names for driving ports and uses role nouns (`OrderRepository`, `PaymentGateway`) for driven ports as a deliberate house choice: both styles are purpose names, never technology names. A codebase already using `For...` names on the driven side is following the source convention — leave it be.

| Boundary | Good names | Avoid | Why |
|----------|------------|-------|-----|
| Driving/public API | `ForPlacingOrders`, `ForPledgingToOccasions` | `PlaceOrderUseCase`, `PlaceOrderHandler`, `OrderInputPort` | Names the actor capability, not the pattern |
| Aggregate persistence | `OrderRepository`, `ContributorRepository` (or `ForStoringOrders`) | `OrderDatabase`, `OrderDao`, `SqlOrderPort` | Repository is a domain collection abstraction |
| External service | `PaymentGateway`, `ExchangeRateProvider` (or `ForPaying`, `ForObtainingRates`) | `StripeClient`, `HttpPaymentPort` | Names the capability the app needs, not the vendor/protocol |
| Notifications/events | `OrderEventPublisher`, `ReceiptSender` (or `ForNotifyingContributors`) | `SnsAdapter`, `MessageBusPort` | Names the business-side interaction |

**Public interface naming rules:**
- Use `interface` for behavior contracts, not data shapes that are better modeled as `type`/schemas.
- Do not prefix interfaces with `I` or suffix them with `Interface`; name the role (`PaymentGateway`, not `IPaymentGateway` or `PaymentGatewayInterface`).
- Avoid `Port` in type names. A name like `PaymentPort` says "architecture" instead of "conversation."
- Avoid `Impl` in implementation names. Name the concrete technology or strategy: `createStripePaymentGateway`, `createFakePaymentGateway`, `createDrizzleOrderRepository`.
- Prefer role interfaces over header interfaces: include only the methods the use case needs, not every method an adapter happens to expose.
- Make names stable under adapter swaps. If moving from Stripe to PayPal, SQL to DynamoDB, or HTTP to a queue forces a port rename, the port name leaked infrastructure.

```typescript
// Driving port — exposed by the application, called by driving adapters
interface ForPlacingOrders {
  readonly placeOrder: (command: PlaceOrderCommand) => Promise<PlaceOrderResult>;
}

// Driven port — owned inside beside application policy, implemented by adapters
interface UserRepository {
  readonly findById: (id: UserId) => Promise<User | undefined>;
  readonly save: (user: User) => Promise<void>;
}

// Driven port — owned inside beside application policy, implemented by adapters
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
// Driven adapter: translate expected infrastructure errors into domain-specific errors
const createDrizzleUserRepository = (db: Database): UserRepository => ({
  save: async (user) => {
    try {
      await db.insert(users).values(toRow(user)).onConflictDoUpdate({ ... });
    } catch (e) {
      if (isUniqueConstraintError(e)) throw new UserAlreadyExistsError(user.id);
      throw e; // unexpected errors (connection lost, disk full) propagate
    }
  },
});
```

Expected constraint violations become domain-specific errors (caught by the use case or driving adapter). Unexpected infrastructure errors propagate to the top-level handler.

**Key principle:** If swapping an adapter requires changing domain code, the boundary is wrong.

---

## Reads vs Writes (CQRS-lite)

Not all reads need to go through repositories. The repository pattern enforces aggregate boundaries — essential for writes, but reads often need to JOIN across aggregates for display.

| Operation | Pattern | Example |
|-----------|---------|---------|
| Write | Repository (one aggregate) | `userRepo.save(user)` |
| Read (single aggregate) | Repository | `userRepo.findById(id)` |
| Read (cross-aggregate, display) | Query function (JOINs freely) | `getEventDetail(db, eventId)` |

Query functions are driven adapters too — in the visible layout they live under the relevant provider edge (for example, `adapters/driven/postgres/queries/`) and return read-optimized DTOs. They bypass the repository pattern intentionally.

```typescript
// Query function — JOINs across aggregates for display
// Lives at adapters/driven/postgres/queries/, outside the hexagon
const getParticipantEventView = async (db: Database, eventId: string) => {
  return db.select({ ... })
    .from(events)
    .innerJoin(occasions, ...)
    .leftJoin(giftClaims, ...)
    .where(eq(events.id, eventId))
    .all();
};
```

Provider-free inside functions may interpret query results when the interpretation expresses genuine business meaning (for example, "is this item claimed by the current user?"). Display-only formatting stays at the driving edge. The query fetches; business policy interprets.

For detailed CQRS-lite guidance, see `resources/cqrs-lite.md`. When the read/write split goes all the way — events as the source of truth, rebuilt into read models by replay — that is event sourcing; load the `event-sourcing` skill.

---

## Dependency Injection and the Configurator

Inject all dependencies via function parameters. No DI container needed. The driving adapter gathers impure dependencies, passes them to the use case, and acts on the result — Seemann's "impureim sandwich" (impure/pure/impure).

```typescript
// WRONG — creates dependencies internally (untestable, tightly coupled)
const createOrder = async (order: NewOrder) => {
  const repo = new DrizzleOrderRepo(getDb());          // hardcoded
  const gateway = new StripeGateway(process.env.KEY);   // hardcoded
  // ...
};

// RIGHT — dependencies injected into a use case implementation
interface ForPlacingOrders {
  readonly placeOrder: (order: NewOrder) => Promise<OrderResult>;
}

const createOrderPlacement = (
  repo: OrderRepository,
  gateway: PaymentGateway,
): ForPlacingOrders => ({
  placeOrder: async (order) => {
    const charge = await gateway.charge(order.total, order.payment);
    if (!charge.success) return { success: false, reason: charge.error };
    const saved = await repo.save({ ...order, chargeId: charge.id });
    return { success: true, order: saved };
  },
});
```

**Composition root:** Wiring happens at the application entry point — where adapters are created from environment/config and injected into use cases. This is the only place that knows about concrete implementations.

```typescript
// Serverless executable entrypoint = inline composition + driving adapter
// Valid only while this object graph remains trivial and unshared.
export async function POST(request: Request) {
  const { env } = getCloudflareContext();
  const db = createDb(env.DB);

  // Wire adapters
  const repo = createDrizzleOrderRepository(db);
  const gateway = createStripeGateway(env.STRIPE_KEY);
  const orderPlacement: ForPlacingOrders = createOrderPlacement(repo, gateway);

  // Call use case
  const body = CreateOrderSchema.parse(await request.json());
  const result = await orderPlacement.placeOrder(body);
  return NextResponse.json(result);
}
```

This handler may combine two roles only because the framework makes it the executable deployment entrypoint and the graph is trivial. Keep the inline wiring visually distinct from request translation. In a shared or nontrivial host, construct the graph once in `main.ts` or `composition/` and give the route a prepared `ForPlacingOrders`; an ordinary route module never selects implementations. No business logic belongs in either role.

**The configurator:** whatever code knows all the players and introduces them — the composition root here — is the pattern's fifth element. Constructor injection (this skill's default) is one of three sanctioned shapes: a setter or `ForConfiguring...` function allows driven adapters to be swapped while the system runs (hazard: an app constructed but never configured), and dependency lookup hands the application a broker it asks at call time. In tests, the test case itself plays configurator and driving actor at once; in production, the composition root does.

**Non-HTTP executable entrypoints** follow the same boundary. A queue callback that is itself the deployment entrypoint may compose a trivial graph inline; an ordinary consumer receives a prepared driving port and only parses, delegates, and translates:

```typescript
// Queue deployment entrypoint = inline composition + driving adapter
const handlePledgeMessage = async (message: SQSMessage, env: Env) => {
  const db = createDb(env.DB);
  const occasionRepo = createDrizzleOccasionRepository(db);
  const contributorRepo = createDrizzleContributorRepository(db);
  const pledging: ForPledgingToOccasions = createPledgingToOccasions(occasionRepo, contributorRepo);

  const dto = PledgeSchema.parse(JSON.parse(message.body));
  await pledging.pledgeToOccasion(dto);
};
```

The use case doesn't know or care whether it was triggered by an HTTP request, a queue message, a cron job, or a CLI command. Every driving adapter remains thin translation glue; only an executable-entrypoint exception may also select a trivial concrete graph.

**Naming:** Use case interfaces and implementations are named after the business capability — `ForPlacingOrders`, `createOrderPlacement`, `pledgeToOccasion`. Never `CreateOrderUseCase` or `PlaceOrderHandler`. Pattern suffixes are technical jargon, not domain language. You can tell a use case implementation from a domain function by its dependencies — use case implementations take driven ports (repositories, gateways) as parameters; domain functions take only domain types.

*Terminology note:* in the source pattern literature, "use case" is a requirements technique — its primary/secondary actors map to driving/driven actors, and ports start out one per actor. This skill uses "use case" for the orchestration object that implements a driving port. Related, not the same thing.

---

## File Organization

These are logical roles, not mandatory folder names. The `structure-codebase` skill owns physical layout and recommends a visible `hexagon/` beside outside adapters when restructuring is in scope.

| Role | Zone | Contains | Tests |
|------|------|----------|-------|
| Domain policy | Inside | Pure business rules, types, state transitions | Focused behavior/property tests |
| Application policy | Inside | Provider-free orchestration, driving-port implementations, driven-port use | Use-case tests with test interactors |
| Port contracts | Inside | Purposeful provided/required application conversations | Exercised from both sides of each port |
| Driven adapters | Outside | Repository implementations, API clients, query functions | Integration/contract tests |
| Driving adapters | Outside | Route handlers, event listeners, CLI/queue entrypoints | Transport/E2E tests |
| Test interactors | Outside | Test drivers, fakes, reusable behavioral contract suites | Test support only |
| Composition root | Executable host | Concrete construction, configuration, resource lifecycle | Startup/smoke/E2E coverage |

**Key rules:**
- Domain policy has zero framework/infrastructure dependencies and remains genuinely pure.
- Application policy may call injected ports but performs no concrete I/O and remains runnable in-process.
- Driving and driven port contracts live inside, preferably beside the policy that owns the conversation.
- Trust-boundary/wire schemas live with the adapter that parses them; domain-owned validation may live inside when it expresses business invariants without leaking a provider representation.
- Adapters import inside public contracts, never the reverse.
- Driving adapters are thin — parse, authenticate, translate, delegate, respond.
- Concrete wiring belongs near the executable entrypoint. A tiny entrypoint may compose inline; a nontrivial host uses an explicit composition root.
- When `structure-codebase` is applied, enforce these roles with its package/import-boundary guidance.

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

**A port is only real if it is tested.** Every port needs a test interactor — a test driver at each driving port, a fake at each driven port. Without one, the "port" is just a line on a diagram; nothing enforces it as a boundary. The test wall doubles as the leak detector: business logic drifting into an adapter, or technology detail drifting into the domain, breaks a boundary test immediately.

For a complete worked example showing one feature traced through every layer (glossary → types → domain → use case → adapters → tests → file locations), see `resources/worked-example.md`.

---

## Cross-Cutting Concerns

| Concern | Where | Why |
|---------|-------|-----|
| Authentication (who are you?) | Driving adapter | Protocol-specific (JWT, session, API key) |
| Authorization (are you allowed?) | Domain | Business rule about permissions |
| Technical telemetry & correlation | Adapters (both sides) | Infrastructure side effect |
| Domain observations (support logs, business metrics) | Driven port (probe) or domain events | Business-significant facts; tested with fakes like any port |
| Transactions | Adapter / composition root | Infrastructure concern, domain unaware |
| Error formatting | Driving adapter | Translates domain results to HTTP/gRPC |

**The domain never imports a logger, catches HTTP errors, or manages transactions.** It returns results — and where a business-significant fact doesn't survive to the boundary, it announces the fact through an explicit driven port (Domain Probe) or a domain event, never a raw logger. See `resources/cross-cutting-concerns.md` for the four-tier observability model and detailed patterns; for what goes into telemetry (wide events, SLOs, alerting), see the `observability` skill.

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

### Port for a Domain Concept

A driven port represents a conversation with an external system — a database, a payment provider, a notification channel. Wrapping an internal domain abstraction in a port interface adds indirection with no boundary to protect. If nothing outside the hexagon will ever sit behind the interface, it is not a port.

### Nested Hexagons

Hexagons do not nest. The ports-and-adapters boundary belongs at the technology (or team-authority) edge, where system-level tests are worth maintaining. Inner hexagon boundaries duplicate that test wall; the inner tests decay, and the boundary stops being real. Structure the inside with modules, bounded contexts, or plain functions instead.

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

### Pattern-Shaped Public Names

Names that advertise the architecture pattern instead of the business role make code harder to read and easier to cargo-cult.

```typescript
// ❌ Names the pattern or type mechanism
interface IPaymentPort {
  readonly charge: (amount: Money, paymentInfo: PaymentInfo) => Promise<ChargeResult>;
}
const createPaymentGatewayImpl = (): IPaymentPort => ...
const placeOrderUseCase = async (...) => ...

// ✅ Names the role and the concrete adapter
interface PaymentGateway {
  readonly charge: (amount: Money, paymentInfo: PaymentInfo) => Promise<ChargeResult>;
}
const createStripePaymentGateway = (): PaymentGateway => ...
const placeOrder = async (...) => ...
```

---

## Checklist

**Required by the pattern:**

- [ ] All external boundaries use ports/public contracts — nothing outside reaches past a port
- [ ] Domain logic has zero framework/infrastructure dependencies (no source dependencies on any actor or adapter)
- [ ] Driven actors are configurable at run time — the application never constructs them internally (the pattern leaves the configurator's shape open; parameter injection is this skill's house default)
- [ ] Ports use business language only; port methods never expose technology types
- [ ] Swapping any adapter requires zero domain code changes
- [ ] Every port has a test interactor — a test driver on the driving side, a fake on the driven side

**This skill's additions (house style):**

- [ ] If `structure-codebase` has been applied, the visible inside/outside package or import rules are present and passing
- [ ] Driving adapters are thin — parse, authenticate, translate, delegate, respond; only a trivial executable-entrypoint exception also composes
- [ ] Driven adapters (repos) implement ports, contain no business logic
- [ ] Driven port interfaces live inside beside their owning policy, named by business purpose
- [ ] Public interfaces avoid `I` prefixes, `Interface` suffixes, `Port` suffixes, and `Impl` implementations
- [ ] Driving port and use case names use business capability language, not `UseCase`/`Handler` pattern names
- [ ] Wire schemas stay at trust boundaries; business-invariant validation stays inside without provider leakage
- [ ] Reads that JOIN across aggregates use query functions (CQRS-lite)
- [ ] Each layer has behavioral tests at the appropriate level
- [ ] Cross-cutting concerns (auth, technical telemetry, transactions) live in adapters; domain-significant observations go through an explicit driven port or domain events, never a raw logger import
- [ ] Domain returns result types for expected outcomes, never throws for business rules
