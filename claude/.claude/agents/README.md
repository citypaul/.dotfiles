# Claude Code Enforcement Agents

This directory contains specialized sub-agents that run in isolated context windows to enforce [CLAUDE.md](../CLAUDE.md) principles.

## Overview

These agents automate quality enforcement and make development practices consistent and reliable. Each agent has a **proactive mode** (guide before work) and a **reactive mode** (verify after work).

---

## Available Agents

### 1. 🔴 [tdd-guardian](tdd-guardian.md) - TDD Compliance Enforcer

**Use proactively** when planning to write code, or **reactively** to verify TDD was followed.

**What it checks:**
- ✅ Tests were written before production code
- ✅ Tests verify behavior (not implementation)
- ✅ All code paths have test coverage
- ✅ Tests use public APIs only
- ✅ Factory functions used (no `let`/`beforeEach`)
- ❌ Flags implementation-focused tests
- ❌ Catches missing edge case tests

**Example invocation:**
```
You: "I just implemented payment validation. Can you check TDD compliance?"
Claude Code: [Launches tdd-guardian agent]
```

**Output:**
- Lists all TDD violations with file locations
- Identifies implementation-focused tests
- Suggests missing test cases
- Provides actionable recommendations

**When to use:**
- Before writing code (proactive guidance)
- After writing code (compliance verification)
- During code review
- When tests are green (refactoring assessment)

---

### 2. 🔷 [ts-enforcer](ts-enforcer.md) - TypeScript Strict Mode Enforcer

**Use before commits** or **when adding new types/schemas**.

**What it checks:**
- ❌ `any` types (must use `unknown` or specific types)
- ❌ Type assertions without justification
- ❌ `interface` for data structures (use `type`)
- ✅ Schema-first development (schemas before types at trust boundaries)
- ✅ Immutable data patterns
- ✅ Options objects over positional parameters

**Includes the nuanced schema-first framework:**
- Schema required: Trust boundaries, validation rules, contracts, test factories
- Schema optional: Internal types, utilities, state machines, behavior contracts

**Example invocation:**
```
You: "I've added new TypeScript code. Check for type safety violations."
Claude Code: [Launches ts-enforcer agent]
```

**Output:**
- Critical violations (any types, missing schemas at boundaries)
- High priority issues (mutations, poor structure)
- Style improvements (naming, parameter patterns)
- Compliance score with specific fixes

**When to use:**
- When defining new types or schemas
- Before committing TypeScript changes
- During code review
- When refactoring type definitions

---

### 3. 🟡 [refactor-scan](refactor-scan.md) - Refactoring Opportunity Scanner

**Use after achieving green tests** (the REFACTOR step in RED-GREEN-REFACTOR).

**What it analyzes:**
- 🎯 Knowledge duplication (DRY violations)
- 🎯 Semantic vs structural similarity
- 🎯 Complex nested conditionals
- 🎯 Magic numbers and unclear names
- 🎯 Immutability violations

**What it doesn't recommend:**
- ❌ Refactoring code that's already clean
- ❌ Abstracting structurally similar but semantically different code
- ❌ Cosmetic changes without clear value

**Example invocation:**
```
You: "My tests are passing, should I refactor anything?"
Claude Code: [Launches refactor-scan agent]
```

**Output:**
- 🔴 Critical refactoring needed (must fix)
- ⚠️ High value opportunities (should fix)
- 💡 Nice to have improvements (consider)
- ✅ Correctly separated code (keep as-is)
- Specific recommendations with code examples

**When to use:**
- After tests turn green (GREEN → REFACTOR transition)
- When considering abstracting similar code
- During code review
- When code "smells" but you're not sure why

---

### 4. 🔵 [learn](learn.md) - CLAUDE.md Learning Integrator

**Use proactively** when discovering gotchas, or **reactively** after completing complex features.

**What it captures:**
- Gotchas or unexpected behavior discovered
- "Aha!" moments or breakthroughs
- Architectural decisions being made
- Patterns that worked particularly well
- Anti-patterns encountered
- Tooling or setup knowledge gained

**Example invocation:**
```
You: "I just fixed a tricky timezone bug. Let me document this gotcha."
Claude Code: [Launches learn agent]
```

**Output:**
- Asks discovery questions about what you learned
- Reads current CLAUDE.md to check for duplicates
- Proposes formatted additions to CLAUDE.md
- Provides rationale for placement and structure

**When to use:**
- When you discover unexpected behavior
- After completing a complex feature
- When making architectural decisions
- After fixing a tricky bug
- When you think "I wish I'd known this earlier"

---

### 5. 🟣 [docs-guardian](docs-guardian.md) - Documentation Quality Guardian

**Use proactively** when creating documentation or **reactively** to review and improve existing docs.

**What it ensures:**
- ✅ Value-first approach (why before how)
- ✅ Scannable structure (visual hierarchy, clear headings)
- ✅ Progressive disclosure (quick start before deep dive)
- ✅ Problem-oriented navigation (find by problem, not structure)
- ✅ Concrete examples showing value
- ✅ Cross-references and multiple entry points
- ✅ Actionable next steps

**What it checks:**
- ❌ Wall of text without visual breaks
- ❌ Feature lists without examples showing value
- ❌ Abstract principles without concrete examples
- ❌ Installation-first (before showing what it does)
- ❌ Missing navigation aids
- ❌ Broken links or outdated information

**Example invocation:**
```
You: "I need to write a README for this feature."
Claude Code: [Launches docs-guardian agent]

You: "Can you review the documentation I just wrote?"
Claude Code: [Launches docs-guardian agent]
```

**Output:**
- Assessment against 7 pillars of world-class documentation
- Critical issues (must fix) vs nice-to-haves
- Specific improvement recommendations with examples
- Proposed restructuring for better discoverability
- Templates for common documentation types

**When to use:**
- Writing new READMEs, guides, or API docs
- Reviewing existing documentation
- Users report confusion with docs
- Setting up new project documentation
- Improving documentation discoverability

---

## Usage Patterns

### Proactive Usage (Before Work)

Invoke agents BEFORE potential violations to guide good practices:

```
"I'm about to implement payment validation"
→ tdd-guardian guides test-first approach

"I need to add new TypeScript types for the API"
→ ts-enforcer guides schema-first development

"I'm writing the project README"
→ docs-guardian guides world-class documentation structure
```

### Reactive Usage (After Work)

Invoke agents AFTER work to verify compliance:

```
"I just implemented the payment feature"
→ tdd-guardian verifies TDD compliance
→ ts-enforcer checks type safety
→ refactor-scan assesses improvement opportunities

"I just fixed a timezone bug"
→ learn captures the gotcha for CLAUDE.md

"I wrote the API documentation"
→ docs-guardian reviews for quality and clarity
```

### Typical Development Workflow

1. **Planning:** Use `docs-guardian` if documenting, `tdd-guardian` to plan test-first approach
2. **RED:** Write failing test with `tdd-guardian` guidance
3. **GREEN:** Implement minimal code to pass
4. **REFACTOR:** Run `refactor-scan` to assess opportunities, then `ts-enforcer` to verify type safety
5. **Document:** Use `learn` to capture insights, `docs-guardian` for user-facing docs
6. **Review:** Run `tdd-guardian` and `ts-enforcer` before commit

---

## Multiple Agents in Parallel

Claude Code can run multiple agents concurrently:

```
"Check my code for TDD, TypeScript, and refactoring issues"
→ Claude launches tdd-guardian, ts-enforcer, and refactor-scan in parallel
```

This is efficient when you want comprehensive quality checks.

---

## Agent Invocation Examples

### Implicit Invocation

Claude detects when to use agents based on context:

```
"I just wrote some code, can you check it?"
→ Claude automatically launches tdd-guardian and ts-enforcer

"Should I refactor this?"
→ Claude launches refactor-scan

"How do I document this feature?"
→ Claude launches docs-guardian
```

### Explicit Invocation

You can explicitly request specific agents:

```
"Launch the tdd-guardian to check my tests"
"Run the refactor-scan agent"
"Use the docs-guardian to review my README"
"Let's use the learn agent to document this gotcha"
```

---

## Agent Files

Each agent is defined in its own markdown file with:

- **Name and description** with usage examples
- **Core principles** it enforces
- **Proactive guidance** patterns
- **Reactive analysis** process
- **Report formats** for findings
- **Response patterns** for different scenarios
- **Quality gates** before allowing commits
- **Commands** the agent can use

**Files:**
- [tdd-guardian.md](tdd-guardian.md) - Full TDD enforcer specification
- [ts-enforcer.md](ts-enforcer.md) - Full TypeScript enforcer specification
- [refactor-scan.md](refactor-scan.md) - Full refactoring scanner specification
- [learn.md](learn.md) - Full learning integrator specification
- [docs-guardian.md](docs-guardian.md) - Full documentation guardian specification

---

## Customization

These agents follow the principles in [CLAUDE.md](../CLAUDE.md). To customize:

1. **Fork this repository**
2. **Modify agent files** to match your team's standards
3. **Update CLAUDE.md** with your principles
4. **Agents will enforce your customized guidelines**

---

## Philosophy

These agents embody a core insight: **AI needs explicit, detailed context to provide consistent results.**

Instead of vague principles ("write good tests"), agents enforce specific, verifiable practices:
- "Tests must use public APIs only"
- "Schema required at trust boundaries"
- "Abstract based on semantic meaning, not structural similarity"
- "Value proposition in first paragraph of docs"

This transforms subjective code review into objective quality gates.

---

## See Also

- [CLAUDE.md](../CLAUDE.md) - The complete development guidelines these agents enforce
- [Detailed Documentation Guide](../../README.md#-detailed-documentation-guide) - In-depth explanation of all principles
