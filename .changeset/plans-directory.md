---
"@paulhammond/dotfiles": minor
---

Replace single PLAN.md with plans/ directory system:

- Plans now live in `plans/<feature-name>.md` — multiple plans can coexist without conflicts across branches or worktrees
- Remove WIP.md and LEARNINGS.md — simplify to just plan files that get deleted when complete
- Remove PLANS.md index file — the directory itself is the index, avoiding merge conflicts
- Update /plan command, /continue command, planning skill, progress-guardian agent, agents README, and main README for consistency
- Fix /plan command to create regular PR (not draft)
