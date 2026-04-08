---
name: characterisation-tests
description: Use when modifying existing code that lacks tests and you need to document its actual current behavior before making changes -- the legacy code dilemma where you need tests to refactor safely but the code was not written for testability. Specifically for understanding and pinning down what code currently does, not what it should do. Do NOT use for test-driving new behavior (see tdd), general test writing patterns (see testing), verifying test effectiveness (see mutation-testing), or making untestable code testable (see finding-seams).
---

# Characterisation Tests

For making untestable code testable first, load the `finding-seams` skill. For test-driving new behavior, load the `tdd` skill. For general test patterns, load the `testing` skill. For verifying test effectiveness after characterising, load the `mutation-testing` skill.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `writing-process.md` | Need a worked example of the full characterisation process with targeted testing, async code, and when-to-stop guidance |
| `modern-tooling.md` | Need guidance on Vitest snapshots, combination testing, approval testing, or handling non-determinism |

## Core Concept

> A **characterisation test** is a test that characterizes the actual behavior of a piece of code. There's no "it should do this" -- the tests document what the system really does.

Characterisation tests have no moral authority. They don't assert correctness -- they detect *change*. When a characterisation test breaks, a human decides whether the change was intended. Also known as **golden master testing** or **approval testing** -- same concept, different names.

*-- Michael Feathers, Working Effectively with Legacy Code (2004)*

## When to Use

- Modifying existing code that has no tests (or inadequate tests)
- Specifications are missing, incomplete, or contradict the running system
- Code is too complex to reason about by reading alone
- Facing the **legacy code dilemma**: need tests to refactor safely, but code resists testing
- Need to understand what a function actually returns before changing it

## When NOT to Use

- **Greenfield code** -- new code should be test-driven from the start (see `tdd` skill)
- **You already have specs** -- if requirements are clear and code is new, write behavior-driven tests that assert intended behavior, not characterisation tests that document whatever the code does
- **Code already has adequate tests** -- characterise only the untested parts; don't duplicate existing coverage
- **As a permanent testing strategy** -- characterisation tests are scaffolding; replace them with proper tests as you refactor

## Naming and Identification

Characterisation tests must be **immediately recognisable** as characterisation tests -- to other LLMs, to humans, and to your future self. Someone reading the test file should understand at a glance: these tests document actual behavior, they are not assertions of correctness, and they are intended to be temporary.

### Test Naming

Use `characterises` in the test name to distinguish from behavior-driven tests:

```typescript
// ✅ Clearly identified as characterisation tests
describe('calculateDiscount characterisation', () => {
  it('characterises premium customer discount for < 5 years', () => { ... });
  it('characterises business customer loyalty bonus threshold', () => { ... });
});

// ❌ Indistinguishable from behavior-driven tests
describe('calculateDiscount', () => {
  it('should apply 15% discount for premium customers', () => { ... });
});
```

### File Naming

Use a distinct file suffix so characterisation tests are visually separable in the file tree:

```
pricing.characterisation.test.ts    ← characterisation tests (temporary)
pricing.test.ts                     ← behavior-driven tests (permanent)
```

### Documentation Within Tests

Add a block comment at the top of each characterisation test file explaining the purpose and the planned lifecycle. This is one of the few places where comments are essential -- the tests themselves document *what* the code does, but the comment documents *why these tests exist and when to remove them*:

```typescript
/**
 * CHARACTERISATION TESTS -- documenting actual behavior, NOT asserting correctness.
 *
 * These tests pin down the current behavior of calculateDiscount so we can
 * safely refactor it. They should be replaced with behavior-driven tests
 * as the code is understood and restructured.
 *
 * See: characterisation-tests skill for the methodology.
 */
describe('calculateDiscount characterisation', () => { ... });
```

### Suspicious Behavior

When a characterisation test captures behavior that looks like a bug, mark it explicitly:

```typescript
it('characterises negative quantity handling -- SUSPICIOUS: returns negative discount', () => {
  // This may be a bug -- negative quantities produce negative discounts.
  // Documented as-is; escalate before changing.
  expect(calculateDiscount(-5, 'premium', 3)).toBe(-0.75);
});
```

## The Algorithm

1. **Use** a piece of code in a test harness
2. **Write an assertion you know will fail** (use a dummy value like `"PLACEHOLDER"`)
3. **Let the failure tell you the behavior** -- the test runner shows the actual value
4. **Change the test** so it expects the behavior the code actually produces
5. **Repeat** -- let curiosity guide you; the code itself suggests what to test next

```typescript
// Step 2: write assertion you know will fail
it('characterises formatPrice', () => {
  expect(formatPrice(1999)).toBe('PLACEHOLDER');
});
// Test output: expected 'PLACEHOLDER' but received '$19.99'

// Step 4: change test to expect actual behavior
it('characterises formatPrice', () => {
  expect(formatPrice(1999)).toBe('$19.99');
});
```

## Heuristics

1. **Use coverage as your guide** -- run `vitest --coverage` to find untested paths, then write tests to exercise them
2. **Production behavior IS the specification** -- if deployed code does something, assume someone depends on it, even if it looks wrong
3. **Focus on the change area** -- you don't need to characterise the entire codebase, only the code you're about to modify
4. **Mark suspicious behavior** -- when you find something that looks like a bug, document it in the test but mark it as suspicious; don't silently "fix" it
5. **Look at the code** -- these aren't black-box tests; read the code to guide which paths to characterise
6. **Validate with mutation testing** -- after characterising, run the `mutation-testing` skill against the change area to verify your tests would catch real bugs. Coverage tells you which paths are *exercised*; mutation testing tells you which are *protected*.

## When to Stop

You don't need 100% coverage of the entire codebase. Stop when:

- **Every branch your upcoming change touches** has a characterisation test exercising it
- **One layer out** from the change point is also covered (the branches that call into or are called by the code you're changing)
- **Mutation testing** on the change area shows no surviving mutants in paths you'll modify

If you can't feel confident that your tests would detect a mistake in the specific code you're about to change, add more tests. If you can, stop.

## When You Find Bugs

All legacy code has bugs. When you find one during characterisation:

- **If the system is deployed**: someone may depend on the "buggy" behavior. Document it, mark the test as suspicious, escalate before changing it.
- **If the system is not yet deployed**: fix it.
- **Always**: include the characterisation test in your suite. Even if it captures a bug, it's documenting *reality*.

## Characterisation Tests Are Temporary

They enable refactoring, then get replaced by proper behavior-driven tests:

1. **Characterise** -- pin down current behavior as a safety net
2. **Refactor** -- restructure code while characterisation tests detect any behavioral change
3. **Replace** -- as you understand the code, write proper tests that assert *intended* behavior
4. **Remove** -- retire characterisation tests once proper tests cover the same behavior

> Like walking into a forest and drawing a line: "I own all of this area." After you know that, you can develop it by refactoring and writing more tests. Over time, the characterisation tests can go away.

## Characterising Async Code

Async legacy code requires the same algorithm -- the key difference is awaiting results and controlling timing.

```typescript
// Step 1: dummy assertion, same algorithm
it('characterises fetchUserOrders', async () => {
  const result = await fetchUserOrders('user-123');
  expect(result).toBe('PLACEHOLDER');
});
// Output: expected 'PLACEHOLDER' but received [{ id: 'order-1', ... }]

// Step 2: record actual behavior
it('characterises fetchUserOrders for known user', async () => {
  const result = await fetchUserOrders('user-123');
  expect(result).toEqual([
    expect.objectContaining({ id: 'order-1', status: 'shipped' }),
  ]);
});
```

**Key concerns for async characterisation:**
- **Use real seams for I/O** -- pass async dependencies as parameters rather than hitting real services (see `finding-seams` skill)
- **Error paths** -- characterise both resolved and rejected states: `await expect(fn()).rejects.toThrow()`
- **Timing-dependent behavior** -- use `vi.useFakeTimers()` and `vi.advanceTimersByTime()` to control time (see `modern-tooling.md`)
- **Streams and events** -- collect emitted values into an array, then assert on the collected result

```typescript
// Characterising an event emitter
it('characterises order processor events', async () => {
  const events: string[] = [];
  processor.on('status', (s: string) => events.push(s));
  await processor.process(testOrder);
  expect(events).toEqual(['validating', 'processing', 'complete']);
});
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Treating characterisation tests as permanent | They are scaffolding -- replace with behavior-driven tests as you refactor |
| "Fixing" bugs in characterisation tests | Document the actual behavior, mark as suspicious, escalate |
| Trying to characterise the entire codebase | Focus on the area you're about to change + one layer out |
| Writing characterisation tests based on what code *should* do | Let the code tell you what it does -- use the algorithm above |
| Skipping mutation testing after characterising | Coverage says paths ran; mutation testing says tests would catch changes |
| Using characterisation tests for new code | New code should be test-driven (see `tdd` skill) |
| Using `vi.mock()` for sensing instead of parameter injection | Pass a sensing function as a parameter (see `finding-seams` skill) |
| Not awaiting async results | Use `async`/`await` in characterisation tests -- a synchronous assertion on a promise always passes |
