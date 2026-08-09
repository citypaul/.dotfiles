---
description: Generate project-specific PR review automation that combines global rules with project conventions
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(npm:*), Bash(cat:*)
---

# Generate Project-Specific PR Review Automation

You are generating a customized PR review configuration for this project. This combines:
1. **Global rules** from CLAUDE.md (TDD, TypeScript strict, functional patterns)
2. **Project-specific rules** discovered from codebase analysis

## Step 1: Analyze the Project

First, discover the project's characteristics from multiple sources:

### AI/LLM Configuration Files

**Critical:** Check for existing AI assistant configurations that define project rules:

```bash
# Claude Code
.claude/CLAUDE.md
.claude/settings.json
.claude/agents/*.md
.claude/skills/*/SKILL.md
CLAUDE.md (root level)

# Cursor
.cursorrules
.cursor/rules/*.md

# GitHub Copilot
.github/copilot-instructions.md

# Aider
.aider.conf.yml
.aiderignore

# Codeium
.codeium/config.json

# Other common patterns
.ai-rules
.llm-config
AGENTS.md
CONTRIBUTING.md (often contains coding standards)
```

Extract rules, patterns, and conventions from these files - they represent explicit project decisions.

### Project Documentation

Check for documented conventions:

```bash
# Architecture Decision Records
docs/adr/*.md
docs/decisions/*.md
adr/*.md
architecture/decisions/*.md

# General documentation
docs/*.md
README.md
CONTRIBUTING.md
DEVELOPMENT.md
CODING_STANDARDS.md
STYLE_GUIDE.md

# API documentation
docs/api/*.md
API.md
```

Parse ADRs for architectural decisions that affect code review (e.g., "We use Zod for all validation").

### CI Pipeline Detection

Check for CI configuration files and document the pipeline:

```bash
# GitHub Actions
.github/workflows/*.yml

# Forgejo Actions
.forgejo/workflows/*.yml

# Woodpecker
.woodpecker/*.yml

# Other
Jenkinsfile
.circleci/config.yml
.gitlab-ci.yml
```

Extract: pipeline steps, execution order, Node/runtime versions, environment variables, and any known differences from local development.

### Tech Stack Detection

Check for:
- `package.json` - Dependencies, scripts, type of project
- `tsconfig.json` - TypeScript configuration (note `strict`, `noUncheckedIndexedAccess`, and other strict flags)
- `.eslintrc.*` or `eslint.config.*` - Linting rules
- `jest.config.*` or `vitest.config.*` - Testing setup
- `biome.json` - Biome configuration
- `.prettierrc*` - Formatting rules

### Framework/Library Detection

Look for:
- React/Vue/Angular/Svelte in dependencies
- Express/Fastify/Hono for backend
- Testing libraries (Jest, Vitest, Testing Library)
- State management (Redux, Zustand, etc.)
- Schema libraries (Zod, io-ts, Yup, etc.)

### Existing Code Conventions

Search for:
- Existing code patterns in `src/`
- Test file organization
- Naming conventions
- Import patterns

## Step 2: Create Project Review Configuration

Based on analysis, create `.claude/agents/pr-reviewer.md` in the project:

```markdown
---
name: pr-reviewer
description: >
  Project-specific PR review combining global standards with [PROJECT_NAME] conventions.
  Use proactively for review guidance or reactively to analyze PRs.
tools: Read, Grep, Glob, Bash
model: sonnet
color: cyan
---

# [PROJECT_NAME] PR Review

This reviewer enforces:
1. **Global standards** - TDD, TypeScript strict, functional patterns
2. **Project conventions** - [Discovered patterns]

## Global Rules (Non-Negotiable)

### Change-Path Compliance
- New or changed observable behavior needs corresponding tests written before implementation
- Pure behavior-preserving refactors or reductions need a passing pre/post baseline plus proportionate alternate evidence where tests cannot observe the mechanism
- For production behavior/refactor/reduction paths, run only the applicable refactoring/reduction assessment. Path types outside that responsibility omit the field rather than recording ceremonial `N/A`
- For production-code paths, once the current review boundary is otherwise PR-ready, run mutation testing once for the accumulated scope where meaningful. Path types outside mutation testing omit the field and use evidence appropriate to their claim
- A reduction transition must reference its program, terminal slice, and conserved contract; pass the behavior gate and independent verification; record owner/removal/bounded-lifetime metadata for any temporary bridge (`N/A` when none); and state `mechanism gate: pending — no net-reduction claim`
- A terminal reduction must link its reducer program/report/ledger (or state `N/A — authorized single terminal slice`), discharge prior transition obligations, and pass both gates before claiming net reduction
- Any tests verify behavior, not implementation

### Testing Quality
- Test through the subject's public interface at the layer the claim names
- Keep test state fresh or reliably isolated; use factories where they improve repeated or nested data
- Reuse an existing production schema in factories when it adds evidence; do not redefine the same contract
- No spying on internal methods
- No 1:1 mapping between test files and implementation files

### TypeScript Strictness
- No unexplained `any`; contain unavoidable interop
- No type assertions without justification
- Follow repository convention and language semantics for `type` versus `interface`
- Schema-first at trust boundaries (Zod/Standard Schema)
- `readonly` where the API promises immutability
[IF noUncheckedIndexedAccess IS ENABLED: - All indexed access returns `T | undefined` — use optional chaining or explicit guards, never non-null assertions]
[ADD ANY OTHER STRICT FLAGS DETECTED FROM tsconfig.json]

### Functional Patterns
- Prefer immutable values and pure logic; contain necessary mutation and effects
- Use control flow that is clear for the path
- Use options objects where positional arguments are ambiguous
- Comments explain non-obvious why, constraints, or safety context

### General Quality
- No leftover unstructured console/debug output outside reviewed presentation, process-stream, logging, or diagnostic adapters
- No TODO comments without linked issues
- No hardcoded secrets
- Small, focused changes

---

## Project-Specific Rules

[GENERATED BASED ON PROJECT ANALYSIS]

### Rules from Existing Configuration

[Extract from .cursorrules, CLAUDE.md, .github/copilot-instructions.md, CONTRIBUTING.md, etc.]

**Source files found:**
- [List files that contained rules]

**Key rules extracted:**
- [Rule 1 from existing config]
- [Rule 2 from existing config]
- [etc.]

### Architecture Decisions (from ADRs)

[Extract relevant decisions from docs/adr/*.md or similar]

- **ADR-001**: [Decision title] - [How it affects code review]
- **ADR-002**: [Decision title] - [How it affects code review]

### Tech Stack: [DETECTED]
- Framework: [e.g., React 18, Next.js 14]
- Testing: [e.g., Vitest + React Testing Library]
- Schema: [e.g., Zod]

### Testing Conventions
[Based on existing test file analysis and documented patterns]
- Test file location: [e.g., `__tests__/` or `.test.ts` suffix]
- Factory pattern: [e.g., uses `getMock*` prefix]
- Import patterns: [e.g., `@/` alias]

### Component Patterns (if React/Vue/etc.)
[Based on existing component analysis]
- Component structure: [e.g., functional components only]
- Hooks patterns: [e.g., custom hooks in `hooks/`]
- State management: [e.g., Zustand stores in `stores/`]

### API/Backend Patterns (if applicable)
[Based on existing API analysis]
- Route organization: [e.g., `app/api/` Next.js routes]
- Validation: [e.g., Zod schemas in `schemas/`]
- Error handling: [e.g., custom `AppError` class]

### File Organization
- Source: [e.g., `src/`]
- Tests: [e.g., colocated with source]
- Types: [e.g., `types/` directory]
- Schemas: [e.g., `schemas/` directory]

---

## Review Checklist

When reviewing PRs for this project:

### Must Pass (Blocking)
- [ ] Every changed path is classified by every applicable type; mixed PRs may use several. Behavior changes have test-first evidence and pure refactors have a passing baseline
- [ ] Production behavior/refactor/reduction paths complete their applicable assessment; unrelated path types omit the field
- [ ] Production-code paths apply the repository's end-of-phase mutation gate where meaningful; docs, dependency, generated, config, CI, and operations paths use evidence appropriate to their claims without fabricated mutation `N/A`
- [ ] Reduction transitions link their terminal slice, pass the behavior gate and independent verification, record temporary-bridge ownership/removal metadata or `N/A`, and mark the mechanism gate pending without claiming net reduction
- [ ] Terminal reductions link their program/report/ledger (or authorized single-slice `N/A`), discharge transition obligations, pass both gates, and remove old machinery/expired bridges
- [ ] Any tests are behavior-focused
- [ ] No unexplained or leaking `any`
- [ ] Mutation and effects respect their declared ownership and contracts
- [ ] No security issues
- [ ] CI passes
[PROJECT-SPECIFIC MUST-PASS ITEMS]

### Should Pass
- [ ] Test data is clear and isolated; factories are used where they add value
- [ ] Pure functions where possible
- [ ] Control flow is clear for the risk of the path
- [ ] Comments add non-obvious information
[PROJECT-SPECIFIC SHOULD-PASS ITEMS]

---

## Commands for This Project

```bash
# Run tests
[DETECTED_TEST_COMMAND]

# Type check
[DETECTED_TYPE_CHECK_COMMAND]

# Lint
[DETECTED_LINT_COMMAND]

# Build
[DETECTED_BUILD_COMMAND]
```

---

## Pattern Examples

### Test Factory Pattern (This Project)

```typescript
[EXAMPLE FROM PROJECT OR TEMPLATE]
```

### Component Pattern (This Project)

```typescript
[EXAMPLE FROM PROJECT OR TEMPLATE IF APPLICABLE]
```
```

## Step 3: Generate Project-Level Hooks

Create `.claude/settings.json` (or merge into existing) with a PostToolUse hook that runs typecheck after editing TypeScript files:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "FILE=$(jq -r '.tool_input.file_path // empty'); if [[ \"$FILE\" == *.ts || \"$FILE\" == *.tsx ]]; then [DETECTED_TYPE_CHECK_COMMAND] 2>&1 | tail -20; fi; exit 0"
          }
        ]
      }
    ]
  }
}
```

Replace `[DETECTED_TYPE_CHECK_COMMAND]` with the actual typecheck command from `package.json` scripts (e.g., `pnpm typecheck`, `npx tsc --noEmit`).

## Step 4: Generate Project-Specific /pr Command

Create `.claude/commands/pr.md` that runs quality checks before creating the PR:

```markdown
---
description: Create a pull request with pre-flight quality checks
allowed-tools: Read, Glob, Bash(git:*), Bash(gh:*), Bash([PACKAGE_MANAGER]:*)
---

Current branch:
!`git branch --show-current`

Recent commits:
!`git log --oneline -5`

If the current branch is `[DETECTED_DEFAULT_BRANCH]`, STOP. Do not create a PR until the work is moved to a feature branch with user approval.

If an active plan exists, read the current slice's `Delivery` field. With no plan, default to one PR against `[DETECTED_DEFAULT_BRANCH]` unless the user explicitly requests a stack or reliable stack metadata identifies the current branch as a stacked boundary.

- Single PR: review and verify against `[DETECTED_DEFAULT_BRANCH]`.
- Stacked boundary: load `stack-pull-requests`, target the immediate parent, and review and verify only `git diff <parent>...HEAD`.
- Identify whether the approved topology is a GitHub-native linked stack or an unlinked dependent chain. Native stacks evaluate CI and rules against the stack trunk; unlinked dependent PRs retain ordinary immediate-base semantics. Confirm `merge_group` handling when the repository uses a merge queue.
- Create only the current stacked boundary with `gh pr create --base <parent>` by default.
- For an intended native stack, link the boundary with current `gh stack link` or `gh stack submit` behavior only after confirming the exact affected branches, PRs, bases, and draft states. Until linked, do not assume native stack-trunk CI or rule evaluation.
- Use `gh stack submit` only when the user intends to create or update the full stack and its whole-stack effects have been confirmed.

If the plan or explicit intent says GitHub-native stack but the boundary remains unlinked, STOP and repair the topology before presenting or updating it as a native stacked PR.

Before creating the PR, run these checks in order:

1. Classify every changed path by all applicable types: behavior change, pure
   refactor, reduction transition/terminal reduction, docs, dependency,
   generated output, configuration, CI, or operations. Mixed PRs may have more
   than one type.
2. Confirm each path's applicable assessment is complete:
   - Behavior change: verify RED before GREEN and complete any applicable refactoring
   - Pure refactor: verify the passing baseline and complete the refactoring assessment
   - Reduction transition: reference the program/terminal slice and record the conserved contract, `behavior gate: pass`, independent verification, owner/removal/bounded-lifetime metadata for any temporary bridge (`N/A` when none), and `mechanism gate: pending — no net-reduction claim`
   - Terminal reduction: link the reducer program/report/ledger (or state `N/A — authorized single terminal slice`), discharge transition obligations, run both `reduce-system-complexity` gates, and confirm old machinery and expired bridges are gone
   - Docs/dependency/generated/configuration/CI/operations: run the relevant
     source, rendering, lockfile, provenance, compatibility, syntax, dry-run,
     rollback, or regeneration checks; do not manufacture TDD/refactoring gates
3. Run the end-of-phase mutation gate once for changed production behavior
   where repository policy or risk makes it meaningful—default branch for one
   PR, immediate parent for a stacked boundary. Address valuable survivors and
   scoped reruns inside that gate. Other path types report only their relevant
   alternate evidence; do not manufacture mutation `N/A` ceremony.
4. [DETECTED_TYPE_CHECK_COMMAND]
5. [DETECTED_LINT_COMMAND]
6. [DETECTED_TEST_COMMAND]
7. [DETECTED_BUILD_COMMAND]

If any check fails, fix the issue before proceeding.

Create a PR with:

## Summary
- 1-3 bullet points describing the changes
- Focus on WHAT changed and WHY

## Verification
- Changed behavior: name test-first evidence plus mutation results or explicit `N/A` and alternate evidence
- Pure refactor: name the passing baseline plus mutation results or explicit `N/A` and alternate evidence
- Reduction transition: link the program and terminal slice; name the conserved contract, passing behavior gate, independent verification, owner/removal/bounded-lifetime metadata for any temporary bridge (`N/A` when none), pending mechanism gate without a net claim, plus mutation results or explicit mutation `N/A` with proportionate alternate evidence
- Terminal reduction: link the reducer program/report/ledger (or state `N/A — authorized single terminal slice`), show discharged transition obligations, passing behavior/mechanism gates, removal of superseded machinery and expired bridges, plus mutation results or explicit mutation `N/A` with proportionate alternate evidence
- Docs/dependency/generated/configuration/CI/operations: name the applicable
  source/render/lock/provenance/compatibility/syntax/dry-run/rollback/regeneration
  evidence and omit unrelated TDD or mutation claims

Use `gh pr create` (or project-specific CLI) with the appropriate base, title, and body. Create only the current boundary unless whole-stack submission was explicitly confirmed.
```

Replace `[DETECTED_DEFAULT_BRANCH]` with the repository's detected default branch. Replace every command placeholder with the actual project command; when a check is unavailable, record it as `N/A` with a reason instead of emitting a broken command.

## Step 5: Optionally Create Project Skill

If the project has complex review patterns, also create `.claude/skills/pr-review/SKILL.md`:

```markdown
---
name: pr-review
description: PR review patterns specific to [PROJECT_NAME]. Auto-loaded when reviewing code changes.
---

# [PROJECT_NAME] PR Review Patterns

[Detailed patterns discovered from project analysis]
```

## Step 6: Summary

After generation, provide:

1. **What was created** - Files and their locations
2. **Key project-specific rules discovered** - Highlight important conventions
3. **How to use** - Instructions for invoking the reviewer
4. **Customization guide** - How to add more project-specific rules

---

## Output Format

```
## Generated PR Review Automation

### Files Created

1. `.claude/agents/pr-reviewer.md` - Main PR reviewer agent
2. `.claude/settings.json` - Project-level hooks (typecheck on edit)
3. `.claude/commands/pr.md` - Project-specific PR command with quality gates

### Sources Analyzed

**AI/LLM Configuration:**
- [x] `.cursorrules` - Found/Not found
- [x] `CLAUDE.md` - Found/Not found
- [x] `.github/copilot-instructions.md` - Found/Not found

**Documentation:**
- [x] `docs/adr/*.md` - [N] ADRs found
- [x] `CONTRIBUTING.md` - Found/Not found
- [x] `README.md` - Found/Not found

**Tech Stack:**
- **Framework**: [Detected]
- **Testing**: [Detected]
- **Schemas**: [Detected]
- **Linting**: [Detected]

### Key Project Conventions Discovered

**From existing AI config files:**
1. [Rule extracted from .cursorrules or similar]
2. [Rule extracted from CLAUDE.md]

**From ADRs:**
1. [ADR-001: Decision that affects reviews]

**From code analysis:**
1. [Pattern discovered in codebase]
2. [Convention discovered in codebase]

### How to Use

**Review a specific PR:**
```
/pr-review #123
```

**Get review guidance while creating a PR:**
```
"Help me review my changes before creating a PR"
```

### Customization

To add project-specific rules, edit `.claude/agents/pr-reviewer.md`:

1. Add rules under "Project-Specific Rules"
2. Add checklist items under "Review Checklist"
3. Add pattern examples under "Pattern Examples"
```
