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

### Analysis & Architecture Agents

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
**Purpose**: Manages progress through significant work using a three-document system.

**Use proactively when**:
- Starting significant multi-step work
- Beginning feature requiring multiple PRs
- Starting complex refactoring or investigation

**Use reactively when**:
- Completing a step (update WIP.md)
- Discovering something (add to LEARNINGS.md)
- Plan needs changing (propose changes, get approval)
- End of work session (checkpoint)
- Feature complete (merge learnings, delete docs)

**Core responsibility**:
- Create and maintain three documents: **PLAN.md**, **WIP.md**, **LEARNINGS.md**
- Enforce small increments, TDD, commit approval
- Never modify PLAN.md without explicit user approval
- Capture learnings as they occur
- At end: orchestrate learning merge, then **DELETE all three docs**

**Three-Document Model**:

| Document | Purpose | Updates |
|----------|---------|---------|
| **PLAN.md** | What we're doing (approved steps) | Only with user approval |
| **WIP.md** | Where we are now (current state) | Constantly |
| **LEARNINGS.md** | What we discovered | As discoveries occur |

**Key distinction**: Creates TEMPORARY docs (deleted when done). Learnings merged into CLAUDE.md/ADRs before deletion.

**Related skill**: Load `planning` skill for detailed incremental work principles.

---

## Agent Relationships

### Orchestration Flow

```
progress-guardian (orchestrates)
    │
    ├─► Creates: PLAN.md, WIP.md, LEARNINGS.md
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
    │   ├─→ learn (merge LEARNINGS.md → CLAUDE.md)
    │   ├─→ docs-guardian (update permanent docs)
    │   └─→ DELETE all three docs
    │
    └─► Related: `planning` skill (incremental work principles)
```

### Typical Workflow

1. **Start significant work**
   - Load `planning` skill for principles
   - Invoke `progress-guardian`: Creates PLAN.md, WIP.md, LEARNINGS.md
   - Get approval for PLAN.md

2. **For each step in plan**
   - RED: Write failing test (TDD non-negotiable)
   - GREEN: Minimal code to pass
   - REFACTOR: Invoke `refactor-scan` to assess improvements
   - Update WIP.md with progress
   - Capture discoveries in LEARNINGS.md
   - **WAIT FOR COMMIT APPROVAL**

3. **When plan needs changing**
   - Invoke `progress-guardian`: Propose changes
   - **Get approval before modifying PLAN.md**

4. **When architectural decision arises**
   - Add to LEARNINGS.md immediately
   - Invoke `adr` if decision warrants permanent record

5. **Before commits**
   - Invoke `ts-enforcer`: Verify TypeScript compliance
   - Invoke `tdd-guardian`: Verify TDD compliance
   - **Ask for commit approval**

6. **End of session**
   - Invoke `progress-guardian`: Update WIP.md, session checkpoint

7. **Before creating PR**
   - Invoke `pr-reviewer`: Self-review changes
   - Fix any issues found
   - Create PR using `/pr` command

8. **Feature complete**
   - Invoke `progress-guardian`: Verify all criteria met
   - Review LEARNINGS.md for merge destinations
   - Invoke `learn`: Merge gotchas/patterns → CLAUDE.md
   - Invoke `adr`: Create ADRs for architectural decisions
   - Invoke `docs-guardian`: Update permanent docs
   - **DELETE PLAN.md, WIP.md, LEARNINGS.md**

## Key Distinctions

### Documentation Types

| Aspect | progress-guardian | adr | learn | docs-guardian |
|--------|------------------|-----|-------|---------------|
| **Lifespan** | Temporary (days/weeks) | Permanent | Permanent | Permanent |
| **Audience** | Current developer | Future developers | AI assistant + developers | Users + developers |
| **Purpose** | Track progress, capture learnings | Explain "why" decisions | Explain "how" to work | Explain "what" and "how to use" |
| **Content** | PLAN + WIP + LEARNINGS | Context, decision, consequences | Gotchas, patterns | Features, API, setup |
| **Updates** | Constantly (WIP), on approval (PLAN) | Once (rarely updated) | As learning occurs | When features change |
| **Format** | Informal notes | Structured ADR format | Informal examples | Professional, polished |
| **End of life** | **DELETED** when done | Lives forever | Lives forever | Lives forever |

### When to Use Which Documentation Agent

**Use `progress-guardian`** for:
- "What am I working on right now?"
- "What's the next step?"
- "Where was I when I stopped yesterday?"
- "What have we discovered so far?"
- → Answer: Temporary PLAN.md, WIP.md, LEARNINGS.md (deleted when done)

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
- **Quality**: tdd-guardian + ts-enforcer ensure code quality
- **Improvement**: refactor-scan optimizes code after tests pass
- **Review**: pr-reviewer validates PRs before merge
- **Knowledge**: learn + adr + docs-guardian preserve knowledge
- **Progress**: progress-guardian manages incremental work with three-document model

**Key workflow principles** (see `planning` skill for details):
- All work in small, known-good increments
- TDD non-negotiable (RED-GREEN-REFACTOR)
- Commit approval required before every commit
- Learnings captured as they occur, merged at end

Each agent is specialized, autonomous, and designed to be invoked at the right time to maintain high standards throughout the development process.
