---
"dotfiles": minor
---

feat: migrate to skills-based architecture for on-demand context loading (v3.0)

## Skills (5 auto-discovered patterns)
- `tdd` - RED-GREEN-REFACTOR workflow
- `typescript-strict` - TypeScript strict mode patterns
- `functional` - Functional programming with immutability
- `refactoring` - Assessment framework and priorities
- `testing` - Factory patterns and behavior testing

## Commands (1 slash command)
- `/pr` - Create pull requests (no test plan needed with TDD)

## Hooks
- PostToolUse hook for Prettier + ESLint auto-formatting on TypeScript files

## Context Optimization
- CLAUDE.md reduced from ~3000+ lines (with @docs imports) to ~120 lines
- Detailed patterns now loaded on-demand via skills when relevant

## Breaking Changes
- Removed docs/testing.md, docs/typescript.md, docs/code-style.md, docs/workflow.md
- Content migrated to skills (loaded on-demand instead of always)
- Kept docs/examples.md and docs/working-with-claude.md

## Migration
- Users of v2.0.0 can use `--version v2.0.0` to keep modular docs
- Skills provide same content but with better context efficiency
