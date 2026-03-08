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
- Each step in the plan must be small enough for a single commit
- Each step must follow RED-GREEN-REFACTOR (specify the failing test first)
