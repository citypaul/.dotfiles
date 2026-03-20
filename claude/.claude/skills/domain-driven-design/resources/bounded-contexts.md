# Bounded Contexts

A bounded context is a linguistic boundary — the region where a particular domain model and ubiquitous language apply consistently. Context boundaries are discovered through team structure, language divergence, and business capability mapping, not by technical convenience.

## Context Mapping Patterns

When bounded contexts interact, the relationship follows one of these patterns:

| Pattern | Relationship | When to use |
|---------|-------------|-------------|
| **Anti-Corruption Layer** | Downstream translates upstream model | Upstream model doesn't fit your domain — protect your model with a translation layer |
| **Shared Kernel** | Two contexts share a minimal subset | Small, stable shared concepts (Money, Email). Both teams agree on changes |
| **Published Language** | Shared interchange format (schemas) | Event-driven communication. Events use a shared schema |
| **Open Host Service** | Upstream provides a stable API | Multiple downstream consumers. The API is the contract |
| **Conformist** | Downstream accepts upstream model as-is | No influence over upstream. Accept their types directly |
| **Separate Ways** | No integration | Cost of integration exceeds the benefit |

**For most projects, Anti-Corruption Layer and Shared Kernel are the most immediately useful.**

## Anti-Corruption Layer (ACL)

The ACL translates between an external model and your domain model at the boundary. This is the most practically important context mapping pattern — use it whenever integrating with external APIs, legacy systems, or other bounded contexts whose types don't match yours.

```typescript
// External API returns their model
type StripeCharge = {
  readonly id: string;
  readonly amount: number;        // cents
  readonly currency: string;      // lowercase
  readonly status: string;
};

// Your domain model
type PaymentResult =
  | { readonly success: true; readonly chargeId: ChargeId; readonly amount: Money }
  | { readonly success: false; readonly reason: string };

// ACL: translate at the boundary — adapter implements this
const toPaymentResult = (charge: StripeCharge): PaymentResult => {
  if (charge.status === 'succeeded') {
    return {
      success: true,
      chargeId: createChargeId(charge.id),
      amount: createMoney(charge.amount / 100, parseCurrency(charge.currency)),
    };
  }
  return { success: false, reason: `Payment failed: ${charge.status}` };
};
```

The ACL lives in the adapter layer. Domain code never sees `StripeCharge` — only `PaymentResult`.

## Shared Kernel

A minimal set of types shared across contexts. Keep it as small as possible — only truly universal value objects.

```typescript
// shared-kernel/
//   money.ts
//   email.ts
//   branded-ids.ts  (if IDs cross context boundaries)
```

**Warning signs the shared kernel is too large:**
- It contains entity types (not just value objects)
- Changes to the kernel require coordinating multiple teams
- It has its own business logic beyond construction/validation

## Structuring Context Boundaries in Code

The physical structure depends on your project and team setup. The principle is the same: each context owns its code and exposes a clear boundary.

**Single app, directory-based separation:**

```
src/
  contexts/
    gifting/
      domain/        # Aggregates, value objects, ports, use cases
      db/            # Driven adapters (repositories, queries)
      app/           # Driving adapters (route handlers)
    budgeting/
      domain/
      db/
      app/
  shared/            # Shared kernel (Money, Email)
```

**Monorepo with workspace packages** (enforced boundaries):

```
packages/
  gifting/           # package.json with explicit exports
  budgeting/         # package.json with explicit exports
  shared-kernel/     # Minimal shared types
```

**Separate services** (strongest isolation):

Each bounded context is its own deployable service. Communicate via events (Published Language) or explicit API contracts (Open Host Service). Use ACLs to translate between contexts.

The deployment model is independent of the context boundary. A monolith can have well-defined contexts; microservices can have muddled ones. The boundary is linguistic and ownership-based, not deployment-based.

## Enforcing Boundaries

- **Import restrictions**: Use ESLint rules (eslint-plugin-boundaries, Nx enforce-module-boundaries) to prevent cross-context imports
- **Barrel exports**: Each context exposes only its public API via `index.ts`
- **Code review**: Every PR touching domain code should be checked for ubiquitous language compliance against the glossary
- **Separate packages/services**: The strongest enforcement — contexts can only communicate through published interfaces

## Discovering Context Boundaries

Context boundaries are discovered, not designed up front. They emerge where language, ownership, or business rules diverge.

### The Language Test

The strongest signal is when the same word means different things to different people:

| Word | In gifting context | In billing context |
|------|-------------------|-------------------|
| "User" | Someone who organizes occasions and manages gift ideas | An account with a payment method and billing history |
| "Event" | A gift-giving occasion (birthday, holiday) | A billable transaction or audit log entry |
| "Amount" | How much to pledge toward a gift | An invoice line item total |

When you find yourself adding qualifiers ("billing user" vs "gifting user"), you've found a context boundary. Each context should use the unqualified term with its own meaning.

### Signals That You Need to Split

**Strong signals (split now):**
- The same word means different things — and you're adding prefixes to disambiguate
- Two parts of the system change for different business reasons at different rates
- A model that makes one workflow simple makes another workflow awkward
- Different stakeholders or domain experts own different parts of the system

**Moderate signals (consider splitting):**
- You're building a "god entity" with dozens of fields, most irrelevant to any single use case
- Teams step on each other's code — merge conflicts across unrelated features
- Business rules in one area have nothing to do with business rules in another

**Weak signals (probably don't split yet):**
- Code is getting large (size alone doesn't imply a boundary)
- You want to "clean up" the architecture (refactoring isn't the same as boundary discovery)
- Technical concerns differ (use hex arch layers, not context boundaries)

### How to Find Boundaries in Practice

**1. Listen for language friction.** When domain conversations become awkward — "I mean the *shipping* address, not the *billing* address" — you've found a seam. Map where these qualifiers appear.

**2. Map the workflows.** For each major business workflow (e.g., "place an order", "process a return", "manage inventory"), list the entities and rules involved. Where workflows share entities but use different fields or apply different rules, there's likely a boundary.

```
Workflow: "Pledge a contribution"
  → Entities: Occasion, Contributor, Money
  → Rules: balance check, funding-closed check

Workflow: "Send gift reminders"
  → Entities: Occasion, Recipient, NotificationPreference
  → Rules: reminder timing, opt-out, channel selection

These share "Occasion" but use different fields and rules.
"Occasion" means different things in each workflow.
→ Potential boundary between gifting and notifications.
```

**3. Follow the ownership.** If different people (or teams) are responsible for different decisions, those decisions likely belong in different contexts. The gifting team decides budget rules; the notifications team decides delivery channels.

**4. Check for independent deployability.** Could this part of the system change and deploy without affecting the other? If yes, it's likely a separate context. If changes always cascade across both, they may be one context.

### Common Mistakes

- **Splitting by technical layer** (a "database context" and an "API context") — contexts are business boundaries, not technical ones
- **One context per entity** — most entities don't warrant their own context. Split by business capability, not by noun
- **Splitting too early** — start with one context and split when you feel the friction. Premature boundaries create coordination overhead worse than a slightly large model
- **Ignoring the cost of communication** — every context boundary adds an integration point. Only split when the cost of a unified model exceeds the cost of integration
