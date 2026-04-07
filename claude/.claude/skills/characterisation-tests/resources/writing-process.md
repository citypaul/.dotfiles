# Writing Characterisation Tests: Process and Examples

Detailed walkthrough of the characterisation testing process. See the main `characterisation-tests` skill for overview and heuristics.

## Worked Example

Given an opaque pricing function we need to modify:

```typescript
// legacy-pricing.ts -- no tests, no documentation
export const calculateDiscount = (
  amount: number,
  customerType: string,
  years: number,
): number => {
  let discount = 0;
  if (customerType === 'premium') {
    discount = amount * 0.15;
    if (years > 5) discount += amount * 0.05;
  } else if (customerType === 'business') {
    discount = amount * 0.1;
    if (years > 3) discount += amount * 0.03;
  }
  if (amount > 10000) discount += 500;
  return Math.round(discount * 100) / 100;
};
```

### Step 1: Start with a dummy assertion

```typescript
it('characterises calculateDiscount', () => {
  expect(calculateDiscount(1000, 'premium', 3)).toBe('PLACEHOLDER');
});
// Output: expected 'PLACEHOLDER' but received 150
```

### Step 2: Record the actual value, expand

```typescript
describe('calculateDiscount characterisation', () => {
  it('premium customer, < 5 years', () => {
    expect(calculateDiscount(1000, 'premium', 3)).toBe(150);
  });

  it('premium customer, > 5 years gets loyalty bonus', () => {
    expect(calculateDiscount(1000, 'premium', 7)).toBe(200);
    // 150 (15%) + 50 (5% loyalty) = 200
  });

  it('business customer, < 3 years', () => {
    expect(calculateDiscount(1000, 'business', 2)).toBe(100);
  });

  it('business customer, > 3 years gets loyalty bonus', () => {
    expect(calculateDiscount(1000, 'business', 5)).toBe(130);
    // 100 (10%) + 30 (3% loyalty) = 130
  });

  it('unknown customer type gets no discount', () => {
    expect(calculateDiscount(1000, 'standard', 10)).toBe(0);
  });

  it('high-value orders get flat bonus', () => {
    expect(calculateDiscount(15000, 'premium', 3)).toBe(2750);
    // 2250 (15%) + 500 (flat bonus) = 2750
  });
});
```

### Step 3: Check coverage, fill gaps

Run `vitest --coverage` to see if all branches are exercised. Add tests for any uncovered paths (e.g., boundary values at exactly `years === 5`, `amount === 10000`).

```typescript
it('boundary: premium at exactly 5 years (no loyalty bonus)', () => {
  expect(calculateDiscount(1000, 'premium', 5)).toBe(150);
  // > 5, not >= 5 -- 5 years does NOT trigger the bonus
});

it('boundary: amount exactly 10000 (no flat bonus)', () => {
  expect(calculateDiscount(10000, 'premium', 3)).toBe(1500);
  // > 10000, not >= 10000
});
```

These boundary tests reveal the exact conditions (strict `>`, not `>=`). This is characterisation at work -- the code told us its behavior.

## Targeted Testing

After characterising the general behavior, focus on the specific code you're about to change. Ask:

1. **Will my change affect this path?** If yes, ensure a test exercises it.
2. **Does my test actually hit the path I think?** Use coverage reports or add a temporary `console.log` to verify.
3. **Are there type conversions along the path?** Choose inputs that would reveal truncation or coercion bugs after refactoring.

### Watch for Type Conversion Traps

```typescript
// If you extract this to a function that returns `number` instead of keeping the
// intermediate `discount` variable, would rounding still work the same way?
// Choose inputs that produce fractional cents:
it('rounding: fractional results are rounded to 2 decimal places', () => {
  expect(calculateDiscount(333, 'premium', 3)).toBe(49.95);
  // 333 * 0.15 = 49.95 -- this verifies rounding behavior is preserved
});
```

Pick inputs that exercise conversions. If all your test inputs produce round numbers, a type change from `number` to `bigint` or a missing `Math.round` after refactoring would go undetected.

## Sensing Variables

When you can't tell if a code path is being exercised, add temporary instrumentation:

```typescript
// Modern equivalent: use vitest coverage instead of manual sensing
// But when coverage tools can't distinguish paths within a single line:

// Temporary -- add and remove after confirming the path
let hitLoyaltyBonus = false;
// ... insert `hitLoyaltyBonus = true` in the target branch
// ... assert in test, then remove
```

The modern approach: prefer `vitest --coverage` with branch-level reporting. Only use manual sensing when coverage tools can't distinguish the specific path you need.

## Pinch Points

A **pinch point** is a narrowing in the code's effect graph where a test against one method detects changes in many upstream methods. Pinch points are ideal locations for characterisation tests because:

- One test covers many code paths
- They provide maximum safety net per test
- They sit at natural boundaries in the code

Example: a `generateReport()` method that calls `fetchData()`, `applyRules()`, `formatOutput()`, and `validate()`. Testing `generateReport()` characterises all four internal methods at once.

**Pinch point tests are temporary.** As you refactor and understand the code, replace them with focused tests for each component. The pinch point test was the "line drawn in the forest" -- it served its purpose.

## The Method Use Rule

> Before you use a method in a legacy system, check if there are tests for it. If there aren't, write them.

Apply this consistently and you build a growing safety net around the code you actually touch. The tests serve as documentation for the next person (or the next Claude) who encounters the same code.
