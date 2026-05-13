---
description: Create a pull request following standards
allowed-tools: Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log main..HEAD --oneline`

Changes summary:
!`git diff main...HEAD --stat`

## Pre-PR Quality Gate

Before creating the PR, verify each of these has been completed:

1. **Implementation skill routing** — For each implemented slice, `tdd`, `testing`, `mutation-testing`, and `refactoring` were loaded before code changes began.
2. **TDD evidence** — RED happened before GREEN; every production change was demanded by a failing behavior test.
3. **Mutation testing** — The `mutation-testing` skill has been run. All surviving mutants are killed or justified as equivalent mutants.
4. **Refactoring assessment** — The `refactoring` skill has been run. Any valuable refactoring has been committed separately.
5. **Typecheck and lint pass** — The project's typecheck and lint commands pass with zero errors.
6. **DDD glossary check** (if project uses DDD) — All new/changed types, functions, and test names conform to the project's DDD glossary.

If any step has not been completed, run it now before creating the PR.

## PR Creation

Create a PR with:

### Summary
- 1-3 bullet points describing the changes
- Focus on WHAT changed and WHY
- **Prefer small PRs** — if the change could be split into independently mergeable units, consider doing so

Note: No test plan section needed - TDD means tests are already written and passing.

Use `gh pr create` with appropriate title and body.
