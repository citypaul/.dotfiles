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
// Small transformation functions
const addDiscount = (order: Order, percent: number): Order => ({
  ...order,
  total: order.total * (1 - percent / 100),
});

const addShipping = (order: Order, cost: number): Order => ({
  ...order,
  total: order.total + cost,
});

const addTax = (order: Order, rate: number): Order => ({
  ...order,
  total: order.total * (1 + rate),
});

// Compose them
const finalizeOrder = (order: Order): Order => {
  return addTax(
    addShipping(
      addDiscount(order, 10),
      5.99
    ),
    0.2
  );
};

// Or use pipe for left-to-right reading
const finalizeOrder = (order: Order): Order =>
  pipe(
    order,
    o => addDiscount(o, 10),
    o => addShipping(o, 5.99),
    o => addTax(o, 0.2),
  );
```

---

## Flattening Deep Nesting

**Max 2 levels of function nesting** (the rule is in `../SKILL.md`). Beyond that, extract functions or use early returns.

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
