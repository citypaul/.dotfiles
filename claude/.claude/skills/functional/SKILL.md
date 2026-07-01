---
name: functional
description: Functional programming patterns with immutable data. Use when writing logic, data transformations, or encountering mutation bugs. Covers immutability violations catalog, pure functions, composition, early returns, and options objects. Do NOT over-apply heavy FP abstractions (monads, fp-ts) unless the project requires them.
---

# Functional Patterns

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `immutability-catalog.md` | Fixing mutation bugs, applying `readonly`/`ReadonlyArray` types, or looking up the immutable alternative to an array/object mutation |
| `composition-patterns.md` | Composing small functions into pipelines, refactoring monolithic logic, or flattening deeply nested code |

---

## Core Principles

- **No data mutation** - immutable structures only
- **Pure functions** wherever possible
- **Composition** over inheritance
- **No comments** - code should be self-documenting
- **Array methods** over loops
- **Options objects** over positional parameters

---

## Why Immutability Matters

Immutable data is the foundation of functional programming. It makes code **predictable** (same input → same output, no hidden state changes), **debuggable** (state never changes underneath you), **testable** (no hidden mutable state), **React-friendly** (reconciliation and memoization work correctly), and **concurrency-safe** (no race conditions).

```typescript
// ❌ WRONG - Mutation creates unpredictable behavior
const user = { name: 'Alice', permissions: ['read'] };
grantPermission(user, 'write'); // Mutates user.permissions internally
console.log(user.permissions); // ['read', 'write'] - SURPRISE! user changed

// ✅ CORRECT - Immutable approach is predictable
const updatedUser = grantPermission(user, 'write'); // Returns new object
console.log(user.permissions); // ['read'] - original unchanged
console.log(updatedUser.permissions); // ['read', 'write'] - new version
```

Use `readonly` on all data structure properties and `ReadonlyArray<T>` for arrays so the compiler enforces this. For the full catalog of mutations and their immutable alternatives, load `resources/immutability-catalog.md`.

---

## Functional Light

Follow "Functional Light" principles - practical functional patterns without heavy abstractions:

- **DO**: pure functions, immutable data, composition, declarative code, array methods, `readonly` type safety
- **DON'T**: category theory, monads, heavy FP libraries (fp-ts, Ramda), over-engineering, functional for its own sake

**Why:** The goal is **maintainable, testable code** - not academic purity. If a functional pattern makes code harder to understand, don't use it.

```typescript
// ✅ GOOD - Simple, clear, functional
const activeUsers = users.filter(u => u.active);
const userNames = activeUsers.map(u => u.name);

// ❌ OVER-ENGINEERED - Unnecessary abstraction
const compose = <T>(...fns: Array<(arg: T) => T>) => (x: T) =>
  fns.reduceRight((v, f) => f(v), x);
const withoutInactive = compose(
  (users: readonly User[]): readonly User[] => users.filter(u => u.active),
  (users: readonly User[]): readonly User[] => users.filter(u => !u.suspended),
)(users);
```

---

## No Comments / Self-Documenting Code

Code should be clear through naming and structure. Comments indicate unclear code.

**Exceptions:**
- JSDoc for public APIs when generating documentation
- "Why"-comments required by other skills: characterisation test file headers and SUSPICIOUS behavior markers (see the `characterisation-tests` skill)
- Constraints the code cannot express (e.g. a workaround pinned to an upstream bug, an ordering requirement imposed by an external system)

❌ **WRONG - Comments explaining unclear code**
```typescript
// Get the user and check if active and has permission
function check(u: any) {
  // Check user exists, then active, then permission
  if (u) {
    if (u.a) {
      if (u.p) return true;
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

// Even better - a single boolean expression
function canUserAccessResource(user: User | undefined): boolean {
  return user !== undefined && user.isActive && user.hasPermission;
}
```

Check `undefined` explicitly in the boolean form: optional chaining (`user?.isActive && user?.hasPermission`) yields `boolean | undefined` and fails to compile under strict mode.

If code requires comments to understand, refactor instead: extract functions with descriptive names, use meaningful variable names, break complex logic into steps, use type aliases for domain concepts.

✅ **Acceptable JSDoc for public APIs**
```typescript
/**
 * Registers a scenario for runtime switching.
 * @throws {ValidationError} if scenario ID is duplicate
 */
export function registerScenario(definition: ScenaristScenario): void {
```

---

## Array Methods Over Loops

Prefer `map`, `filter`, `reduce` for transformations. They're declarative (what, not how) and naturally immutable.

✅ **CORRECT - map, filter, reduce, and chaining**
```typescript
const scenarioIds = scenarios.map(s => s.id);
const activeScenarios = scenarios.filter(s => s.active);
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

But even then, prefer `Array.find()` for early termination and `Array.some()` / `Array.every()` for boolean checks.

---

## Options Objects Over Positional Parameters

Default to options objects for function parameters: named parameters, no ordering dependencies, easy optional parameters, self-documenting call sites, TypeScript autocomplete.

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
createPayment({ amount: 100, currency: 'GBP', cardId: 'card_123', cvv: '123', saveCard: true });
```

Use positional parameters only when: 1-2 parameters max, the order is obvious (e.g., `add(a, b)`), or for high-frequency utility functions.

---

## Pure Functions

Pure functions have no side effects and always return the same output for the same input:

1. **No side effects** - doesn't mutate external state, modify arguments, or perform I/O
2. **Deterministic** - same input → same output; no dependency on `Date.now()`, `Math.random()`, or globals
3. **Referentially transparent** - can replace the call with its return value

Pure functions are testable (no setup/teardown), composable, predictable, cacheable, and parallelizable.

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

## Early Returns Over Nesting

**Max 2 levels of function nesting.** Beyond that, extract functions or flatten with guard clauses. For worked flattening and composition examples, load `resources/composition-patterns.md`.

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
if (!result.success) return logError(result.error);
console.log(result.data.transactionId); // TypeScript knows result.data exists here
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
