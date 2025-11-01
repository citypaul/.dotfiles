# Changelog

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
