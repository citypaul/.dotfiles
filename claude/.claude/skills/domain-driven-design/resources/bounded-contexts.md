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

## Monorepo Structure

For a single team, directory-based separation is sufficient:

```
src/
  contexts/
    gifting/
      domain/        # Aggregates, value objects, ports
      application/   # Use cases
      infrastructure/# Adapters
    budgeting/
      domain/
      application/
      infrastructure/
  shared/            # Shared kernel (Money, Email)
```

For multiple teams, use workspace packages with explicit exports:

```
packages/
  gifting/           # package.json with explicit exports
  budgeting/         # package.json with explicit exports
  shared-kernel/     # Minimal shared types
```

## Enforcing Boundaries

- **Import restrictions**: Use ESLint rules (eslint-plugin-boundaries, Nx enforce-module-boundaries) to prevent cross-context imports
- **Barrel exports**: Each context exposes only its public API via `index.ts`
- **Code review**: Every PR touching domain code should be checked for ubiquitous language compliance against the glossary

## Discovering Context Boundaries

Context boundaries emerge where language diverges. Signals that two things belong in different contexts:

- The same word means different things to different stakeholders ("User" in billing vs "User" in shipping)
- Two concepts change for different business reasons
- Different teams own different parts
- A model that works for one workflow doesn't fit another
