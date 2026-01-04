---
description: Generate project-specific PR review automation that combines global rules with project conventions
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(npm:*), Bash(cat:*)
---

# Generate Project-Specific PR Review Automation

You are generating a customized PR review configuration for this project. This combines:
1. **Global rules** from CLAUDE.md (TDD, TypeScript strict, functional patterns)
2. **Project-specific rules** discovered from codebase analysis

## Step 1: Analyze the Project

First, discover the project's characteristics:

### Tech Stack Detection

Check for:
- `package.json` - Dependencies, scripts, type of project
- `tsconfig.json` - TypeScript configuration
- `.eslintrc.*` or `eslint.config.*` - Linting rules
- `jest.config.*` or `vitest.config.*` - Testing setup
- Existing `.claude/` directory - Existing conventions
- `README.md` - Project documentation

### Framework/Library Detection

Look for:
- React/Vue/Angular/Svelte in dependencies
- Express/Fastify/Hono for backend
- Testing libraries (Jest, Vitest, Testing Library)
- State management (Redux, Zustand, etc.)
- Schema libraries (Zod, io-ts, etc.)

### Existing Conventions

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

### TDD Compliance
- Every production code change needs corresponding tests
- Tests come BEFORE implementation (test-first)
- Tests verify behavior, not implementation

### Testing Quality
- Test through public API only
- No `let`/`beforeEach` - use factory functions
- Factory functions validate with real schemas (don't redefine)
- No spying on internal methods
- No 1:1 mapping between test files and implementation files

### TypeScript Strictness
- No `any` types - ever
- No type assertions without justification
- `type` for data structures, `interface` for behavior contracts
- Schema-first at trust boundaries (Zod/Standard Schema)
- `readonly` on immutable data

### Functional Patterns
- No data mutation (no `.push()`, `.splice()`, property assignment)
- Pure functions (no side effects)
- Early returns (no nested if/else)
- Array methods over loops
- Options objects over positional parameters
- No comments (self-documenting code)

### General Quality
- No `console.log` or debug statements
- No TODO comments without linked issues
- No hardcoded secrets
- Small, focused changes

---

## Project-Specific Rules

[GENERATED BASED ON PROJECT ANALYSIS]

### Tech Stack: [DETECTED]
- Framework: [e.g., React 18, Next.js 14]
- Testing: [e.g., Vitest + React Testing Library]
- Schema: [e.g., Zod]

### Testing Conventions
[Based on existing test file analysis]
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
- [ ] All production code has tests (TDD)
- [ ] Tests are behavior-focused
- [ ] No `any` types
- [ ] No data mutation
- [ ] No security issues
- [ ] CI passes
[PROJECT-SPECIFIC MUST-PASS ITEMS]

### Should Pass
- [ ] Factory functions for test data
- [ ] Pure functions where possible
- [ ] Early returns pattern
- [ ] Self-documenting code
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

## Step 3: Optionally Create Project Skill

If the project has complex review patterns, also create `.claude/skills/pr-review/SKILL.md`:

```markdown
---
name: pr-review
description: PR review patterns specific to [PROJECT_NAME]. Auto-loaded when reviewing code changes.
---

# [PROJECT_NAME] PR Review Patterns

[Detailed patterns discovered from project analysis]
```

## Step 4: Summary

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

### Project Analysis

- **Framework**: [Detected]
- **Testing**: [Detected]
- **Schemas**: [Detected]
- **Test Pattern**: [Detected]

### Key Project Conventions Discovered

1. [Convention 1]
2. [Convention 2]
3. [Convention 3]

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
