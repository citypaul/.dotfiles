---
name: refactoring
description: Refactoring assessment and behavior-preserving patterns for code with a passing baseline and proportionate preservation evidence. Use when the user asks to clean up, simplify, or restructure a selected area, or after GREEN establishes the passing baseline for a TDD increment. Mutation testing verifies the accumulated result later at the end-of-phase PR-readiness gate. Covers commit-before-refactoring discipline, when refactoring adds value vs when to skip it, and priority classification. For any slice in a selected whole-path reduction program—transition or terminal—use reduce-system-complexity as the governing skill; refactoring may be secondary when applicable. For repository-wide architecture discovery use improve-codebase-architecture; for a module contract use codebase-design. Do NOT use for insufficiently evidenced code or adding behavior.
---

# Refactoring

Refactoring is the final step of each fast RED-GREEN-REFACTOR increment when restructuring is applicable. Assess it after GREEN establishes a passing behavior-test baseline. Do not run the automated mutation harness before or after each refactor; mutation testing verifies the completed phase once the work is otherwise ready for a PR.

Because automated mutation evidence is intentionally deferred, the baseline's strength is not yet mutation-harness-verified during refactoring. Keep each refactor small, strictly behavior-preserving, and green under the existing oracles; the final gate validates the accumulated result.

This skill safely implements a bounded, behavior-preserving improvement. Use `improve-codebase-architecture` to discover and rank architecture candidates, then `codebase-design` to design a selected module contract before returning here for implementation. If the slice participates in a selected whole-path reduction program, whether as a transition or terminal reduction, `reduce-system-complexity` governs the ledger and gate state; use this skill only as a secondary refactoring assessment when applicable.

## When to Refactor

- Assess after GREEN or another passing proportionate preservation baseline
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
2. COMMIT: Save the working baseline with its preservation evidence
3. REFACTOR: Improve structure in small steps under the `tdd` skill's canonical fast-feedback policy. From a clean baseline, prefer a proven repository-owned graph-complete watcher; use diff-selected Vitest watch only when the installed version/configuration has passed the canonical clean-start live proof, otherwise repeat the affected one-shot. In monorepos use the root graph so transitive consumers remain eligible
4. VERIFY: Keep focused and affected tests plus other proportionate evidence green after each step; do not rerun the full suite after every edit
5. COMMIT: Save refactored code
6. PRE-PR GATE: When the phase is otherwise ready for a PR, run mutation testing once for the accumulated scope where meaningful, or record explicit `N/A` plus proportionate alternate evidence; address valuable survivors within that gate

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
// After GREEN establishes a passing behavior-test baseline:
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

**Key lesson**: Every new behavior must have a failing test that demanded it. A behavior-preserving refactor may change lines without a new RED test, but only to improve structure while proportionate preservation evidence stays green. At PR readiness, use mutation evidence for the accumulated scope where meaningful and explicit alternate evidence where it is not; never invent structural mutants. Do not add speculative behavior.

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
- [ ] Focused/affected tests stayed green during refactoring, and the repository-defined complete non-watch PR test gate passes before PR
- [ ] If the refactored phase is ready for a PR, mutation results were reviewed once for the accumulated scope where meaningful, or explicit `N/A` plus proportionate alternate evidence was recorded
- [ ] No unplanned consumer-facing API was added; internal or temporary contracts follow the selected design and compatibility plan
- [ ] Code more readable than before
- [ ] Committed separately from features
- [ ] Committed BEFORE refactoring (safety net)
- [ ] No speculative code added
- [ ] Behavior unchanged within the confidence and fidelity of the passing preservation evidence
