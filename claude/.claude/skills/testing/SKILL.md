---
name: testing
description: Testing patterns for behavior-driven tests. Use when writing tests, creating test factories, structuring test files, or deciding what to test. Do NOT use for UI-specific testing (see front-end-testing or react-testing skills).
---

# Testing Patterns

For verifying test effectiveness through mutation analysis, load the `mutation-testing` skill. Use its mutator rules while planning and writing tests, but defer the automated mutation harness until the end-of-phase PR-readiness gate. For evaluating test quality against Dave Farley's properties, load the `test-design-reviewer` skill.

## Core Principle

**Test behavior, not implementation.** Coverage helps find unexercised code; the repository owns any threshold, and a percentage does not replace meaningful assertions.

**Example:** Exercise validation through `processPayment()` when that is the contract under test, rather than testing an internal validator only to move a coverage number.

---

## Fast, Relevant Test Execution

Follow the `tdd` skill's canonical fast-feedback, watcher lifecycle, process cleanup, monorepo, final-gate, and repository-authority policy. For Vitest seed semantics and reusable-command proof, read its [resources/vitest-watch-feedback.md](../tdd/resources/vitest-watch-feedback.md).

Start with an exact selector for RED. For GREEN/REFACTOR, prefer a behaviorally proven repository-owned watcher, then the runner/orchestrator-derived affected scope or affected one-shot. A repository-owned command may deliberately run its complete relevant tier once to seed the runtime graph. Do not hand-pick a smaller ongoing scope, accept zero-test evidence, leave a watcher behind, or substitute watch mode for the complete non-watch PR gate.

Inspect project scripts and installed runner help rather than guessing flags. Representative runner-specific choices:

Preference order:

1. Tested repository-owned watch/affected command.
2. Native VCS-aware selection when the installed runner and repository configuration have proven its watch behavior.
3. Native dependency-aware selection from a complete, mechanically derived changed-source list.
4. Runner/orchestrator-selected affected packages/projects, including transitive dependents.
5. Exact test file/name only for proving RED or debugging, followed by one of the broader affected scopes for GREEN.

| Runner | GREEN/REFACTOR affected scope | RED/debug-only selector |
|---|---|---|
| Vitest | Repository-owned watcher first. Otherwise use `vitest --changed <real-base> --watch` only under the `tdd` skill's version/configuration proof conditions; for one-shot use `--run`. Use `vitest related <all-changed-source-paths>` only when that list is derived mechanically | `vitest run <test-file> -t <name>` or exact-file watch |
| Jest | `jest --watch`, adding `--changedSince=<base>` when the task spans commits; for one-shot use `--onlyChanged`, `--changedSince=<base>`, or `--findRelatedTests <all-changed-source-paths>` with watch disabled | `jest --runTestsByPath <test-file> -t <name>` |
| pytest | Use an existing repository affected/watch task. Without one, run the complete owning package/suite plus known consumers and widen when dependency impact is uncertain | `pytest path/to/test_file.py::test_name` or `pytest -k <name> <path>` |
| Playwright Test | Prefer the repository script or `playwright test --only-changed[=<real-base>]` as a runner-selected affected one-shot. A mechanically derived complete affected-project set may be supplied with project filters. For runtime app code not imported by tests, dynamic/non-import dependencies, or shared global inputs, use the repository-mapped affected journey/project set and widen when uncertain | A file, `--grep`, `--last-failed`, or hand-picked project filter used only to prove RED or repair a known failure |
| Go / Rust / JVM | Use the repository's existing affected/watch task or a dependency-graph-derived package/module set including transitive consumers | Exact package/class/test-name selectors chosen only to prove RED or debug |

If the runner lacks a dependency graph, use its exact selector only for RED/debugging. For GREEN/REFACTOR, run the behavior test plus every known consumer and the complete owning suite/project set; widen when impact is uncertain. Do not mistake “changed test files” for “all relevant tests.” The target is the tests affected by changed behavior, whether or not those test files changed.

Vitest `related` implicitly permits an empty result to pass. Require at least one expected test to execute. Vitest `--standalone` is not a TDD substitute; follow the canonical TDD policy instead.

---

## Mutation-Aware Test Planning

When planning or writing tests, automatically scan the intended behavior and changed production code against the mutator rules from the `mutation-testing` skill's `resources/mutator-rules.md` resource. A good test should fail if a realistic mutant changes the behavior.

Load that resource when the code under test includes conditionals, arithmetic, equality, boolean logic, array/string operations, optional chaining, or meaningful side effects. Use it to identify likely surviving mutants before the Stryker run.

When the scan finds an obvious gap, add or strengthen a behavior test immediately. When the gap depends on product or domain judgment, use the host's structured question facility when available; otherwise ask one concise plain-text question. Give concrete choices, explain the potential mutant, and state the tradeoff.

Example ask-question prompt:

```markdown
The bulk path uses `items.length >= 100`, but current tests only cover `150`.
Should the exact `100` boundary use the bulk path?
- Yes: add a boundary test for `100`
- No: change/confirm the rule as `items.length > 100`
- Unspecified: document the behavior as intentionally not guaranteed
```

Do not ask when the gap is plainly a missing assertion, missing boundary, missing branch, or missing side-effect check. Fix those directly.

---

## Test Through the Subject's Public Interface

Never test implementation details. Test behavior through the subject's public interface — **at the layer named by the test's claim**.

**Why this matters:**
- Tests remain valid when refactoring
- Tests document intended behavior
- Tests catch real bugs, not implementation changes

"Public API" does not mean "the HTTP API": every layer has its own public interface, and the claim under test decides which one owns the evidence.

| Claim under test | Public interface that owns the evidence |
|---|---|
| Domain/application behavior | Exported domain/application operation |
| HTTP API contract | HTTP client and documented request/response contract |
| Component behavior | Rendered component DOM and its public props/events |
| Browser/frontend behavior | Navigation, accessible UI, browser lifecycle, and browser-observed network |
| User journey | Accessible user actions and user-visible outcomes across the real journey |

An HTTP endpoint can be public and still be the **wrong** interface for a browser claim: a "user creates X" test that calls the endpoint directly proves an HTTP contract while bypassing the UI handler, cookie policy, CSRF/Fetch Metadata checks, redirects, loading/error state, and rendering — and stays green when any of those break. Test names, comments, CI step labels, docs, and PR prose must state the **narrowest evidence actually proved**. For the E2E evidence model, request observation, and the direct-transport audit, load the `front-end-testing` skill's `resources/playwright-e2e.md`.

### Examples

❌ **WRONG - Testing implementation:**
```typescript
// ❌ Testing HOW (implementation detail)
it('should call validateAmount', () => {
  const spy = vi.spyOn(validator, 'validateAmount');
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
  const payment = getMockPayment({ amountMinorUnits: -100, currency: 'GBP' });
  const result = processPayment(payment);
  expect(result).toEqual({ success: false, error: expect.stringContaining('Amount must be positive') });
});

it('should reject invalid CVV', () => {
  const payment = getMockPayment({ cvv: '12' }); // Only 2 digits
  const result = processPayment(payment);
  expect(result).toEqual({ success: false, error: expect.stringContaining('Invalid CVV') });
});

it('should process valid payments', () => {
  const payment = getMockPayment({ amountMinorUnits: 10_000, currency: 'GBP', cvv: '123' });
  const result = processPayment(payment);
  expect(result).toEqual({ success: true, data: { transactionId: expect.any(String) } });
});
```

Assert on the whole `Result` value rather than reaching for `result.error`/`result.data` after a separate `expect(result.success)` — `expect(...).toBe(false)` does not narrow a discriminated union, so member access on the un-narrowed `Result` fails under strict TypeScript, and the whole-value assertion is stronger against mutants anyway.

---

## Reach Code Through Behavior

Validation code should be reached by tests of the behavior it protects:

```typescript
// Tests covering validation WITHOUT testing validator directly
describe('processPayment', () => {
  it('should reject negative amounts', () => {
    const payment = getMockPayment({ amountMinorUnits: -100, currency: 'GBP' });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
  });

  it('should reject amounts over 10000', () => {
    const payment = getMockPayment({ amountMinorUnits: 1_500_000, currency: 'GBP' });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
  });

  it('should reject invalid CVV', () => {
    const payment = getMockPayment({ cvv: '12' });
    const result = processPayment(payment);
    expect(result.success).toBe(false);
  });

  it('should process valid payments', () => {
    const payment = getMockPayment({ amountMinorUnits: 10_000, currency: 'GBP', cvv: '123' });
    const result = processPayment(payment);
    expect(result.success).toBe(true);
  });
});

// ✅ Result: validation branches are exercised through the public behavior
```

**Key insight:** When coverage drops, ask **"What business behavior am I not testing?"** not "What line am I missing?"

---

## Do Not Extract Merely To Mirror Tests

Do not extract a function into its own file merely to give it a matching unit test. Extract when it creates a coherent contract or seam, improves readability, represents shared **knowledge** (see the `refactoring` skill), or separates responsibilities. If difficulty testing a behavior exposes a real dependency seam, use `finding-seams` rather than hiding the problem behind implementation-detail tests.

Inline code can often be exercised through its consumer's behavioral tests. If that makes failures too broad or a dependency impossible to control, treat the difficulty as design evidence and introduce a coherent seam rather than a helper created only to mirror a test file.

The anti-pattern is creating a 1:1 mapping between extracted helpers and test files (see "No 1:1 Mapping" below). The extracted helper is an implementation detail of its consumer. Test the consumer's behavior.

❌ **WRONG — Extracted single-use helper with its own test file:**
```typescript
// prepare-participant-data.ts (new file, one caller)
export const prepareParticipantData = (items: Item[]) => ({
  yourClaims: items.filter(i => i.isClaimed && i.isClaimedByCurrentUser),
  available: items.filter(i => !i.isClaimedByCurrentUser),
});

// prepare-participant-data.test.ts (tests the helper directly)
it('filters claims', () => { ... });
```

✅ **CORRECT — Inline in the consuming function, tested through its behavior:**
```typescript
// load-participant-view.ts
export const loadParticipantView = async (db: Db, eventId: EventId, userId: UserId) => {
  const items = await getItems(db, eventId, userId);
  const yourClaims = items.filter(i => i.isClaimed && i.isClaimedByCurrentUser);
  const available = items.filter(i => !i.isClaimedByCurrentUser);
  return { yourClaims, available };
};

// The behavioral test for loadParticipantView covers the filtering:
it('returns claimed gifts in yourClaims and unclaimed in available', async () => {
  const result = await loadParticipantView(db, eventId, userId);
  expect(result.yourClaims).toHaveLength(1);
  expect(result.available).toHaveLength(2);
});
```

**When extraction is justified:** If the filtering has a coherent reusable meaning or several consumers depend on it, extract it. Test at the narrowest public boundary that honestly owns the behavior; consumer-level tests may still be needed for integration.

---

## Test Factory Pattern

Use factory functions with optional overrides when test data is repeated, nested,
or otherwise clearer behind a named fixture builder. Keep one-off values inline.

### Core Principles

1. Return objects valid for the scenario, with intentional invalidity made explicit
2. Use typed overrides when that fits the language and model
3. Reuse a production schema when the contract already has one; do not invent a schema only for a factory
4. Prefer fresh state per test. Lifecycle hooks are fine when setup is isolated and cleanup is reliable

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

**Why reuse an existing schema?** It keeps contract-shaped fixtures aligned with the production boundary and catches schema changes without redefining the contract. Pure internal values and deliberately invalid fixtures may not need schema parsing.

**Tip:** For factories where only a subset of fields are relevant, use `Partial<Pick<T, 'field1' | 'field2'>>` for the overrides parameter to constrain what callers can customize (a bare `Pick` keeps every picked field required, so overriding just one field would not compile).

### Factory Composition

For nested objects, compose factories:

```typescript
const getMockItem = (overrides?: Partial<Item>): Item => {
  return ItemSchema.parse({
    id: 'item-1',
    name: 'Test Item',
    weightGrams: 100,
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
      getMockItem({ weightGrams: 100 }),
      getMockItem({ weightGrams: 200 }),
    ],
  });
  expect(calculateTotalWeightGrams(order)).toBe(300);
});
```

### Anti-Patterns

❌ **WRONG: One mutable object shared by the suite**
```typescript
const user: User = { id: 'user-123', name: 'Test User', ... };

it('test 1', () => {
  user.name = 'Modified User';
});

it('test 2', () => {
  expect(user.name).toBe('Test User');  // Order-dependent failure
});
```

✅ **CORRECT: Fresh state per test**
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

Watch for patterns that execute code without proving behavior:

### Pattern 1: Mock the function being tested

❌ **WRONG** - Gives 100% coverage but tests nothing:
```typescript
it('calls validator', () => {
  const spy = vi.spyOn(validator, 'validate');
  validator.validate(payment);
  expect(spy).toHaveBeenCalled(); // Meaningless assertion
});
```

✅ **CORRECT** - Test actual behavior:
```typescript
it('should reject invalid payment', () => {
  const payment = getMockPayment({ amountMinorUnits: -100, currency: 'GBP' });
  const result = validate(payment);
  expect(result).toEqual({ success: false, error: expect.stringContaining('Amount must be positive') });
});
```

### Pattern 2: Test only that function was called

❌ **WRONG** - No behavior validation:
```typescript
it('processes payment', () => {
  const spy = vi.spyOn(processor, 'process');
  handlePayment(payment);
  expect(spy).toHaveBeenCalledWith(payment); // So what?
});
```

✅ **CORRECT** - Verify the outcome:
```typescript
it('should process payment and return transaction ID', () => {
  const payment = getMockPayment();
  const result = handlePayment(payment);
  expect(result).toEqual({ success: true, data: { transactionId: expect.any(String) } });
});
```

**Exception**: asserting on a callback passed in through the public API is behavior testing, not coverage theater. When a component or function accepts a callback (e.g. an `onSubmit` prop), that callback contract IS the output — `expect(handleSubmit).toHaveBeenCalledWith(...)` verifies observable behavior. What this pattern forbids is spying on internal collaborators the caller never provided.

### Pattern 3: Test trivial getters/setters

❌ **WRONG** - Testing implementation, not behavior:
```typescript
it('sets retry limit', () => {
  worker.setRetryLimit(3);
  expect(worker.getRetryLimit()).toBe(3); // Trivial
});
```

✅ **CORRECT** - Test meaningful behavior:
```typescript
it('should calculate shipment weight', () => {
  const order = createOrder({ items: [item1, item2] });
  expect(order.calculateWeightGrams()).toBe(230);
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
    const payment = getMockPayment({ amountMinorUnits: -100, currency: 'GBP' });
    expect(validate(payment).success).toBe(false);
  });

  it('should reject amounts over limit', () => {
    const payment = getMockPayment({ amountMinorUnits: 1_500_000, currency: 'GBP' });
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

## No Automatic 1:1 Mapping Between Tests and Implementation

Do not mirror every implementation file by reflex. Organize tests around stable behavior or contracts; a 1:1 file is fine when that file itself is the public unit under test.

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

- [ ] Testing behavior through the subject's public interface at the layer the claim names (not implementation details, not a lower layer standing in for it)
- [ ] No mocks of the function being tested
- [ ] No tests of private methods or internal state
- [ ] Factory functions return scenario-valid objects and mark intentional invalidity
- [ ] Existing production schemas are reused where appropriate, not redefined in tests
- [ ] Overrides are type-safe for the language and model
- [ ] Test state is isolated; lifecycle setup has reliable cleanup
- [ ] Edge cases covered (not just happy path)
- [ ] Tests would pass even if implementation is refactored
- [ ] Test organization follows stable behavior or contracts rather than implementation shape by default
- [ ] TDD inner-loop runs use focused watch or related/affected selectors rather than repeated full suites
- [ ] GREEN/REFACTOR uses the complete affected scope derived by the runner, workspace orchestrator, or repository mapping; when no reliable graph exists, use the documented owning-suite-plus-known-consumers fallback and widen on uncertainty, never hand-picked test files
- [ ] When using a watcher, new tests join it; otherwise the affected one-shot is rerun after test creation. Every claimed result executed at least one expected test without `--passWithNoTests`
- [ ] The watcher and its child processes were stopped; a completed non-watch full-suite run is current for the final tree, and mutation or alternate evidence satisfies the target repository's policy
