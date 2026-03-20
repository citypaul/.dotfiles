---
name: domain-driven-design
description: Domain-Driven Design patterns for TypeScript. Use when implementing ubiquitous language, value objects, entities, aggregates, domain services, or bounded contexts. Only applies to projects that explicitly use DDD. Do NOT use for simple CRUD or projects without domain modeling.
---

# Domain-Driven Design (DDD)

This skill applies only to projects that have opted in to DDD. Do not apply these patterns to projects that use a different approach.

For hexagonal architecture (ports and adapters), load the `hexagonal-architecture` skill. DDD and hexagonal architecture are complementary but independent — a project may use one without the other.

**Deep-dive resources** are in the `resources/` directory within this skill folder. The main skill covers core rules; resources provide detailed guidance for specific decisions.

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

## Where Does This Code Belong?

This is the most common decision in DDD. When unsure, use this framework:

| Question | If yes → | If no ↓ |
|----------|----------|---------|
| Does it enforce a business rule or compute a business value? | `domain/` (entity function, value object, or domain service) | ↓ |
| Does it orchestrate multiple domain operations without owning logic? | Use case / application service | ↓ |
| Does it format, transform, or prepare data for display? | `lib/` or inline in the view | ↓ |
| Does it talk to an external system (DB, API, file system)? | Adapter (implements a port defined in domain) | ↓ |
| Is it framework-specific glue (route handler, middleware)? | Delivery layer (`app/`) | — |

**The purity test is necessary but not sufficient.** A pure function that formats a date for display does not belong in `domain/` just because it's pure. The question is always: "Is this a business rule?"

```typescript
// ❌ Pure but NOT domain — formats for human display
export const formatEventDate = (date: string | null) =>
  date ? format(parseISO(date), "MMMM d, yyyy") : undefined;
// → Belongs in lib/format.ts

// ✅ Pure AND domain — business rule that affects behavior
export const isPastEvent = (eventDate: string | null, now: Date) =>
  eventDate ? parseISO(eventDate) < now : false;
// → Belongs in domain/event/

// ✅ Pure AND domain — business calculation
export const calculateCommittedTotal = (items: readonly GiftItem[]) =>
  items.filter(i => i.status !== "idea").reduce((sum, i) => sum + i.pricePence, 0);
// → Belongs in domain/budget/
```

**Why placement matters:** `domain/` files typically have strict coverage requirements and zero infrastructure imports. Putting code in the wrong layer creates unnecessary testing obligations and architectural violations.

---

## Ubiquitous Language & Glossary

DDD projects must maintain a glossary file that defines all domain terms. This is the single source of truth for naming.

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
};

// ❌ Technical jargon
type Item = { readonly id: string; readonly text: string; readonly parentId: string; };
```

---

## Building Blocks

### Value Objects

Immutable, identity-less, compared by value. Represent domain concepts defined by their attributes.

```typescript
type Money = { readonly amount: number; readonly currency: Currency };

const createMoney = (amount: number, currency: Currency): Money => {
  if (amount < 0) throw new Error('Money cannot be negative');
  return { amount, currency };
};
```

### Branded Entity IDs

Prevent accidental ID swapping at compile time:

```typescript
type OccasionId = string & { readonly __brand: 'OccasionId' };
type GiftIdeaId = string & { readonly __brand: 'GiftIdeaId' };
```

### Entities

Have identity and a lifecycle. Always valid after construction or state transition.

```typescript
type Occasion = {
  readonly id: OccasionId;
  readonly name: string;
  readonly date: Date;
  readonly giftIdeas: ReadonlyArray<GiftIdea>;
  readonly budget: Money;
};

// Immutable update — returns new valid state
const renameOccasion = (occasion: Occasion, newName: string): Occasion => ({
  ...occasion,
  name: newName,
});
```

**Always-valid principle:** An entity must satisfy its invariants at all times. Validate on construction (factory functions or schema parsing) and on every state transition. Never allow an entity to exist in an invalid state, even temporarily.

### Make Illegal States Unrepresentable

Use discriminated unions to prevent invalid state combinations at compile time:

```typescript
type Order =
  | { readonly status: 'draft'; readonly items: ReadonlyArray<OrderItem> }
  | { readonly status: 'placed'; readonly items: ReadonlyArray<OrderItem>; readonly placedAt: Date }
  | { readonly status: 'shipped'; readonly placedAt: Date; readonly shippedAt: Date; readonly trackingNumber: string };
```

### Aggregates

Clusters of entities and value objects with a single root. All modifications go through the root.

1. **One aggregate root per transaction**
2. **Reference other aggregates by ID** — never embed
3. **All invariants enforced by the root**
4. **Keep aggregates small** — only what's needed for consistency

For detailed aggregate design guidance, see `resources/aggregate-design.md`.

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
): { readonly occasion: Occasion; readonly contributor: Contributor } => {
  if (amount.amount > contributor.walletBalance.amount) {
    throw new Error('Insufficient balance');
  }
  // Returns updated versions of both aggregates
};
```

**Domain service vs use case (application service):**

| | Domain Service | Use Case |
|--|----------------|----------|
| Contains business logic? | Yes | No — orchestration only |
| Lives in | `domain/` | `domain/` or `app/` |
| Depends on | Domain types only | Repositories, ports, domain services |
| Example | `pledgeContribution(occasion, contributor, amount)` | `handlePledge(repo, dto)` — loads, calls domain service, saves |

For detailed guidance, see `resources/domain-services.md`.

---

## Repository Pattern

Repositories provide collection-like access to aggregates. **Interfaces** in the domain layer, **implementations** in the adapter layer.

```typescript
// Port (domain layer)
interface OccasionRepository {
  findById(id: OccasionId): Promise<Occasion | undefined>;
  save(occasion: Occasion): Promise<void>;
}

// Adapter (infrastructure layer) — see hexagonal-architecture skill
```

**Repositories handle writes and single-aggregate reads.** For reads that need to JOIN across aggregates (dashboard views, detail pages combining data from multiple entities), repositories are the wrong tool — they enforce aggregate boundaries that reads need to cross. Use query functions that JOIN freely instead. This is the CQRS-lite pattern: writes go through repositories (consistency), reads go through query functions (flexibility). See the `hexagonal-architecture` skill's CQRS-lite section and `resources/cqrs-lite.md` for details.

For simple domains where reads map cleanly to a single aggregate, repository reads are fine. Don't separate prematurely.

---

## DDD + TDD Integration

### Test by Domain Concept, Not Implementation File

```
tests/
  occasions/
    create-occasion.test.ts       # Behavior: creating occasions
    add-gift-idea.test.ts         # Behavior: managing gift ideas
    occasion-budget.test.ts       # Behavior: budget constraints
```

### Primary Test Boundary: The Use Case

Test by calling use cases with driven ports replaced by in-memory **fakes** (not mocks). This exercises domain entities, domain services, and orchestration together — proving the feature works as a whole.

Domain unit tests **complement** use case tests for complex pure business rules. They don't replace them.

| Priority | Boundary | What it proves |
|----------|----------|----------------|
| **Primary** | Use case (faked driven ports) | Feature works end-to-end within the hexagon |
| **Complement** | Domain pure functions directly | Complex business rules in isolation |
| **Secondary** | Driven adapters (real DB/MSW) | Adapter translates correctly |
| **Verification** | E2E (full stack) | User experience works |

For detailed testing guidance, see `resources/testing-by-layer.md`.

### Test Factories Use Domain Language

```typescript
const getTestOccasion = (overrides?: Partial<Occasion>): Occasion =>
  OccasionSchema.parse({
    id: createOccasionId('occasion-1'),
    name: "Mum's Birthday",
    giftIdeas: [],
    budget: createMoney(100, 'GBP'),
    ...overrides,
  });
```

---

## Bounded Contexts

A bounded context is a boundary within which a particular domain model applies.

1. **Each context has its own model** — `User` may differ across contexts
2. **Communicate between contexts via events or explicit contracts**
3. **Shared kernel should be minimal** — only truly shared value objects
4. **Each context has its own glossary section**

---

## Anti-Patterns

### Anemic Domain Model

Entities are data bags with no behavior. All logic in "services." Fix: put behavior as pure functions next to the types they operate on.

### Generic Technical Names

Using `Item`, `Entity`, `Record`, `Data`, `Info` instead of domain terms. Always use the glossary.

### Presentation Logic in Domain

Display formatting does not belong in `domain/`. The test: "make this look right for a human" = presentation (`lib/`). "Enforce a business rule" = domain. Purity is not sufficient — a pure formatting function is still presentation.

### Leaking Domain Logic

Business logic in route handlers, database queries, or adapters. Keep it in `domain/`.

### Over-Engineering

Not every project needs aggregates, domain events, or bounded contexts. Start with:
1. Ubiquitous language (glossary)
2. Value objects and entities
3. Add complexity only when the domain demands it

---

## Checklist

- [ ] Glossary file exists and is up to date
- [ ] All types use glossary terms
- [ ] All functions use glossary verbs and nouns
- [ ] All test descriptions use domain language
- [ ] Value objects are immutable and identity-less
- [ ] Entities are always valid (invariants enforced on construction and transitions)
- [ ] Entities have branded IDs
- [ ] Aggregate roots enforce all invariants
- [ ] Other aggregates referenced by ID, not embedded
- [ ] Cross-aggregate logic in domain services, not crammed into one entity
- [ ] Repository interfaces defined in domain layer
- [ ] Domain logic has zero infrastructure dependencies
- [ ] Presentation logic is NOT in domain/ (even if pure)
- [ ] Tests organized by domain concept, not implementation file
- [ ] Each layer has behavioral tests at the appropriate level
