---
"@paulhammond/dotfiles": minor
---

Improvements based on Claude Code insights analysis (63 sessions):

- Add output guardrails section to CLAUDE.md (write to files, plan-only mode, incremental output)
- Add ci-debugging skill for systematic CI failure diagnosis
- Add /plan slash command for plan-only workflows
- Add /continue slash command for post-merge workflow (pull, branch, update plan)
- Improve /generate-pr-review to also generate project hooks and /pr command
- Deduplicate typescript-strict and functional skills (~460 lines removed)
- Extract hexagonal-architecture as opt-in skill (not all projects use it)
- Add domain-driven-design as opt-in skill with glossary enforcement
- Add typecheck hook pattern docs and hexagonal-architecture reference to CLAUDE.md
- Add agent decision framework to agents README
- Trim adr agent (~585 → ~250 lines) and ts-enforcer agent (~649 → ~300 lines) via cross-references
- Update front-end-testing and react-testing skills to recommend Vitest Browser Mode
- Add cross-references between testing, mutation-testing, and test-design-reviewer skills
- Add Pick<T> tip to testing skill factory pattern
- Add corrected example to refactoring skill speculative code section
- Update skills list in CLAUDE.md header to include all 15 skills
- Add /setup command for one-shot project onboarding (replaces /init)
- Update README.md with all new skills, commands, and Vitest Browser Mode references
- Update install-claude.sh to include all 15 skills and 5 commands
- Add "Recommended Flow" section to README and agents README showing full command lifecycle with rationale
- Improve skill frontmatter descriptions with trigger phrases and negative triggers per Anthropic best practices
- Add Playwright/Browser Mode test idempotency requirement to front-end-testing and react-testing skills
