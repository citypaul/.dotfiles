---
name: tdd
description: Test-Driven Development workflow. Use for ALL code changes - features, bug fixes, refactoring. TDD is non-negotiable.
---

# Test-Driven Development

TDD is the fundamental practice. Every line of production code must be written in response to a failing test.

## RED-GREEN-REFACTOR Cycle

### RED: Write Failing Test First
- NO production code until you have a failing test
- Test describes desired behavior, not implementation
- Test should fail for the right reason

### GREEN: Minimum Code to Pass
- Write ONLY enough code to make the test pass
- Resist adding functionality not demanded by a test
- Commit immediately after green

### REFACTOR: Assess Improvements
- Assess AFTER every green (but only refactor if it adds value)
- Commit before refactoring
- All tests must pass after refactoring

---

## TDD Evidence in Commit History

### Default Expectation

Commit history should show clear RED → GREEN → REFACTOR progression.

**Ideal progression:**
```
commit abc123: test: add failing test for user authentication
commit def456: feat: implement user authentication to pass test
commit ghi789: refactor: extract validation logic for clarity
```

### Rare Exceptions

TDD evidence may not be linearly visible in commits in these cases:

**1. Multi-Session Work**
- Feature spans multiple development sessions
- Work done with TDD in each session
- Commits organized for PR clarity rather than strict TDD phases
- **Evidence**: Tests exist, all passing, implementation matches test requirements

**2. Context Continuation**
- Resuming from previous work
- Original RED phase done in previous session/commit
- Current work continues from that point
- **Evidence**: Reference to RED commit in PR description

**3. Refactoring Commits**
- Large refactors after GREEN
- Multiple small refactors combined into single commit
- All tests remained green throughout
- **Evidence**: Commit message notes "refactor only, no behavior change"

### Documenting Exceptions in PRs

When exception applies, document in PR description:

```markdown
## TDD Evidence

RED phase: commit c925187 (added failing tests for shopping cart)
GREEN phase: commits 5e0055b, 9a246d0 (implementation + bug fixes)
REFACTOR: commit 11dbd1a (test isolation improvements)

Test Evidence:
✅ 4/4 tests passing (7.7s with 4 workers)
```

**Important**: Exception is for EVIDENCE presentation, not TDD practice. TDD process must still be followed - these are cases where commit history doesn't perfectly reflect the process that was actually followed.

---

## Coverage Verification - CRITICAL

### NEVER Trust Coverage Claims Without Verification

**Always run coverage yourself before approving PRs.**

### Verification Process

**Before approving any PR claiming "100% coverage":**

1. Check out the branch
   ```bash
   git checkout feature-branch
   ```

2. Run coverage verification:
   ```bash
   cd packages/core
   pnpm test:coverage
   # OR
   pnpm exec vitest run --coverage
   ```

3. Verify ALL metrics hit 100%:
   - Lines: 100% ✅
   - Statements: 100% ✅
   - Branches: 100% ✅
   - Functions: 100% ✅

4. Check that tests are behavior-driven (not testing implementation details)

### Reading Coverage Output

Look for the "All files" line in coverage summary:

```
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |     100 |      100 |     100 |     100 |
setup.ts       |     100 |      100 |     100 |     100 |
context.ts     |     100 |      100 |     100 |     100 |
endpoints.ts   |     100 |      100 |     100 |     100 |
```

✅ This is 100% coverage - all four metrics at 100%.

### Red Flags

Watch for these signs of incomplete coverage:

❌ **PR claims "100% coverage" but you haven't verified**
- Never trust claims without running coverage yourself

❌ **Coverage summary shows <100% on any metric**
```
All files      |   97.11 |    93.97 |   81.81 |   97.11 |
```
- This is NOT 100% coverage (Functions: 81.81%, Lines: 97.11%)

❌ **"Uncovered Line #s" column shows line numbers**
```
setup.ts       |   95.23 |      100 |      60 |   95.23 | 45-48, 52-55
```
- Lines 45-48 and 52-55 are not covered

❌ **Coverage gaps without explicit exception documentation**
- If coverage <100%, exception should be documented (see Exception Process below)

### Coverage Theater Detection

Watch for fake coverage patterns:

**Pattern 1: Mock the function being tested**
```typescript
// ❌ WRONG - This gives 100% coverage but tests nothing
it('calls validator', () => {
  const spy = jest.spyOn(validator, 'validate');
  validate(payment);
  expect(spy).toHaveBeenCalled(); // Tells us nothing about behavior
});
```

**Pattern 2: Test only that function was called**
```typescript
// ❌ WRONG - No behavior validation
it('processes payment', () => {
  const spy = jest.spyOn(processor, 'process');
  handlePayment(payment);
  expect(spy).toHaveBeenCalledWith(payment); // So what?
});
```

**Pattern 3: Test trivial getters/setters**
```typescript
// ❌ WRONG - Testing implementation, not behavior
it('sets amount', () => {
  payment.setAmount(100);
  expect(payment.getAmount()).toBe(100); // Trivial
});
```

**Pattern 4: 100% line coverage, 0% branch coverage**
```typescript
// ❌ WRONG - Missing edge cases
it('validates payment', () => {
  const result = validate(getMockPayment());
  expect(result.success).toBe(true); // Only happy path!
});
// Missing: negative amounts, invalid CVV, missing fields, etc.
```

### Real Coverage Example

```typescript
// ✅ CORRECT - Tests actual behavior with edge cases
describe('processPayment', () => {
  it('should reject negative amounts', () => {
    const payment = getMockPayment({ amount: -100 });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Amount must be positive');
  });

  it('should reject amounts over limit', () => {
    const payment = getMockPayment({ amount: 15000 });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Amount exceeds limit');
  });

  it('should reject invalid CVV', () => {
    const payment = getMockPayment({ cvv: '12' });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid CVV');
  });

  it('should process valid payments', () => {
    const payment = getMockPayment({ amount: 100, cvv: '123' });
    const result = processPayment(payment);
    expect(result.success).toBe(true);
    expect(result.data.transactionId).toBeDefined();
  });
});
```

### When Coverage Drops, Ask

**"What business behavior am I not testing?"**

NOT "What line am I missing?"

Add tests for behavior, and coverage follows naturally.

---

## 100% Coverage Exception Process

### Default Rule: 100% Coverage Required

No exceptions without explicit approval and documentation.

### Requesting an Exception

If 100% coverage cannot be achieved:

**Step 1: Document in package README**

Explain:
- Current coverage metrics
- WHY 100% cannot be achieved in this package
- WHERE the missing coverage will come from (integration tests, E2E, etc.)

**Step 2: Get explicit approval**

From project maintainer or team lead

**Step 3: Document in CLAUDE.md**

Under "Test Coverage: 100% Required" section, list the exception

**Example Exception:**

```markdown
## Current Exceptions

- **Next.js Adapter**: 86% function coverage
  - Documented in `/packages/nextjs-adapter/README.md`
  - Missing coverage from SSR functions (tested in E2E layer)
  - Approved: 2024-11-15
```

### Remember

The burden of proof is on the requester. 100% is the default expectation.

---

## Development Workflow

### Adding a New Feature

1. **Write failing test** - describe expected behavior
2. **Run test** - confirm it fails (`pnpm test:watch`)
3. **Implement minimum** - just enough to pass
4. **Run test** - confirm it passes
5. **Refactor if valuable** - improve code structure
6. **Commit** - with conventional commit message

### Workflow Example

```bash
# 1. Write failing test
it('should reject empty scenario names', () => {
  const result = registerScenario({ id: 'test', name: '' });
  expect(result.success).toBe(false);
}); # ❌ Test fails (no implementation)

# 2. Implement minimum code
if (scenario.name === '') {
  return { success: false, error: 'Name required' };
} # ✅ Test passes

# 3. Refactor if needed (extract validation, improve naming)

# 4. Commit
git add .
git commit -m "feat: reject empty scenario names"
```

---

## Commit Messages

Use conventional commits format:

```
feat: add scenario variant support
fix: correct test ID extraction from headers
refactor: extract scenario validation logic
test: add edge cases for scenario switching
docs: update architecture documentation
```

**Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code change that neither fixes bug nor adds feature
- `test:` - Adding or updating tests
- `docs:` - Documentation changes

---

## Pull Request Requirements

Before submitting PR:

- [ ] All tests must pass
- [ ] All linting and type checks must pass
- [ ] **Coverage verification REQUIRED** - claims must be verified before review/approval
- [ ] PRs focused on single feature or fix
- [ ] Include behavior description (not implementation details)

**Example PR Description:**

```markdown
## Summary

Adds support for scenario variants, allowing different backend states within the same scenario.

## Behavior Changes

- Scenarios can now define multiple variants
- Variant selection via `switchScenario(testId, scenarioId, variantName)`
- Default variant used if variantName omitted

## Test Evidence

✅ 127/127 tests passing
✅ 100% coverage verified (see coverage report)

## TDD Evidence

RED: commit 4a3b2c1 (failing tests for variant support)
GREEN: commit 5d4e3f2 (implementation)
REFACTOR: commit 6e5f4a3 (extract variant resolution)
```

---

## Test Factory Pattern

For test data, use factory functions with optional overrides.

### Core Principles

1. Return complete objects with sensible defaults
2. Accept `Partial<T>` overrides for customization
3. Validate with real schemas (don't redefine)
4. NO `let`/`beforeEach` - use factories for fresh state

### Basic Pattern

```typescript
const getMockScenario = (overrides?: Partial<Scenario>): Scenario => {
  return ScenarioSchema.parse({
    id: 'test-scenario',
    name: 'Test Scenario',
    description: 'Test description',
    mocks: [],
    ...overrides,
  });
};

// Usage
it('processes scenario', () => {
  const scenario = getMockScenario({ name: 'Custom Name' });
  const result = registerScenario(scenario);
  expect(result.success).toBe(true);
});
```

### Complete Factory Example

```typescript
import { ScenarioSchema } from '@/schemas'; // Import real schema

const getMockScenario = (overrides?: Partial<Scenario>): Scenario => {
  return ScenarioSchema.parse({
    id: 'test-scenario',
    name: 'Test Scenario',
    description: 'A test scenario for unit testing',
    mocks: [
      {
        method: 'GET',
        url: '/api/test',
        response: { status: 200, body: { success: true } },
      },
    ],
    ...overrides,
  });
};
```

**Why validate with schema?**
- Ensures test data is valid according to production schema
- Catches breaking changes early (schema changes fail tests)
- Single source of truth (no schema redefinition)

### Factory Composition

For nested objects, compose factories:

```typescript
const getMockItem = (overrides?: Partial<Item>): Item => {
  return ItemSchema.parse({
    id: 'item-1',
    name: 'Test Item',
    price: 100,
    ...overrides,
  });
};

const getMockOrder = (overrides?: Partial<Order>): Order => {
  return OrderSchema.parse({
    id: 'order-1',
    items: [getMockItem()],      // ✅ Compose factories
    customer: getMockCustomer(),  // ✅ Compose factories
    payment: getMockPayment(),    // ✅ Compose factories
    ...overrides,
  });
};

// Usage - override nested objects
it('calculates total with multiple items', () => {
  const order = getMockOrder({
    items: [
      getMockItem({ price: 100 }),
      getMockItem({ price: 200 }),
    ],
  });
  expect(calculateTotal(order)).toBe(300);
});
```

### Anti-Patterns to Avoid

❌ **WRONG: Using `let` and `beforeEach`**
```typescript
let scenario: Scenario;
beforeEach(() => {
  scenario = { id: 'test', ... };  // Shared mutable state!
});

it('test 1', () => {
  scenario.name = 'Modified';  // Mutates shared state
});

it('test 2', () => {
  expect(scenario.name).toBe('Test Scenario');  // Fails! Modified by test 1
});
```

✅ **CORRECT: Factory per test**
```typescript
it('test 1', () => {
  const scenario = getMockScenario({ name: 'Modified' });  // Fresh state
  // ...
});

it('test 2', () => {
  const scenario = getMockScenario();  // Fresh state, not affected by test 1
  expect(scenario.name).toBe('Test Scenario');  // ✅ Passes
});
```

❌ **WRONG: Incomplete objects**
```typescript
const getMockScenario = () => ({
  id: 'test',  // Missing name, description, mocks!
});
```

✅ **CORRECT: Complete objects**
```typescript
const getMockScenario = (overrides?: Partial<Scenario>): Scenario => {
  return ScenarioSchema.parse({
    id: 'test-scenario',
    name: 'Test Scenario',
    description: 'Test description',
    mocks: [],
    ...overrides,  // All required fields present
  });
};
```

❌ **WRONG: Redefining schemas in tests**
```typescript
// ❌ Schema already defined in src/schemas/scenario.ts!
const ScenarioSchema = z.object({ ... });
const getMockScenario = () => ScenarioSchema.parse({ ... });
```

✅ **CORRECT: Import real schema**
```typescript
import { ScenarioSchema } from '@/schemas/scenario';

const getMockScenario = (overrides?: Partial<Scenario>): Scenario => {
  return ScenarioSchema.parse({
    id: 'test',
    name: 'Test',
    ...overrides,
  });
};
```

---

## Refactoring Priority

After green, classify any issues:

| Priority | Action | Examples |
|----------|--------|----------|
| Critical | Fix now | Mutations, knowledge duplication, >3 levels nesting |
| High | This session | Magic numbers, unclear names, >30 line functions |
| Nice | Later | Minor naming, single-use helpers |
| Skip | Don't change | Already clean code |

For detailed refactoring methodology, load the `refactoring` skill.

---

## Anti-Patterns to Avoid

- ❌ Writing production code without failing test
- ❌ Testing implementation details (spies on internal methods)
- ❌ 1:1 mapping between test files and implementation files
- ❌ Using `let`/`beforeEach` for test data
- ❌ Trusting coverage claims without verification
- ❌ Mocking the function being tested
- ❌ Redefining schemas in test files
- ❌ Factories returning partial/incomplete objects
- ❌ Speculative code ("just in case" logic without tests)

---

## Summary Checklist

Before marking work complete:

- [ ] Every production code line has a failing test that demanded it
- [ ] Commit history shows TDD evidence (or documented exception)
- [ ] All tests pass
- [ ] Coverage verified at 100% (or exception documented)
- [ ] Test factories used (no `let`/`beforeEach`)
- [ ] Tests verify behavior (not implementation details)
- [ ] Refactoring assessed and applied if valuable
- [ ] Conventional commit messages used
