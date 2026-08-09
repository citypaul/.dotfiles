# Composition Patterns

Worked examples for composing small functions, refactoring monolithic logic, and flattening deeply nested code. The rules live in `../SKILL.md`; load this file when applying them.

---

## Composition Over Complex Logic

Compose small functions into larger ones. Each function does one thing well.

### Benefits of Composition

- Easier to understand (each piece is simple)
- Easier to test (test pieces independently)
- Easier to reuse (pieces work in multiple contexts)
- Easier to maintain (change one piece without affecting others)

### Examples

❌ **WRONG - Complex monolithic function**
```typescript
function registerScenario(input: unknown) {
  if (typeof input !== 'object' || !input) {
    throw new Error('Invalid input');
  }
  if (!('id' in input) || typeof input.id !== 'string') {
    throw new Error('Missing id');
  }
  if (!('name' in input) || typeof input.name !== 'string') {
    throw new Error('Missing name');
  }
  if (!('mocks' in input) || !Array.isArray(input.mocks)) {
    throw new Error('Missing mocks');
  }
  // ... 50 more lines of validation and registration
}
```

✅ **CORRECT - Composed functions**
```typescript
// Small, focused functions
const validate = (input: unknown) => ScenarioSchema.parse(input);
const register = (scenario: Scenario) => registry.register(scenario);

// Compose them
const registerScenario = (input: unknown) => register(validate(input));

// Even better - use a pipe utility (value-first, as below)
const registerScenario = (input: unknown) =>
  pipe(input, validate, register);
```

---

## Composing Immutable Transformations

```typescript
type Currency = 'GBP' | 'USD' | 'EUR';
type Money = { readonly minorUnits: number; readonly currency: Currency };

const createMoney = (minorUnits: number, currency: Currency): Money => {
  if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) throw new Error('Invalid money');
  return { minorUnits, currency };
};

const addMoney = (left: Money, right: Money): Money => {
  if (left.currency !== right.currency) throw new Error('Currency mismatch');
  if (!Number.isSafeInteger(left.minorUnits) || !Number.isSafeInteger(right.minorUnits)) {
    throw new Error('Invalid money');
  }
  const minorUnits = left.minorUnits + right.minorUnits;
  if (!Number.isSafeInteger(minorUnits)) throw new Error('Money addition overflowed');
  return createMoney(minorUnits, left.currency);
};

const percentageHalfUp = (money: Money, basisPoints: number): Money => {
  if (!Number.isSafeInteger(money.minorUnits)) throw new Error('Invalid money');
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) throw new Error('Invalid rate');
  const rounded = Number(
    (BigInt(money.minorUnits) * BigInt(basisPoints) + 5_000n) / 10_000n,
  );
  return createMoney(rounded, money.currency);
};

const addDiscount = (order: Order, basisPoints: number): Order => ({
  ...order,
  total: createMoney(
    order.total.minorUnits - percentageHalfUp(order.total, basisPoints).minorUnits,
    order.total.currency,
  ),
});

const addShipping = (order: Order, cost: Money): Order => ({
  ...order,
  total: addMoney(order.total, cost),
});

const addTax = (order: Order, basisPoints: number): Order => ({
  ...order,
  total: addMoney(order.total, percentageHalfUp(order.total, basisPoints)),
});

// Compose them
const finalizeOrder = (order: Order): Order => {
  return addTax(
    addShipping(
      addDiscount(order, 1_000),
      createMoney(599, order.total.currency),
    ),
    2_000,
  );
};

// Or use pipe for left-to-right reading
const finalizeOrder = (order: Order): Order =>
  pipe(
    order,
    o => addDiscount(o, 1_000),
    o => addShipping(o, createMoney(599, o.total.currency)),
    o => addTax(o, 2_000),
  );
```

Amounts stay in integer minor units; rates use integer basis points and `percentageHalfUp` makes the rounding rule explicit. The `Money` currency check prevents composing values from different currencies.

---

## Flattening Deep Nesting

Deep nesting is a readability signal, not a fixed numeric failure. When nesting hides the main path or makes branches hard to reason about, extract functions or use early returns.

### Why Limit Nesting?

- Deeply nested code is hard to read
- Hard to test (many paths through code)
- Hard to modify (tight coupling)
- Sign of missing abstractions

### Examples

❌ **WRONG - Deep nesting (4+ levels)**
```typescript
function processOrder(order: Order) {
  if (order.items.length > 0) {
    if (order.customer.verified) {
      if (order.total > 0) {
        if (order.payment.valid) {
          // ... deeply nested logic
        }
      }
    }
  }
}
```

✅ **CORRECT - Flat with early returns**
```typescript
function processOrder(order: Order) {
  if (order.items.length === 0) return;
  if (!order.customer.verified) return;
  if (order.total <= 0) return;
  if (!order.payment.valid) return;

  // Main logic at top level
}
```

✅ **CORRECT - Extract to functions**
```typescript
function processOrder(order: Order) {
  if (!canProcessOrder(order)) return;
  const validated = validateOrder(order);
  return executeOrder(validated);
}

function canProcessOrder(order: Order): boolean {
  return order.items.length > 0
    && order.customer.verified
    && order.total > 0
    && order.payment.valid;
}
```
