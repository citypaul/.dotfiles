# Claude Code Agents

This directory contains specifications for specialized Claude Code agents that work together to maintain code quality, documentation, and development workflow.

## Agent Overview

### Development Process Agents

#### `tdd-guardian`
**Purpose**: Ensures strict Test-Driven Development compliance throughout the coding process.

**Use proactively when**:
- Planning to implement a new feature
- About to write any production code

**Use reactively when**:
- Code has been written (verify TDD was followed)
- Tests are green (assess refactoring opportunities)

**Core responsibility**: Enforce RED-GREEN-REFACTOR cycle, verify tests written first.

---

#### `ts-enforcer`
**Purpose**: Enforces TypeScript strict mode and best practices.

**Use proactively when**:
- Defining new types or schemas
- Planning TypeScript code structure

**Use reactively when**:
- Code written with potential type issues
- Detecting mutations or `any` types
- Reviewing TypeScript compliance

**Core responsibility**: No `any` types, schema-first development, immutability.

---

#### `refactor-scan`
**Purpose**: Assesses refactoring opportunities after tests pass (TDD's third step).

**Use proactively when**:
- Tests just turned green
- Considering creating abstractions
- Planning code improvements

**Use reactively when**:
- Noticing code duplication
- Reviewing code quality
- Evaluating semantic vs structural similarity

**Core responsibility**: Identify valuable refactoring (only refactor if adds value), distinguish knowledge duplication from structural similarity.

---

### Code Review Agents

#### `pr-reviewer`
**Purpose**: Reviews pull requests for TDD compliance, TypeScript strictness, testing quality, and functional patterns.

**Use proactively when**:
- About to review a PR
- Creating a PR (self-review)
- Want guided review process

**Use reactively when**:
- PR submitted for review
- Need to analyze specific code changes
- Evaluating merge readiness

**Core responsibility**: Ensure PRs meet quality standards before merge.

**Review categories**:
1. TDD Compliance - Was test-first development followed?
2. Testing Quality - Are tests behavior-focused?
3. TypeScript Strictness - No `any`, proper types?
4. Functional Patterns - Immutability, pure functions?
5. General Quality - Clean code, security, scope?

**Project-specific extensions**: Use `/generate-pr-review` command to create project-specific review automation that combines global rules with project conventions.

---

### Documentation & Knowledge Agents

#### `docs-guardian`
**Purpose**: Creates and maintains world-class permanent documentation.

**Use proactively when**:
- Creating new README, guides, or API docs
- Planning user-facing documentation

**Use reactively when**:
- Reviewing existing documentation
- Documentation needs improvement
- Feature complete (update docs)

**Core responsibility**: Permanent, user-facing, professional documentation (README, guides, API docs).

**Key distinction**: Creates PERMANENT docs that live forever in the repository.

---

#### `adr`
**Purpose**: Documents significant architectural decisions with context and trade-offs.

**Use proactively when**:
- About to make significant architectural choice
- Evaluating technology/library options
- Planning foundational decisions

**Use reactively when**:
- Just made an architectural decision
- Discovering undocumented architectural choice
- Need to explain "why we did it this way"

**Core responsibility**: Create Architecture Decision Records (ADRs) for significant decisions only.

**When to use**:
- ✅ Significant architectural choices with trade-offs
- ✅ Technology selections with long-term impact
- ✅ Pattern decisions affecting multiple modules
- ❌ Trivial implementation choices
- ❌ Temporary workarounds
- ❌ Standard patterns already in CLAUDE.md

---

#### `learn`
**Purpose**: Captures learnings, gotchas, and patterns into CLAUDE.md.

**Use proactively when**:
- Discovering unexpected behavior
- Making architectural decisions (rationale)

**Use reactively when**:
- Completing significant features
- Fixing complex bugs
- After any significant learning moment

**Core responsibility**: Document gotchas, patterns, anti-patterns, decisions while context is fresh.

**Key distinction**: Captures HOW to work with the codebase (gotchas, patterns), not WHY architecture chosen (that's ADRs).

---

### Compliance & Architecture Agents

#### `twelve-factor-audit`
**Purpose**: Audits Node.js/TypeScript codebases for 12-Factor App compliance.

**Use when**:
- Onboarding to an existing service project
- Assessing deployment readiness
- Reviewing infrastructure patterns before scaling

**Core responsibility**: Produce a compliance report covering all 12 factors with specific file/line citations, gaps, and prioritized actionable suggestions.

**Output:** Compliance report with factor summary table, violation details, code suggestions, and prioritized action plan written to `twelve-factor-audit.md`.

**Related skill**: Load `twelve-factor` skill for detailed 12-factor patterns.

---

#### `use-case-data-patterns`
**Purpose**: Analyzes how user-facing use cases map to underlying data access patterns and architectural implementation.

**Use proactively when**:
- Implementing new features that interact with data
- Designing API endpoints
- Planning refactoring of data-heavy systems

**Use reactively when**:
- Understanding how a feature works end-to-end
- Identifying gaps in data access patterns
- Investigating architectural decisions

**Core responsibility**: Create comprehensive analytical reports mapping use cases to data patterns, database interactions, and architectural decisions.

> **Attribution**: Adapted from [Kieran O'Hara's dotfiles](https://github.com/kieran-ohara/dotfiles/blob/main/config/claude/agents/analyse-use-case-to-data-patterns.md).

---

### Workflow & Planning Agents

#### `progress-guardian`
**Purpose**: Tracks progress through significant work using plan files in `plans/`.

**Use proactively when**:
- Starting significant multi-step work
- Beginning feature requiring multiple PRs
- Starting complex refactoring or investigation

**Use reactively when**:
- Completing a step (update plan progress)
- Plan needs changing (propose changes, get approval)
- Feature complete (merge learnings, delete plan file)

**Core responsibility**:
- Track progress through plan files in `plans/` directory
- Enforce small increments, TDD, commit approval
- Never modify plans without explicit user approval
- At end: orchestrate learning merge, then **DELETE plan file**

**Key distinction**: Plan files are TEMPORARY (deleted when done). Learnings merged into CLAUDE.md/ADRs before deletion.

**Related skill**: Load `planning` skill for detailed incremental work principles.

---

## Agent Relationships

### Orchestration Flow

```
progress-guardian (orchestrates)
    │
    ├─► Creates: plans/<name>.md
    │
    ├─► For each step:
    │   ├─→ tdd-guardian (RED-GREEN-REFACTOR)
    │   ├─→ ts-enforcer (before commits)
    │   └─→ refactor-scan (after GREEN)
    │
    ├─► When decisions arise:
    │   └─→ adr (architectural decisions)
    │
    ├─► Before merge:
    │   └─→ pr-reviewer (comprehensive PR review)
    │
    ├─► At end:
    │   ├─→ learn (merge learnings → CLAUDE.md)
    │   ├─→ docs-guardian (update permanent docs)
    │   └─→ DELETE plan file from plans/
    │
    └─► Related: `planning` skill (incremental work principles)
```

### Typical Workflow

**Recommended command flow:** `/setup` → `/plan` → RED-GREEN-REFACTOR → `/pr` → `/continue` → repeat

1. **Onboard project** (once)
   - Run `/setup` to detect tech stack and generate project-level config
   - Run `/generate-pr-review` if custom PR review rules needed

2. **Plan the work** (before writing any code)
   - Run `/plan` to create a plan in `plans/` on a branch with a PR
   - Get approval for the plan before writing any code

3. **For each step in plan**
   - RED: Write failing test (TDD non-negotiable)
   - GREEN: Minimal code to pass
   - REFACTOR: Invoke `refactor-scan` to assess improvements
   - **WAIT FOR COMMIT APPROVAL**

4. **When plan needs changing**
   - Propose changes, **get approval before modifying plan**

5. **When architectural decision arises**
   - Invoke `adr` if decision warrants permanent record

6. **Before commits**
   - Invoke `ts-enforcer`: Verify TypeScript compliance
   - Invoke `tdd-guardian`: Verify TDD compliance
   - **Ask for commit approval**

7. **Pre-PR quality gate**
   - Run `mutation-testing` skill: Verify tests detect changes, kill surviving mutants
   - Invoke `refactor-scan`: Assess improvements (only if adds value)
   - Invoke `pr-reviewer`: Self-review changes
   - Fix any issues found
   - Run `/pr` to create PR with quality gates (typecheck + lint + test + build)

8. **Continue to next step**
   - After PR is merged, run `/continue` to pull main, create new branch, update plan

9. **Feature complete**
   - Verify all acceptance criteria met
   - Invoke `learn`: Merge gotchas/patterns → CLAUDE.md
   - Invoke `adr`: Create ADRs for architectural decisions
   - Invoke `docs-guardian`: Update permanent docs
   - **DELETE plan file from `plans/`** (delete `plans/` if empty)

## When to Use Which Agent

Quick decision table for all agents:

| Question | Agent | Timing |
|----------|-------|--------|
| "How do I work with X?" | `learn` | After discovering patterns/gotchas |
| "Why did we choose X?" | `adr` | When making/documenting architecture decisions |
| "Is this type-safe?" | `ts-enforcer` | During development (proactive) |
| "Is this PR ready?" | `pr-reviewer` | At review time (reactive) |
| "Should I refactor this?" | `refactor-scan` | After GREEN phase only |
| "Was TDD followed?" | `tdd-guardian` | During TDD cycle |
| "Is this documented?" | `docs-guardian` | At feature completion |
| "What data patterns exist?" | `use-case-data-patterns` | Before implementing features |
| "Is this 12-factor compliant?" | `twelve-factor-audit` | When onboarding or assessing deployment readiness |
| "Where am I in this work?" | `progress-guardian` | Throughout multi-step work |

**Note:** `learn` and `adr` can both apply to the same decision — `learn` captures "how to use it" (→ CLAUDE.md), `adr` captures "why we chose it" (→ ADR doc).

## Key Distinctions

### Documentation Types

| Aspect | progress-guardian | adr | learn | docs-guardian |
|--------|------------------|-----|-------|---------------|
| **Lifespan** | Temporary (days/weeks) | Permanent | Permanent | Permanent |
| **Audience** | Current developer | Future developers | AI assistant + developers | Users + developers |
| **Purpose** | Track progress through plan | Explain "why" decisions | Explain "how" to work | Explain "what" and "how to use" |
| **Content** | Plan file in `plans/` | Context, decision, consequences | Gotchas, patterns | Features, API, setup |
| **Updates** | On approval (plan changes) | Once (rarely updated) | As learning occurs | When features change |
| **Format** | Structured plan | Structured ADR format | Informal examples | Professional, polished |
| **End of life** | **DELETED** when done | Lives forever | Lives forever | Lives forever |

### When to Use Which Documentation Agent

**Use `progress-guardian`** for:
- "What am I working on right now?"
- "What's the next step?"
- "Where was I when I stopped yesterday?"
- → Answer: Temporary plan file in `plans/` (deleted when done)

**Use `adr`** for:
- "Why did we choose technology X over Y?"
- "What were the trade-offs in this architectural decision?"
- "Why is the system designed this way?"
- → Answer: Permanent ADR in `docs/adr/`

**Use `learn`** for:
- "What gotchas should I know about?"
- "What patterns work well here?"
- "How do I avoid this common mistake?"
- → Answer: Permanent entry in `CLAUDE.md`

**Use `docs-guardian`** for:
- "How do I install this?"
- "How do I use this API?"
- "What features does this have?"
- → Answer: Permanent `README.md`, guides, API docs

**Use `use-case-data-patterns`** for:
- "How does this feature work end-to-end?"
- "What data patterns support this use case?"
- "What's missing to implement this feature?"
- → Answer: Analytical report mapping use cases to data patterns

## Slash Commands

Commands complement agents by encoding common workflows into single invocations.

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/setup` | Project onboarding — detect tech stack, create CLAUDE.md, hooks, commands, PR reviewer | Starting work on a new project (replaces `/init`) |
| `/pr` | Create a pull request following standards | When ready to submit work |
| `/plan` | Create a plan document on a branch with a PR — no code | When planning work before implementation |
| `/continue` | Pull merged PR, create new branch, update plan | After a PR is merged and you want to continue |
| `/generate-pr-review` | Generate project-specific PR review automation | One-time setup per project |

## Using These Agents

These agent specifications are designed to be integrated into Claude Code. To use them:

1. **Read the agent specification** to understand when to invoke it
2. **Invoke the agent** via Claude Code's Task tool with the appropriate `subagent_type`
3. **Follow the agent's guidance** for your specific situation

Each agent is designed to be:
- **Proactive**: Used before work begins to guide best practices
- **Reactive**: Used after work to verify compliance and improvements
- **Autonomous**: Operates independently with clear responsibilities
- **Integrated**: Works with other agents as part of a cohesive system

## Agent Design Principles

All agents follow these principles:

1. **Clear Purpose**: Each agent has a specific, well-defined responsibility
2. **Trigger Patterns**: Explicit proactive and reactive usage patterns
3. **Integration Points**: Clear handoffs between agents
4. **Examples-Driven**: Comprehensive examples of good/bad usage
5. **Anti-Patterns**: Explicit documentation of what NOT to do
6. **Success Criteria**: Clear metrics for agent effectiveness

## Contributing New Agents

When creating a new agent specification:

1. **Define clear purpose**: What specific problem does it solve?
2. **Distinguish from existing agents**: How is it different?
3. **Provide comprehensive examples**: Show proactive and reactive usage
4. **Document integration points**: How does it work with other agents?
5. **Include anti-patterns**: What should users avoid?
6. **Follow the template**: Use existing agents as reference

## Summary

These agents work together to create a comprehensive development workflow:

- **Analysis**: use-case-data-patterns maps use cases to implementation patterns
- **Compliance**: twelve-factor-audit assesses 12-factor methodology adherence
- **Quality**: tdd-guardian + ts-enforcer ensure code quality
- **Improvement**: refactor-scan optimizes code after tests pass
- **Review**: pr-reviewer validates PRs before merge
- **Knowledge**: learn + adr + docs-guardian preserve knowledge
- **Progress**: progress-guardian tracks work through plan files in `plans/`

**Key workflow principles** (see `planning` skill for details):
- All work in small, known-good increments
- TDD non-negotiable (RED-GREEN-REFACTOR)
- Commit approval required before every commit
- Learnings captured at end via `learn` and `adr` agents

Each agent is specialized, autonomous, and designed to be invoked at the right time to maintain high standards throughout the development process.
