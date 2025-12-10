# Changelog

## 3.0.0

### Major Changes

- fd148e9: feat: skills-based architecture with planning workflow (v3.0)

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

## 2.3.0

### Minor Changes

- Add Claude Code settings.json with claude-powerline statusline and plugins
  - Add `claude/.claude/settings.json` with personal Claude Code configuration
  - Configure [claude-powerline](https://github.com/Owloops/claude-powerline) for vim-style statusline with usage tracking and git integration
  - Enable official Anthropic plugins: feature-dev, frontend-design, hookify, learning-output-style, plugin-dev, security-guidance
  - Document settings.json in README with explanation of each plugin and how to use/merge with existing settings

## 2.2.0

### Minor Changes

- db4fc5c: Add use-case-data-patterns agent for architectural analysis

  Added a new agent that analyzes how user-facing use cases map to underlying data access patterns and architectural implementation in the codebase. This agent helps developers understand existing patterns before implementing new features.

  This agent is adapted from [Kieran O'Hara's dotfiles](https://github.com/kieran-ohara/dotfiles/blob/main/config/claude/agents/analyse-use-case-to-data-patterns.md). Thank you to Kieran O'Hara for creating and sharing this excellent agent specification.

  Key features:

  - Creates comprehensive analytical reports mapping use cases to data patterns
  - Traces through architecture layers (endpoints, middleware, business logic, data access)
  - Identifies database patterns, caching strategies, and external integrations
  - Highlights gaps and provides recommendations
  - Does NOT edit files - purely analytical

## 2.1.2

### Patch Changes

- 1e63ef7: Fix YAML frontmatter syntax in all agent files

  All custom agent files had malformed YAML in the description field causing
  parsing errors on GitHub ("mapping values are not allowed in this context").

  **Fixed:**

  - Removed embedded examples with 'nn' pseudo-newlines from description fields
  - Converted descriptions to YAML folded block scalar (>) format for proper parsing
  - All agent files now have valid YAML frontmatter per Claude Code documentation

  **Agents Updated:**

  - refactor-scan.md
  - tdd-guardian.md
  - ts-enforcer.md
  - docs-guardian.md
  - learn.md
  - wip-guardian.md
  - adr.md

  Per Claude Code official docs, the description field should be a concise natural
  language description for task matching, not include examples. Examples belong in
  the system prompt body, not YAML frontmatter.

## 2.1.1

### Patch Changes

- 87aec6a: fix: add correct front matter to agent files

  Updated agent files (adr.md, wip-guardian.md, docs-guardian.md, learn.md, refactor-scan.md, tdd-guardian.md, ts-enforcer.md) to include proper front matter with name, description, tools, model, and color fields required for agent functionality.

## 2.1.0

### Minor Changes

- 4c773ac: Add wip-guardian and adr agents for workflow management and architectural decisions

  **New Claude Code Agents:**

  Added two new specialized agents that integrate with the existing agent system:

  1. **`wip-guardian`** - Work In Progress Guardian

     - Creates and maintains living `WIP.md` plan documents for complex, multi-step features
     - Tracks current progress, next steps, and blockers
     - Enforces small PRs, incremental work, tests always passing
     - Orchestrates all other agents at appropriate times (tdd-guardian, ts-enforcer, refactor-scan, adr, learn, docs-guardian)
     - Updates plan as learning occurs
     - **Deletes `WIP.md` when work completes** (ephemeral short-term memory)
     - Identifies ADR opportunities during development
     - Prevents context loss during multi-day features

  2. **`adr`** - Architecture Decision Records
     - Creates ADRs for significant architectural decisions
     - 5-question decision framework for determining when ADRs are needed
     - Documents alternatives considered, trade-offs, and consequences
     - Maintains ADR index in `docs/adr/README.md`
     - Integrated with wip-guardian and docs-guardian
     - Prevents "why did we do it this way?" confusion
     - Clear guidance on when NOT to create ADRs (trivial choices, temporary workarounds, standard patterns)

  **Agent System Enhancements:**

  - Updated `.claude/agents/README.md` with comprehensive overview of all 7 agents
  - Added clear distinctions between agent purposes and lifespans
  - Added complete workflow integration showing how agents work together
  - Added decision matrix for which agent to use when
  - Added documentation type comparison table (wip vs adr vs learn vs docs)

  **Key Features:**

  - **wip-guardian orchestrates the entire development workflow:**

    - Invokes tdd-guardian for RED-GREEN-REFACTOR cycle
    - Invokes ts-enforcer before commits/PRs
    - Invokes refactor-scan after green tests
    - Invokes adr when architectural decisions arise
    - Invokes learn when significant learnings occur
    - Invokes docs-guardian when features complete

  - **Clear documentation boundaries established:**
    - `wip-guardian`: Temporary progress tracking (deleted when done)
    - `adr`: Permanent "why" (architectural decisions)
    - `learn`: Permanent "how" (gotchas, patterns)
    - `docs-guardian`: Permanent "what" (features, API, setup)

  **Documentation Updates:**

  - Updated README.md agent count from 5 to 7 agents
  - Added comprehensive sections for both new agents in README
  - Updated installation instructions to include new agent download commands
  - Updated all agent count references throughout documentation

## 2.0.4

### Patch Changes

- 546c057: Improve installation documentation order and clarity

  **Fixed:**

  - Option 3 now correctly uses v1.0.0 single-file version (v2.0.0 had broken imports)
  - Installation options now ordered by recommendation (global install first, not third)
  - Navigation table accurately describes each option's purpose

  **Added:**

  - Quick navigation table by user situation
  - "Best for" and "Why choose this" sections for each option
  - Clear tradeoffs for v1.0.0 vs v2.0.0 choice
  - Workflow explanation before installation options
  - Agent invocation examples integrated into workflow section

  **Changed:**

  - Moved version note to end of section (less critical information)
  - Removed duplicate sections for cleaner structure
  - First navigation row now says "I want this on all my personal projects" instead of misleading "I want this working in 30 seconds"

## 2.0.3

### Patch Changes

- c673d57: Fix automated tagging and releases for private packages

  The workflow wasn't creating git tags or GitHub releases automatically because
  `pnpm changeset tag` only works for packages published to npm. Since this
  package has `"private": true` (GitHub releases only, no npm), we need to
  manually create tags and releases.

  This adds a new workflow step that:

  - Reads the version from package.json after changesets bumps it
  - Creates and pushes a git tag (v2.0.x format)
  - Creates a GitHub Release from that tag

  Future releases (v2.0.2+) will now be fully automated when the Version
  Packages PR is merged.

## 2.0.2

### Patch Changes

- e5377a7: Fix automated tagging and releases for private packages

  The workflow wasn't creating git tags or GitHub releases automatically because
  `pnpm changeset tag` only works for packages published to npm. Since this
  package has `"private": true` (GitHub releases only, no npm), we need to
  manually create tags and releases.

  This adds a new workflow step that:

  - Reads the version from package.json after changesets bumps it
  - Creates and pushes a git tag (v2.0.x format)
  - Creates a GitHub Release from that tag

  Future releases (v2.0.2+) will now be fully automated when the Version
  Packages PR is merged.

## 2.0.1

### Patch Changes

- e5b9d00: Add node_modules to .gitignore

  The changesets action accidentally committed node_modules/ directory in PR #21.
  This adds node_modules/ to .gitignore to prevent this from happening.

- 004d570: Fix GitHub Actions workflow pnpm version incompatibility

  The release workflow failed again after adding pnpm-lock.yaml because the
  lockfile was generated with pnpm v10 but the workflow used pnpm v8, causing:

  WARN Ignoring not compatible lockfile at pnpm-lock.yaml
  ERR_PNPM_NO_LOCKFILE Cannot install with "frozen-lockfile"

  This updates the GitHub Actions workflow to use pnpm v10 to match the lockfile.

- 039e448: Fix GitHub Actions workflow to correctly run changesets versioning

  The workflow was failing with "No commits between main and changeset-release/main"
  because the version command was configured as `pnpm version` (which just prints
  version info) instead of `pnpm changeset version` (which actually bumps versions).

  This also simplifies the workflow to use a single changesets action call that
  handles both creating the Version Packages PR and creating GitHub releases.

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2025-11-01

### BREAKING CHANGES

**Modular CLAUDE.md Structure**

CLAUDE.md has been split from a single 1,818-line file into a modular structure:

- Main CLAUDE.md reduced to 156 lines (core philosophy + quick reference)
- Detailed content extracted to 6 separate files in `docs/` directory
- **All imports use absolute paths** (`@~/.claude/docs/...`) for dotfiles compatibility

**Why this is breaking:**

- If you manually created symlinks or custom imports, you'll need to update paths
- The file structure has changed (though the monolithic version still works if you have it)

**Migration:** See [MIGRATION.md](MIGRATION.md) for detailed upgrade instructions.

### Added

**Modular Documentation Structure:**

- `docs/testing.md` (238 lines) - Testing principles and behavior-driven development
- `docs/typescript.md` (305 lines) - TypeScript guidelines and schema-first approach
- `docs/code-style.md` (370 lines) - Functional programming and immutability patterns
- `docs/workflow.md` (671 lines) - TDD process, refactoring, and git workflow
- `docs/examples.md` (118 lines) - Code examples and anti-patterns
- `docs/working-with-claude.md` (74 lines) - Expectations and learning capture

**Versioning Infrastructure:**

- `package.json` - Version tracking (not an npm package, just for semver)
- `CHANGELOG.md` - This file
- `MIGRATION.md` - Upgrade guide from v1.x to v2.x

### Changed

- **CLAUDE.md**: Reduced from 1,818 lines to 156 lines
- **Import paths**: All use absolute paths (`@~/.claude/docs/...`) instead of relative
- **README.md**: Added separate installation instructions for CLAUDE.md-only vs full dotfiles

### Documentation

- Updated [SPLIT-CLAUDE-MD-PLAN.md](SPLIT-CLAUDE-MD-PLAN.md) with absolute path requirements
- Documented why absolute paths are required for dotfiles installation
- Added examples showing project vs dotfiles import syntax differences

## [1.0.0] - 2025-11-01

### Added

**CLAUDE.md Development Framework (1,818 lines):**

**📄 View the v1.0.0 monolithic file:**

- GitHub: https://github.com/citypaul/.dotfiles/blob/v1.0.0/claude/.claude/CLAUDE.md
- Raw download: https://github.com/citypaul/.dotfiles/raw/v1.0.0/claude/.claude/CLAUDE.md

**Content:**

- Core philosophy: TDD is non-negotiable
- Testing principles: Behavior-driven testing with 100% coverage
- TypeScript guidelines: Strict mode with schema-first approach
- Code style: Functional programming with immutability
- Development workflow: RED-GREEN-REFACTOR TDD process
- Refactoring guidance: Semantic vs structural decision framework
- Working with Claude: Expectations and learning documentation

**Claude Code Agents:**

- `tdd-guardian` - Proactive TDD coaching and reactive compliance verification
- `ts-enforcer` - TypeScript best practices and schema-first enforcement
- `learn` - Proactive learning capture and CLAUDE.md documentation
- `refactor-scan` - Refactoring assessment and semantic analysis

**Documentation:**

- Comprehensive README with agent documentation
- Git aliases documentation (30+ aliases)
- Personal dotfiles for shell and git configuration

### Initial Release

This release represents the state of the repository before the modular split. All functionality was contained in a single CLAUDE.md file.

---

## Version History

- [2.0.0] - Modular CLAUDE.md structure with absolute imports
- [1.0.0] - Initial release with monolithic CLAUDE.md

[Unreleased]: https://github.com/citypaul/.dotfiles/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/citypaul/.dotfiles/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/citypaul/.dotfiles/releases/tag/v1.0.0
