---
name: domain-driven-design
description: Domain-Driven Design patterns for TypeScript. Use when implementing ubiquitous language, value objects, entities, aggregates, domain events, domain services, or bounded contexts. Only applies to projects that explicitly use DDD. Do NOT use for simple CRUD or projects without domain modeling.
---

# Domain-Driven Design (DDD)

This skill applies only to projects that have opted in to DDD. Do not apply these patterns to projects that use a different approach.

For hexagonal architecture (ports and adapters), load the `hexagonal-architecture` skill. DDD and hexagonal architecture are complementary but independent — a project may use one without the other.

Use the `structure-codebase` skill when designing or changing physical placement. It keeps bounded context, feature/use-case cohesion, package enforcement, and any opted-in hexagonal inside/outside boundary as separate structural axes. If physical restructuring is not requested, preserve the repo's existing layout while keeping domain logic isolated.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `aggregate-design.md` | Designing or splitting aggregates, sizing questions, optimistic locking |
| `domain-services.md` | Unsure if logic is a domain service vs use case, naming conventions |
| `domain-events.md` | Cross-aggregate coordination, Decider pattern, event dispatch (outbox), process managers |
| `bounded-contexts.md` | Drawing context boundaries, integrating with external systems (ACL), context mapping |
| `error-modeling.md` | Deciding between result types and exceptions, error propagation |
| `testing-by-layer.md` | Writing tests for DDD code, property-based testing for invariants |

For authoritative sources, see `claude/.claude/skills/REFERENCES.md` in the source repo (https://github.com/citypaul/.dotfiles) — that file is not bundled when this skill is installed standalone.

---

## When to Use DDD

DDD adds value for **complex domains** with rich business rules. Not every project needs it.

**Use DDD when:**
- Domain has complex business rules and invariants
- Multiple stakeholders with domain expertise
- Business logic is the core differentiator
- Terms have specific, important meanings

**Don't use DDD when:**
- Simple CRUD with no business rules
- Technical/infrastructure-focused projects
- No domain expert to consult

**Start simple and evolve:** Begin with ubiquitous language (glossary) and value objects. Add aggregates, domain events, and bounded contexts only when the domain demands it. Your first model will be wrong — that's fine. The goal is to learn quickly and refactor toward deeper insight.

---

## Core Principle

**The code must speak the language of the domain.** Every type, function, variable, and test name must use terms from the project's ubiquitous language (glossary). If a concept doesn't have a domain term, that's a modeling gap to discuss with stakeholders — not something to paper over with technical jargon.

**Domain models evolve.** The first model is never the final model. As understanding deepens through conversations with domain experts and building working software, the model should change — types get renamed, aggregates get split or merged, new concepts emerge. This is expected and ideal. A model that never changes is either perfect (unlikely) or stagnant (the team stopped learning). TDD and behavioral tests make this evolution safe — rename a concept, update the glossary, and the tests tell you what needs to change.

---

## Where Does This Code Belong?

This is the most common decision in DDD. When unsure, use this framework:

The roles below are logical placement guidance. Use `structure-codebase` to choose their physical folders and packages.

| Question | If yes → | If no ↓ |
|----------|----------|---------|
| Does it enforce a business rule or compute a business value? | Domain policy (entity function, value object, or domain service) | ↓ |
| Does it orchestrate domain operations without owning the rules? | Application policy / use case | ↓ |
| Does it format, transform, or prepare data for display? | Presentation code; in hexagonal architecture, often at the driving edge | ↓ |
| Does it talk to an external system (DB, API, file system)? | Infrastructure/integration code; in hexagonal architecture, a driven adapter implements an inside-owned port | ↓ |
| Is it framework-specific glue (route handler, middleware)? | Framework entrypoint; in hexagonal architecture, a driving adapter | — |

**The purity test is necessary but not sufficient.** A pure function that formats a date for display does not belong in domain policy just because it's pure. The question is always: "Is this a business rule?"

```typescript
// ❌ Pure but NOT domain — formats for human display
export const formatEventDate = (date: string | null) =>
  date ? format(parseISO(date), "MMMM d, yyyy") : undefined;
// → Belongs in presentation code; a hexagonal app may place it at the driving edge

// ✅ Pure AND domain — business rule that affects behavior
export const isPastEvent = (eventDate: string | null, now: Date) =>
  eventDate ? parseISO(eventDate) < now : false;
// → Belongs in domain policy for events

// ✅ Pure AND domain — business calculation
export const calculateCommittedTotal = (items: readonly GiftItem[]) =>
  items.filter(i => i.status !== "idea").reduce((sum, i) => sum + i.pricePence, 0);
// → Belongs in domain policy for budgets
```

**Why placement matters:** Domain-policy code typically has strict coverage requirements and zero infrastructure imports. Putting code in the wrong role creates unnecessary testing obligations and architectural violations.

When `structure-codebase` has been applied, enforce domain and any visible hexagonal boundary mechanically with its package/import rules.

---

## Ubiquitous Language & Glossary

DDD projects must maintain a glossary file that defines all domain terms. This is the single source of truth for naming. The glossary evolves as the model evolves — when the team discovers a better name or splits a concept, update the glossary first and let the code follow.

### The Glossary File

For projects with multiple bounded contexts, organize by context. The same term may have different definitions in different contexts — this is correct, not a bug.

```markdown
## Gifting Context

| Term | Definition | Examples |
|------|-----------|----------|
| Occasion | A gift-giving event (birthday, holiday) | "Mum's Birthday", "Christmas 2026" |
| Gift Idea | A potential gift for an occasion | "Cookbook", "Scarf" |
| Contribution | Money pledged toward a gift | "£25 from Dad" |

## Notifications Context

| Term | Definition | Examples |
|------|-----------|----------|
| Occasion | An upcoming event that may trigger reminders | (same events, different concern) |
| Recipient | The person being gifted — target of reminder scheduling | "Mum" |
```

### Enforcement Rules

- All `type` and `interface` names must use glossary terms
- All function names must use glossary verbs and nouns
- All test descriptions must use domain language
- If you need a new term, add it to the glossary first

```typescript
// ✅ Uses domain language
type GiftIdea = {
  readonly id: GiftIdeaId;
  readonly description: string;
  readonly occasion: OccasionId;
  readonly estimatedCost: Money;
  readonly status: 'proposed' | 'selected' | 'purchased';
};

// ❌ Technical jargon
type Item = { readonly id: string; readonly text: string; readonly parentId: string; };
```

---

## Building Blocks

### Value Objects

Immutable, identity-less, compared by their attributes (not by reference). Represent domain concepts defined by their attributes. Two `Money` values with the same amount and currency are equal — value objects have no identity.

```typescript
type Currency = 'GBP' | 'USD' | 'EUR';
type Money = { readonly amount: number; readonly currency: Currency };

const createMoney = (amount: number, currency: Currency): Money => {
  if (amount < 0) throw new Error('Money cannot be negative');
  return { amount, currency };
};
// Factory throws = invariant violation (a bug in calling code).
// Schemas catch invalid user input at trust boundaries BEFORE
// the factory is called. If the factory throws, something
// bypassed the schema.
```

For value objects crossing trust boundaries (API input, form data), use Zod schemas. For domain-internal value objects, plain types + factory functions suffice. See the `typescript-strict` skill for schema-first patterns.

**Zod-to-branded-type bridging** — parse raw input into branded domain types at trust boundaries:

```typescript
// Schema at trust boundary — parses raw strings into branded types
const PledgeInputSchema = z.object({
  occasionId: z.string().min(1).transform(createOccasionId),
  contributorId: z.string().min(1).transform(createContributorId),
  amount: z.object({ amount: z.number().positive(), currency: CurrencySchema }),
});

// Reconstitution from persistence — same pattern, used at the integration boundary
// (a driven adapter in hexagonal architecture loads the gift ideas alongside the row)
const toOccasion = (row: OccasionRow, giftIdeas: ReadonlyArray<GiftIdea>): Occasion => ({
  id: createOccasionId(row.id),
  name: row.name,
  giftIdeas,
  budget: createMoney(row.budgetAmount, parseCurrency(row.budgetCurrency)),
  totalPledged: createMoney(row.pledgedAmount, parseCurrency(row.budgetCurrency)),
  isFundingClosed: row.isFundingClosed,
});
```

Reconstitution (rebuilding domain objects from DB rows) uses the same factory functions as creation. The factory validates, so invalid persisted data is caught on read rather than silently corrupting the domain.

### Branded Types

The branded type pattern itself is covered by the `typescript-strict` skill — load it for the general rules. The DDD-specific application:

- **Give every entity its own branded ID** (`OccasionId`, `GiftIdeaId`) so the compiler rejects cross-entity ID mixups — passing a `GiftIdeaId` where an `OccasionId` is expected is a compile error, not a runtime bug.
- **Brand only through validating factory functions** — raw strings become branded values only after validation. The `as` assertion inside such a factory is the one justified exception: validate first, then brand.
- Use branded types for entity IDs and single-value value objects (`EmailAddress`).

```typescript
type OccasionId = string & { readonly __brand: 'OccasionId' };
type GiftIdeaId = string & { readonly __brand: 'GiftIdeaId' };

const createOccasionId = (raw: string): OccasionId => {
  if (!raw.trim()) throw new Error('OccasionId cannot be empty');
  return raw as OccasionId; // justified: factory validates, then brands
};
```

### Entities

Have identity and a lifecycle. Always valid after construction or state transition.

```typescript
type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly giftIdeas: ReadonlyArray<GiftIdea>;
  readonly budget: Money;
  readonly totalPledged: Money;
  readonly isFundingClosed: boolean;
};

// Immutable update — returns new valid state
const renameOccasion = (occasion: Occasion, newName: string): Occasion => ({
  ...occasion,
  name: newName,
});
```

**Always-valid principle:** An entity must satisfy its invariants at all times. Validate on construction (factory functions or schema parsing) and on every state transition. Never allow an entity to exist in an invalid state, even temporarily.

### Make Illegal States Unrepresentable

General type-safety patterns (no `any`, discriminated unions, schema-first) live in the `typescript-strict` skill. The DDD-specific application: model entity **lifecycles** as discriminated unions where each variant carries only the data valid for that state — never boolean flags plus optional fields, which allow contradictory combinations like `{ isVerified: true, verifiedAt: undefined }`:

```typescript
type Order =
  | { readonly status: 'draft'; readonly items: ReadonlyArray<OrderItem> }
  | { readonly status: 'placed'; readonly items: ReadonlyArray<OrderItem>; readonly placedAt: Date }
  | { readonly status: 'shipped'; readonly items: ReadonlyArray<OrderItem>; readonly placedAt: Date; readonly shippedAt: Date; readonly trackingNumber: string };
```

**Always handle all lifecycle variants exhaustively.** The `never` type ensures the compiler catches unhandled states when you add a new variant:

```typescript
const describeOrder = (order: Order): string => {
  switch (order.status) {
    case 'draft': return `Draft with ${order.items.length} items`;
    case 'placed': return `Placed at ${order.placedAt.toISOString()}`;
    case 'shipped': return `Shipped: ${order.trackingNumber}`;
    default: { const _exhaustive: never = order; return _exhaustive; }
  }
};
```

### Aggregates

Clusters of entities and value objects with a single root. All modifications go through the root.

1. **One aggregate root per transaction**
2. **Reference other aggregates by ID** — never embed
3. **All invariants enforced by the root**
4. **Keep aggregates small** — only what's needed for consistency

For detailed aggregate design guidance, see `resources/aggregate-design.md`.

### Specifications (Predicate Functions)

Complex business rules for filtering, eligibility, or validation are expressed as predicate functions in the domain layer. Evans calls these "specifications."

```typescript
// Specification: "can this contributor pledge to this occasion?"
const canPledge = (occasion: Occasion, contributor: Contributor, amount: Money): boolean =>
  !occasion.isFundingClosed &&
  amount.amount <= contributor.walletBalance.amount &&
  amount.currency === occasion.budget.currency;

// Compose specifications for complex eligibility
const isGiftReady = (occasion: Occasion): boolean =>
  occasion.totalPledged.amount >= occasion.budget.amount &&
  occasion.giftIdeas.some(idea => idea.status === 'selected');
```

Specifications are pure predicate functions — they return `boolean` and have no side effects. Use them in domain services, use cases, and query filters. Name them with `is`, `can`, or `has` prefixes.

### Domain Events

Domain events represent something meaningful that happened in the domain ("OrderPlaced", "ContributionPledged"). They coordinate side effects across aggregates and bounded contexts.

**Domain events earn their complexity when:**
- Side effects cross aggregate boundaries
- Other bounded contexts need to react to changes
- You need an audit trail or event-driven workflows

**Don't add domain events when:**
- All logic is within a single aggregate
- Side effects are within the same transaction
- Explicit return values from domain functions suffice

For most projects, start without domain events and add them when the domain demands coordination. See `resources/domain-events.md` for the Decider pattern and detailed guidance. When events become the source of truth — persisted to an append-only log and replayed to rebuild state — that is event sourcing; load the `event-sourcing` skill (it builds directly on this Decider). Where domain events already exist, observability rides for free as another subscriber — an observability adapter on the existing publisher port, not a second announcement channel (see the `hexagonal-architecture` skill's four-tier observability model and the `observability` skill).

---

## Domain Services

When business logic doesn't belong to a single entity, it belongs in a **domain service** — a stateless function in the domain layer that operates across multiple entities or aggregates.

```typescript
// ❌ WRONG — cramming cross-entity logic into one entity
const addContribution = (occasion: Occasion, contribution: Contribution): Occasion => {
  // This needs to check the contributor's wallet balance — wrong aggregate!
};

// ✅ CORRECT — domain service operates across aggregates
const pledgeContribution = (
  occasion: Occasion,
  contributor: Contributor,
  amount: Money,
): PledgeResult => {
  if (amount.amount > contributor.walletBalance.amount) {
    return { success: false, reason: 'insufficient-balance' };
  }
  return {
    success: true,
    occasion: addContribution(occasion, { contributorId: contributor.id, amount }),
    contributor: deductBalance(contributor, amount),
  };
};
```

**Domain service vs use case (application service):**

| | Domain Service | Use Case |
|--|----------------|----------|
| Contains business logic? | Yes | No — orchestration only |
| Logical role | Domain policy | Application policy — coordinates domain operations and collaborations |
| Depends on | Domain types only | Domain services and repository/integration contracts; ports when the architecture defines them |
| Example | `pledgeContribution(occasion, contributor, amount)` | `handlePledge(repo, dto)` — loads, calls domain service, saves |

Physical placement depends on the selected architecture. In a visible hexagonal backend both roles are inside, commonly in separate domain/application packages when that dependency boundary earns its cost, or in cohesive feature/use-case modules inside one package. DDD without hexagonal architecture may use another context-first arrangement. Follow `structure-codebase` rather than assuming `domain/` contains all inside code.

For detailed guidance, see `resources/domain-services.md`.

---

## Error Modeling

Use discriminated union result types for expected business outcomes. Reserve exceptions for programmer mistakes and infrastructure failures.

```typescript
type PledgeResult =
  | { readonly success: true; readonly occasion: Occasion; readonly contributor: Contributor }
  | { readonly success: false; readonly reason: 'insufficient-balance' | 'funding-closed' | 'not-found' };
```

**The test:** Could a user's action legitimately cause this outcome? If yes → result type. If no (it would mean a bug) → exception.

For detailed error modeling patterns and how errors propagate through layers, see `resources/error-modeling.md`.

---

## Repository Pattern

Repositories provide collection-like access to aggregates. Put the **interface on the policy side that consumes it** and the concrete implementation with infrastructure or integration code. In an explicitly hexagonal system the interface is an inside-owned driven port, preferably beside its owning application policy, and the implementation is a driven adapter. DDD without ports and adapters does not gain adapter layers by implication; follow the architecture selected by `structure-codebase`. Repositories use `interface` (not `type`) because they define behavior contracts, and their methods use domain language.

```typescript
// Policy-side repository contract — an inside-owned port when hexagonal architecture is used
interface OccasionRepository {
  readonly findById: (id: OccasionId) => Promise<Occasion | undefined>;
  readonly save: (occasion: Occasion) => Promise<void>;
}

// Concrete implementation belongs with infrastructure/integration;
// in hexagonal architecture it is a driven adapter.
```

**Repositories handle writes and single-aggregate reads.** For reads that need to JOIN across aggregates (dashboard views, detail pages combining data from multiple entities), repositories are the wrong tool — they enforce aggregate boundaries that reads need to cross. Use query functions that JOIN freely instead. This is the CQRS-lite pattern: writes go through repositories (consistency), reads go through query functions (flexibility). See the `hexagonal-architecture` skill's CQRS-lite section and its `resources/cqrs-lite.md` for details.

For simple domains where reads map cleanly to a single aggregate, repository reads are fine. Don't separate prematurely.

---

## DDD + TDD Integration

### Test by Domain Concept, Not Implementation File

Follow the physical shape selected for the project and keep focused tests beside the behavior they describe; DDD does not require a root `tests/` directory.

```
<selected-context-or-feature>/
  occasions/
    create-occasion.test.ts       # Behavior: creating occasions
    add-gift-idea.test.ts         # Behavior: managing gift ideas
    occasion-budget.test.ts       # Behavior: budget constraints
```

### Select the Primary Behavioral Boundary

Test through the broadest stable public behavior that the chosen architecture actually has:

- For a domain-only model or library, call aggregate operations, domain services, or Deciders directly; these tests are primary, not a fallback.
- When application policy exists, call the use case with simple fakes or stubs for its collaboration contracts. This exercises domain behavior and orchestration together without inventing ports.
- In an explicitly hexagonal system, exercise the driving port with driven actors replaced by outside test interactors; load `hexagonal-architecture` for that testing strategy.
- Add integration and delivery tests according to real infrastructure and user risk, not because DDD mandates a layer pyramid.

Focused tests for complex pure business rules complement application tests when both exist. They may be the complete primary suite for a provider-free domain package.

See `resources/testing-by-layer.md` for the architecture-neutral decision. For a DDD system that also adopts hexagonal architecture, the hexagonal skill's `resources/worked-example.md` traces one feature across ports, adapters, and tests.

### Test Factories Use Domain Language

```typescript
const getTestOccasion = (overrides?: Partial<Occasion>): Occasion =>
  OccasionSchema.parse({
    id: createOccasionId('occasion-1'),
    name: "Mum's Birthday",
    giftIdeas: [],
    budget: createMoney(100, 'GBP'),
    totalPledged: createMoney(0, 'GBP'),
    isFundingClosed: false,
    ...overrides,
  });
```

---

## Bounded Contexts

A bounded context is a linguistic boundary within which a particular domain model and glossary apply. The same word (e.g., "User") can mean different things in different contexts — and that's correct.

1. **Each context owns its own model and glossary** — `User` in billing differs from `User` in shipping
2. **Communicate between contexts via events or explicit contracts** — never share mutable state
3. **Anti-Corruption Layer (ACL)** — when integrating with external systems or other contexts whose model doesn't fit yours, translate at the boundary rather than letting their types leak in
4. **Shared kernel should be minimal** — only truly universal value objects (Money, Email). If the shared kernel grows, boundaries are unclear
5. **Each context has its own glossary section**

For context mapping patterns, monorepo structure, and ACL examples, see `resources/bounded-contexts.md`.

---

## Anti-Patterns

### Anemic Domain Model

Entities are data bags with no behavior. All logic in "services." Fix: put behavior as pure functions next to the types they operate on.

### Generic Technical Names

Using `Item`, `Entity`, `Record`, `Data`, `Info` instead of domain terms. Always use the glossary.

### Presentation Logic in Domain

Display formatting does not belong in domain policy. The test: "make this look right for a human" = presentation. "Enforce a business rule" = domain. Purity is not sufficient — a pure formatting function is still presentation.

### Leaking Domain Logic

Business logic in route handlers, database queries, or adapters. Keep it in domain-policy modules under the physical shape selected for the project.

### Relationship-Driven Aggregates

Designing aggregates by mapping entity hierarchies ("Order contains OrderLines, OrderLine contains Product") instead of discovering invariants. The tell: aggregate methods only add, remove, or attach children — no business rules are enforced. If an aggregate's only job is managing parent-child associations, those relationships likely belong as database constraints or simple data models, not an aggregate hierarchy.

**The fix:** Ask "What must remain true when state changes?" If the answer is only structural (one-to-many, one-to-one), you don't need an aggregate — you need a foreign key. Aggregates earn their complexity when they enforce behavioral invariants during commands.

### Over-Engineering

Not every project needs aggregates, domain events, or bounded contexts. Start with:
1. Ubiquitous language (glossary)
2. Value objects and entities
3. Add complexity only when the domain demands it

### Resisting Model Evolution

Treating the initial model as sacred — refusing to rename types, split aggregates, or restructure bounded contexts as understanding deepens. The model should evolve continuously. If a refactoring reveals that "Occasion" should really be "GiftEvent" and "SavingsGoal", do it. The glossary changes, the types change, the tests guide the migration. Evans calls these "breakthroughs" — moments where the model fundamentally improves because the team learned something new about the domain.

---

## Checklist

- [ ] Glossary file exists and is up to date
- [ ] All types use glossary terms
- [ ] All functions use glossary verbs and nouns
- [ ] All test descriptions use domain language
- [ ] Value objects are immutable and identity-less
- [ ] Entities are always valid (invariants enforced on construction and transitions)
- [ ] Entities have branded IDs; primitive value objects use branded types
- [ ] Aggregate roots enforce all invariants
- [ ] Aggregate boundaries justified by invariants, not entity relationships
- [ ] Aggregates contain no read-only properties that exist solely for query convenience
- [ ] Other aggregates referenced by ID, not embedded
- [ ] Cross-aggregate logic in domain services, not crammed into one entity
- [ ] Repository interfaces live on the consuming policy side; concrete implementations live with infrastructure/integration
- [ ] Discriminated unions have exhaustive switch handling
- [ ] Expected business outcomes use result types, not exceptions
- [ ] Domain logic has zero infrastructure dependencies
- [ ] If `structure-codebase` has been applied, its domain/context and any visible inside/outside rules are present and passing
- [ ] Presentation logic is NOT in domain policy (even if pure)
- [ ] Tests organized by domain concept, not implementation file
- [ ] Each logical role has behavioral tests at the appropriate level
