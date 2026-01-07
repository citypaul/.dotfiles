---
name: mutation-testing
description: Mutation testing patterns for verifying test effectiveness. Use when analyzing branch code to find weak or missing tests.
---

# Mutation Testing

Mutation testing answers the question: **"Are my tests actually catching bugs?"**

Code coverage tells you what code your tests execute. Mutation testing tells you if your tests would **detect changes** to that code. A test suite with 100% coverage can still miss 40% of potential bugs.

---

## Core Concept

**The Mutation Testing Process:**

1. **Generate mutants**: Introduce small bugs (mutations) into production code
2. **Run tests**: Execute your test suite against each mutant
3. **Evaluate results**: If tests fail, the mutant is "killed" (good). If tests pass, the mutant "survived" (bad - your tests missed the bug)

**The Insight**: A surviving mutant represents a bug your tests wouldn't catch.

---

## When to Use This Skill

Use mutation testing analysis when:

- Reviewing code changes on a branch
- Verifying test effectiveness after TDD
- Identifying weak tests that appear to have coverage
- Finding missing edge case tests
- Validating that refactoring didn't weaken test suite

**Integration with TDD:**

```
TDD Workflow                    Mutation Testing Validation
┌─────────────────┐             ┌─────────────────────────────┐
│ RED: Write test │             │                             │
│ GREEN: Pass it  │──────────►  │ After GREEN: Verify tests   │
│ REFACTOR        │             │ would kill relevant mutants │
└─────────────────┘             └─────────────────────────────┘
```

---

## Systematic Branch Analysis Process

When analyzing code on a branch, follow this systematic process:

### Step 1: Identify Changed Code

```bash
# Get files changed on the branch
git diff main...HEAD --name-only | grep -E '\.(ts|js|tsx|jsx)$' | grep -v '\.test\.'

# Get detailed diff for analysis
git diff main...HEAD -- src/
```

### Step 2: Generate Mental Mutants

For each changed function/method, mentally apply mutation operators (see Mutation Operators section below).

### Step 3: Verify Test Coverage

For each potential mutant, ask:

1. **Is there a test that exercises this code path?**
2. **Would that test FAIL if this mutation were applied?**
3. **Is the assertion specific enough to catch this change?**

### Step 4: Document Findings

Categorize findings:

| Category | Description | Action Required |
|----------|-------------|-----------------|
| Killed | Test would fail if mutant applied | None - tests are effective |
| Survived | Test would pass with mutant | Add/strengthen test |
| No Coverage | No test exercises this code | Add behavior test |
| Equivalent | Mutant produces same behavior | None - not a real bug |

---

## Mutation Operators

### Arithmetic Operator Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `a + b` | `a - b` | Addition behavior |
| `a - b` | `a + b` | Subtraction behavior |
| `a * b` | `a / b` | Multiplication behavior |
| `a / b` | `a * b` | Division behavior |
| `a % b` | `a * b` | Modulo behavior |

**Example Analysis:**

```typescript
// Production code
const calculateTotal = (price: number, quantity: number): number => {
  return price * quantity;
};

// Mutant: price / quantity
// Question: Would tests fail if * became /?

// ❌ WEAK TEST - Would NOT catch mutant
it('calculates total', () => {
  expect(calculateTotal(10, 1)).toBe(10); // 10 * 1 = 10, 10 / 1 = 10 (SAME!)
});

// ✅ STRONG TEST - Would catch mutant
it('calculates total', () => {
  expect(calculateTotal(10, 3)).toBe(30); // 10 * 3 = 30, 10 / 3 = 3.33 (DIFFERENT!)
});
```

### Conditional Expression Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `a < b` | `a <= b` | Boundary value at equality |
| `a < b` | `a >= b` | Both sides of condition |
| `a <= b` | `a < b` | Boundary value at equality |
| `a <= b` | `a > b` | Both sides of condition |
| `a > b` | `a >= b` | Boundary value at equality |
| `a > b` | `a <= b` | Both sides of condition |
| `a >= b` | `a > b` | Boundary value at equality |
| `a >= b` | `a < b` | Both sides of condition |

**Example Analysis:**

```typescript
// Production code
const isAdult = (age: number): boolean => {
  return age >= 18;
};

// Mutant: age > 18
// Question: Would tests fail if >= became >?

// ❌ WEAK TEST - Would NOT catch boundary mutant
it('returns true for adults', () => {
  expect(isAdult(25)).toBe(true);  // 25 >= 18 = true, 25 > 18 = true (SAME!)
});

// ✅ STRONG TEST - Would catch boundary mutant
it('returns true for exactly 18', () => {
  expect(isAdult(18)).toBe(true);  // 18 >= 18 = true, 18 > 18 = false (DIFFERENT!)
});
```

### Equality Operator Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `a === b` | `a !== b` | Both equal and not equal cases |
| `a !== b` | `a === b` | Both equal and not equal cases |
| `a == b` | `a != b` | Both equal and not equal cases |
| `a != b` | `a == b` | Both equal and not equal cases |

### Logical Operator Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `a && b` | `a \|\| b` | Case where one is true, other is false |
| `a \|\| b` | `a && b` | Case where one is true, other is false |
| `a ?? b` | `a && b` | Nullish coalescing behavior |

**Example Analysis:**

```typescript
// Production code
const canAccess = (isAdmin: boolean, isOwner: boolean): boolean => {
  return isAdmin || isOwner;
};

// Mutant: isAdmin && isOwner
// Question: Would tests fail if || became &&?

// ❌ WEAK TEST - Would NOT catch mutant
it('returns true when both conditions met', () => {
  expect(canAccess(true, true)).toBe(true);  // true || true = true && true (SAME!)
});

// ✅ STRONG TEST - Would catch mutant
it('returns true when only admin', () => {
  expect(canAccess(true, false)).toBe(true);  // true || false = true, true && false = false (DIFFERENT!)
});
```

### Boolean Literal Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `true` | `false` | Both true and false outcomes |
| `false` | `true` | Both true and false outcomes |
| `!(a)` | `a` | Negation is necessary |

### Block Statement Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `{ code }` | `{ }` | Side effects of the block |

**Example Analysis:**

```typescript
// Production code
const processOrder = (order: Order): void => {
  validateOrder(order);
  saveOrder(order);
  sendConfirmation(order);
};

// Mutant: Empty function body
// Question: Would tests fail if all statements removed?

// ❌ WEAK TEST - Would NOT catch mutant
it('processes order without error', () => {
  expect(() => processOrder(order)).not.toThrow();  // Empty function also doesn't throw!
});

// ✅ STRONG TEST - Would catch mutant
it('saves order to database', () => {
  processOrder(order);
  expect(mockDatabase.save).toHaveBeenCalledWith(order);
});
```

### String Literal Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `"text"` | `""` | Non-empty string behavior |
| `""` | `"Stryker was here!"` | Empty string behavior |

### Array Declaration Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `[1, 2, 3]` | `[]` | Non-empty array behavior |
| `new Array(1, 2)` | `new Array()` | Array contents matter |

### Unary Operator Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `+a` | `-a` | Sign matters |
| `-a` | `+a` | Sign matters |
| `++a` | `--a` | Increment vs decrement |
| `a++` | `a--` | Increment vs decrement |

### Method Expression Mutations (TypeScript/JavaScript)

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `startsWith()` | `endsWith()` | Correct string position |
| `endsWith()` | `startsWith()` | Correct string position |
| `toUpperCase()` | `toLowerCase()` | Case transformation |
| `toLowerCase()` | `toUpperCase()` | Case transformation |
| `some()` | `every()` | Partial vs full match |
| `every()` | `some()` | Full vs partial match |
| `filter()` | (removed) | Filtering is necessary |
| `reverse()` | (removed) | Order matters |
| `sort()` | (removed) | Ordering is necessary |
| `min()` | `max()` | Correct extremum |
| `max()` | `min()` | Correct extremum |
| `trim()` | `trimStart()` | Correct trim behavior |

### Optional Chaining Mutations

| Original | Mutated | Test Should Verify |
|----------|---------|-------------------|
| `foo?.bar` | `foo.bar` | Null/undefined handling |
| `foo?.[i]` | `foo[i]` | Null/undefined handling |
| `foo?.()` | `foo()` | Null/undefined handling |

---

## Mutant States and Metrics

### Mutant States

| State | Meaning | Action |
|-------|---------|--------|
| **Killed** | Test failed when mutant applied | Good - tests are effective |
| **Survived** | Tests passed with mutant active | Bad - add/strengthen test |
| **No Coverage** | No test exercises this code | Add behavior test |
| **Timeout** | Tests timed out (infinite loop) | Counted as detected |
| **Equivalent** | Mutant produces same behavior | No action - not a real bug |

### Metrics

- **Mutation Score**: `killed / valid * 100` - The higher, the better
- **Detected**: `killed + timeout`
- **Undetected**: `survived + no coverage`

### Target Mutation Score

| Score | Quality |
|-------|---------|
| < 60% | Weak test suite - significant gaps |
| 60-80% | Moderate - many improvements possible |
| 80-90% | Good - but still gaps to address |
| > 90% | Strong - but watch for equivalent mutants |

---

## Equivalent Mutants

Equivalent mutants produce the same behavior as the original code. They cannot be killed because there is no observable difference.

### Common Equivalent Mutant Patterns

**Pattern 1: Operations with identity elements**

```typescript
// Mutant in conditional where both branches have same effect
if (whatever) {
  number += 0;  // Can mutate to -= 0, *= 1, /= 1 - all equivalent!
} else {
  number += 0;
}
```

**Pattern 2: Boundary conditions that don't affect outcome**

```typescript
// When max equals min, condition doesn't matter
const max = Math.max(a, b);
const min = Math.min(a, b);
if (a >= b) {  // Mutating to <= or < has no effect when a === b
  result = 10 ** (max - min);  // 10 ** 0 = 1 regardless
}
```

**Pattern 3: Dead code paths**

```typescript
// If this path is never reached, mutations don't matter
if (impossibleCondition) {
  doSomething();  // Mutating this won't affect behavior
}
```

### How to Handle Equivalent Mutants

1. **Identify**: Analyze if mutation truly changes observable behavior
2. **Document**: Note why mutant is equivalent
3. **Accept**: 100% mutation score may not be achievable
4. **Consider refactoring**: Sometimes equivalent mutants indicate unclear code

---

## Branch Analysis Checklist

When analyzing code changes on a branch:

### For Each Function/Method Changed:

- [ ] **Arithmetic operators**: Would changing +, -, *, / be detected?
- [ ] **Conditionals**: Are boundary values tested (>=, <=)?
- [ ] **Boolean logic**: Are all branches of &&, || tested?
- [ ] **Return statements**: Would changing return value be detected?
- [ ] **Method calls**: Would removing or swapping methods be detected?
- [ ] **String literals**: Would empty strings be detected?
- [ ] **Array operations**: Would empty arrays be detected?

### Red Flags (Likely Surviving Mutants):

- [ ] Tests only verify "no error thrown"
- [ ] Tests only check one side of a condition
- [ ] Tests use identity values (0, 1, empty string)
- [ ] Tests only verify function was called, not with what
- [ ] Tests don't verify return values
- [ ] Boundary values not tested

### Questions to Ask:

1. "If I changed this operator, would a test fail?"
2. "If I negated this condition, would a test fail?"
3. "If I removed this line, would a test fail?"
4. "If I returned early here, would a test fail?"

---

## Strengthening Weak Tests

### Pattern: Add Boundary Value Tests

```typescript
// Original weak test
it('validates age', () => {
  expect(isAdult(25)).toBe(true);
  expect(isAdult(10)).toBe(false);
});

// Strengthened with boundary values
it('validates age at boundary', () => {
  expect(isAdult(17)).toBe(false);  // Just below
  expect(isAdult(18)).toBe(true);   // Exactly at boundary
  expect(isAdult(19)).toBe(true);   // Just above
});
```

### Pattern: Test Both Branches of Conditions

```typescript
// Original weak test - only tests one branch
it('returns access result', () => {
  expect(canAccess(true, true)).toBe(true);
});

// Strengthened - tests all meaningful combinations
it('grants access when admin', () => {
  expect(canAccess(true, false)).toBe(true);
});

it('grants access when owner', () => {
  expect(canAccess(false, true)).toBe(true);
});

it('denies access when neither', () => {
  expect(canAccess(false, false)).toBe(false);
});
```

### Pattern: Avoid Identity Values

```typescript
// Weak - uses identity values
it('calculates', () => {
  expect(multiply(10, 1)).toBe(10);  // x * 1 = x / 1
  expect(add(5, 0)).toBe(5);         // x + 0 = x - 0
});

// Strong - uses values that reveal operator differences
it('calculates', () => {
  expect(multiply(10, 3)).toBe(30);  // 10 * 3 != 10 / 3
  expect(add(5, 3)).toBe(8);         // 5 + 3 != 5 - 3
});
```

### Pattern: Verify Side Effects

```typescript
// Weak - no verification of side effects
it('processes order', () => {
  processOrder(order);
  // No assertions!
});

// Strong - verifies observable outcomes
it('processes order', () => {
  processOrder(order);
  expect(orderRepository.save).toHaveBeenCalledWith(order);
  expect(emailService.send).toHaveBeenCalledWith(
    expect.objectContaining({ to: order.customerEmail })
  );
});
```

---

## Integration with Stryker (Optional)

For automated mutation testing, use Stryker:

### Installation

```bash
npm init stryker
```

### Configuration (stryker.conf.json)

```json
{
  "testRunner": "jest",
  "coverageAnalysis": "perTest",
  "reporters": ["html", "clear-text", "progress"],
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts"]
}
```

### Running

```bash
npx stryker run
```

### Incremental Mode (for branches)

```bash
npx stryker run --incremental
```

---

## Summary: Mutation Testing Mindset

**The key question for every line of code:**

> "If I introduced a bug here, would my tests catch it?"

**For each test, verify it would catch:**
- Arithmetic operator changes
- Boundary condition shifts
- Boolean logic inversions
- Removed statements
- Changed return values

**Remember:**
- Coverage measures execution, mutation testing measures detection
- A test that doesn't make assertions can't kill mutants
- Boundary values are critical for conditional mutations
- Avoid identity values that make operators interchangeable

---

## Quick Reference

### Operators Most Likely to Have Surviving Mutants

1. `>=` vs `>` (boundary not tested)
2. `&&` vs `||` (only tested when both true/false)
3. `+` vs `-` (only tested with 0)
4. `*` vs `/` (only tested with 1)
5. `some()` vs `every()` (only tested with all matching)

### Test Values That Kill Mutants

| Avoid | Use Instead |
|-------|-------------|
| 0 (for +/-) | Non-zero values |
| 1 (for */) | Values > 1 |
| Empty arrays | Arrays with multiple items |
| Identical values for comparisons | Distinct values |
| All true/false for logical ops | Mixed true/false |
