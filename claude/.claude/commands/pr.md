---
description: Create a pull request following standards
allowed-tools: Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log main..HEAD --oneline`

Changes summary:
!`git diff main...HEAD --stat`

Create a PR with:

## Summary
- 1-3 bullet points describing the changes
- Focus on WHAT changed and WHY

Note: No test plan section needed - TDD means tests are already written and passing.

Use `gh pr create` with appropriate title and body.
