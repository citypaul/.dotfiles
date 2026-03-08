---
"@paulhammond/dotfiles": minor
---

Improvements based on Claude Code insights analysis (63 sessions):

- Add output guardrails section to CLAUDE.md (write to files, plan-only mode, incremental output)
- Add ci-debugging skill for systematic CI failure diagnosis
- Add /plan slash command for plan-only workflows
- Improve /generate-pr-review to also generate project hooks and /pr command
- Deduplicate typescript-strict and functional skills (~460 lines removed)
- Extract hexagonal-architecture as opt-in skill (not all projects use it)
- Add typecheck hook pattern docs and hexagonal-architecture reference to CLAUDE.md
- Add agent decision framework to agents README
