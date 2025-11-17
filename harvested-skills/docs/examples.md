# Example Patterns

## Error Handling

Use Result types or early returns:

```typescript
// Good - Result type pattern
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

const processPayment = (
  payment: Payment
): Result<ProcessedPayment, PaymentError> => {
  if (!isValidPayment(payment)) {
    return { success: false, error: new PaymentError("Invalid payment") };
  }

  if (!hasSufficientFunds(payment)) {
    return { success: false, error: new PaymentError("Insufficient funds") };
  }

  return { success: true, data: executePayment(payment) };
};

// Also good - early returns with exceptions
const processPayment = (payment: Payment): ProcessedPayment => {
  if (!isValidPayment(payment)) {
    throw new PaymentError("Invalid payment");
  }

  if (!hasSufficientFunds(payment)) {
    throw new PaymentError("Insufficient funds");
  }

  return executePayment(payment);
};
```

## Testing Behavior

```typescript
// Good - tests behavior through public API
describe("PaymentProcessor", () => {
  it("should decline payment when insufficient funds", () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 1000 });
    const account = getMockAccount({ Balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Insufficient funds");
  });

  it("should process valid payment successfully", () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 100 });
    const account = getMockAccount({ Balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(true);
    expect(result.data.remainingBalance).toBe(400);
  });
});

// Avoid - testing implementation details
describe("PaymentProcessor", () => {
  it("should call checkBalance method", () => {
    // This tests implementation, not behavior
  });
});
```

# Common Patterns to Avoid

## Anti-patterns

```typescript
// Avoid: Mutation
const addItem = (items: Item[], newItem: Item) => {
  items.push(newItem); // Mutates array
  return items;
};

// Prefer: Immutable update
const addItem = (items: Item[], newItem: Item): Item[] => {
  return [...items, newItem];
};

// Avoid: Nested conditionals
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// Prefer: Early returns
if (!user || !user.isActive || !user.hasPermission) {
  return;
}
// do something

// Avoid: Large functions
const processOrder = (order: Order) => {
  // 100+ lines of code
};

// Prefer: Composed small functions
const processOrder = (order: Order) => {
  const validatedOrder = validateOrder(order);
  const pricedOrder = calculatePricing(validatedOrder);
  const finalOrder = applyDiscounts(pricedOrder);
  return submitOrder(finalOrder);
};
```
