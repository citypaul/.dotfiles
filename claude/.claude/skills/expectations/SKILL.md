---
name: expectations
description: "Decide where a learning, gotcha, or decision should live so it is not lost, and capture it there while context is fresh. Use when the user says they just discovered, learned, or found out something non-obvious, asks where a fact should be recorded, written down, or go, wants a setup gotcha, workaround, or decision kept for the next person or the next agent session, or asks whether something belongs in CLAUDE.md, a README, an ADR, tests, a glossary, or a reusable skill. Routes each fact to its durable owner and decides whether it is reusable or project-local. For the prose of the document itself see technical-writing; for recording a domain term see ubiquitous-language."
---

# Expectations: Capturing Learnings

Route each discovery to the artifact that owns its truth. Do not turn one project's architecture, delivery process, or tooling conventions into universal guidance.

## Reusable Principle or Local Policy?

- **Reusable principle** — applies across projects without relying on one repository's names, paths, tools, or release process. Improve the relevant global skill.
- **Local policy** — depends on this product's domain, architecture, risk posture, workflow, or infrastructure. Record it in repository agent guidance or canonical project documentation.

When in doubt, make the narrower local update. Reuse should be earned by evidence from more than one project, not inferred from one successful implementation.

## Documentation Framework

**At the end of every significant change, ask: "What do I wish I'd known at the start?"**

Capture a learning if ANY of these are true:
- Would save future developers significant time
- Prevents a class of bugs or errors
- Reveals non-obvious behavior or constraints
- Captures architectural rationale or trade-offs
- Documents domain-specific knowledge
- Identifies effective patterns or anti-patterns
- Clarifies tool setup or configuration gotchas

Do not duplicate what the repository already records: current code structure, Git history, or behavior obvious from source and tests.

## Types of Learnings to Capture

- **Gotchas**: Unexpected behavior discovered (e.g., "API returns null instead of empty array")
- **Patterns**: Approaches that worked particularly well
- **Anti-patterns**: Approaches that seemed good but caused problems
- **Decisions**: Architectural choices with rationale and trade-offs
- **Edge cases**: Non-obvious scenarios that required special handling
- **Tool knowledge**: Setup, configuration, or usage insights

## Where Each Learning Goes

| Learning | Destination | Why |
|----------|-------------|-----|
| Cross-project practice with evidence beyond one repository | Relevant global skill | Reusable guidance stays provider- and project-neutral |
| Project-specific architecture, delivery rule, tool setup, or gotcha | Repository agent guidance or canonical project documentation | Local policy stays with the project that owns it |
| Domain term, definition, alias, or naming rule | Owning bounded context's authoritative glossary | Vocabulary has one context-scoped authority |
| Accepted architecture, dependency, platform, or build-versus-adopt decision | Repository's accepted ADR location | Durable decisions retain rationale and rejected alternatives |
| Observable behavioral constraint or regression | Source code and executable tests | The maintained behavior proves the rule |
| In-flight blocker, sequencing choice, or scope change | Current status artifact or active plan | Temporary delivery knowledge expires with the work |
| User-facing behavior, setup, API usage, or operations | Maintained product, package, or operational documentation | Readers find current truth at the owning surface |

If a temporary artifact reveals a lasting constraint, promote the constraint to its owner before deleting the artifact. Git history remains the archive.

## Documentation Format

```markdown
#### Gotcha: [Descriptive Title]

**Context**: When this occurs
**Issue**: What goes wrong
**Solution**: How to handle it

// CORRECT - Solution
const example = "correct approach";

// WRONG - What causes the problem
const wrong = "incorrect approach";
```

Keep entries scannable: a future reader should grasp context, issue, and solution in under ten seconds.

## Communication

- Be explicit about trade-offs in different approaches
- Explain the reasoning behind significant design decisions
- Flag any deviations from guidelines with justification
- Suggest improvements that align with these principles
- When unsure, ask for clarification rather than assuming
- State explicitly whether a recommendation is a reusable principle or local policy
