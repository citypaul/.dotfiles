# Development Guidelines for Claude

> **About this file:** v3 architecture generation from the current 4.9.0 package. Core principles live here; detailed patterns load on demand via skills.
>
> **Architecture:**
> - **CLAUDE.md** (this file): Core philosophy + quick reference (~160 lines, always loaded)
> - **Skills**: Detailed patterns loaded on-demand (specification, ubiquitous-language, planning, story-splitting, stack-pull-requests, acceptance-review, debugging, ci-debugging, tdd, testing, mutation-testing, test-design-reviewer, typescript-strict, functional, refactoring, reduce-system-complexity, expectations, front-end-testing, react-testing, hexagonal-architecture, domain-driven-design, event-sourcing, twelve-factor, api-design, secure-oauth-oidc, bff-design, bff-entry-points, cli-design, codebase-design, improve-codebase-architecture, structure-codebase, evaluate-existing-solutions, finding-seams, characterisation-tests, production-parity-skill-builder, storyboard, teach-me, diagrams, technical-writing, find-skills, find-gaps, double-check, graph-engineering, review)
> - **External skills**: Loaded on-demand from community repos (impeccable + 17 steering commands from [pbakaus/impeccable](https://github.com/pbakaus/impeccable), 6 web quality skills from [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills), 3 Next.js skills from [vercel-labs/next-skills](https://skills.sh/vercel-labs/next-skills), grill-me from [mattpocock/skills](https://skills.sh/mattpocock/skills/grill-me), seo-audit from [coreyhaines31/marketingskills](https://skills.sh/coreyhaines31/marketingskills/seo-audit))
> - **Agents**: Specialized subprocesses for verification and analysis
>
> **Previous versions:**
> - v2.0.0: Modular with @docs/ imports (~3000+ lines always loaded)
> - v1.0.0: Single monolithic file (1,818 lines)

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE FOR NEW OR CHANGED BEHAVIOR.** Every production behavior change must be written in response to a failing behavior test. Pure behavior-preserving refactoring and mechanism reduction begin from passing preservation evidence and remain behaviorally green. Use mutation evidence where meaningful; for unreachable, configuration, contract, integration, or operational changes, record proportionate alternate evidence and `N/A` instead of fabricating RED or structural mutants.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state throughout development.

For mutation-testing cadence, a **phase of work** means one PR review boundary. Normally that is one PR-sized, independently mergeable slice; in a cross-slice stack it is one whole-slice member, and in an intra-slice stack it is one focused dependent layer. It does not mean a multi-PR feature/stack as a whole or the numbered lifecycle phases in `README.md`.

## Quick Reference

**Key Principles:**

- Write behavior tests first for new or changed behavior (TDD)
- Test behavior, not implementation
- No unexplained `any`; contain unavoidable interop and justify assertions
- Prefer immutable values and pure logic; isolate necessary mutation and effects
- Cohesive functions behind stable module contracts
- TypeScript strict mode always
- Reuse an existing production schema when it adds test evidence; do not
  redefine the same contract

**Preferred Tools:**

- **Language**: TypeScript (strict mode)
- **Testing**: Follow the repository harness; prefer real-browser evidence
  when the claim depends on browser behaviour and the cost is justified
- **State Management**: Prefer immutable patterns

## Testing Principles

**Core principle**: Test behavior, not implementation. Cover changed and
high-risk behavior proportionately; a coverage percentage is not proof.

**Quick reference:**
- Write behavior tests first for new or changed behavior (TDD non-negotiable)
- Test through the subject's public interface at the layer the claim names (an HTTP endpoint is the wrong interface for a browser claim)
- Use factories for repeated or nested test data; isolated lifecycle hooks and
  clear one-off values are valid
- Tests must document expected business behavior
- Organize tests around behavior and repository ownership, not a universal
  file-count rule

For detailed testing patterns and examples, load the `testing` skill.
For verifying test effectiveness through mutation analysis, load the `mutation-testing` skill at the end-of-phase PR-readiness gate; use its mutator rules earlier for cheap test-design guidance without running the automated harness.

## TypeScript Guidelines

**Core principle**: Strict mode always. Schema-first at trust boundaries, types for internal logic.

**Quick reference:**
- No unexplained `any`; use `unknown` at untrusted boundaries and contain
  unavoidable interop
- No type assertions without justification
- Follow repository convention for `type`/`interface`, then language semantics
- Define schemas at runtime trust boundaries and derive types from them
- Use plain types, smart constructors, or domain values for trusted internal logic

For detailed TypeScript patterns and rationale, load the `typescript-strict` skill.
For API and interface design patterns, load the `api-design` skill.
For OAuth 2.0 or OpenID Connect design, implementation, review, testing, incident analysis, or migration, load the `secure-oauth-oidc` skill.

## Code Style

**Core principle**: Prefer immutable data and pure logic where they make
behavior easier to reason about; keep necessary effects explicit.

**Quick reference:**
- Prefer immutable values; contain mutation where a boundary, library, or
  measured performance need requires it
- Pure functions wherever possible
- Use early returns or composition when they make branching clearer
- Use comments for non-obvious why, constraints, and safety context
- Use an options object when positional parameters are ambiguous or unstable
- Choose array methods or loops by clarity, control flow, and measured needs
- Compose small private functions behind cohesive, stable module contracts; do not equate one helper with one public module

For detailed patterns and examples, load the `functional` skill.

## Development Workflow

**Core principle**: Use fast RED-GREEN-REFACTOR increments for changed behavior. Run mutation testing or review alternate evidence once at the end-of-phase PR-readiness gate, after implementation and refactoring are complete.

**Quick reference:**
- RED: Write a failing behavior test before new or changed behavior
- GREEN: Write MINIMUM code to pass test
- REFACTOR OR REDUCE: Assess applicable improvements while ordinary behavior tests stay green
- REPEAT: Continue the inner cycle without running the automated mutation harness after each increment, refactor, or commit
- PRE-PR MUTATION GATE: When the phase is otherwise ready for a PR, run mutation testing once for the accumulated scope where meaningful; otherwise record `N/A` plus proportionate reachability, configuration, contract, integration, or operational evidence
- KILL MUTANTS: During that gate, address valuable survivors and re-run focused/diff mutation checks as part of the same gate (ask the human when value is ambiguous)
- **Wait for commit approval** before every commit
- Each increment leaves codebase in working state
For detailed TDD workflow, load the `tdd` skill.
For a behavior-changing planned slice, load `tdd`, `testing`, and applicable refactoring guidance before code changes begin. Use the `mutation-testing` skill's mutator rules for cheap test-design guidance, but do not run its harness until the end-of-phase PR-readiness gate. For a pure behavior-preserving refactor/reduction, load only the applicable testing, refactoring, and reduction skills during implementation, then apply mutation testing or alternate evidence at the same PR gate; load `reduce-system-complexity` when net mechanism removal is claimed, and record why any other skill is `N/A`. Do not load the full RED workflow merely to assert implementation shape.
For refactoring methodology, load the `refactoring` skill.
For removing total branches, states, dependencies, layers, flags, retries, jobs, or operational moving parts from a selected existing path while conserving behavior, load the `reduce-system-complexity` skill. Pure reductions use the verified REFACTOR path, not a fabricated structural RED test.
For fuzzy product/design decisions, load `grill-me` when installed; otherwise
use the host's one-question mechanism or `specification` to pressure-test the
decision tree before writing stories or plans.
For turning fuzzy intent into shared understanding and acceptance criteria — agent-facilitated draft followed by accountable, risk-proportionate human review — load the `specification` skill.
For naming domain concepts, glossary work, or any new/changed domain term — the five-step language protocol, never silent coinage — load the `ubiquitous-language` skill.
For broad stories, epics, features, or backlog items, load `story-splitting` to create child stories before planning.
For tightening an existing story, plan, acceptance criteria set, or mock spec, load `find-gaps` to write confirmed answers back into the artifact.
For significant implementation work, load `planning` to turn one selected child story or narrow capability into the repository's declared planning workflow and location; use `plans/` only as the documented fallback.
When one planned vertical slice may be too large for review, or later slices should start on the same evolving baseline before lower PRs merge, load `stack-pull-requests` with `planning` to choose independent PRs or an explicit hard-/flow-lineage stack without turning technical layers into stories or slices.
For CI failure diagnosis, load the `ci-debugging` skill.
For local or runtime failure diagnosis, load `debugging` to preserve evidence, localize one causal hypothesis at a time, and fix the earliest shared owning boundary when a fix is requested.
For a read-only decision on whether finished implementation satisfies an authoritative requirement, load `acceptance-review` and report every criterion plus its evidence and exact verdict.
For hexagonal architecture projects, load the `hexagonal-architecture` skill.
For Domain-Driven Design projects, load the `domain-driven-design` skill.
For event-sourced systems or bounded contexts (events as the source of truth, the Decider write model, event stores, projections and read models, event versioning, snapshots), load the `event-sourcing` skill.
For 12-factor service projects, load the `twelve-factor` skill.
For production observability (wide events, OpenTelemetry, SLOs/alerting, telemetry testing), load the `observability` skill.
For CLI tool design (stream separation, format flags, exit codes, composability), load the `cli-design` skill.
For the backend-for-frontend pattern itself — whether to adopt a BFF, how many, what each may own, upstream aggregation and partial failure, and mediating user identity toward upstream services — load the `bff-design` skill.
For browser-facing BFF or backend HTTP entry points — public/protected access classification, authentication middleware, session cookies, CSRF/Origin policy, protected SSE/WebSocket registration, and endpoint-protection enforcement — load the `bff-entry-points` skill.
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
For relentless decision-tree interrogation before story splitting, planning, or implementation, load `grill-me` when installed; otherwise use `specification` or the host's one-question mechanism.
For a rigorous second opinion on finished work, load `double-check`. It selects an available reviewer dynamically, prefers a different provider when possible, labels a same-provider fresh-context fallback honestly, and bounds unresolved disagreement rather than requiring artificial consensus.
For composing several installed skills into one orchestrated multi-agent run — an agent graph where each sub-agent node loads exactly one skill, with fan-out, adversarial verification, and synthesis stages — load the `graph-engineering` skill.
For reviewing any change boundary — uncommitted work-in-progress, a branch, a stacked layer, a diff, or a pull request — through composable skill lenses (`/review`, one sub-agent per lens, verified findings, one ranked report), or for the PR-readiness evidence gate before creating a PR, load the `review` skill.

**Project onboarding:** Run `/setup` only when the user asks to onboard or
configure a project and authorizes the generated project files. Ordinary
read-only or narrowly scoped work does not trigger setup.

**Project-level hooks:** When the repository supports hooks and the user authorizes project configuration, consider a PostToolUse typecheck/format hook using the repository's existing toolchain. `/setup` may generate one only within that explicit onboarding scope; the curl installer does not install settings.json.

## Output Guardrails

- **Honor the requested artifact boundary** — Persist a plan or document only
  when the user asks for a file or the repository declares that durable owner.
  Otherwise answer in chat without creating a new source of truth.
- **Plan-only mode** — When asked for a plan, design, or document only, produce ONLY that artifact. Do not write production code, test code, or make any implementation changes unless explicitly asked.
- **Incremental output** — When exploring a codebase, produce a first draft of output within 3-4 tool calls. Refine iteratively rather than front-loading all exploration before producing anything.

## Working with Claude

**Core principle**: Think deeply, follow TDD strictly, capture learnings while context is fresh.

**Quick reference:**
- ALWAYS FOLLOW TDD for behavior change; keep pure refactors/reductions behaviorally green from passing, proportionate preservation evidence
- Assess refactoring after every green (but only if adds value)
- Ask "What do I wish I'd known at the start?" after significant changes
- Route durable, non-obvious learnings through `expectations` to their actual
  owner: source/tests, glossary, accepted decision mechanism, maintained docs,
  active plan, or repository working policy
- Update CLAUDE.md only for local working policy it is declared to own, and only
  when the request or repository workflow authorizes that write

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

The key is to write clean, testable, functional code that evolves through small, safe increments. Drive production-behavior changes with a test that describes the desired behavior; use claim-appropriate evidence for documentation, configuration, dependency, generated, CI, and operational changes. The implementation should be the simplest thing that makes the test or other governing check pass. When in doubt, favor simplicity and readability over cleverness.
