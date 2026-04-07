---
name: finding-seams
description: Use when existing code has untestable dependencies that prevent writing tests -- direct construction of collaborators, static or global function calls, tight coupling to external systems, or singleton access patterns. Specifically for identifying substitution points (seams) that make legacy or tightly-coupled code testable without editing at the call site. Do NOT use for greenfield TDD (see tdd), general test writing patterns (see testing), or refactoring already-tested code (see refactoring).
---

# Finding Seams

For writing tests that document existing behavior once you have seams, load the `characterisation-tests` skill. For test-driving new behavior, load the `tdd` skill. For general test patterns, load the `testing` skill. For refactoring after tests are in place, load the `refactoring` skill.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `seam-types.md` | Need detailed FP-first examples of each seam type in TypeScript |
| `creating-seams.md` | Need to introduce a seam where none exists, with before/after examples |
| `oop-patterns.md` | Encountering legacy class-based code -- object seams, subclass and override, constructor injection |

## Core Concept

> A **seam** is a place where you can alter behavior in your program without editing in that place.

Every seam has an **enabling point** -- the place where you choose which behavior to activate. The source code at the seam stays identical in production and test; only the enabling point differs.

*-- Michael Feathers, Working Effectively with Legacy Code (2004)*

**Connection to hexagonal architecture:** Ports are designed-in seams. A port defines a contract (the seam), and the composition root chooses which adapter to wire in (the enabling point). If your code already uses hex arch, you have seams everywhere -- this skill is for code that lacks them. See the `hexagonal-architecture` skill.

## When to Use

- Cannot call a function in a test harness because it reaches for external systems directly
- A function hard-codes a dependency instead of accepting it as a parameter
- Global or static dependencies make isolation impossible
- Singleton access patterns couple code to shared mutable state
- React components fetch data internally instead of receiving it via props/context

## Quick Reference: Seam Types for TypeScript/JS

| Seam Type | Mechanism | Enabling Point | Prefer When |
|-----------|-----------|---------------|-------------|
| **Function Parameter** | Pass dependency as argument | The argument list | **Default choice.** Functional code, pure functions, explicit contracts |
| **Configuration** | Env vars, feature flags, config objects | The config source | Infrastructure-level concerns |
| **Module** | `vi.mock()` / `jest.mock()` replaces imports | Test file mock configuration | **Last resort.** Quick scaffolding only -- bypasses type safety, implicit, requires cleanup |
| **Object** | Subclass and override, or DI via constructor | Where the object is created | Legacy class-based code (see `resources/oop-patterns.md`) |

## How to Find Seams

Look for these in the code you need to test:

1. **Function parameters** -- any parameter that could accept a different implementation
2. **Default parameter values** -- `(resolve = fetchFromApi)` is already a seam
3. **Module imports** -- anything imported can potentially be mocked (but prefer parameter injection)
4. **Configuration** -- env vars, config files, feature flags
5. **React props and context** -- components receive dependencies as props; context providers can be swapped in tests
6. **Hard-coded `new` or direct calls** -- every direct dependency is a place where a seam *could* exist but doesn't yet

## The Progression

Ordered from preferred to last-resort. Start with the most explicit option that works:

1. **Function parameter injection** -- pass dependencies as arguments with production defaults (explicit, type-safe, no framework needed)
2. **Higher-order functions** -- return a configured function from a factory (FP composition)
3. **Configuration injection** -- pass config/env as parameter instead of reading globally
4. **Module mocking** -- `vi.mock()` to replace imports (**scaffolding only** -- migrate away as you gain coverage)
5. **Subclass and override** -- for legacy class-based code only (see `resources/oop-patterns.md`)

Steps 1-3 are permanent design improvements. Steps 4-5 are temporary scaffolding.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Using `vi.mock()` as permanent architecture | Module mocks bypass type safety and create implicit coupling. Migrate to parameter injection as soon as you have tests. |
| Leading with class-based patterns (subclass, DI containers) | In TypeScript FP, function parameters provide natural seams. Classes and DI containers are rarely needed. |
| Mocking everything instead of finding real seams | Mock only at the seam boundary; test real logic |
| Creating seams that leak implementation details | Seam interfaces should describe *what*, not *how* |
| Forgetting the enabling point | Every seam needs a place to choose behavior; if there's no enabling point, it's not a seam |
| Breaking too many dependencies at once | Break one dependency at a time; get a test passing; then break the next |
