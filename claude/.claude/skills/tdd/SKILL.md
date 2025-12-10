---
name: tdd
description: Test-Driven Development workflow. Use for ALL code changes - features, bug fixes, refactoring. TDD is non-negotiable.
---

# Test-Driven Development

TDD is the fundamental practice. Every line of production code must be written in response to a failing test.

## RED-GREEN-REFACTOR Cycle

### RED: Write Failing Test First
- NO production code until you have a failing test
- Test describes desired behavior, not implementation
- Test should fail for the right reason

### GREEN: Minimum Code to Pass
- Write ONLY enough code to make the test pass
- Resist adding functionality not demanded by a test
- Commit immediately after green

### REFACTOR: Assess Improvements
- Assess AFTER every green (but only refactor if it adds value)
- Commit before refactoring
- All tests must pass after refactoring

## Test Factory Pattern

For test data, use factory functions with optional overrides. See the `testing` skill for detailed patterns.

Key principles:
- Return complete objects with sensible defaults
- Accept `Partial<T>` overrides
- Validate with real schemas
- NO `let`/`beforeEach` - use factories

## Refactoring Priority

After green, classify any issues:

| Priority | Action | Examples |
|----------|--------|----------|
| Critical | Fix now | Mutations, knowledge duplication |
| High | This session | Magic numbers, unclear names |
| Nice | Later | Minor improvements |
| Skip | Don't change | Already clean code |

## Anti-patterns to Avoid

- Writing production code without failing test
- Testing implementation details (spies on internal methods)
- 1:1 mapping between test files and implementation files
- Using `let`/`beforeEach` for test data
