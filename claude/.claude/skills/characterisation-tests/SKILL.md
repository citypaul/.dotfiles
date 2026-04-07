---
name: characterisation-tests
description: Use when modifying existing code that lacks tests and you need to document its actual current behavior before making changes -- the legacy code dilemma where you need tests to refactor safely but the code was not written for testability. Specifically for understanding and pinning down what code currently does, not what it should do. Do NOT use for test-driving new behavior (see tdd), general test writing patterns (see testing), verifying test effectiveness (see mutation-testing), or making untestable code testable (see finding-seams).
---

# Characterisation Tests

For making untestable code testable first, load the `finding-seams` skill. For test-driving new behavior, load the `tdd` skill. For general test patterns, load the `testing` skill. For verifying test effectiveness after characterising, load the `mutation-testing` skill.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `writing-process.md` | Need a worked example of the full characterisation process with targeted testing and pinch points |
| `modern-tooling.md` | Need guidance on Vitest snapshots, combination testing, approval testing, or handling non-determinism |

## Core Concept

> A **characterisation test** is a test that characterizes the actual behavior of a piece of code. There's no "it should do this" -- the tests document what the system really does.

Characterisation tests have no moral authority. They don't assert correctness -- they detect *change*. When a characterisation test breaks, a human decides whether the change was intended.

*-- Michael Feathers, Working Effectively with Legacy Code (2004)*

## When to Use

- Modifying existing code that has no tests (or inadequate tests)
- Specifications are missing, incomplete, or contradict the running system
- Code is too complex to reason about by reading alone
- Facing the **legacy code dilemma**: need tests to refactor safely, but code resists testing
- Need to understand what a function actually returns before changing it

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

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Treating characterisation tests as permanent | They are scaffolding -- replace with behavior-driven tests as you refactor |
| "Fixing" bugs in characterisation tests | Document the actual behavior, mark as suspicious, escalate |
| Trying to characterise the entire codebase | Focus on the area you're about to change |
| Writing characterisation tests based on what code *should* do | Let the code tell you what it does -- use the algorithm above |
| Skipping coverage checks after characterising | Use coverage + mutation testing to verify your safety net is adequate |
| Using characterisation tests for new code | New code should be test-driven (see `tdd` skill) |
