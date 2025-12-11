---
name: testing
description: Testing patterns for behavior-driven tests. Use when writing tests or test factories.
---

# Testing Patterns

## Core Principle

**Test behavior, not implementation.** 100% coverage through business behavior, not implementation details.

**Example:** Validation code in `payment-validator.ts` gets 100% coverage by testing `processPayment()` behavior, NOT by directly testing validator functions.

---

## Test Through Public API Only

Never test implementation details. Test behavior through public APIs.

**Why this matters:**
- Tests remain valid when refactoring
- Tests document intended behavior
- Tests catch real bugs, not implementation changes

### Examples

❌ **WRONG - Testing implementation:**
```typescript
// ❌ Testing HOW (implementation detail)
it('should call validateAmount', () => {
  const spy = jest.spyOn(validator, 'validateAmount');
  processPayment(payment);
  expect(spy).toHaveBeenCalled(); // Tests HOW, not WHAT
});

// ❌ Testing private methods
it('should validate CVV format', () => {
  const result = validator._validateCVV('123'); // Private method!
  expect(result).toBe(true);
});

// ❌ Testing internal state
it('should set isValidated flag', () => {
  processPayment(payment);
  expect(processor.isValidated).toBe(true); // Internal state
});
```

✅ **CORRECT - Testing behavior through public API:**
```typescript
it('should reject negative amounts', () => {
  const payment = getMockPayment({ amount: -100 });
  const result = processPayment(payment);
  expect(result.success).toBe(false);
  expect(result.error).toContain('Amount must be positive');
});

it('should reject invalid CVV', () => {
  const payment = getMockPayment({ cvv: '12' }); // Only 2 digits
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
```

---

## Coverage Through Behavior

Validation code gets 100% coverage by testing the behavior it protects:

```typescript
// Tests covering validation WITHOUT testing validator directly
describe('processPayment', () => {
  it('should reject negative amounts', () => {
    const payment = getMockPayment({ amount: -100 });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
  });

  it('should reject amounts over 10000', () => {
    const payment = getMockPayment({ amount: 15000 });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
  });

  it('should reject invalid CVV', () => {
    const payment = getMockPayment({ cvv: '12' });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
  });

  it('should process valid payments', () => {
    const payment = getMockPayment({ amount: 100, cvv: '123' });
    const result = processPayment(payment);
    expect(result.success).toBe(true);
  });
});

// ✅ Result: payment-validator.ts has 100% coverage through behavior
```

**Key insight:** When coverage drops, ask **"What business behavior am I not testing?"** not "What line am I missing?"

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
const getMockUser = (overrides?: Partial<User>): User => {
  return UserSchema.parse({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  });
};

// Usage
it('creates user with custom email', () => {
  const user = getMockUser({ email: 'custom@example.com' });
  const result = createUser(user);
  expect(result.success).toBe(true);
});
```

### Complete Factory Example

```typescript
import { UserSchema } from '@/schemas'; // Import real schema

const getMockUser = (overrides?: Partial<User>): User => {
  return UserSchema.parse({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    isActive: true,
    createdAt: new Date('2024-01-01'),
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

### Anti-Patterns

❌ **WRONG: Using `let` and `beforeEach`**
```typescript
let user: User;
beforeEach(() => {
  user = { id: 'user-123', name: 'Test User', ... };  // Shared mutable state!
});

it('test 1', () => {
  user.name = 'Modified User';  // Mutates shared state
});

it('test 2', () => {
  expect(user.name).toBe('Test User');  // Fails! Modified by test 1
});
```

✅ **CORRECT: Factory per test**
```typescript
it('test 1', () => {
  const user = getMockUser({ name: 'Modified User' });  // Fresh state
  // ...
});

it('test 2', () => {
  const user = getMockUser();  // Fresh state, not affected by test 1
  expect(user.name).toBe('Test User');  // ✅ Passes
});
```

❌ **WRONG: Incomplete objects**
```typescript
const getMockUser = () => ({
  id: 'user-123',  // Missing name, email, role!
});
```

✅ **CORRECT: Complete objects**
```typescript
const getMockUser = (overrides?: Partial<User>): User => {
  return UserSchema.parse({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides,  // All required fields present
  });
};
```

❌ **WRONG: Redefining schemas in tests**
```typescript
// ❌ Schema already defined in src/schemas/user.ts!
const UserSchema = z.object({ ... });
const getMockUser = () => UserSchema.parse({ ... });
```

✅ **CORRECT: Import real schema**
```typescript
import { UserSchema } from '@/schemas/user';

const getMockUser = (overrides?: Partial<User>): User => {
  return UserSchema.parse({
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    ...overrides,
  });
};
```

---

## Coverage Theater Detection

Watch for these patterns that give fake 100% coverage:

### Pattern 1: Mock the function being tested

❌ **WRONG** - Gives 100% coverage but tests nothing:
```typescript
it('calls validator', () => {
  const spy = jest.spyOn(validator, 'validate');
  validate(payment);
  expect(spy).toHaveBeenCalled(); // Meaningless assertion
});
```

✅ **CORRECT** - Test actual behavior:
```typescript
it('should reject invalid payment', () => {
  const payment = getMockPayment({ amount: -100 });
  const result = validate(payment);
  expect(result.success).toBe(false);
  expect(result.error).toContain('Amount must be positive');
});
```

### Pattern 2: Test only that function was called

❌ **WRONG** - No behavior validation:
```typescript
it('processes payment', () => {
  const spy = jest.spyOn(processor, 'process');
  handlePayment(payment);
  expect(spy).toHaveBeenCalledWith(payment); // So what?
});
```

✅ **CORRECT** - Verify the outcome:
```typescript
it('should process payment and return transaction ID', () => {
  const payment = getMockPayment();
  const result = handlePayment(payment);
  expect(result.success).toBe(true);
  expect(result.transactionId).toBeDefined();
});
```

### Pattern 3: Test trivial getters/setters

❌ **WRONG** - Testing implementation, not behavior:
```typescript
it('sets amount', () => {
  payment.setAmount(100);
  expect(payment.getAmount()).toBe(100); // Trivial
});
```

✅ **CORRECT** - Test meaningful behavior:
```typescript
it('should calculate total with tax', () => {
  const order = createOrder({ items: [item1, item2] });
  const total = order.calculateTotal();
  expect(total).toBe(230); // 200 + 15% tax
});
```

### Pattern 4: 100% line coverage, 0% branch coverage

❌ **WRONG** - Missing edge cases:
```typescript
it('validates payment', () => {
  const result = validate(getMockPayment());
  expect(result.success).toBe(true); // Only happy path!
});
// Missing: negative amounts, invalid CVV, missing fields, etc.
```

✅ **CORRECT** - Test all branches:
```typescript
describe('validate payment', () => {
  it('should reject negative amounts', () => {
    const payment = getMockPayment({ amount: -100 });
    expect(validate(payment).success).toBe(false);
  });

  it('should reject amounts over limit', () => {
    const payment = getMockPayment({ amount: 15000 });
    expect(validate(payment).success).toBe(false);
  });

  it('should reject invalid CVV', () => {
    const payment = getMockPayment({ cvv: '12' });
    expect(validate(payment).success).toBe(false);
  });

  it('should accept valid payments', () => {
    const payment = getMockPayment();
    expect(validate(payment).success).toBe(true);
  });
});
```

---

## No 1:1 Mapping Between Tests and Implementation

Don't create test files that mirror implementation files.

❌ **WRONG:**
```
src/
  payment-validator.ts
  payment-processor.ts
  payment-formatter.ts
tests/
  payment-validator.test.ts  ← 1:1 mapping
  payment-processor.test.ts  ← 1:1 mapping
  payment-formatter.test.ts  ← 1:1 mapping
```

✅ **CORRECT:**
```
src/
  payment-validator.ts
  payment-processor.ts
  payment-formatter.ts
tests/
  process-payment.test.ts  ← Tests behavior, not implementation files
```

**Why:** Implementation details can be refactored without changing tests. Tests verify behavior remains correct regardless of how code is organized internally.

---

## Summary Checklist

When writing tests, verify:

- [ ] Testing behavior through public API (not implementation details)
- [ ] No mocks of the function being tested
- [ ] No tests of private methods or internal state
- [ ] Factory functions return complete, valid objects
- [ ] Factories validate with real schemas (not redefined in tests)
- [ ] Using Partial<T> for type-safe overrides
- [ ] No `let`/`beforeEach` - use factories for fresh state
- [ ] Edge cases covered (not just happy path)
- [ ] Tests would pass even if implementation is refactored
- [ ] No 1:1 mapping between test files and implementation files
