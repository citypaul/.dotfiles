---
name: finding-seams
description: Use when existing code has untestable dependencies that prevent writing tests -- direct construction of collaborators, static or global function calls, tight coupling to external systems, or singleton access patterns. Specifically for identifying substitution points (seams) that make legacy or tightly-coupled code testable without editing at the call site. Do NOT use for greenfield TDD (see tdd), general test writing patterns (see testing), or refactoring already-tested code (see refactoring).
---

# Finding Seams

For writing tests that document existing behavior once you have seams, load the `characterisation-tests` skill. For test-driving new behavior, load the `tdd` skill. For general test patterns, load the `testing` skill. For refactoring after tests are in place, load the `refactoring` skill.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `seam-types.md` | Need detailed examples of each seam type in TypeScript with comparison guidance |
| `creating-seams.md` | Need to introduce a seam where none exists, with before/after refactoring examples |

## Core Concept

> A **seam** is a place where you can alter behavior in your program without editing in that place.

Every seam has an **enabling point** -- the place where you choose which behavior to activate. The source code at the seam stays identical in production and test; only the enabling point differs.

*-- Michael Feathers, Working Effectively with Legacy Code (2004)*

## When to Use

- Cannot instantiate a class or call a function in a test harness due to dependencies
- A method directly calls an external system (database, network, filesystem) with no way to substitute
- Global or static dependencies make isolation impossible
- Constructor creates its own collaborators internally (`new` inside the constructor)
- Singleton access patterns couple code to shared mutable state

## Quick Reference: Seam Types for TypeScript/JS

| Seam Type | Mechanism | Enabling Point | Prefer When |
|-----------|-----------|---------------|-------------|
| **Module** | `vi.mock()` / `jest.mock()` replaces imports | Test file mock configuration | Quick isolation of import-level dependencies |
| **Object** | Subclass and override, or DI via constructor | Where the object is created | Class-based code with virtual methods |
| **Function Parameter** | Pass dependency as argument | The argument list | Functional code, pure functions, explicit contracts |
| **Configuration** | Env vars, feature flags, config objects | The config source | Infrastructure-level concerns |

## How to Find Seams

Look for these in the code you need to test:

1. **Method parameters** -- any parameter that could accept a different implementation
2. **Constructor arguments** -- dependencies injected through constructors
3. **Overridable methods** -- methods that can be overridden in a subclass (no `private`/`final`)
4. **Module imports** -- anything imported can potentially be mocked at the module level
5. **Configuration** -- env vars, config files, feature flags
6. **`new` keywords** -- every direct construction of a dependency is a place where a seam *could* exist but doesn't yet

## The Progression

Ordered from quick-fix to proper design. Start with the fastest option that works, then improve as you gain test coverage:

1. **Extract and Override** -- pull problematic call into a protected method, subclass in test
2. **Module mocking** -- `vi.mock()` to replace imports (works without production code changes)
3. **Function parameter injection** -- pass dependencies as arguments (explicit, type-safe)
4. **Constructor/factory injection** -- support complex dependency graphs
5. **Full interface-based DI** -- most flexible, best for large systems

Steps 1-2 are temporary scaffolding. Steps 3-5 are permanent design improvements.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Mocking everything instead of finding real seams | Mock only at the seam boundary; test real logic |
| Using module mocks as permanent architecture | Module mocks are scaffolding -- migrate to explicit injection |
| Creating seams that leak implementation details | Seam interfaces should describe *what*, not *how* |
| Forgetting the enabling point | Every seam needs a place to choose behavior; if there's no enabling point, it's not a seam |
| Breaking too many dependencies at once | Break one dependency at a time; get a test passing; then break the next |
