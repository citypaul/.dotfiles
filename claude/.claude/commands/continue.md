---
description: Continue after a merged independent PR or advance and sync a dependent PR stack
allowed-tools: Read, Edit, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git branch --show-current`

!`git log --oneline -3`

Working tree:
!`git status --porcelain`

Read the active plan and current slice's `Delivery` mode before changing branches. If no plan exists, use stack metadata only when reliable; otherwise follow the single-PR path.

## Safety

- If the working tree is dirty, STOP and ask whether to stash, commit, or abort.
- Do not implement the next slice or layer; only update the plan with approval and prepare the correct branch.

## Independent PRs

1. Confirm the current PR is merged with `gh pr view --json state,mergedAt`. If it is open, STOP.
2. Switch to the detected default branch and pull the latest changes.
3. Mark the completed implementation slice in the plan, with user approval for the plan edit.
4. Create a new branch from updated trunk for the next independent slice.
5. Summarize what merged and what comes next.

Independent implementation or reduction slices target trunk. Do not base the next one on an unmerged sibling unless the approved plan explicitly makes both part of a cross-slice stack.

## Stacked PRs

Load `stack-pull-requests` and verify current preview syntax with `gh stack --help`.

- **Advance before lower PRs merge:** Require the current top PR boundary to be committed and known-good. Add the next intra-slice layer or dependent slice from the current top; do not switch to trunk or require review approval/merge first.
- **Continue after lower boundaries merge:** Run interactive `gh stack sync` to update trunk, rebase remaining boundaries, push safely, and move to the next unmerged boundary. Do not recreate that boundary from trunk. Use `--prune` only after listing the merged local branches it will delete and obtaining explicit user approval.
- **Respond to lower-boundary feedback:** Check out the owning lower branch, make no implementation change in this command, and report that the eventual fix must be rebased upstack and rechecked.
- **Finish the stack scope:** Mark each cross-slice member complete when its owning PR lands; mark an intra-slice delivery complete when its top lands. When the whole stack is merged, return to updated trunk and create the next independent slice branch if the plan has one.

Update the plan's delivery map only with user approval. Summarize the current PR boundary, owning slice, parent, next boundary, and whether the next action is build, review, rebase, or merge.

## Constraints

- Do NOT start implementing anything yet — just set up the branch and update the plan
