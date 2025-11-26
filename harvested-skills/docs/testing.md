# Testing Principles

## Behavior-Driven Testing

- **No "unit tests"** - this term is not helpful. Tests should verify expected behavior, treating implementation as a black box
- Test through the public API exclusively - internals should be invisible to tests
- No 1:1 mapping between test files and implementation files
- Tests that examine internal implementation details are wasteful and should be avoided
- **Coverage targets**: 100% coverage should be expected at all times, but these tests must ALWAYS be based on business behaviour, not implementation details
- Tests must document expected business behaviour

## Testing Tools

- **Jest** or **Vitest** for testing frameworks
- **React Testing Library** for React components
- **MSW (Mock Service Worker)** for API mocking when needed
- All test code must follow the same TypeScript strict mode rules as production code

## Test Organization

```
src/
  features/
    payment/
      payment-processor.ts
      payment-validator.ts
      payment-processor.test.ts // The validator is an implementation detail. Validation is fully covered, but by testing the expected business behaviour, treating the validation code itself as an implementation detail
```

## Test Data Pattern

Use factory functions with optional overrides for test data:

```typescript
const getMockPaymentPostPaymentRequest = (
  overrides?: Partial<PostPaymentsRequestV3>
): PostPaymentsRequestV3 => {
  return {
    CardAccountId: "1234567890123456",
    Amount: 100,
    Source: "Web",
    AccountStatus: "Normal",
    LastName: "Doe",
    DateOfBirth: "1980-01-01",
    PayingCardDetails: {
      Cvv: "123",
      Token: "token",
    },
    AddressDetails: getMockAddressDetails(),
    Brand: "Visa",
    ...overrides,
  };
};

const getMockAddressDetails = (
  overrides?: Partial<AddressDetails>
): AddressDetails => {
  return {
    HouseNumber: "123",
    HouseName: "Test House",
    AddressLine1: "Test Address Line 1",
    AddressLine2: "Test Address Line 2",
    City: "Test City",
    ...overrides,
  };
};
```

Key principles:

- Always return complete objects with sensible defaults
- Accept optional `Partial<T>` overrides
- Build incrementally - extract nested object factories as needed
- Compose factories for complex objects
- Consider using a test data builder pattern for very complex objects

## Validating Test Data

When schemas exist, validate factory output to catch test data issues early:

```typescript
import { PaymentSchema, type Payment } from '../schemas/payment.schema';

const getMockPayment = (overrides?: Partial<Payment>): Payment => {
  const basePayment = {
    amount: 100,
    currency: "GBP",
    cardId: "card_123",
    customerId: "cust_456",
  };

  const paymentData = { ...basePayment, ...overrides };

  // Validate against real schema to catch type mismatches
  return PaymentSchema.parse(paymentData);
};

// This catches errors in test setup:
const payment = getMockPayment({
  amount: -100  // ❌ Schema validation fails: amount must be positive
});
```

**Why validate test data:**
- Ensures test factories produce valid data that matches production schemas
- Catches test data bugs immediately rather than in test assertions
- Documents constraints (e.g., "amount must be positive") in schema, not in every test
- Prevents tests from passing with invalid data that would fail in production

## Anti-Patterns in Tests

**Avoid these test smells:**

```typescript
// ❌ BAD - Implementation-focused test
it("should call validateAmount", () => {
  const spy = jest.spyOn(validator, 'validateAmount');
  processPayment(payment);
  expect(spy).toHaveBeenCalled();
});

// ✅ GOOD - Behavior-focused test
it("should reject payments with negative amounts", () => {
  const payment = getMockPayment({ amount: -100 });
  const result = processPayment(payment);
  expect(result.success).toBe(false);
  expect(result.error.message).toBe("Invalid amount");
});

// ❌ BAD - Using let and beforeEach (shared mutable state)
let payment: Payment;
beforeEach(() => {
  payment = { amount: 100 };
});
it("should process payment", () => {
  processPayment(payment);
});

// ✅ GOOD - Factory functions (isolated, immutable)
it("should process payment", () => {
  const payment = getMockPayment({ amount: 100 });
  processPayment(payment);
});
```

## Achieving 100% Coverage Through Business Behavior

Example showing how validation code gets 100% coverage without testing it directly:

```typescript
// payment-validator.ts (implementation detail)
export const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000;
};

export const validateCardDetails = (card: PayingCardDetails): boolean => {
  return /^\d{3,4}$/.test(card.cvv) && card.token.length > 0;
};

// payment-processor.ts (public API)
export const processPayment = (
  request: PaymentRequest
): Result<Payment, PaymentError> => {
  // Validation is used internally but not exposed
  if (!validatePaymentAmount(request.amount)) {
    return { success: false, error: new PaymentError("Invalid amount") };
  }

  if (!validateCardDetails(request.payingCardDetails)) {
    return { success: false, error: new PaymentError("Invalid card details") };
  }

  // Process payment...
  return { success: true, data: executedPayment };
};

// payment-processor.test.ts
describe("Payment processing", () => {
  // These tests achieve 100% coverage of validation code
  // without directly testing the validator functions

  it("should reject payments with negative amounts", () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: -100 });
    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid amount");
  });

  it("should reject payments exceeding maximum amount", () => {
    const payment = getMockPaymentPostPaymentRequest({ amount: 10001 });
    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid amount");
  });

  it("should reject payments with invalid CVV format", () => {
    const payment = getMockPaymentPostPaymentRequest({
      payingCardDetails: { cvv: "12", token: "valid-token" },
    });
    const result = processPayment(payment);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Invalid card details");
  });

  it("should process valid payments successfully", () => {
    const payment = getMockPaymentPostPaymentRequest({
      amount: 100,
      payingCardDetails: { cvv: "123", token: "valid-token" },
    });
    const result = processPayment(payment);

    expect(result.success).toBe(true);
    expect(result.data.status).toBe("completed");
  });
});
```

## React Component Testing

```typescript
// Good - testing user-visible behavior
describe("PaymentForm", () => {
  it("should show error when submitting invalid amount", async () => {
    render(<PaymentForm />);

    const amountInput = screen.getByLabelText("Amount");
    const submitButton = screen.getByRole("button", { name: "Submit Payment" });

    await userEvent.type(amountInput, "-100");
    await userEvent.click(submitButton);

    expect(screen.getByText("Amount must be positive")).toBeInTheDocument();
  });
});
```
