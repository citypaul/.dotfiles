# Writing Characterisation Tests: Process and Examples

Detailed walkthrough of the characterisation testing process. See the main `characterisation-tests` skill for the algorithm and heuristics.

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
  });

  it('business customer, < 3 years', () => {
    expect(calculateDiscount(1000, 'business', 2)).toBe(100);
  });

  it('business customer, > 3 years gets loyalty bonus', () => {
    expect(calculateDiscount(1000, 'business', 5)).toBe(130);
  });

  it('unknown customer type gets no discount', () => {
    expect(calculateDiscount(1000, 'standard', 10)).toBe(0);
  });

  it('high-value orders get flat bonus', () => {
    expect(calculateDiscount(15000, 'premium', 3)).toBe(2750);
  });
});
```

### Step 3: Check coverage, fill gaps

Run `vitest --coverage` to see if all branches are exercised. Add tests for any uncovered paths:

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

### Step 4: Validate with mutation testing

Run the `mutation-testing` skill against `calculateDiscount`. If mutants survive in paths you plan to change, add more targeted tests. For example, if changing `* 0.15` to `* 0.16` doesn't fail a test, your inputs need more variety.

```typescript
// Rounding: fractional results exercise the Math.round path
it('rounding: fractional results are rounded to 2 decimal places', () => {
  expect(calculateDiscount(333, 'premium', 3)).toBe(49.95);
});
```

## When to Stop Characterising

1. **Cover every branch your change touches.** If you're modifying the premium loyalty bonus, ensure tests exercise both sides of `years > 5`.
2. **Cover one layer out.** If your change is inside `calculateDiscount`, also characterise its callers -- they may depend on specific return shapes.
3. **Run mutation testing.** If no mutants survive in the code you're about to modify, your safety net is adequate.
4. **Stop when confident.** If you're certain your tests would catch any mistake you could make in the upcoming change, that's enough.

## Targeted Testing

After characterising the general behavior, focus on the specific code you're about to change:

1. **Will my change affect this path?** If yes, ensure a test exercises it.
2. **Does my test actually hit the path I think?** Use coverage reports to verify.
3. **Are there type conversions along the path?** Choose inputs that would reveal truncation or coercion bugs after refactoring.

### Watch for Type Conversion Traps

```typescript
// If you extract this to a function that changes the return type,
// would rounding still work? Choose inputs that produce fractional values:
it('exercises the rounding path', () => {
  expect(calculateDiscount(333, 'premium', 3)).toBe(49.95);
  // 333 * 0.15 = 49.95 -- if Math.round were removed, this would change
});
```

Pick inputs that exercise conversions. If all your test inputs produce round numbers, a missing `Math.round` after refactoring would go undetected.

## Sensing Without Monkey-Patching

When you need to verify a code path is exercised but can't tell from the return value alone, prefer **parameter injection** over monkey-patching:

```typescript
// ❌ Monkey-patching -- brittle, implementation-coupled
const original = module.processItem;
module.processItem = (...args) => { calls.push(args); return original(...args); };

// ✅ Parameter injection -- explicit, type-safe
type ItemProcessor = (item: Item) => ProcessedItem;

const processOrder = (
  order: Order,
  processItem: ItemProcessor = defaultProcessItem,
): ProcessedOrder => ({
  ...order,
  items: order.items.map(processItem),
});

// Sensing: capture calls via a wrapper function
const calls: Item[] = [];
const sensingProcessor: ItemProcessor = (item) => {
  calls.push(item);
  return defaultProcessItem(item);
};
processOrder(testOrder, sensingProcessor);
expect(calls).toHaveLength(3);
```

When parameter injection isn't possible yet (you haven't introduced the seam), use `vitest --coverage` with branch-level reporting instead of manual sensing. See the `finding-seams` skill for how to introduce the seam.

## Pinch Points

A **pinch point** is a narrowing in the code's call graph where a test against one function detects changes in many upstream functions. Ideal for initial characterisation:

```typescript
// generateReport calls fetchData, applyRules, formatOutput, validate
// Testing generateReport characterises all four at once
it('characterises full report generation', () => {
  expect(generateReport(testInput)).toMatchInlineSnapshot(`...`);
});
```

**Pinch point tests are temporary.** As you refactor and understand the code, replace them with focused tests for each component. The pinch point test was the safety net that let you start.

## The Method Use Rule

> Before you use a function in a legacy system, check if there are tests for it. If there aren't, write them.

Apply this consistently and you build a growing safety net around the code you actually touch. Each characterisation test is documentation for the next person who encounters the same code.
