---
description: Work a labelled GitHub issue to a reviewable PR, pick the next one, address review comments, watch delegated PRs, or land a PR marked ready
argument-hint: "#<issue> | next | review #<pr> | watch | land #<pr>"
allowed-tools: Read, Glob, Grep, Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(npm:*), Bash(npx:*), Bash(agent-browser:*), Bash(timeout:*), Agent, EnterWorktree
---

Current branch:
!`git branch --show-current`

Repository:
!`gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || git remote get-url origin 2>/dev/null || echo "unknown: no origin remote"`

Project delegation settings (`.claude/delegation.md`):
!`cat .claude/delegation.md 2>/dev/null || echo "none"`

## Settings

If the settings above read `none`, reply "This project has no `.claude/delegation.md`, so `/delegate` is not set up here. Add one with a **Parameters** table for the `delegating-github-issues` skill and a **Project rules** list." and stop. Never guess a project's settings.

Otherwise the settings file's **Parameters** table sets the skill's parameters; any parameter it leaves out takes the skill's default. Its **Project rules** apply inside every delegated run. Owner and repo come from the **Repository** line above: strip any `https://github.com/` or `git@github.com:` prefix and `.git` suffix. A value in the settings file wins over it.

## Mode

Parse `$ARGUMENTS`:

- `#<n>` or a bare number → **Work** issue `n`.
- `next` → **Pick**, then **Work** the result.
- `review #<n>` or `review <n>` → **Review** PR `n`.
- `watch` → one **Watch** pass. Run it as `/loop /delegate watch` to keep watching.
- `land #<n>` or `land <n>` → **Land** PR `n`.
- Anything else → print the five forms above and stop.

## Procedure

Load the `delegating-github-issues` skill and follow the named entry point with the parameters above.

These rules apply in every project, alongside its Project rules:

- Wait for commit approval before every commit in **Work** or **Review** started by hand. **Watch**, the **Review** and **Land** runs it starts, and `land #<n>` commit without asking.
- Commit trailer `Co-Authored-By: <the model running this delegation> <noreply@anthropic.com>`. Name the model that actually did the work, not a fixed one, or the attribution is false the first time a different model runs `/delegate`. PR footer `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

The final line of the run is the PR URL, the merge SHA, the Watch pass report, or the one-line reason the run stopped.
