---
name: functional
description: Functional programming patterns with immutable data. Use when writing logic or data transformations.
---

# Functional Patterns

## Core Principles

- **No data mutation** - immutable structures only
- **Pure functions** wherever possible
- **Composition** over inheritance
- **No comments** - code should be self-documenting
- **Array methods** over loops
- **Options objects** over positional parameters

---

## Why Immutability Matters

Immutable data is the foundation of functional programming. Understanding WHY helps you embrace it:

- **Predictable**: Same input always produces same output (no hidden state changes)
- **Debuggable**: State doesn't change unexpectedly - easier to trace bugs
- **Testable**: No hidden mutable state makes tests straightforward
- **React-friendly**: React's reconciliation and memoization optimizations work correctly
- **Concurrency-safe**: No race conditions when data can't change

**Example of the problem:**
```typescript
// ❌ WRONG - Mutation creates unpredictable behavior
const user = { name: 'Alice', permissions: ['read'] };
grantPermission(user, 'write'); // Mutates user.permissions internally
console.log(user.permissions); // ['read', 'write'] - SURPRISE! user changed
```

```typescript
// ✅ CORRECT - Immutable approach is predictable
const user = { name: 'Alice', permissions: ['read'] };
const updatedUser = grantPermission(user, 'write'); // Returns new object
console.log(user.permissions); // ['read'] - original unchanged
console.log(updatedUser.permissions); // ['read', 'write'] - new version
```

---

## Functional Light

We follow "Functional Light" principles - practical functional patterns without heavy abstractions:

**What we DO:**
- Pure functions and immutable data
- Composition and declarative code
- Array methods over loops
- Type safety and readonly

**What we DON'T do:**
- Category theory or monads
- Heavy FP libraries (fp-ts, Ramda)
- Over-engineering with abstractions
- Functional for the sake of functional

**Why:** The goal is **maintainable, testable code** - not academic purity. If a functional pattern makes code harder to understand, don't use it.

**Example - Keep it simple:**
```typescript
// ✅ GOOD - Simple, clear, functional
const activeUsers = users.filter(u => u.active);
const userNames = activeUsers.map(u => u.name);

// ❌ OVER-ENGINEERED - Unnecessary abstraction
const compose = <T>(...fns: Array<(arg: T) => T>) => (x: T) =>
  fns.reduceRight((v, f) => f(v), x);
const activeUsers = compose(
  filter((u: User) => u.active),
  map((u: User) => u.name)
)(users);
```

---

## No Comments / Self-Documenting Code

Code should be clear through naming and structure. Comments indicate unclear code.

**Exception**: JSDoc for public APIs when generating documentation.

### Examples

❌ **WRONG - Comments explaining unclear code**
```typescript
// Get the user and check if active and has permission
function check(u: any) {
  // Check user exists
  if (u) {
    // Check if active
    if (u.a) {
      // Check permission
      if (u.p) {
        return true;
      }
    }
  }
  return false;
}
```

✅ **CORRECT - Self-documenting code**
```typescript
function canUserAccessResource(user: User | undefined): boolean {
  if (!user) return false;
  if (!user.isActive) return false;
  if (!user.hasPermission) return false;
  return true;
}

// Even better - compose predicates
function canUserAccessResource(user: User | undefined): boolean {
  return user?.isActive && user?.hasPermission;
}
```

### When Code Needs Explaining

If code requires comments to understand, refactor instead:

- Extract functions with descriptive names
- Use meaningful variable names
- Break complex logic into steps
- Use type aliases for domain concepts

✅ **Acceptable JSDoc for public APIs**
```typescript
/**
 * Registers a scenario for runtime switching.
 * @param definition - The scenario configuration including mocks and metadata
 * @throws {ValidationError} if scenario ID is duplicate
 */
export function registerScenario(definition: ScenaristScenario): void {
  // Implementation
}
```

---

## Array Methods Over Loops

Prefer `map`, `filter`, `reduce` for transformations. They're declarative (what, not how) and naturally immutable.

### Map - Transform Each Element

❌ **WRONG - Imperative loop**
```typescript
const scenarioIds = [];
for (const scenario of scenarios) {
  scenarioIds.push(scenario.id);
}
```

✅ **CORRECT - Functional map**
```typescript
const scenarioIds = scenarios.map(s => s.id);
```

### Filter - Select Subset

❌ **WRONG - Imperative loop**
```typescript
const activeScenarios = [];
for (const scenario of scenarios) {
  if (scenario.active) {
    activeScenarios.push(scenario);
  }
}
```

✅ **CORRECT - Functional filter**
```typescript
const activeScenarios = scenarios.filter(s => s.active);
```

### Reduce - Aggregate Values

❌ **WRONG - Imperative loop**
```typescript
let total = 0;
for (const item of items) {
  total += item.price * item.quantity;
}
```

✅ **CORRECT - Functional reduce**
```typescript
const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
```

### Chaining Multiple Operations

✅ **CORRECT - Compose array methods**
```typescript
const total = items
  .filter(item => item.active)
  .map(item => item.price * item.quantity)
  .reduce((sum, price) => sum + price, 0);
```

### When Loops Are Acceptable

Imperative loops are fine when:
- Early termination is essential (use `for...of` with `break`)
- Performance critical (measure first!)
- Side effects are necessary (logging, DOM manipulation)

But even then, consider:
- `Array.find()` for early termination
- `Array.some()` / `Array.every()` for boolean checks

---

## Options Objects Over Positional Parameters

Default to options objects for function parameters. This improves readability and reduces ordering dependencies.

### Why Options Objects?

**Benefits:**
- Named parameters (clear what each argument means)
- No ordering dependencies
- Easy to add optional parameters
- Self-documenting at call site
- TypeScript autocomplete

### Examples

❌ **WRONG - Positional parameters**
```typescript
function createPayment(
  amount: number,
  currency: string,
  cardId: string,
  cvv: string,
  saveCard: boolean,
  sendReceipt: boolean
): Payment {
  // ...
}

// Call site - unclear what parameters mean
createPayment(100, 'GBP', 'card_123', '123', true, false);
```

✅ **CORRECT - Options object**
```typescript
type CreatePaymentOptions = {
  amount: number;
  currency: string;
  cardId: string;
  cvv: string;
  saveCard?: boolean;
  sendReceipt?: boolean;
};

function createPayment(options: CreatePaymentOptions): Payment {
  const { amount, currency, cardId, cvv, saveCard = false, sendReceipt = true } = options;
  // ...
}

// Call site - crystal clear
createPayment({
  amount: 100,
  currency: 'GBP',
  cardId: 'card_123',
  cvv: '123',
  saveCard: true,
});
```

### When Positional Parameters Are OK

Use positional parameters when:
- 1-2 parameters max
- Order is obvious (e.g., `add(a, b)`)
- High-frequency utility functions

```typescript
// ✅ OK - Obvious ordering, few parameters
function add(a: number, b: number): number {
  return a + b;
}

function updateUser(user: User, changes: Partial<User>): User {
  return { ...user, ...changes };
}
```

---

## Pure Functions

Pure functions have no side effects and always return the same output for the same input.

### What Makes a Function Pure?

1. **No side effects**
   - Doesn't mutate external state
   - Doesn't modify function arguments
   - Doesn't perform I/O (network, file system, console)

2. **Deterministic**
   - Same input → same output
   - No dependency on external state (Date.now(), Math.random(), global vars)

3. **Referentially transparent**
   - Can replace function call with its return value

### Examples

❌ **WRONG - Impure function (mutations)**
```typescript
function addScenario(scenarios: Scenario[], newScenario: Scenario): void {
  scenarios.push(newScenario); // ❌ Mutates input
}

let count = 0;
function increment(): number {
  count++; // ❌ Modifies external state
  return count;
}
```

✅ **CORRECT - Pure functions**
```typescript
function addScenario(
  scenarios: ReadonlyArray<Scenario>,
  newScenario: Scenario,
): ReadonlyArray<Scenario> {
  return [...scenarios, newScenario]; // ✅ Returns new array
}

function increment(count: number): number {
  return count + 1; // ✅ No external state
}
```

### Benefits of Pure Functions

- **Testable**: No setup/teardown needed
- **Composable**: Easy to combine
- **Predictable**: No hidden behavior
- **Cacheable**: Memoization possible
- **Parallelizable**: No race conditions

### When Impurity Is Necessary

Some functions must be impure (I/O, randomness, side effects). Isolate them:

```typescript
// ✅ CORRECT - Isolate impure functions at edges
// Pure core
function calculateTotal(items: ReadonlyArray<Item>): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Impure shell (isolated)
async function saveOrder(order: Order): Promise<void> {
  const total = calculateTotal(order.items); // Pure
  await database.save({ ...order, total }); // Impure (I/O)
}
```

**Pattern**: Keep impure functions at system boundaries (adapters, ports). Keep core domain logic pure.

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

// Even better - use pipe/compose utilities
const registerScenario = pipe(
  validate,
  register,
);
```

### Composing Immutable Transformations

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

## Readonly Keyword for Immutability

Use `readonly` on all data structures to signal immutability intent.

### readonly on Properties

```typescript
// ✅ CORRECT - Immutable data structure
type Scenario = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

// ❌ WRONG - Mutable
type Scenario = {
  id: string;
  name: string;
};
```

### ReadonlyArray vs Array

```typescript
// ✅ CORRECT - Immutable array
type Scenario = {
  readonly mocks: ReadonlyArray<Mock>;
};

// ❌ WRONG - Mutable array
type Scenario = {
  readonly mocks: Mock[];
};
```

### Nested readonly

```typescript
// ✅ CORRECT - Deep immutability
type Mock = {
  readonly method: 'GET' | 'POST';
  readonly response: {
    readonly status: number;
    readonly body: readonly unknown[];
  };
};
```

### Why readonly Matters

- **Compiler enforces immutability**: TypeScript errors on mutation attempts
- **Self-documenting**: Signals "don't mutate this"
- **Functional programming alignment**: Natural fit for FP patterns
- **Prevents accidental bugs**: Can't accidentally mutate data

---

## Deep Nesting Limitation

**Max 2 levels of function nesting.** Beyond that, extract functions.

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

---

## Immutable Array Operations

**Complete catalog of array mutations and their immutable alternatives:**

```typescript
// ❌ WRONG - Mutations
items.push(newItem);        // Add to end
items.pop();                // Remove last
items.unshift(newItem);     // Add to start
items.shift();              // Remove first
items.splice(index, 1);     // Remove at index
items.reverse();            // Reverse order
items.sort();               // Sort
items[i] = newValue;        // Update at index

// ✅ CORRECT - Immutable alternatives
const withNew = [...items, newItem];           // Add to end
const withoutLast = items.slice(0, -1);        // Remove last
const withFirst = [newItem, ...items];         // Add to start
const withoutFirst = items.slice(1);           // Remove first
const removed = [...items.slice(0, index),     // Remove at index
                 ...items.slice(index + 1)];
const reversed = [...items].reverse();         // Reverse (copy first!)
const sorted = [...items].sort();              // Sort (copy first!)
const updated = items.map((item, idx) =>       // Update at index
  idx === i ? newValue : item
);
```

**Common patterns:**

```typescript
// Filter out specific item
const withoutItem = items.filter(item => item.id !== targetId);

// Replace specific item
const replaced = items.map(item =>
  item.id === targetId ? newItem : item
);

// Insert at specific position
const inserted = [
  ...items.slice(0, index),
  newItem,
  ...items.slice(index)
];
```

---

## Immutable Object Updates

```typescript
// ❌ WRONG
user.name = "New";
Object.assign(user, { name: "New" });

// ✅ CORRECT
const updated = { ...user, name: "New" };
```

---

## Nested Updates

```typescript
// ✅ CORRECT - Immutable nested update
const updatedCart = {
  ...cart,
  items: cart.items.map((item, i) =>
    i === targetIndex ? { ...item, quantity: newQuantity } : item
  ),
};

// ✅ CORRECT - Immutable nested array update
const updatedOrder = {
  ...order,
  items: [
    ...order.items.slice(0, index),
    updatedItem,
    ...order.items.slice(index + 1),
  ],
};
```

---

## Early Returns Over Nesting

```typescript
// ❌ WRONG - Nested conditions
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// ✅ CORRECT - Early returns (guard clauses)
if (!user) return;
if (!user.isActive) return;
if (!user.hasPermission) return;

// do something
```

---

## Result Type for Error Handling

```typescript
type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// Usage
function processPayment(payment: Payment): Result<Transaction> {
  if (payment.amount <= 0) {
    return { success: false, error: new Error('Invalid amount') };
  }

  const transaction = executePayment(payment);
  return { success: true, data: transaction };
}

// Caller handles both cases explicitly
const result = processPayment(payment);
if (!result.success) {
  console.error(result.error);
  return;
}

// TypeScript knows result.data exists here
console.log(result.data.transactionId);
```

---

## Summary Checklist

When writing functional code, verify:

- [ ] No data mutation - using spread operators
- [ ] Pure functions wherever possible (no side effects)
- [ ] Code is self-documenting (no comments needed)
- [ ] Array methods (`map`, `filter`, `reduce`) over loops
- [ ] Options objects for 3+ parameters
- [ ] Composed small functions, not complex monoliths
- [ ] `readonly` on all data structure properties
- [ ] `ReadonlyArray<T>` for immutable arrays
- [ ] Max 2 levels of nesting (use early returns)
- [ ] Result types for error handling
