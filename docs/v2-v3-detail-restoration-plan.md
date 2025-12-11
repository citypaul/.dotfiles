# CLAUDE.md v2→v3 Detail Restoration Plan

## Problem Statement

The v3.0.0 refactor reduced CLAUDE.md from 4,936 lines to ~350 lines (93% reduction) by moving detailed guidance into skills. However, **critical testing details were lost** rather than moved, including:

1. Four-layer testing strategy (ADR-0003/ADR-0006 context)
2. TDD commit history expectations and exception handling
3. Coverage verification requirements ("NEVER trust coverage claims")
4. Detailed WRONG vs CORRECT examples for testing patterns
5. Adapter testing defaults (when to mock vs use real dependencies)

## Guiding Principles for Restoration

1. **Preserve v3.0.0 structure** - Keep CLAUDE.md lean, use skills for details
2. **Restore ALL v2.0.0 detail** - Nothing should be lost, just reorganized
3. **Add explicit examples** - Every principle needs WRONG ❌ vs CORRECT ✅ examples
4. **Test behavior, not implementation** - Make this ultra-clear with examples
5. **ADR integration** - Reference ADRs but include key context inline

## Restoration Actions

### Action 1: Expand Testing Skill

**File:** `~/.claude/skills/testing/SKILL.md`

**Add the following sections:**

#### Section A: Four-Layer Testing Strategy

````markdown
## Four-Layer Testing Strategy

**Reference:** [ADR-0003: Testing Strategy](https://github.com/citypaul/scenarist/blob/main/docs/adrs/0003-testing-strategy.md)

### Layer 1: Domain/Core Tests

- Test pure business logic
- Zero framework dependencies
- Fast, focused unit tests
- **Example:** `scenario-manager.test.ts`

### Layer 2: Adapter Tests

- **DEFAULT: Mock external dependencies**
- Test translation logic only (framework ↔ core)
- Most adapters mock Request/Response objects
- Fast, isolated tests

**Example - Express Adapter Test:**

```typescript
// ✅ CORRECT - Mock Express Request/Response
const mockReq = {
  headers: { "x-test-id": "test-123" },
  body: { scenario: "premium" },
} as Request;

const mockRes = {
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
} as unknown as Response;

await setScenario(mockReq, mockRes);
expect(mockRes.json).toHaveBeenCalledWith({ success: true });
```
````

**Thin Adapter Exception (ADR-0006):** Only use real dependencies when adapter meets ALL 5 criteria:

1. Single responsibility (one clear purpose)
2. Direct API wrapper (minimal transformation)
3. Stateless (no complex state management)
4. No business logic
5. Integration test adds value vs mock

**Current rate:** 1/4 adapters (25%) - **target ≤10%**
**When in doubt:** Use mocks (applies to 90%+ of adapters)

### Layer 3: Integration Tests

- Real framework, mocked external services
- End-to-end flows through adapter → core
- **Example:** Express example app tests

### Layer 4: E2E Tests

- Real everything (Playwright, Testcontainers)
- User journey validation
- Slowest, most realistic

````

#### Section B: TDD Commit History Expectations

```markdown
## TDD Commit History

**Default Expectation:** Commit history shows clear RED → GREEN → REFACTOR progression.

### Rare Exceptions

TDD evidence may not be linearly visible when:

**1. Multi-Session Work**
- Work done with TDD in each session
- Commits organized for PR clarity
- **Evidence:** Tests exist, all passing

**2. Context Continuation**
- Original RED phase in previous session/commit
- Current work continues from that point
- **Evidence:** Reference RED commit in PR description

**3. Refactoring Commits**
- Multiple small refactors combined into single commit
- All tests remained green throughout
- **Evidence:** Commit message notes "refactor only, no behavior change"

### Documentation Requirements

When exception applies, document in PR:
````

RED phase: commit c925187 (added failing tests)
GREEN phase: commits 5e0055b, 9a246d0 (implementation)
REFACTOR: commit 11dbd1a (test isolation improvements)

Test Evidence:
✅ 105/105 tests passing

```

**Important:** Exception is for EVIDENCE presentation, not TDD practice. TDD process must still be followed.
```

#### Section C: Coverage Verification

````markdown
## Coverage Verification - CRITICAL

**NEVER trust coverage claims without verification.**

### Before Approving PRs

1. Check out the branch
2. Run coverage: `cd packages/core && pnpm test:coverage`
3. Verify "All files" line = 100% (Statements, Branches, Functions, Lines)
4. Check tests are behavior-driven (not implementation details)

### Coverage Theater Detection

❌ **Fake Coverage Patterns:**

- Tests that mock the function being tested
- Tests that only check function was called
- Tests covering trivial getters/setters
- 100% line coverage but 0% branch coverage

**Example - Coverage Theater:**

```typescript
// ❌ WRONG - Tests nothing about behavior
it("calls validator", () => {
  const spy = jest.spyOn(validator, "validate");
  validate(payment);
  expect(spy).toHaveBeenCalled(); // Meaningless
});
```
````

**Example - Real Coverage:**

```typescript
// ✅ CORRECT - Tests actual behavior
it("rejects negative amounts", () => {
  const payment = getMockPayment({ amount: -100 });
  const result = validate(payment);
  expect(result.success).toBe(false);
  expect(result.error).toContain("Amount must be positive");
});
```

### Coverage Through Behavior

Validation code gets 100% coverage by testing the behavior it protects:

```typescript
// Tests covering validation WITHOUT testing validator directly
describe("processPayment", () => {
  it("rejects negative amounts", () => {
    /* ... */
  });
  it("rejects amounts over 10000", () => {
    /* ... */
  });
  it("rejects invalid CVV", () => {
    /* ... */
  });
  it("processes valid payments", () => {
    /* ... */
  });
});
// ✅ Result: payment-validator.ts has 100% coverage through behavior
```

````

#### Section D: Enhanced Test Data Patterns

```markdown
## Test Data Patterns

### Factory Function Best Practices

1. **Return complete, valid objects**
```typescript
// ✅ CORRECT - Complete object with all required fields
const getMockPayment = (overrides?: Partial<Payment>): Payment => {
  return PaymentSchema.parse({
    amount: 100,
    currency: "GBP",
    cardId: "card_123",
    cvv: "123",
    ...overrides,
  });
};
````

2. **Validate with real schemas**

```typescript
// ✅ CORRECT - Use actual schema from codebase
const getMockPayment = (overrides?: Partial<Payment>): Payment => {
  return PaymentSchema.parse({ ... });
};

// ❌ WRONG - Redefining schema in test
const getMockPayment = (overrides?: Partial<Payment>) => {
  return { amount: 100, ... }; // No validation!
};
```

3. **Compose factories for nested objects**

```typescript
// ✅ CORRECT - Compose factories
const getMockOrder = (overrides?: Partial<Order>): Order => {
  return OrderSchema.parse({
    items: [getMockItem()], // Compose
    customer: getMockCustomer(), // Compose
    payment: getMockPayment(), // Compose
    ...overrides,
  });
};
```

4. **Use Partial<T> for type-safe overrides**

```typescript
// ✅ CORRECT - TypeScript catches typos
const payment = getMockPayment({ amount: 500 });
const payment = getMockPayment({ amoutn: 500 }); // TS Error!
```

### Anti-Patterns

❌ **WRONG:**

```typescript
// Using let and beforeEach
let payment: Payment;
beforeEach(() => {
  payment = { amount: 100, ... };  // Shared mutable state
});

// Incomplete objects
const getMockPayment = () => ({ amount: 100 }); // Missing required fields

// Redefining schemas
const PaymentSchema = z.object({ ... }); // Already defined in src/

// Factories returning Partial
const getMockPayment = (): Partial<Payment> => ({ ... }); // Should be complete
```

✅ **CORRECT:**

```typescript
// Factory per test
const createTestPayment = () => getMockPayment();

it("processes payment", () => {
  const payment = createTestPayment(); // Fresh state every test
  // ...
});
```

````

### Action 2: Update TDD Skill

**File:** `~/.claude/skills/tdd/SKILL.md`

**Add section on commit history expectations from Action 1, Section B**

### Action 3: Add CLAUDE.md Quick Reference

**File:** `CLAUDE.md`

**Add to TDD Requirements section:**

```markdown
## TDD Requirements (NON-NEGOTIABLE)

[existing content...]

**Testing Guidelines:**
- Load `testing` skill for comprehensive patterns (behavior-driven testing, coverage verification, factory patterns)
- Load `tdd` skill for commit history expectations and exceptions
- See ADR-0003 for four-layer testing strategy
- See ADR-0006 for thin adapter exception (when to use real vs mock dependencies)
````

### Action 4: Verification Checklist

After restoration, verify ALL of the following are present:

- [ ] Four-layer testing strategy explained
- [ ] ADR-0003 and ADR-0006 referenced with inline context
- [ ] Thin adapter exception criteria (all 5)
- [ ] TDD commit history expectations
- [ ] TDD exception cases with examples
- [ ] Coverage verification requirements ("NEVER trust claims")
- [ ] Coverage theater detection patterns
- [ ] Test factory best practices (4 points)
- [ ] Factory composition examples
- [ ] Schema validation in factories
- [ ] Anti-patterns section with ❌ examples
- [ ] Behavior-driven coverage examples
- [ ] Public API testing vs implementation testing
- [ ] At least 10 WRONG ❌ vs CORRECT ✅ examples

## Success Criteria

1. **No detail lost** - Every point from v2.0.0 testing section is present
2. **Better organized** - Detail in skills, quick reference in CLAUDE.md
3. **More examples** - Every principle has WRONG ❌ vs CORRECT ✅ code
4. **ADR integration** - References with inline context (don't force reading ADRs)
5. **Easy to find** - Testing skill loads automatically when writing tests

## Implementation Order

1. Create expanded testing skill (Action 1) ← START HERE
2. Update TDD skill (Action 2)
3. Add quick reference to CLAUDE.md (Action 3)
4. Run verification checklist (Action 4)
5. Test by asking Claude Code to help write tests (see if guidance is followed)
