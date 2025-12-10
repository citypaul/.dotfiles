---
name: refactoring
description: Refactoring assessment and patterns. Use after tests pass (GREEN phase) to assess improvement opportunities.
---

# Refactoring

Refactoring is the third step of TDD. After GREEN, assess if refactoring adds value.

## When to Refactor

- Always assess after green
- Only refactor if it improves the code
- Commit working code BEFORE refactoring

## Priority Classification

| Priority | Action | Examples |
|----------|--------|----------|
| Critical | Fix now | Mutations, knowledge duplication, >3 levels nesting |
| High | This session | Magic numbers, unclear names, >30 line functions |
| Nice | Later | Minor naming, single-use helpers |
| Skip | Don't change | Already clean code |

## DRY = Knowledge, Not Code

**Abstract when**:
- Same business concept (semantic meaning)
- Would change together if requirements change
- Obvious why grouped together

**Keep separate when**:
- Different concepts that look similar (structural)
- Would evolve independently
- Coupling would be confusing

## Example Assessment

```typescript
// After GREEN:
const processOrder = (order: Order): ProcessedOrder => {
  const itemsTotal = order.items.reduce((sum, item) => sum + item.price, 0);
  const shipping = itemsTotal > 50 ? 0 : 5.99;
  return { ...order, total: itemsTotal + shipping, shippingCost: shipping };
};

// ASSESSMENT:
// ⚠️ High: Magic numbers 50, 5.99 → extract constants
// ✅ Skip: Structure is clear enough
// DECISION: Extract constants only
```

## Refactoring Checklist

- [ ] All tests pass without modification
- [ ] No new public APIs added
- [ ] Code more readable than before
- [ ] Committed separately from features
