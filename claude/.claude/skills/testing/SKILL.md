---
name: testing
description: Testing patterns for behavior-driven tests. Use when writing tests or test factories.
---

# Testing Patterns

## Core Principle

Test behavior, not implementation. 100% coverage through business behavior.

## Test Factory Pattern

```typescript
const getMockPayment = (overrides?: Partial<Payment>): Payment => {
  return PaymentSchema.parse({
    amount: 100,
    currency: "GBP",
    cardId: "card_123",
    ...overrides,
  });
};

// Compose for nested objects
const getMockOrder = (overrides?: Partial<Order>): Order => {
  return OrderSchema.parse({
    items: [getMockItem()],
    customer: getMockCustomer(),
    ...overrides,
  });
};
```

## Key Principles

- Return complete objects with sensible defaults
- Accept `Partial<T>` overrides
- Validate with real schemas (not redefined in tests)
- NO `let`/`beforeEach` - use factories

## Test Through Public API

```typescript
// ❌ WRONG - Testing implementation
it("should call validateAmount", () => {
  const spy = jest.spyOn(validator, 'validateAmount');
  processPayment(payment);
  expect(spy).toHaveBeenCalled();
});

// ✅ CORRECT - Testing behavior
it("should reject negative amounts", () => {
  const payment = getMockPayment({ amount: -100 });
  const result = processPayment(payment);
  expect(result.success).toBe(false);
});
```

## Coverage Through Behavior

Validation code gets 100% coverage by testing the behavior it protects:

```typescript
// Tests covering validation without testing validator directly
it("should reject negative amounts", () => { /* ... */ });
it("should reject amounts over 10000", () => { /* ... */ });
it("should reject invalid CVV", () => { /* ... */ });
it("should process valid payments", () => { /* ... */ });
```
