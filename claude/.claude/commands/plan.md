---
description: Create a plan document on a branch with a PR - no code changes
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log main..HEAD --oneline`

Current branch:
!`git branch --show-current`

Active plans:
!`ls plans/ 2>/dev/null || echo "No plans/ directory found"`

Create a plan for the requested work:

1. If on main, create a new feature branch first
2. Explore the codebase to understand the relevant areas
3. Write the plan to `plans/<feature-name>.md` (create the directory if needed)
4. Create a PR with the plan for review

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

## Steps

Every step follows RED-GREEN-REFACTOR-MUTATE. No production code without a failing test.
Read the project's CLAUDE.md and testing rules before writing steps.

### Step 1: [One sentence description]

**RED**: What failing test will we write? (Describes expected behaviour, not implementation.)
**GREEN**: What minimum code makes the test pass?
**REFACTOR**: Assess improvements (only if they add value).
**MUTATE**: Run `mutation-testing` skill to verify tests catch real bugs.
**Done when**: How do we know it's complete?

### Step 2: ...

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
- **Prefer multiple small PRs** — break work into the smallest independently mergeable units. Each PR should be reviewable in isolation.
- Each step in the plan must be small enough for a single commit
- **TDD is mandatory** — every step must specify the failing test first (RED), then the minimum implementation (GREEN), then refactoring assessment, then mutation testing to verify test effectiveness. No exceptions.
- **Test behaviour, not implementation** — acceptance criteria and test descriptions must describe observable outcomes (what the user sees, what the API returns), never internal details (what function was called, what query was run)
- **Read project testing rules** — before writing steps, read the project's CLAUDE.md and any testing guidelines to ensure tests follow the project's conventions (factories, MSW vs mocks, real DB vs stubs, etc.)
