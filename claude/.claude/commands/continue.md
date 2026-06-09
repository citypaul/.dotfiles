---
description: Pull merged PR on main, create new branch, update plan, and continue work
allowed-tools: Read, Edit, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git branch --show-current`

!`git log --oneline -3`

Working tree:
!`git status --porcelain`

The previous PR has been merged. Continue the workflow:

1. **Safety checks first:**
   - If the working tree is dirty (`git status --porcelain` shows output), STOP and ask whether to stash, commit, or abort — do not switch branches over uncommitted changes.
   - Confirm the PR is actually merged: `gh pr view --json state,mergedAt`. If it is still open, STOP and say so.
2. Switch to main and pull latest: `git checkout main && git pull`
3. Read the plan file to understand what's next
4. If the plan needs updating (e.g., marking completed items), update it
5. Create a new branch for the next piece of work
6. Summarize: what was just completed, what's next

## Constraints

- Do NOT start implementing anything yet — just set up the branch and update the plan
- If no plan file exists in `plans/`, ask what to work on next
