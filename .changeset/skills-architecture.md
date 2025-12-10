---
"dotfiles": minor
---

feat: truly lean CLAUDE.md with no @imports (v3.1)

## Skills (6 auto-discovered patterns)
- `tdd` - RED-GREEN-REFACTOR workflow
- `testing` - Factory patterns and behavior testing
- `typescript-strict` - TypeScript strict mode patterns
- `functional` - Functional programming with immutability
- `refactoring` - Assessment framework and priorities
- `expectations` - Working expectations and documentation practices (NEW)

## Commands (1 slash command)
- `/pr` - Create pull requests (no test plan needed with TDD)

## Context Optimization
- CLAUDE.md reduced from ~350 lines (v3.0 with @imports) to ~100 lines
- Removed all @imports - CLAUDE.md is now truly self-contained
- Detailed patterns loaded on-demand via skills only when relevant

## Breaking Changes from v3.0
- Removed `docs/` directory entirely
- `docs/examples.md` content now in relevant skills (functional, testing)
- `docs/working-with-claude.md` converted to `expectations` skill
- Removed duplicate `.claude/README.md` (consolidated into `agents/README.md`)
- Test factory pattern deduplicated (in `testing` skill only, referenced from `tdd`)

## Migration from v3.0
- No action needed - install script updated
- `expectations` skill replaces `docs/working-with-claude.md`
- Skills now reference each other where appropriate
