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

Small pure functions are an implementation technique, not a mandate to publish one function per module. Keep related helpers private and colocated when they compose into one coherent responsibility; use `codebase-design` when choosing the stable caller-facing contract.

## Core Principles

- **Immutable domain data by default** - keep local or boundary mutation encapsulated when it is clearer or required
- **Pure functions** wherever possible
- **Composition** over inheritance
- **Self-documenting code first** - keep comments that explain constraints or non-obvious reasons
- **Array methods for transformations** - use loops when control flow is clearer
- **Options objects for parameter groups** - keep simple positional APIs simple

---

## Why Immutability Matters

Immutable data is a foundation of functional programming. It makes code **predictable** (same input → same output, no hidden state changes), **debuggable** (state does not change underneath a reader), **testable** (less hidden mutable state), and **React-friendly** (reconciliation and memoization can rely on reference changes). It also reduces shared-state concurrency hazards, but does not by itself prevent races in I/O or coordination.

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

Use `readonly` on data that is intended to be immutable and `ReadonlyArray<T>` for immutable arrays so the compiler enforces that contract. Encapsulated mutable accumulators, caches, and adapter state are acceptable when they do not leak mutation into the domain contract. For common mutations and immutable alternatives, load `resources/immutability-catalog.md`.

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

## Self-Documenting Code and Useful Comments

Code should be clear through naming and structure. Prefer refactoring comments that merely narrate syntax, but keep comments that explain a non-obvious decision or constraint.

**Comments worth keeping:**
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

If a comment only restates what the code does, refactor instead: extract functions with descriptive names, use meaningful variable names, break complex logic into steps, or use type aliases for domain concepts.

✅ **Acceptable JSDoc for public APIs**
```typescript
/**
 * Registers a scenario for runtime switching.
 * @throws {ValidationError} if scenario ID is duplicate
 */
export function registerScenario(definition: ScenaristScenario): void {
```

---

## Choosing Array Methods and Loops

Prefer `map`, `filter`, `reduce` for transformations. They're declarative (what, not how) and naturally immutable.

✅ **CORRECT - map, filter, reduce, and chaining**
```typescript
const scenarioIds = scenarios.map(s => s.id);
const activeScenarios = scenarios.filter(s => s.active);
const totalActiveMinutes = sessions
  .filter(session => session.active)
  .map(session => session.durationMinutes * session.repetitions)
  .reduce((sum, minutes) => sum + minutes, 0);
```

### When Loops Are Acceptable

Imperative loops are fine when:
- Early termination is essential (use `for...of` with `break`)
- Performance critical (measure first!)
- Side effects are necessary (logging, DOM manipulation)

Choose `Array.find()`, `Array.some()`, or `Array.every()` when those operations express the intent more directly; do not replace a clear loop merely to satisfy a style rule.

---

## When to Use Options Objects

Use an options object when parameters form a meaningful group, several values share the same type, or optional arguments make ordering unclear. A small, stable function with obvious positional parameters can remain positional.

✅ **CORRECT - Options object**
```typescript
type CreateReportOptions = {
  reportId: string;
  format: 'pdf' | 'csv';
  locale: string;
  timeZone: string;
  includeCharts?: boolean;
  sendEmail?: boolean;
};

function createReport(options: CreateReportOptions): Report {
  const { reportId, format, locale, timeZone, includeCharts = false, sendEmail = true } = options;
  // ...
}

// Call site - crystal clear
createReport({ reportId: 'report_123', format: 'pdf', locale: 'en-GB', timeZone: 'Europe/London', includeCharts: true });
```

Use positional parameters when the order is obvious, as in `add(a, b)`, or a familiar high-frequency utility would become noisier with an options object. Switch to named options when same-typed or optional arguments make a call ambiguous; parameter count is a signal, not a fixed limit.

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
function calculateTotalWeightGrams(parcels: ReadonlyArray<Parcel>): number {
  return parcels.reduce((sum, parcel) => sum + parcel.weightGrams, 0);
}

// Impure shell (isolated)
async function saveShipment(shipment: Shipment): Promise<void> {
  const totalWeightGrams = calculateTotalWeightGrams(shipment.parcels); // Pure
  await database.save({ ...shipment, totalWeightGrams }); // Impure (I/O)
}
```

**Pattern**: Keep impure functions at system boundaries (adapters, ports). Keep core domain logic pure.

---

## Early Returns Over Nesting

Treat deep nesting as a readability signal, not a numeric rule. When nested control flow obscures the main path, extract functions or flatten it with guard clauses. For worked examples, load `resources/composition-patterns.md`.

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

Use a `Result` type when expected failures are part of the caller-facing contract and callers must handle both branches. Preserve an established exception, nullable-value, or framework error convention when it communicates the contract more clearly.

```typescript
type Result<T, E = Error> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E };

// Usage
function processBatch(batch: Batch): Result<BatchRun> {
  if (batch.itemCount <= 0) {
    return { success: false, error: new Error('Batch must contain an item') };
  }

  const run = executeBatch(batch);
  return { success: true, data: run };
}

// Caller handles both cases explicitly
const result = processBatch(batch);
if (!result.success) return logError(result.error);
console.log(result.data.batchId); // TypeScript knows result.data exists here
```

---

## Summary Checklist

When writing functional code, verify:

- [ ] Domain data is immutable where that is part of its contract; any mutable state is local and encapsulated
- [ ] Pure functions wherever possible (no side effects)
- [ ] Code is self-documenting; comments explain non-obvious reasons or constraints
- [ ] Array methods or loops are chosen for clarity and control-flow needs
- [ ] Options objects group parameters when they improve the caller-facing contract
- [ ] Composed small functions, not complex monoliths
- [ ] `readonly` and `ReadonlyArray<T>` express intended immutability
- [ ] Nesting remains readable; guard clauses or extraction clarify deep paths
- [ ] Result types are used when expected failures belong in the return contract
