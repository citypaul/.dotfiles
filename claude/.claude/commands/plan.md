---
description: Create a plan document on a branch with a PR - no code changes
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log main..HEAD --oneline`

Current branch:
!`git branch --show-current`

Create a plan for the requested work:

1. If on main, create a new feature branch first
2. Explore the codebase to understand the relevant areas
3. Write a PLAN.md file using the planning skill's structure (Goal, Acceptance Criteria, Steps with Test/Implementation/Done-when for each)
4. Create a draft PR with the plan for review

## Constraints

- **Do NOT write any production code, test code, or implementation files**
- **Plan document only** — the only file you should create/modify is PLAN.md
- Write the plan to a file, never present it inline in chat
- **Prefer multiple small PRs** — break work into the smallest independently mergeable units. Each PR should be reviewable in isolation.
- Each step in the plan must be small enough for a single commit
- Each step must follow RED-GREEN-REFACTOR (specify the failing test first)

## Pre-PR Quality Gate

Include this quality gate in the plan as an explicit step before each PR:

1. **Mutation testing** — Run the `mutation-testing` skill. All surviving mutants must be killed or justified as equivalent mutants.
2. **Refactoring assessment** — Run the `refactoring` skill. Only refactor if it adds genuine value. Commit before refactoring.
3. **Typecheck and lint pass** — Run the project's typecheck and lint commands with zero errors.
4. **DDD glossary check** (if project uses DDD) — Verify all new/changed types, functions, and test names conform to the project's DDD glossary.
