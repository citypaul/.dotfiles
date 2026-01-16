# Changelog

## 3.4.0

### Minor Changes

- 6a4043c: Add mutation testing skill for verifying test effectiveness

  New skill that provides systematic guidance for mutation testing analysis:

  - Comprehensive mutation operator reference (arithmetic, conditional, logical, boolean, etc.)
  - Weak vs strong test pattern examples for each operator
  - Systematic branch analysis process (4-step workflow)
  - Equivalent mutant identification and handling
  - Test strengthening patterns (boundary values, branch coverage, avoiding identity values)
  - Integration with TDD workflow (verify after GREEN phase)
  - Optional Stryker integration guide
  - Quick reference for operators most likely to have surviving mutants

  Key insight: Code coverage measures execution; mutation testing measures detection. A test suite with 100% coverage can still miss 40% of potential bugs if tests don't make proper assertions.

## 3.3.0

### Minor Changes

- 059e176: Add PR reviewer agent with direct GitHub commenting

  New features:

  - `pr-reviewer` agent: Comprehensive pull request review for TDD compliance, TypeScript strictness, testing quality, functional patterns, and general code quality
  - `/generate-pr-review` command: Creates project-specific PR review automation combining global rules with project conventions
  - Direct PR commenting: Agent posts reviews directly to GitHub PRs using MCP tools

  The pr-reviewer agent reviews PRs across five categories:

  1. TDD Compliance - Was test-first development followed?
  2. Testing Quality - Are tests behavior-focused?
  3. TypeScript Strictness - No `any`, proper types?
  4. Functional Patterns - Immutability, pure functions?
  5. General Quality - Clean code, security, scope?

  Design decisions:

  - **Manual invocation only**: Designed for use during Claude Code sessions rather than automated CI/CD pipelines. This saves significant API costs while still providing comprehensive reviews when needed.
  - **Direct GitHub integration**: Posts reviews as PR comments using GitHub MCP tools (add_issue_comment, pull_request_review_write, add_comment_to_pending_review)

  The `/generate-pr-review` command analyzes multiple sources to create project-specific reviewers:

  - AI/LLM config files (`.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.aider.conf.yml`)
  - Architecture Decision Records (docs/adr/\*.md)
  - Project documentation (CONTRIBUTING.md, DEVELOPMENT.md, CODING_STANDARDS.md)
  - Tech stack (package.json, tsconfig.json, eslint configs)
  - Existing code patterns and conventions

## 3.2.0

### Minor Changes

- d65d843: # Add Front-End Testing Skills for Testing Library Patterns

  **Context**: The existing `testing` skill covers general testing patterns (factories, public API, coverage theater) and `tdd` skill covers the RED-GREEN-REFACTOR workflow. However, there was no dedicated guidance for Testing Library-specific patterns and best practices.

  This minor release adds two new skills to fill that gap:

  1. **front-end-testing**: Framework-agnostic DOM Testing Library patterns
  2. **react-testing**: React-specific Testing Library patterns

  ## New Skills

  ### 1. front-end-testing (~890 lines) - Framework-Agnostic DOM Testing Library

  **DOM Testing Library patterns for behavior-driven UI testing across all frameworks (React, Vue, Svelte, etc.)**

  #### Key Sections

  **1. Core Philosophy (80 lines)**

  - Test behavior users see, not implementation details
  - False negatives (tests break on refactor) vs false positives (bugs pass)
  - Kent C. Dodds principle: "Test how software is used"
  - Framework-agnostic examples (vanilla JS/HTML)

  **2. Query Selection Priority (100 lines)** ⭐ **MOST CRITICAL**

  - Accessibility-first query hierarchy (getByRole → getByLabelText → ... → getByTestId)
  - Query variants: getBy* (throws), queryBy* (null), findBy\* (async)
  - Common mistakes with correct alternatives
  - Works across all Testing Library implementations

  **3. User Event Simulation (80 lines)**

  - userEvent vs fireEvent (why userEvent is superior)
  - userEvent.setup() pattern (2025 best practice)
  - Common interactions: click, type, keyboard, select
  - Framework-agnostic patterns

  **4. Async Testing Patterns (110 lines)**

  - findBy queries for async elements
  - waitFor utility for complex conditions
  - waitForElementToBeRemoved for disappearance
  - Common patterns: loading states, API responses, debounced inputs

  **5. MSW Integration (90 lines)**

  - Why MSW (network-level interception)
  - setupServer pattern for test setup
  - Per-test overrides with server.use()
  - Works across all frameworks

  **6. Accessibility-First Testing (70 lines)**

  - Why accessible queries improve both tests AND app quality
  - When to add ARIA (custom components only)
  - Semantic HTML priority over ARIA

  **7. Testing Library Anti-Patterns (200 lines)** ⭐ **HIGH VALUE**
  14 common mistakes with ❌ WRONG and ✅ CORRECT examples:

  1. Not using `screen` object
  2. Using `querySelector`
  3. Testing implementation details
  4. Not using jest-dom matchers
  5. Manual cleanup() calls
  6. Wrong assertion methods
  7. beforeEach render pattern
  8. Multiple assertions in waitFor
  9. Side effects in waitFor
  10. Exact string matching
  11. Wrong query variants
  12. Wrapping findBy in waitFor
  13. Using testId when role available
  14. Not installing ESLint plugins

  **8. Summary Checklist (30 lines)**
  Quick reference for test review with cross-references to `tdd`, `testing`, and `react-testing` skills

  ### 2. react-testing (~460 lines) - React-Specific Patterns

  **React Testing Library patterns for testing React components, hooks, and context**

  #### Key Sections

  **1. Opening Paragraph (10 lines)**

  - References `front-end-testing` skill for general DOM patterns
  - References `tdd` skill for RED-GREEN-REFACTOR workflow
  - References `testing` skill for factory patterns

  **2. Testing React Components (60 lines)**

  - Components as functions: props → rendered DOM
  - Testing props and their effects
  - Testing conditional rendering
  - Example patterns with ❌/✅ comparisons

  **3. Testing React Hooks (60 lines)**

  - renderHook API (built into RTL since v13)
  - result.current pattern
  - act() for state updates
  - rerender() for testing with different props

  **4. Testing Context (60 lines)**

  - wrapper option for context providers
  - Multiple providers pattern
  - Testing components that consume context
  - Custom render helpers

  **5. Testing Forms (60 lines)**

  - Controlled inputs
  - Form submissions
  - Form validation
  - userEvent integration

  **6. React-Specific Anti-Patterns (80 lines)** ⭐ **HIGH VALUE**
  5 React-specific mistakes:

  1. Unnecessary act() wrapping (RTL handles it)
  2. Manual cleanup() calls (automatic since RTL 9)
  3. beforeEach render pattern (use factories)
  4. Testing component internals (state, methods)
  5. Shallow rendering (use full render)

  **7. Advanced React Patterns (90 lines)**

  - Testing loading states
  - Testing error boundaries
  - Testing portals
  - Testing Suspense

  **8. Summary Checklist (20 lines)**
  React-specific checks with cross-references to `front-end-testing`, `tdd`, and `testing` skills

  ## Separation of Concerns

  ### front-end-testing (Framework-Agnostic) DOES cover:

  - DOM Testing Library query APIs (works with React, Vue, Svelte)
  - userEvent vs fireEvent
  - Async patterns (findBy, waitFor)
  - MSW integration for API mocking
  - Accessibility-first querying
  - Testing Library anti-patterns (screen, jest-dom)
  - Generic UI testing patterns

  ### front-end-testing does NOT cover:

  - React-specific APIs (renderHook, wrapper option)
  - React component testing patterns
  - React hooks testing
  - React context testing
  - Framework-specific anti-patterns

  ### react-testing (React-Specific) DOES cover:

  - React Testing Library specific APIs
  - renderHook for custom hooks
  - wrapper option for context providers
  - Testing React components, hooks, context
  - React-specific anti-patterns (act, cleanup)
  - React patterns (Suspense, error boundaries, portals)

  ### react-testing does NOT cover:

  - Generic DOM Testing Library patterns (delegates to front-end-testing)
  - General testing patterns (delegates to testing skill)
  - TDD workflow (delegates to tdd skill)

  ## Cross-References

  **front-end-testing references:**

  - `tdd` skill for RED-GREEN-REFACTOR workflow
  - `testing` skill for factory patterns
  - `react-testing` skill for React-specific patterns

  **react-testing references:**

  - `front-end-testing` skill for general DOM Testing Library patterns
  - `tdd` skill for TDD workflow
  - `testing` skill for factory patterns

  **CLAUDE.md references:**

  - Both skills in Architecture section skill list
  - Testing Principles section references both skills

  ## Files Modified

  ### New Files

  - `claude/.claude/skills/front-end-testing/SKILL.md` (~890 lines)
  - `claude/.claude/skills/react-testing/SKILL.md` (~460 lines)

  ### Updated Files

  - `README.md`: Updated skill count (8 → 9), added both skills to Key Sections table and Quick Navigation table
  - `install-claude.sh`: Added both skills to directory creation, skills array, and install summary
  - `~/.claude/CLAUDE.md` (user's global): Updated skill list in Architecture section and Testing Principles section

  ## Key Principles from Sources

  ### From fullstack-react-tdd-example (https://github.com/citypaul/fullstack-react-tdd-example)

  - "Testing against behavior rather than implementation details provides more value"
  - "The purpose of good tests is to give us the confidence to make changes over time"
  - User-perspective testing with accessible selectors
  - MSW for consistent mocking across tests and development

  ### From Testing Library Philosophy

  - "The more your tests resemble the way your software is used, the more confidence they can give you"
  - Accessibility queries improve both tests AND app quality
  - Query priority: role → label → text → testId
  - Framework-agnostic patterns (DOM Testing Library works everywhere)

  ### From Kent C. Dodds' React Testing Library Best Practices

  - False negatives (break on refactor) = brittle tests
  - False positives (bugs pass) = useless tests
  - Test the contract (public API), not the implementation
  - userEvent over fireEvent (realistic simulation)

  ## Impact

  **Before:**

  - No dedicated Testing Library guidance
  - React developers had to piece together patterns from general `testing` skill
  - No query selection priority guidance
  - No Testing Library anti-patterns catalog
  - MSW integration patterns missing

  **After:**

  - ✅ Two comprehensive Testing Library skills (~1350 lines total)
  - ✅ Framework-agnostic patterns work across React, Vue, Svelte
  - ✅ React-specific patterns separated into dedicated skill
  - ✅ Clear query selection hierarchy (accessibility-first)
  - ✅ 14 general + 5 React-specific anti-patterns with solutions
  - ✅ MSW integration patterns documented
  - ✅ userEvent best practices (setup() pattern)
  - ✅ renderHook patterns for custom hooks
  - ✅ All cross-references between skills maintained

  **Total skills:** 8 → 9 (tdd, testing, front-end-testing, react-testing, typescript-strict, functional, refactoring, expectations, planning)

## 3.1.0

### Minor Changes

- 36fbd1e: Add OpenCode support for using CLAUDE.md guidelines with opencode.ai

  - Added `opencode/.config/opencode/opencode.json` configuration file that loads CLAUDE.md and skills
  - Added `--with-opencode` and `--opencode-only` flags to install-claude.sh
  - Updated README.md with OpenCode integration documentation

  OpenCode (https://opencode.ai) is an open source AI coding agent. This configuration allows OpenCode users to use the same CLAUDE.md guidelines and skills that work with Claude Code.

### Patch Changes

- 5227203: Document how to pass arguments to one-liner installation

  - Add `bash -s --` pattern for passing flags to curl-piped scripts
  - Add `--with-opencode` to the install options list
  - Update OpenCode installation section with one-liner examples

## 3.0.1

### Patch Changes

- 380cbfa: # Global Skills Restoration: v2.0.0 → v3.0.0 Complete Recovery + Reorganization

  **Context**: The v3.0.0 CLAUDE.md refactor successfully reduced the main file from 4,936 to ~350 lines by moving content to skills, but investigation revealed 1,714 lines (48%) of critical guidance was lost rather than moved.

  This patch:

  1. Restores all missing content to the global skills system
  2. Reorganizes testing/tdd skills to eliminate duplication
  3. Removes project-specific content to make skills universally applicable

  ## Restoration Summary

  ### testing skill (+381 lines - Previously Missing!)

  **The testing skill was completely missing from the dotfiles repo** (69 lines → 425 lines)

  - ✅ Core Principle: Test behavior, not implementation
  - ✅ Test Through Public API Only (with detailed examples)
  - ✅ Coverage Through Behavior (how to achieve coverage without testing implementation)
  - ✅ **Test Factory Pattern** (moved from tdd skill - belongs here)
  - ✅ **Coverage Theater Detection** (4 anti-patterns consolidated from both skills)
  - ✅ No 1:1 Mapping Between Tests and Implementation
  - ✅ All examples now generic (removed scenarist-specific content)

  ### tdd skill Reorganization (581 → 343 lines)

  **Focused on TDD workflow, references testing skill for "how to write good tests"**

  - ✅ Opening reference to `testing` skill
  - ✅ Removed Test Factory Pattern (moved to testing)
  - ✅ Removed Coverage Theater Detection (consolidated in testing)
  - ✅ References testing skill for anti-patterns
  - ✅ All examples now generic (removed scenarist-specific content)

  ### Critical Restorations

  **typescript-strict skill** (+653 lines, was 94% missing)

  - ✅ Schema Placement Architecture (500 lines) - CRITICAL: Schemas ALWAYS in core, NEVER in adapters
  - ✅ Dependency Injection Pattern (100 lines) - CRITICAL: Domain logic must NEVER create port implementations
  - ✅ Type vs Interface Rationale (80 lines) - WHY interface for contracts, type for data
  - ✅ Strict Mode Configuration, Immutability Patterns, Factory Pattern

  **tdd skill** (+529 lines, was 83% missing)

  - ✅ Coverage Verification Protocol (78 lines) - CRITICAL: "NEVER trust coverage claims without verification"
  - ✅ Coverage Theater Detection (4 patterns that give fake 100% coverage)
  - ✅ TDD Evidence in Commit History (40 lines) - How to document multi-session TDD work
  - ✅ 100% Coverage Exception Process (23 lines) - Formal process for requesting exceptions
  - ✅ Test Factory Pattern (107 lines) - Factory composition, schema validation, anti-patterns

  **functional skill** (+563 lines, was 76% missing)

  - ✅ No Comments / Self-Documenting Code (30 lines) - **FIXES ORPHANED ITEM** from CLAUDE.md
  - ✅ Array Methods Over Loops (40 lines) - **FIXES ORPHANED ITEM** from CLAUDE.md
  - ✅ Options Objects Over Positional Parameters (30 lines) - **FIXES ORPHANED ITEM** from CLAUDE.md
  - ✅ Pure Functions (50 lines)
  - ✅ Composition Over Complex Logic (40 lines)
  - ✅ Readonly Keyword for Immutability (25 lines)
  - ✅ Deep Nesting Limitation (12 lines)

  **refactoring skill** (+62 lines, was 71% missing)

  - ✅ Commit Before Refactoring - WHY (15 lines) - Safety net for experimentation
  - ✅ Speculative Code is TDD Violation (15 lines) - Delete "just in case" logic
  - ✅ When NOT to Refactor (20 lines) - Criteria for deferring refactoring
  - ✅ Commit Messages for Refactoring (10 lines)
  - ✅ **FIXED: Now properly referenced in CLAUDE.md** (was completely missing from documentation)

  ### CLAUDE.md Fixes

  - ✅ Added pointer to `functional` skill in Code Style section
  - ✅ Added pointer to `tdd` skill in Development Workflow
  - ✅ Added pointer to `refactoring` skill in Development Workflow (was completely missing)
  - ✅ Added pointer to `refactoring` skill in Working with Claude
  - ✅ Added pointer to `testing` skill in Testing Principles section (fixes orphaned content)
  - ✅ Added pointer to `typescript-strict` skill in TypeScript Guidelines section (fixes orphaned content)
  - ✅ All orphaned quick reference items now have proper skill coverage

  ### Final Verification Additions (Agent-Discovered)

  After multi-agent verification against v2.0.0, additional critical content was added:

  **functional skill** (additional +70 lines):

  - ✅ "Why Immutability Matters" section with 5 key benefits (predictable, debuggable, testable, React-friendly, concurrency-safe)
  - ✅ "Functional Light" philosophy section explaining practical FP approach (no category theory/monads)
  - ✅ Complete array mutation catalog with pop, shift, unshift, reverse, index assignment alternatives

  **typescript-strict skill** (additional +10 lines):

  - ✅ 5 critical compiler flags added:
    - noUncheckedIndexedAccess (arrays return T | undefined)
    - exactOptionalPropertyTypes (precise optional types)
    - noPropertyAccessFromIndexSignature (safer dynamic access)
    - forceConsistentCasingInFileNames (cross-OS safety)
    - allowUnusedLabels: false (catch accidental labels)

  ## Total Impact

  **Lines Restored**: 1,807 lines across 4 skills

  - typescript-strict: +653 lines (CRITICAL)
  - tdd: +529 lines (CRITICAL)
  - functional: +563 lines (fixes 3 orphaned items)
  - refactoring: +62 lines (now discoverable)

  **Issues Fixed**:

  1. ❌ → ✅ Schema placement guidance prevents adapter duplication (violates hexagonal architecture)
  2. ❌ → ✅ Coverage verification protocol prevents fake coverage from passing reviews
  3. ❌ → ✅ DI pattern guidance preserves hexagonal architecture
  4. ❌ → ✅ CLAUDE.md quick reference items all have proper skill coverage (no more orphaned content)
  5. ❌ → ✅ Refactoring skill now discoverable (was hidden)
  6. ❌ → ✅ Multi-session TDD work can be properly documented in PRs
  7. ❌ → ✅ Formal process for coverage exceptions
  8. ❌ → ✅ Type vs Interface has WHY explained, not just WHAT
  9. ❌ → ✅ Refactoring assessment framework accessible
  10. ❌ → ✅ Functional programming patterns prevent code quality degradation

  ## Documentation Added

  Three comprehensive documentation files added to track the analysis and restoration:

  - `docs/v2-v3-detail-restoration-plan.md` - Original testing skill analysis (358 lines)
  - `docs/comprehensive-v2-v3-restoration-plan.md` - Complete skill-by-skill analysis (744 lines)
  - `docs/v2-v3-critical-findings-summary.md` - Executive summary with top 10 critical issues (295 lines)

  ## Verification

  All restored content emphasizes:

  - ✅ Behavior-driven testing (not implementation testing)
  - ✅ WHY explained for every principle (not just WHAT)
  - ✅ Real-world examples with WRONG ❌ vs CORRECT ✅ patterns
  - ✅ Architectural rationale (hexagonal architecture, DI, schema placement)
  - ✅ All CLAUDE.md quick reference items have full skill coverage

  ## Impact on Development

  Without these restorations, developers would:

  - ❌ Duplicate schemas across adapters (violates hexagonal architecture)
  - ❌ Submit fake 100% coverage (no verification protocol)
  - ❌ Hardcode implementations (no DI pattern guidance)
  - ❌ Follow CLAUDE.md quick ref to dead ends (3 orphaned principles)
  - ❌ Miss refactoring methodology (skill existed but not mentioned)
  - ❌ Document multi-session TDD incorrectly (no PR pattern)
  - ❌ Request coverage exceptions informally (no formal process)
  - ❌ Follow rules without understanding WHY
  - ❌ Refactor without methodology
  - ❌ Write imperative instead of functional code

  **All issues resolved** ✅

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

- GitHub: https://github.com/intinig/claude.md/blob/v1.0.0/claude/.claude/CLAUDE.md
- Raw download: https://github.com/intinig/claude.md/raw/v1.0.0/claude/.claude/CLAUDE.md

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

[Unreleased]: https://github.com/intinig/claude.md/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/intinig/claude.md/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/intinig/claude.md/releases/tag/v1.0.0
