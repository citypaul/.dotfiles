# Claude Code Agents

This directory contains specifications for specialized Claude Code agents that work together to maintain code quality, documentation, and development workflow.

## Agent Overview

### Development Process Agents

#### `tdd-guardian`
**Purpose**: Ensures strict Test-Driven Development compliance for new or changed observable behavior.

**Use proactively when**:
- Planning to implement a new feature
- About to implement new or changed production behavior

**Use reactively when**:
- Behavior-changing code has been written (verify TDD was followed)
- Tests are green (assess refactoring opportunities)

**Core responsibility**: Enforce fast RED-GREEN-REFACTOR increments for behavior change and defer the automated mutation harness to the end-of-phase PR-readiness gate. Pure behavior-preserving refactors/reductions route to `refactor-scan` or `reduce-system-complexity` with passing proportionate evidence instead of fabricated RED.

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

**Core responsibility**: Apply the canonical `typescript-strict` skill:
contain unsafe interop, validate untrusted boundaries, and follow the
repository's type-system policy.

---

#### `refactor-scan`
**Purpose**: Assesses refactoring opportunities after GREEN or another passing proportionate preservation baseline.

**Use proactively when**:
- Behavior tests are green
- Considering creating abstractions
- Planning code improvements

**Use reactively when**:
- Noticing code duplication
- Reviewing code quality
- Evaluating semantic vs structural similarity

**Core responsibility**: Identify valuable refactoring (only refactor if adds value), distinguish knowledge duplication from structural similarity.

---

### Documentation & Knowledge Agents

#### `docs-guardian`
**Purpose**: Creates or reviews maintained developer-facing documentation using
the page job, audience, repository authority, and canonical `technical-writing`
and `expectations` guidance.

**Use proactively when**:
- Creating new README, guides, or API docs
- Planning user-facing documentation

**Use reactively when**:
- Reviewing existing documentation
- Documentation needs improvement
- Feature complete (update docs)

**Core responsibility**: Accurate, appropriately shaped README, guide, reference,
runbook, tutorial, or conceptual documentation owned by the repository.

**Key distinction**: Maintained docs describe current truth. Their structure and
lifecycle follow their owner; Git preserves history.

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
- ❌ Practices already owned by canonical skills or repository policy

---

#### `learn`
**Purpose**: Routes durable, non-obvious learnings to their actual owner.

**Use proactively when**:
- Discovering unexpected behavior
- Making architectural decisions (rationale)

**Use reactively when**:
- Completing significant features
- Fixing complex bugs
- After any significant learning moment

**Core responsibility**: Keep reusable knowledge with the source, test, glossary,
decision mechanism, maintained documentation, active plan, or repository policy
that can keep it true.

**Key distinction**: `CLAUDE.md` owns local working policy only when the repository
declares it as that owner; it is not a catch-all knowledge base.

---

### Compliance & Architecture Agents

#### `twelve-factor-audit`
**Purpose**: Audits Node.js/TypeScript codebases for 12-Factor App compliance.

**Use when**:
- Onboarding to an existing service project
- Assessing deployment readiness
- Reviewing infrastructure patterns before scaling

**Core responsibility**: Produce a compliance report covering all 12 factors with specific file/line citations, gaps, and prioritized actionable suggestions.

**Output:** Read-only findings in chat by default, with applicable-factor
statuses, exact evidence, and the smallest corrective directions. Write
`twelve-factor-audit.md` only when the user requests a report file.

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

**Core responsibility**: Produce a read-only, evidence-labelled trace from an
actor's trigger through policy, domain logic, data access, effects, and the
observable result, then identify only material gaps.

The current agent is an original rewrite. Its
[source notes](references/use-case-data-patterns-source-notes.md) disclose an
earlier unlicensed copy and the unresolved published-history permission issue.

---

### Workflow & Planning Agents

#### `progress-guardian`
**Purpose**: Tracks progress through significant work using the repository's declared planning workflow (`plans/` only as the fallback).

**Use proactively when**:
- Starting significant multi-step work
- Beginning feature requiring multiple PRs
- Starting complex refactoring or investigation

**Use reactively when**:
- Completing a step (update plan progress)
- Plan needs changing (propose changes, get approval)
- Feature complete (route learnings, then follow the plan owner's close/archive/delete lifecycle)

**Core responsibility**:
- Track progress through the repository-owned plan artifact
- Enforce small increments, TDD, commit approval
- Never modify plans without explicit user approval
- At end: route durable learning, then follow the plan owner's lifecycle; delete only a fallback temporary plan file with normal authority

**Key distinction**: Plan files are temporary. Before closing one, route lasting
knowledge through `expectations` to its actual owner.

**Related skill**: Load `planning` skill for detailed incremental work principles.

---

## Agent Relationships

### Orchestration Flow

```
progress-guardian (orchestrates)
    │
    ├─► Creates/updates: repository plan owner (fallback: plans/<name>.md)
    │
    ├─► For each implementation increment in the current slice or PR boundary:
    │   ├─→ tdd-guardian (RED-GREEN-REFACTOR)
    │   ├─→ ts-enforcer (before commits)
    │   └─→ refactor-scan (after GREEN or another passing baseline, when applicable)
    │
    ├─► At end-of-phase PR readiness for each review boundary:
    │   └─→ mutation-testing (once against trunk or the immediate stack parent, then survivor handling)
    │
    ├─► When decisions arise:
    │   └─→ adr (architectural decisions)
    │
    ├─► Before merge:
    │   └─→ /panel-review skill (multi-lens skill-composed review)
    │
    ├─► At end:
    │   ├─→ learn (route durable learnings to their owners)
    │   ├─→ docs-guardian (update affected maintained docs)
    │   └─→ DELETE/close the temporary plan artifact
    │
    └─► Related: `planning` skill (incremental work principles)
```

### Typical Workflow

**Recommended delivery flow:** `/plan` → chosen single-PR or stack delivery → applicable evidence path → agent-led PR creation (PR-readiness gate) + `/panel-review` → `/continue` → repeat

1. **Onboard project when explicitly requested** (once)
   - Run `/setup` only with authorization to inspect and generate project-level configuration

2. **Plan the work** (before writing any code)
   - Run `/plan` to use the repository's planning workflow; absent one, it may create a fallback `plans/` file on a branch with a PR
   - Default every implementation slice to one trunk-based PR; use `stack-pull-requests` when one slice needs review layers or later slices should start on the same evolving baseline before lower PRs merge
   - Get approval for the plan before writing any code

3. **For each step in plan**
   - CLASSIFY: Behavior change, pure behavior-preserving refactor/reduction, or mixed
   - LOAD: For behavior change, `tdd`, `testing`, and `refactoring`; for pure preservation, the applicable testing/refactoring/reduction skills
   - RED/GREEN: Required for changed behavior; pure preservation starts from passing evidence and stays behaviorally green
   - REFACTOR: Run `refactoring` skill and invoke `refactor-scan` to assess improvements
   - REPEAT: Continue without running the automated mutation harness after every increment, refactor, or commit
   - **WAIT FOR COMMIT APPROVAL**

4. **When plan needs changing**
   - Propose changes, **get approval before modifying plan**

5. **When architectural decision arises**
   - Invoke `adr` if the accepted decision warrants a durable record in the repository's decision mechanism

6. **Before commits**
   - Invoke `ts-enforcer`: Verify TypeScript compliance
   - Invoke `tdd-guardian` for behavior changes; use `refactor-scan` or `reduce-system-complexity` for pure preservation work
   - **Ask for commit approval**

7. **Pre-PR quality gate**
   - Verify each implemented slice loaded the skills for its behavior-changing or preservation-only path
   - Confirm implementation and applicable refactoring/reduction assessment are complete
   - Run mutation testing once for the actual review boundary where meaningful—trunk for one PR, the immediate parent for a stacked boundary—or review the documented alternate evidence and `N/A`
   - Address valuable survivors and re-run focused/diff mutation checks within that same gate
   - Run `/panel-review`: multi-lens self-review of the boundary
   - Fix any issues found
   - Create the PR as ordinary agent-led work — the quality gates (TDD evidence + mutation testing + refactoring assessment + typecheck + lint + tests + build) live in the `panel-review` skill's PR-readiness reference

8. **Continue to next step**
   - Independent slice: after its PR merges, run `/continue` to update trunk and branch the next independent slice
   - Stack: run `/continue` from the committed, known-good current top to add the next intra-slice layer or dependent slice; after lower merges, use it to sync the remaining stack

9. **Feature complete**
   - Verify every owning PR landed and all acceptance criteria are met
   - Invoke `learn`: Route durable gotchas and patterns to their owning source
   - Invoke `adr`: Create ADRs for architectural decisions
   - Invoke `docs-guardian`: Update affected maintained docs
   - **DELETE/close the temporary plan artifact** (remove fallback `plans/` if empty)

## When to Use Which Agent

Quick decision table for all agents:

| Question | Agent | Timing |
|----------|-------|--------|
| "How do I work with X?" | `learn` | After discovering patterns/gotchas |
| "Why did we choose X?" | `adr` | When making/documenting architecture decisions |
| "Is this type-safe?" | `ts-enforcer` | During development (proactive) |
| "Is this PR ready?" | `/panel-review` skill (a skill, not an agent) | At review time (reactive) |
| "Should I refactor this?" | `refactor-scan` | After GREEN or another passing baseline |
| "Was TDD followed?" | `tdd-guardian` | During TDD cycle |
| "Is this documented?" | `docs-guardian` | At feature completion |
| "What data patterns exist?" | `use-case-data-patterns` | Before implementing features |
| "Is this 12-factor compliant?" | `twelve-factor-audit` | When onboarding or assessing deployment readiness |
| "Where am I in this work?" | `progress-guardian` | Throughout multi-step work |

**Note:** `learn` and `adr` can both apply to the same decision: `learn` routes
operational knowledge to its owner; `adr` records an accepted architectural
choice in the repository's decision mechanism.

## Key Distinctions

### Documentation Types

| Aspect | progress-guardian | adr | learn | docs-guardian |
|--------|------------------|-----|-------|---------------|
| **Lifespan** | Temporary (days/weeks) | Retained while the decision remains relevant; supersede explicitly | Determined by the selected owner | Maintained while the page has an owner and purpose |
| **Audience** | Current developer | Future developers | AI assistant + developers | Users + developers |
| **Purpose** | Track progress through plan | Explain "why" decisions | Explain "how" to work | Explain "what" and "how to use" |
| **Content** | Repository plan artifact (fallback: `plans/`) | Context, decision, consequences | Source/test/glossary/policy/doc update selected by `expectations` | Current product, API, setup, operations, or conceptual guidance |
| **Updates** | On approval (plan changes) | Supersede or amend according to repository policy | When evidence justifies a durable update | When owned truth changes |
| **Format** | Structured plan | Repository decision format | Format of the actual owner | Shape selected for the page job |
| **End of life** | **DELETED/closed** when done | Superseded or archived by repository policy | Removed or superseded with its owner | Removed, redirected, or archived when no longer owned/current |

### When to Use Which Documentation Agent

**Use `progress-guardian`** for:
- "What am I working on right now?"
- "What's the next step?"
- "Where was I when I stopped yesterday?"
- → Answer: Temporary repository-owned plan artifact (deleted/closed when done)

**Use `adr`** for:
- "Why did we choose technology X over Y?"
- "What were the trade-offs in this architectural decision?"
- "Why is the system designed this way?"
- → Answer: Accepted record in the repository's declared decision mechanism

**Use `learn`** for:
- "What gotchas should I know about?"
- "What patterns work well here?"
- "How do I avoid this common mistake?"
- → Answer: Update the owning source, test, glossary, decision, maintained doc, active plan, or repository policy

**Use `docs-guardian`** for:
- "How do I install this?"
- "How do I use this API?"
- "What features does this have?"
- → Answer: Maintained README, guide, reference, runbook, tutorial, or conceptual page shaped for its job

**Use `use-case-data-patterns`** for:
- "How does this feature work end-to-end?"
- "What data patterns support this use case?"
- "What's missing to implement this feature?"
- → Answer: Analytical report mapping use cases to data patterns

## Slash Commands

Commands complement agents by encoding common workflows into single invocations.

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/setup` | Authorized project onboarding — detect tech stack, create project guidance, hooks, commands | Only when the user explicitly requests onboarding/config generation |
| `/plan` | Create a plan document on a branch with a PR — no code | When planning work before implementation |
| `/continue` | Pull merged PR, create new branch, update plan | After a PR is merged and you want to continue |

PR review comes from the `panel-review` skill (`/panel-review`), not a command; PR creation is agent-led work gated by that skill's PR-readiness reference.

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
- **Improvement**: refactor-scan assesses code after GREEN or another passing proportionate preservation baseline; mutation testing verifies the accumulated result later at PR readiness
- **Review**: the `/panel-review` skill fans skill-lens sub-agents out over the boundary before merge
- **Knowledge**: learn + adr + docs-guardian preserve knowledge
- **Progress**: progress-guardian tracks work through the repository's declared plan owner

**Key workflow principles** (see `planning` skill for details):
- All work in small, known-good increments
- TDD non-negotiable for behavior change; pure preservation follows an evidenced REFACTOR/reduction path
- Commit approval required before every commit
- Learnings captured at end via `learn` and `adr` agents

Each agent is specialized, autonomous, and designed to be invoked at the right time to maintain high standards throughout the development process.
