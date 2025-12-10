---
"@paulhammond/dotfiles": minor
---

feat: skills-based architecture with planning workflow (v3.0)

## Skills (7 auto-discovered patterns)
- `tdd` - RED-GREEN-REFACTOR workflow
- `testing` - Factory patterns and behavior testing
- `typescript-strict` - TypeScript strict mode patterns
- `functional` - Functional programming with immutability
- `refactoring` - Assessment framework and priorities
- `expectations` - Working expectations and documentation practices
- `planning` - **NEW** Small increments, three-document model, commit approval

## Planning Workflow (NEW)

Three-document model for significant work:
- **PLAN.md** - What we're doing (changes require approval)
- **WIP.md** - Where we are now (constantly updated)
- **LEARNINGS.md** - What we discovered (merged at end, then deleted)

Key principles:
- All work in small, known-good increments
- TDD non-negotiable (RED-GREEN-REFACTOR)
- **Commit approval required** before every commit
- Learnings captured as they occur, merged into CLAUDE.md/ADRs at end

## Agents
- Renamed `wip-guardian` → `progress-guardian`
- `progress-guardian` now manages three-document model

## Commands (1 slash command)
- `/pr` - Create pull requests (no test plan needed with TDD)

## Context Optimization
- CLAUDE.md reduced to ~100 lines (always loaded)
- No @imports - fully self-contained
- Detailed patterns loaded on-demand via skills

## Breaking Changes from v2.0
- Removed `docs/` directory entirely
- Content migrated to skills (loaded on-demand instead of always)
- `wip-guardian` renamed to `progress-guardian` with enhanced functionality

## Migration from v2.0
- Use `--version v2.0.0` with install script to keep modular docs
- Skills provide same content but with better context efficiency
