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

## Single PR Or Sequential Vertical Slices

1. Confirm the current PR is merged with `gh pr view --json state,mergedAt`. If it is open, STOP.
2. Switch to the detected default branch and pull the latest changes.
3. Mark the completed implementation slice in the plan, with user approval for the plan edit.
4. Create a new branch from updated trunk for the next independent slice.
5. Summarize what merged and what comes next.

Sequential implementation or reduction slices target trunk one after another. Do not base the next one on an unmerged sibling.

## Stacked PR Layers

Load `stack-pull-requests` and verify current preview syntax with `gh stack --help`.

- **Advance before lower PRs merge:** Require the current top layer to be committed and known-good. Add the next branch from the current top; do not switch to trunk or require review approval/merge first.
- **Continue after lower layers merge:** Run interactive `gh stack sync` to update trunk, rebase remaining layers, push safely, and move to the next unmerged layer. Do not recreate that layer from trunk. Use `--prune` only after listing the merged local branches it will delete and obtaining explicit user approval.
- **Respond to lower-layer feedback:** Check out the owning lower branch, make no implementation change in this command, and report that the eventual fix must be rebased upstack and rechecked.
- **Finish the stacked slice:** When every layer in the current slice is merged, mark the slice complete with approval, return to the updated default branch, and create the next independent slice branch if the plan has one.

Update the plan's nested delivery map only with user approval. Summarize the current layer, parent, next layer, and whether the next action is build, review, rebase, or merge.

## Constraints

- Do NOT start implementing anything yet — just set up the branch and update the plan
