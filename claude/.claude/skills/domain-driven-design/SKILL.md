---
name: domain-driven-design
description: Domain-Driven Design patterns for TypeScript. Use when implementing ubiquitous language, value objects, entities, aggregates, domain events, glossary enforcement, or bounded contexts. Only applies to projects that explicitly use DDD. Do NOT use for simple CRUD or projects without domain modeling.
---

# Domain-Driven Design (DDD)

This skill applies only to projects that have opted in to DDD. Do not apply these patterns to projects that use a different approach.

For hexagonal architecture (ports and adapters), load the `hexagonal-architecture` skill. DDD and hexagonal architecture are complementary but independent — a project may use one without the other.

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

**Start simple:** Begin with ubiquitous language (glossary) and value objects. Add aggregates, domain events, and bounded contexts only when the domain demands it.

---

## Core Principle

**The code must speak the language of the domain.** Every type, function, variable, and test name must use terms from the project's ubiquitous language (glossary). If a concept doesn't have a domain term, that's a modeling gap to discuss with stakeholders — not something to paper over with technical jargon.

---

## Ubiquitous Language & Glossary

### The Glossary File

DDD projects must maintain a glossary file (e.g., `docs/glossary.md` or `.claude/glossary.md`) that defines all domain terms. This is the single source of truth for naming.

```markdown
# Domain Glossary

| Term | Definition | Examples |
|------|-----------|----------|
| Occasion | A future event that may involve gift-giving | Birthday, Christmas, Wedding |
| Gift Idea | A potential gift for a specific person and occasion | "Book about gardening" for Mum's Birthday |
| Contributor | A person who contributes money toward a group gift | — |
| Contribution | A specific monetary amount pledged by a contributor | £25 from Alice |
```

### Enforcement Rules

- All `type` and `interface` names must use glossary terms
- All function names must use glossary verbs and nouns
- All test descriptions must use domain language
- If you need a new term, add it to the glossary first

```typescript
// ✅ CORRECT - Uses domain language
type GiftIdea = {
  readonly id: GiftIdeaId;
  readonly description: string;
  readonly occasion: OccasionId;
  readonly estimatedCost: Money;
};

const addGiftIdea = (occasion: Occasion, idea: GiftIdea): Occasion => ({
  ...occasion,
  giftIdeas: [...occasion.giftIdeas, idea],
});

// ❌ WRONG - Technical jargon instead of domain language
type Item = {
  readonly id: string;
  readonly text: string;
  readonly parentId: string;
  readonly cost: number;
};

const addItem = (parent: Container, item: Item): Container => { ... };
```

### Test Names Use Domain Language

```typescript
// ✅ CORRECT - Domain language in tests
describe('Gift Idea', () => {
  it('should add a gift idea to an occasion', () => { ... });
  it('should reject a gift idea that exceeds the budget', () => { ... });
  it('should allow contributors to see all gift ideas for an occasion', () => { ... });
});

// ❌ WRONG - Technical language in tests
describe('addItem', () => {
  it('should push item to array', () => { ... });
  it('should return error when cost > max', () => { ... });
});
```

---

## Value Objects

Value objects are immutable, identity-less, and compared by value. They represent domain concepts that are defined by their attributes, not by a unique ID.

### Pattern: Branded Types for Value Objects

```typescript
// Branded type for compile-time safety
type Money = {
  readonly amount: number;
  readonly currency: Currency;
};

type Currency = 'GBP' | 'USD' | 'EUR';

// Factory function with validation
const createMoney = (amount: number, currency: Currency): Money => {
  if (amount < 0) throw new Error('Money cannot be negative');
  return { amount, currency };
};

// Schema at trust boundaries
const MoneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.enum(['GBP', 'USD', 'EUR']),
});
type MoneyFromSchema = z.infer<typeof MoneySchema>;
```

### Pattern: Branded Primitives for Entity IDs

```typescript
type OccasionId = string & { readonly __brand: 'OccasionId' };
type GiftIdeaId = string & { readonly __brand: 'GiftIdeaId' };

const createOccasionId = (value: string): OccasionId => value as OccasionId;

// Prevents accidental ID swapping
const findGiftIdea = (occasionId: OccasionId, giftIdeaId: GiftIdeaId) => { ... };

// ✅ Compiler catches this mistake:
// findGiftIdea(giftIdeaId, occasionId) // Type error!
```

### Value Object Equality

```typescript
// Value objects are equal when their properties are equal
const areSameMoney = (a: Money, b: Money): boolean =>
  a.amount === b.amount && a.currency === b.currency;
```

---

## Entities

Entities have identity (an ID) and a lifecycle. They are mutable over time (but we represent mutations as new immutable snapshots).

```typescript
type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly date: Date;
  readonly giftIdeas: ReadonlyArray<GiftIdea>;
  readonly budget: Money;
  readonly createdBy: UserId;
};

// "Mutation" via immutable update
const renameOccasion = (occasion: Occasion, newName: string): Occasion => ({
  ...occasion,
  name: newName,
});
```

---

## Make Illegal States Unrepresentable

Use TypeScript's type system to prevent invalid domain states at compile time.

```typescript
// ❌ WRONG - Allows invalid states
type Order = {
  readonly status: 'draft' | 'placed' | 'shipped' | 'delivered';
  readonly shippedAt?: Date;    // Can be set when status is 'draft'!
  readonly trackingNumber?: string;
};

// ✅ CORRECT - Discriminated union prevents invalid combinations
type Order =
  | { readonly status: 'draft'; readonly items: ReadonlyArray<OrderItem> }
  | { readonly status: 'placed'; readonly items: ReadonlyArray<OrderItem>; readonly placedAt: Date }
  | { readonly status: 'shipped'; readonly items: ReadonlyArray<OrderItem>; readonly placedAt: Date; readonly shippedAt: Date; readonly trackingNumber: string }
  | { readonly status: 'delivered'; readonly items: ReadonlyArray<OrderItem>; readonly placedAt: Date; readonly shippedAt: Date; readonly deliveredAt: Date; readonly trackingNumber: string };
```

TypeScript's exhaustive checking ensures all states are handled:

```typescript
const getStatusMessage = (order: Order): string => {
  switch (order.status) {
    case 'draft': return 'Order not yet placed';
    case 'placed': return `Placed on ${order.placedAt.toLocaleDateString()}`;
    case 'shipped': return `Tracking: ${order.trackingNumber}`;
    case 'delivered': return `Delivered on ${order.deliveredAt.toLocaleDateString()}`;
  }
  // TypeScript error if a case is missing (exhaustive check)
};
```

---

## Aggregates

Aggregates are clusters of entities and value objects with a single root entity. All modifications go through the aggregate root.

### Rules

1. **One aggregate root per transaction** — don't modify multiple aggregates in one operation
2. **Reference other aggregates by ID** — never embed another aggregate
3. **All invariants enforced by the root** — the aggregate is always in a valid state
4. **Keep aggregates small** — only include what's needed to enforce invariants

```typescript
// Occasion is the aggregate root
type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly giftIdeas: ReadonlyArray<GiftIdea>;  // Owned by this aggregate
  readonly organizerId: UserId;                  // Reference by ID, not embedded
};

// All operations go through the aggregate root
const addGiftIdea = (occasion: Occasion, idea: NewGiftIdea): Occasion => {
  if (occasion.giftIdeas.length >= 50) {
    throw new Error('Maximum gift ideas per occasion reached');
  }
  return {
    ...occasion,
    giftIdeas: [...occasion.giftIdeas, { ...idea, id: createGiftIdeaId() }],
  };
};
```

---

## Domain Events

Domain events capture something meaningful that happened in the domain. They are immutable facts.

```typescript
type DomainEvent =
  | { readonly type: 'OccasionCreated'; readonly occasionId: OccasionId; readonly createdBy: UserId; readonly occurredAt: Date }
  | { readonly type: 'GiftIdeaAdded'; readonly occasionId: OccasionId; readonly giftIdeaId: GiftIdeaId; readonly occurredAt: Date }
  | { readonly type: 'ContributionPledged'; readonly giftIdeaId: GiftIdeaId; readonly contributorId: UserId; readonly amount: Money; readonly occurredAt: Date };

// Domain operations return the new state + events
type DomainResult<T> = {
  readonly state: T;
  readonly events: ReadonlyArray<DomainEvent>;
};

const addGiftIdea = (occasion: Occasion, idea: NewGiftIdea): DomainResult<Occasion> => {
  const giftIdeaId = createGiftIdeaId();
  return {
    state: {
      ...occasion,
      giftIdeas: [...occasion.giftIdeas, { ...idea, id: giftIdeaId }],
    },
    events: [{
      type: 'GiftIdeaAdded',
      occasionId: occasion.id,
      giftIdeaId,
      occurredAt: new Date(),
    }],
  };
};
```

---

## Repository Pattern

Repositories provide collection-like access to aggregates. They are **interfaces** (behavior contracts) in the domain layer, with implementations in the adapter layer.

```typescript
// Port (domain layer) — uses interface for behavior contract
interface OccasionRepository {
  findById(id: OccasionId): Promise<Occasion | undefined>;
  findByOrganizer(userId: UserId): Promise<ReadonlyArray<Occasion>>;
  save(occasion: Occasion): Promise<void>;
  delete(id: OccasionId): Promise<void>;
}

// Adapter (infrastructure layer) — implements the port
// See hexagonal-architecture skill for implementation patterns
```

---

## Bounded Contexts

A bounded context is a boundary within which a particular domain model applies. The same real-world concept may have different representations in different contexts.

### In a Monorepo

```
packages/
  occasions/          # Occasion Management context
    src/domain/       # Occasion, GiftIdea, Budget
  contributions/      # Contribution context
    src/domain/       # Contribution, Pledge, Payment
  notifications/      # Notification context
    src/domain/       # Notification, Recipient, Channel
  shared/             # Shared kernel (minimal!)
    src/domain/       # UserId, Money (shared value objects)
```

### Rules

1. **Each context has its own model** — `User` in one context may have different properties than in another
2. **Communicate between contexts via events or explicit contracts** — never share internal types
3. **Shared kernel should be minimal** — only truly shared value objects (IDs, Money)
4. **Each context has its own glossary section** — terms may have different meanings across contexts

---

## DDD + TDD Integration

### Test Organization by Domain Concept

```
tests/
  occasions/
    create-occasion.test.ts       # Tests for creating occasions
    add-gift-idea.test.ts         # Tests for adding gift ideas
    occasion-budget.test.ts       # Tests for budget constraints
  contributions/
    pledge-contribution.test.ts   # Tests for pledging contributions
```

Not by implementation file — by domain behavior.

### Test Factories Use Domain Language

```typescript
const getTestOccasion = (overrides?: Partial<Occasion>): Occasion =>
  OccasionSchema.parse({
    id: createOccasionId('occasion-1'),
    name: "Mum's Birthday",
    date: new Date('2025-06-15'),
    giftIdeas: [],
    budget: createMoney(100, 'GBP'),
    organizerId: createUserId('user-1'),
    ...overrides,
  });
```

### Red-Green-Refactor with Domain Focus

1. **RED**: Write a failing test using domain language ("should reject a contribution that exceeds the remaining budget")
2. **GREEN**: Implement using domain concepts (not generic data structures)
3. **REFACTOR**: Extract value objects, improve domain naming, enforce glossary

---

## Anti-Patterns

### Anemic Domain Model

```typescript
// ❌ WRONG - Data bag with no behavior
type Occasion = {
  id: string;
  name: string;
  items: Array<{ name: string; cost: number }>;
};

// All logic in "services"
const occasionService = {
  addItem(occasion: Occasion, item: Item) {
    occasion.items.push(item); // Mutation!
  },
};
```

```typescript
// ✅ CORRECT - Rich domain model with behavior as pure functions
type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly giftIdeas: ReadonlyArray<GiftIdea>;
};

const addGiftIdea = (occasion: Occasion, idea: GiftIdea): Occasion => ({
  ...occasion,
  giftIdeas: [...occasion.giftIdeas, idea],
});
```

### Generic Technical Names

Using `Item`, `Entity`, `Record`, `Data`, `Info` instead of domain terms. Always use the glossary.

### Over-Engineering

Not every project needs aggregates, domain events, or bounded contexts. Start with:
1. Ubiquitous language (glossary)
2. Value objects and entities
3. Add complexity only when the domain demands it

### Leaking Domain Logic

Domain logic must not leak into adapters (controllers, routes, database queries). Keep it in the domain layer.

---

## Checklist

- [ ] Glossary file exists and is up to date
- [ ] All types use glossary terms
- [ ] All functions use glossary verbs and nouns
- [ ] All test descriptions use domain language
- [ ] Value objects are immutable and identity-less
- [ ] Entities have branded IDs
- [ ] Aggregate roots enforce all invariants
- [ ] Other aggregates referenced by ID, not embedded
- [ ] Repository interfaces defined in domain layer
- [ ] Domain logic has zero infrastructure dependencies
- [ ] Tests organized by domain concept, not implementation file
