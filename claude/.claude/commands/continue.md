---
description: Pull merged PR on main, create new branch, update plan, and continue work
allowed-tools: Read, Edit, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git branch --show-current`

!`git log --oneline -3`

The previous PR has been merged. Continue the workflow:

1. Switch to main and pull latest: `git checkout main && git pull`
2. Read the plan file to understand what's next
3. If the plan needs updating (e.g., marking completed items), update it
4. Create a new branch for the next piece of work
5. Summarize: what was just completed, what's next

## Constraints

- Do NOT start implementing anything yet — just set up the branch and update the plan
- If no plan file exists in `plans/`, ask what to work on next
