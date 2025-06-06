# Development Guidelines for Claude

## Core Philosophy

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state throughout development.

## Testing Principles

### Behavior-Driven Testing

- **No "unit tests"** - this term is not helpful. Tests should verify expected behavior, treating implementation as a black box
- Test through the public API exclusively - internals should be invisible to tests
- No 1:1 mapping between test files and implementation files
- Tests that examine internal implementation details are wasteful and should be avoided

### Testing Tools

- **Jest** or **Vitest** for testing frameworks
- **React Testing Library** for React components
- All test code must follow the same TypeScript strict mode rules as production code

### Test Data Pattern

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

## TypeScript Guidelines

### Strict Mode Requirements

- **Full strict mode** enabled
- **No `any`** - ever
- **No type assertions** (`as SomeType`) unless absolutely necessary with clear justification
- These rules apply to test code as well as production code

### Type Definitions

- **Prefer `type` over `interface`** in all cases
- Use explicit typing where it aids clarity, but leverage inference where appropriate
- Utilize utility types effectively

## Code Style

### Functional Programming

I follow a "functional light" approach:

- **No data mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **Composition** as the primary mechanism for code reuse
- Avoid heavy FP abstractions (no need for complex monads or pipe/compose patterns)

### Code Structure

- **No nested if/else statements** - use early returns, guard clauses, or composition
- **Avoid deep nesting** in general
- Keep functions small and focused on a single responsibility
- Prefer flat, readable code over clever abstractions

## Development Workflow

### TDD Process

Follow Red-Green-Refactor strictly:

1. **Red**: Write a failing test for the desired behavior
2. **Green**: Write the minimum code to make the test pass
3. **Refactor**: Clean up the code while keeping tests green

### Continuous Integration/Delivery

- Every PR must have all tests passing
- All linting and quality checks must pass
- Work in small increments that maintain a working state
- Each commit should represent a coherent, working change

## Working with Claude

### Expectations

When working with my code:

1. **Think deeply** before making any edits
2. **Understand the full context** of the code and requirements
3. **Ask clarifying questions** when requirements are ambiguous
4. **Think from first principles** - don't make assumptions

### Code Changes

When suggesting or making changes:

- Respect the existing patterns and conventions
- Maintain test coverage for all behavior changes
- Follow TDD - write or modify tests first
- Keep changes small and incremental
- Ensure all TypeScript strict mode requirements are met

### Communication

- Be explicit about trade-offs in different approaches
- Explain the reasoning behind significant design decisions
- Flag any deviations from these guidelines with justification
- Suggest improvements that align with these principles

## Example Patterns

### Error Handling

Instead of nested try-catch or if-else chains, prefer:

```typescript
// Good
const processPayment = (payment: Payment): ProcessResult => {
  if (!isValidPayment(payment)) {
    return { success: false, error: "Invalid payment" };
  }

  if (!hassufficientFunds(payment)) {
    return { success: false, error: "Insufficient funds" };
  }

  return { success: true, data: executePayment(payment) };
};

// Avoid
const processPayment = (payment: Payment): ProcessResult => {
  try {
    if (isValidPayment(payment)) {
      if (hasSufficientFunds(payment)) {
        return { success: true, data: executePayment(payment) };
      } else {
        return { success: false, error: "Insufficient funds" };
      }
    } else {
      return { success: false, error: "Invalid payment" };
    }
  } catch (error) {
    return { success: false, error: "Unknown error" };
  }
};
```

### Testing Behavior

```typescript
// Good - tests behavior through public API
describe("PaymentProcessor", () => {
  it("should decline payment when insufficient funds", () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 1000 });
    const account = getMockAccount({ Balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Insufficient funds");
  });
});

// Avoid - testing implementation details
describe("PaymentProcessor", () => {
  it("should call checkBalance method", () => {
    // This tests implementation, not behavior
  });
});
```

## Summary

The key is to write clean, testable, functional code that evolves through small, safe increments. Every change should be driven by a test that describes the desired behavior, and the implementation should be the simplest thing that makes that test pass.
