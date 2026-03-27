---
name: refactoring
description: Refactoring assessment and patterns. Use after mutation testing validates test strength (MUTATE phase) to assess improvement opportunities.
---

# Refactoring

Refactoring is the final step of TDD. After mutation testing confirms test strength, assess if refactoring adds value.

## When to Refactor

- Always assess after mutation testing confirms test strength
- Only refactor if it improves the code
- **Commit working code BEFORE refactoring** (critical safety net)

### Commit Before Refactoring - WHY

Having a working baseline before refactoring:
- Allows reverting if refactoring breaks things
- Provides safety net for experimentation
- Makes refactoring less risky
- Shows clear separation in git history

**Workflow:**
1. GREEN: Tests pass
2. MUTATE: Verify test effectiveness
3. KILL MUTANTS: Address surviving mutants
4. COMMIT: Save working code with strong tests
5. REFACTOR: Improve structure
6. COMMIT: Save refactored code

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
// After MUTATE + KILL MUTANTS:
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

## Speculative Code is a TDD Violation

If code isn't driven by a failing test, don't write it.

**Key lesson**: Every line must have a test that demanded its existence.

❌ **Speculative code examples:**
- "Just in case" logic
- Features not yet needed
- Code written "for future flexibility"
- Untested error handling paths

✅ **Correct approach**: Delete speculative code. If the behavior is needed, write a failing test that demands it, then implement.

```typescript
// ❌ WRONG - Speculative error handling (no test demands this)
if (items.length === 0) {
  throw new Error('Empty cart'); // No test for this path!
}

// ✅ CORRECT - Test-driven error handling
// First: write a test that expects this behavior
// Then: implement the guard clause to make it pass
```

---

## When NOT to Refactor

Don't refactor when:

- ❌ Code works correctly (no bug to fix)
- ❌ No test demands the change (speculative refactoring)
- ❌ Would change behavior (that's a feature, not refactoring)
- ❌ Premature optimization
- ❌ Code is "good enough" for current phase
- ❌ **Extracting purely for testability** — if the only reason to move code into a separate file is "so we can unit test it", keep it inline. The consuming function already has behavioral tests that cover this code. Extract for readability, DRY (same knowledge used in multiple places — see "DRY = Knowledge, Not Code" above), or separation of concerns, never for testability alone.

**Remember**: Refactoring should improve code structure without changing behavior.

---

## Commit Messages for Refactoring

```
refactor: extract scenario validation logic
refactor: simplify error handling flow
refactor: rename ambiguous parameter names
```

**Format**: `refactor: <what was changed>`

**Note**: Refactoring commits should NOT be mixed with feature commits.

---

## Refactoring Checklist

- [ ] All tests pass without modification
- [ ] No new public APIs added
- [ ] Code more readable than before
- [ ] Committed separately from features
- [ ] Committed BEFORE refactoring (safety net)
- [ ] No speculative code added
- [ ] Behavior unchanged (tests prove this)
