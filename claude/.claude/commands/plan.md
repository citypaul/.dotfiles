---
description: Create a plan document on a branch with a PR - no code changes
argument-hint: [feature or work to plan]
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log main..HEAD --oneline`

Current branch:
!`git branch --show-current`

Active plans:
!`ls plans/ 2>/dev/null || echo "No plans/ directory found"`

Create a vertical-slice plan for the requested work: $ARGUMENTS

1. If on main, create a new feature branch first
2. Explore the codebase to understand the relevant areas
3. If the request has unresolved product or design decisions, use `grill-me` before writing stories or plans
4. If the request is still a large story, epic, broad feature idea, or backlog item, use the `story-splitting` skill first to identify independently valuable child stories
5. If the selected story, acceptance criteria, or mocks are ambiguous, use `find-gaps` to tighten the artifact before finalizing the plan
6. Write the plan to `plans/<feature-name>.md` (create the directory if needed)
7. Create a PR with the plan for review

## Plan File Structure

Each plan file is self-contained:

```markdown
# Plan: [Feature Name]

**Branch**: feat/feature-name
**Status**: Active

## Goal

[One sentence describing the outcome]

## Acceptance Criteria

[Behaviour-driven criteria — describe observable business outcomes, not implementation details.
Tests at every level (unit, browser, integration) should verify behaviour.]

- [ ] Criterion 1
- [ ] Criterion 2

## Slices

Every slice should be the thinnest useful end-to-end behaviour: actor, trigger, observable outcome, production path, and smallest deployable value.
Every slice follows RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR. No production code without a failing test.
Every slice must explicitly load `tdd`, `testing`, `mutation-testing`, and `refactoring` before implementation. Read the project's CLAUDE.md and testing rules before writing slices.

### Slice 1: [One sentence observable behaviour]

**Value**: Who gets what value?
**Path**: Entry point -> business path -> state/output -> observability. Name any intentionally skipped states.
**Required implementation skills**: Before code changes, load `tdd`, `testing`, `mutation-testing`, and `refactoring` (plus UI/domain/architecture skills when relevant).
**Acceptance criteria**: What observable behaviour proves this slice is done? Present to human and get confirmation before writing any code.
**RED**: What failing test will we write? (Describes expected behaviour, not implementation.)
**GREEN**: What minimum code makes the test pass?
**MUTATE**: Run `mutation-testing` skill — produce a report.
**KILL MUTANTS**: Address surviving mutants (ask human when value is ambiguous).
**REFACTOR**: Assess improvements (only if they add value).
**Done when**: How do we know it's complete?

### Slice 2: ...

## Pre-PR Quality Gate

Before each PR:
1. Mutation testing — run `mutation-testing` skill
2. Refactoring assessment — run `refactoring` skill
3. Typecheck and lint pass
4. DDD glossary check — if the project uses DDD, verify all domain terms match the canonical glossary

---
*Delete this file when the plan is complete. If `plans/` is empty, delete the directory.*
```

## Constraints

- **Do NOT write any production code, test code, or implementation files**
- **Plan document only** — the only file you should create/modify is in `plans/`
- Write the plan to a file, never present it inline in chat
- **Prefer vertical slices** — break work into the smallest independently mergeable units that deliver observable value through the real production path.
- **Avoid layer-cake plans** — database-only, API-only, UI-only, and "do all plumbing first" work is allowed only when it names the next vertical slice it unlocks and has independent verification.
- Each slice in the plan must be small enough for a single PR. A slice may contain multiple TDD commits, but it must be reviewable and mergeable as one coherent unit.
- **Skill routing is mandatory** — every slice must list `tdd`, `testing`, `mutation-testing`, and `refactoring` as required implementation skills before code changes begin.
- **TDD is mandatory** — every slice must specify the failing test first (RED), then the minimum implementation (GREEN), then mutation testing to verify test effectiveness, then kill surviving mutants, then refactoring assessment. No exceptions.
- **Test behaviour, not implementation** — acceptance criteria and test descriptions must describe observable outcomes (what the user sees, what the API returns), never internal details (what function was called, what query was run)
- **Read project testing rules** — before writing slices, read the project's CLAUDE.md and any testing guidelines to ensure tests follow the project's conventions (factories, MSW vs mocks, real DB vs stubs, etc.)
