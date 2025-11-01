# Development Guidelines for Claude

> **About this file (v2.0.0+):** This is a modular version with detailed documentation loaded on-demand. The main file (this one) provides core principles and quick reference. Detailed guidelines are in separate files imported via `@~/.claude/docs/...`.
>
> **Prefer a single file?** The v1.0.0 monolithic version (1,818 lines, all-in-one) is available at:
> https://github.com/citypaul/.dotfiles/blob/v1.0.0/claude/.claude/CLAUDE.md
>
> **Key differences:** v1.0.0 = single file with everything; v2.0.0+ = modular with imports. Content is identical, just organized differently.

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production code must be written in response to a failing test. No exceptions. This is not a suggestion or a preference - it is the fundamental practice that enables all other principles in this document.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state throughout development.

## Quick Reference

**Key Principles:**

- Write tests first (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

**Preferred Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Jest/Vitest + React Testing Library
- **State Management**: Prefer immutable patterns

## Testing Principles

**Core principle**: Test behavior, not implementation. 100% coverage through business behavior.

**Quick reference:**
- Write tests first (TDD non-negotiable)
- Test through public API exclusively
- Use factory functions for test data (no `let`/`beforeEach`)
- Tests must document expected business behavior
- No 1:1 mapping between test files and implementation files

For comprehensive testing guidelines including:
- Behavior-driven testing principles and anti-patterns
- Test data patterns and factory functions with full examples
- Achieving 100% coverage through business behavior
- React component testing strategies
- Testing tools (Jest, Vitest, React Testing Library)
- Validating test data with schemas

See @~/.claude/docs/testing.md

## TypeScript Guidelines

**Core principle**: Strict mode always. Schema-first at trust boundaries, types for internal logic.

**Quick reference:**
- No `any` types - ever (use `unknown` if type truly unknown)
- No type assertions without justification
- Prefer `type` over `interface` for data structures
- Reserve `interface` for behavior contracts only
- Define schemas first, derive types from them (Zod/Standard Schema)
- Use schemas at trust boundaries, plain types for internal logic

For comprehensive TypeScript guidelines including:
- Strict mode requirements and tsconfig setup
- Type vs interface distinction with examples
- Schema-first development with Zod
- Decision framework: when schemas ARE vs AREN'T required (5-question framework)
- Schema usage in tests (import from shared locations)
- Branded types for type safety

See @~/.claude/docs/typescript.md

## Code Style

**Core principle**: Functional programming with immutable data. Self-documenting code.

**Quick reference:**
- No data mutation - immutable data structures only
- Pure functions wherever possible
- No nested if/else - use early returns or composition
- No comments - code should be self-documenting
- Prefer options objects over positional parameters
- Use array methods (`map`, `filter`, `reduce`) over loops

For comprehensive code style guidelines including:
- Functional programming patterns and when to use heavy FP abstractions
- Complete immutability violations catalog (arrays, objects, nested structures)
- Code structure principles (max 2 levels nesting)
- Naming conventions (functions, types, constants, files)
- Self-documenting code patterns (no comments)
- Options objects pattern with examples

See @~/.claude/docs/code-style.md

## Development Workflow

**Core principle**: RED-GREEN-REFACTOR. TDD is the fundamental practice.

**Quick reference:**
- RED: Write failing test first (NO production code without failing test)
- GREEN: Write MINIMUM code to pass test
- REFACTOR: Assess improvement opportunities (only refactor if adds value)
- Always commit before refactoring
- Semantic abstraction (meaning) over structural similarity (appearance)
- DRY = Don't repeat knowledge, not code structure

For comprehensive workflow guidelines including:
- TDD process with quality gates
- Anti-patterns in tests to avoid
- Verifying TDD compliance via git history
- Complete TDD example workflow (RED-GREEN-REFACTOR)
- Refactoring: the critical third step
- Refactoring priority classification (Critical/High/Nice/Skip)
- Understanding DRY - knowledge vs code
- Semantic vs structural decision framework
- Commit guidelines and PR standards

See @~/.claude/docs/workflow.md

## Example Patterns

For complete examples including:
- Error handling (Result types and early returns)
- Testing behavior through public APIs
- Common anti-patterns to avoid (mutations, nested conditionals, large functions)

See @~/.claude/docs/examples.md

## Working with Claude

**Core principle**: Think deeply, follow TDD strictly, capture learnings while context is fresh.

**Quick reference:**
- ALWAYS FOLLOW TDD - no production code without failing test
- Assess refactoring after every green (but only if adds value)
- Update CLAUDE.md when introducing meaningful changes
- Ask "What do I wish I'd known at the start?" after significant changes
- Document gotchas, patterns, decisions, edge cases while context is fresh

For comprehensive guidance including:
- Complete expectations checklist
- Learning documentation framework (7 criteria for what to document)
- Types of learnings to capture (gotchas, patterns, anti-patterns, decisions)
- Documentation format templates
- Code change principles
- Communication guidelines

See @~/.claude/docs/working-with-claude.md

## Resources and References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)

## Summary

The key is to write clean, testable, functional code that evolves through small, safe increments. Every change should be driven by a test that describes the desired behavior, and the implementation should be the simplest thing that makes that test pass. When in doubt, favor simplicity and readability over cleverness.
