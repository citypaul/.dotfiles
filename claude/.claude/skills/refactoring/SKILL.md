---
name: refactoring
description: Refactoring assessment and behavior-preserving patterns for code with a passing baseline and sufficient preservation evidence. Use when the user asks to clean up, simplify, or restructure a selected area, and after mutation testing or reviewed proportionate alternate evidence establishes confidence for the REFACTOR step. Covers commit-before-refactoring discipline, when refactoring adds value vs when to skip it, and priority classification. For any slice in a selected whole-path reduction program—transition or terminal—use reduce-system-complexity as the governing skill; refactoring may be secondary when applicable. For repository-wide architecture discovery use improve-codebase-architecture; for a module contract use codebase-design. Do NOT use for insufficiently evidenced code or adding behavior.
---

# Refactoring

Refactoring is the final step of TDD when restructuring is applicable. Assess it after mutation testing—or reviewed proportionate alternate evidence when mutation is not meaningful—establishes enough preservation confidence for the proposed change.

This skill safely implements a bounded, behavior-preserving improvement. Use `improve-codebase-architecture` to discover and rank architecture candidates, then `codebase-design` to design a selected module contract before returning here for implementation. If the slice participates in a selected whole-path reduction program, whether as a transition or terminal reduction, `reduce-system-complexity` governs the ledger and gate state; use this skill only as a secondary refactoring assessment when applicable.

## When to Refactor

- Assess after mutation testing or reviewed proportionate alternate evidence establishes preservation confidence
- Only refactor if it improves the code
- **Commit working code BEFORE refactoring** (critical safety net)

### Commit Before Refactoring - WHY

Having a working baseline before refactoring:
- Allows reverting if refactoring breaks things
- Provides safety net for experimentation
- Makes refactoring less risky
- Shows clear separation in git history

**Workflow:**
1. BASELINE: Applicable tests pass and/or the conserved behavior and guarantees have proportionate evidence
2. MUTATE OR ALTERNATE EVIDENCE: Verify preservation strength; record explicit `N/A` when mutation is not meaningful
3. KILL MUTANTS WHEN APPLICABLE: Address valuable survivors
4. COMMIT: Save the working baseline with its preservation evidence
5. REFACTOR: Improve structure
6. COMMIT: Save refactored code

## Priority Classification

| Priority | Action | Examples |
|----------|--------|----------|
| Critical | Fix now | Data mutation (see the `functional` skill), knowledge duplication, >3 levels nesting |
| High | This session | Magic numbers, unclear names, functions coordinating multiple responsibilities |
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
// After mutation or reviewed alternate evidence establishes preservation confidence:
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

**Key lesson**: Every new behavior must have a failing test that demanded it. A behavior-preserving refactor may change lines without a new RED test, but only to improve structure while proportionate preservation evidence stays green. Use mutation evidence where meaningful and explicit alternate evidence where it is not; never invent structural mutants. Do not add speculative behavior.

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

- ❌ The current structure isn't impeding the work at hand (clean-enough working code needs no restructuring)
- ❌ Speculative generality — restructuring for requirements that don't exist yet
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

- [ ] Existing behavior tests pass; test edits are not hiding a behavior change
- [ ] Mutation results are reviewed where meaningful, or explicit `N/A` plus proportionate alternate evidence is recorded
- [ ] No unplanned consumer-facing API was added; internal or temporary contracts follow the selected design and compatibility plan
- [ ] Code more readable than before
- [ ] Committed separately from features
- [ ] Committed BEFORE refactoring (safety net)
- [ ] No speculative code added
- [ ] Behavior unchanged within the confidence and fidelity of the passing preservation evidence
