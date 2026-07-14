# Development Guidelines for Claude

> **About this file (v3.0.0):** Lean version optimized for context efficiency. Core principles here; detailed patterns loaded on-demand via skills.
>
> **Architecture:**
> - **CLAUDE.md** (this file): Core philosophy + quick reference (~160 lines, always loaded)
> - **Skills**: Detailed patterns loaded on-demand (specification, ubiquitous-language, tdd, testing, mutation-testing, test-design-reviewer, typescript-strict, functional, refactoring, reduce-system-complexity, expectations, planning, story-splitting, front-end-testing, react-testing, ci-debugging, hexagonal-architecture, domain-driven-design, event-sourcing, twelve-factor, api-design, cli-design, codebase-design, improve-codebase-architecture, structure-codebase, evaluate-existing-solutions, finding-seams, characterisation-tests, production-parity-skill-builder, storyboard, teach-me, diagrams, technical-writing, find-skills, find-gaps, double-check)
> - **External skills**: Loaded on-demand from community repos (impeccable + 17 steering commands from [pbakaus/impeccable](https://github.com/pbakaus/impeccable), 6 web quality skills from [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills), 3 Next.js skills from [vercel-labs/next-skills](https://skills.sh/vercel-labs/next-skills), grill-me from [mattpocock/skills](https://skills.sh/mattpocock/skills/grill-me), seo-audit from [coreyhaines31/marketingskills](https://skills.sh/coreyhaines31/marketingskills/seo-audit))
> - **Agents**: Specialized subprocesses for verification and analysis
>
> **Previous versions:**
> - v2.0.0: Modular with @docs/ imports (~3000+ lines always loaded)
> - v1.0.0: Single monolithic file (1,818 lines)

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE FOR NEW OR CHANGED BEHAVIOR.** Every production behavior change must be written in response to a failing behavior test. Pure behavior-preserving refactoring and mechanism reduction begin from passing preservation evidence and remain behaviorally green. Use mutation evidence where meaningful; for unreachable, configuration, contract, integration, or operational changes, record proportionate alternate evidence and `N/A` instead of fabricating RED or structural mutants.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state throughout development.

## Quick Reference

**Key Principles:**

- Write behavior tests first for new or changed behavior (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

**Preferred Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Vitest (prefer Browser Mode for UI tests) + Testing Library
- **State Management**: Prefer immutable patterns

## Testing Principles

**Core principle**: Test behavior, not implementation. 100% coverage through business behavior.

**Quick reference:**
- Write behavior tests first for new or changed behavior (TDD non-negotiable)
- Test through public API exclusively
- Use factory functions for test data (no `let`/`beforeEach`)
- Tests must document expected business behavior
- No 1:1 mapping between test files and implementation files

For detailed testing patterns and examples, load the `testing` skill.
For verifying test effectiveness through mutation analysis, load the `mutation-testing` skill.

## TypeScript Guidelines

**Core principle**: Strict mode always. Schema-first at trust boundaries, types for internal logic.

**Quick reference:**
- No `any` types - ever (use `unknown` if type truly unknown)
- No type assertions without justification
- Prefer `type` over `interface` for data structures
- Reserve `interface` for behavior contracts only
- Define schemas first, derive types from them (Zod/Standard Schema)
- Use schemas at trust boundaries, plain types for internal logic

For detailed TypeScript patterns and rationale, load the `typescript-strict` skill.
For API and interface design patterns, load the `api-design` skill.
For OAuth 2.0 or OpenID Connect design, implementation, review, testing, incident analysis, or migration, load the `secure-oauth-oidc` skill.

## Code Style

**Core principle**: Functional programming with immutable data. Self-documenting code.

**Quick reference:**
- No data mutation - immutable data structures only
- Pure functions wherever possible
- No nested if/else - use early returns or composition
- No comments - code should be self-documenting
- Prefer options objects over positional parameters
- Use array methods (`map`, `filter`, `reduce`) over loops
- Compose small private functions behind cohesive, stable module contracts; do not equate one helper with one public module

For detailed patterns and examples, load the `functional` skill.

## Development Workflow

**Core principle**: RED-GREEN with mutation or reviewed alternate evidence, conditional mutant handling, and refactoring when applicable, in small known-good increments. TDD is the fundamental practice for changed behavior.

**Quick reference:**
- RED: Write a failing behavior test before new or changed behavior
- GREEN: Write MINIMUM code to pass test
- MUTATE OR ALTERNATE EVIDENCE: Run mutation testing where meaningful; otherwise record `N/A` plus proportionate reachability, configuration, contract, integration, or operational evidence
- KILL MUTANTS: Address surviving mutants when mutation testing applies (ask human when value is ambiguous)
- REFACTOR OR REDUCE: Assess improvement opportunities only when the applicable skill and preservation evidence support the change
- **Wait for commit approval** before every commit
- Each increment leaves codebase in working state
For detailed TDD workflow, load the `tdd` skill.
For a behavior-changing planned slice, load `tdd`, `testing`, `mutation-testing`, and `refactoring` before code changes begin. For a pure behavior-preserving refactor/reduction, load only the applicable testing, mutation-testing, refactoring, and reduction skills; load `reduce-system-complexity` when net mechanism removal is claimed, and record why any other skill is `N/A`. Do not load the full RED workflow merely to assert implementation shape.
For refactoring methodology, load the `refactoring` skill.
For removing total branches, states, dependencies, layers, flags, retries, jobs, or operational moving parts from a selected existing path while conserving behavior, load the `reduce-system-complexity` skill. Pure reductions use the verified REFACTOR path, not a fabricated structural RED test.
For fuzzy product/design decisions, load `grill-me` to pressure-test the decision tree before writing stories or plans.
For turning fuzzy intent into shared understanding and acceptance criteria — specification as a conversation, agent round first, then a real three-amigos round — load the `specification` skill.
For naming domain concepts, glossary work, or any new/changed domain term — the five-step language protocol, never silent coinage — load the `ubiquitous-language` skill.
For broad stories, epics, features, or backlog items, load `story-splitting` to create child stories before planning.
For tightening an existing story, plan, acceptance criteria set, or mock spec, load `find-gaps` to write confirmed answers back into the artifact.
For significant implementation work, load `planning` to turn one selected child story or narrow capability into PR-sized plans in `plans/`.
For CI failure diagnosis, load the `ci-debugging` skill.
For hexagonal architecture projects, load the `hexagonal-architecture` skill.
For Domain-Driven Design projects, load the `domain-driven-design` skill.
For event-sourced systems or bounded contexts (events as the source of truth, the Decider write model, event stores, projections and read models, event versioning, snapshots), load the `event-sourcing` skill.
For 12-factor service projects, load the `twelve-factor` skill.
For production observability (wide events, OpenTelemetry, SLOs/alerting, telemetry testing), load the `observability` skill.
For CLI tool design (stream separation, format flags, exit codes, composability), load the `cli-design` skill.
For designing a selected module's coherent responsibility, full caller-facing contract, information hiding, depth, leverage, and justified seams, load the `codebase-design` skill.
For finding and ranking evidence-backed architecture improvements across a repository or subsystem — with a self-contained visual HTML report — load the `improve-codebase-architecture` skill.
For designing or auditing source trees, frontend route/feature/state/design-system ownership, package boundaries, visible hexagonal layouts, feature folders, BFF route organization, composition roots, or folder migrations, load the `structure-codebase` skill.
Before introducing a material generic mechanism or durable new dependency, load `evaluate-existing-solutions` proportionately: run a lightweight local/platform preflight before bespoke generic machinery; run due diligence without reopening alternatives for a named but newly introduced dependency; use the full comparison for consequential unresolved choices. Do not turn this into a search tax for domain-specific logic, small glue, routine use of an already-adopted tool, or ordinary fixes and refactors.
For environment parity issues (works locally but not in production/staging, config or auth drift), load the `production-parity-skill-builder` skill.
For making untestable code testable, load the `finding-seams` skill.
For documenting existing behavior before changes, load the `characterisation-tests` skill.
For multi-surface design audits before code (embed every mock in a scope on one reviewable page with flow diagram + gap cards + per-mock audit checklists), load the `storyboard` skill.
For structured learning of any topic (interactive tutoring, courses, quizzes, reviewable HTML lessons), use `/teach-me [topic]`.
For developer-facing prose — READMEs, guides, tutorials, reference docs, proposals, release notes — load the `technical-writing` skill (reader-first structure, falsifiable claims, agent-readable reference shape).
For discovering and installing agent skills from the open ecosystem (`npx skills`), load the `find-skills` skill.
For adversarial review of plans, acceptance criteria, stories, or design mocks — one question at a time, turning each answer into a new AC / plan paragraph / mock-state spec written back to the source of truth — load the `find-gaps` skill.
For relentless decision-tree interrogation before story splitting, planning, or implementation — one question at a time, with recommended answers and codebase exploration where useful — load the `grill-me` skill.
For an independent second opinion on finished work — spinning up a *different* AI provider's CLI agent (codex/claude/gemini/cursor-agent) at its best model and effort, then arguing constructively until both agents genuinely agree — load the `double-check` skill.

**Project onboarding:** Run `/setup` in any new project to detect its tech stack and generate project-level CLAUDE.md, hooks, commands, and PR review agent in one shot. This replaces the need for `/init`.

**Project-level hooks:** Projects should add a PostToolUse hook in `.claude/settings.json` to run typecheck after Write/Edit on .ts/.tsx files. Use `/setup` to generate this automatically, or use the prettier/eslint hook in this repo's `claude/.claude/settings.json` as a template (note: the curl installer does not install settings.json — only the stow-based install does).

## Output Guardrails

- **Write to files, not chat** — When asked to produce a plan, document, or artifact, always persist it to a file. You may also present it inline for approval, but the file is the source of truth.
- **Plan-only mode** — When asked for a plan, design, or document only, produce ONLY that artifact. Do not write production code, test code, or make any implementation changes unless explicitly asked.
- **Incremental output** — When exploring a codebase, produce a first draft of output within 3-4 tool calls. Refine iteratively rather than front-loading all exploration before producing anything.

## Working with Claude

**Core principle**: Think deeply, follow TDD strictly, capture learnings while context is fresh.

**Quick reference:**
- ALWAYS FOLLOW TDD for behavior change; keep pure refactors/reductions behaviorally green from passing, proportionate preservation evidence
- Assess refactoring after every green (but only if adds value)
- Update CLAUDE.md when introducing meaningful changes
- Ask "What do I wish I'd known at the start?" after significant changes
- Document gotchas, patterns, decisions, edge cases while context is fresh

For detailed TDD workflow, load the `tdd` skill.
For refactoring methodology, load the `refactoring` skill.
For detailed guidance on expectations and documentation, load the `expectations` skill.

## Browser Automation

Prefer `agent-browser` for web automation. If it is not installed, fall back to other available tools (e.g. `WebFetch`, `curl`, or MCP browser tools). Always try `agent-browser` first.

`agent-browser` core workflow:
1. `agent-browser open <url>` - Navigate to page
2. `agent-browser snapshot -i` - Get interactive elements with refs (@e1, @e2)
3. `agent-browser click @e1` / `fill @e2 "text"` - Interact using refs
4. Re-snapshot after page changes

Run `agent-browser --help` for all commands.

## Resources and References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)

## Summary

The key is to write clean, testable, functional code that evolves through small, safe increments. Every change should be driven by a test that describes the desired behavior, and the implementation should be the simplest thing that makes that test pass. When in doubt, favor simplicity and readability over cleverness.
