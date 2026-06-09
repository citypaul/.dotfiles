---
name: expectations
description: Capture learnings, gotchas, and architectural decisions into the right project documentation while context is fresh. Use when capturing learnings, documenting gotchas, recording architectural decisions, or deciding where a piece of knowledge should live. Triggers on "document this", "remember this pattern", "what should I know about", or after completing significant features.
---

# Expectations: Capturing Learnings

Core philosophy (TDD, refactoring discipline, commit approval) lives in CLAUDE.md and is always loaded — this skill covers what CLAUDE.md does not: deciding **what** to document, **where** it goes, and **in what format**.

One workflow rule bears repeating because it gates documentation work too: **never commit without explicit user approval.** After refactoring, verify all tests and static analysis pass, then STOP and wait for commit approval.

## Documentation Framework

**At the end of every significant change, ask: "What do I wish I'd known at the start?"**

Document if ANY of these are true:
- Would save future developers significant time
- Prevents a class of bugs or errors
- Reveals non-obvious behavior or constraints
- Captures architectural rationale or trade-offs
- Documents domain-specific knowledge
- Identifies effective patterns or anti-patterns
- Clarifies tool setup or configuration gotchas

Do NOT document what the repo already records: code structure, git history, anything derivable by reading the code.

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
| Gotcha, pattern, anti-pattern, tool knowledge that affects how Claude works in this repo | Project `CLAUDE.md` | Loaded every session for this project |
| Architectural decision with rationale and rejected alternatives | ADR (`docs/adr/` or project convention) — use the `adr` agent | Decisions need permanence and context beyond a config file |
| In-flight discoveries during planned work (blockers, scope changes) | The active plan file in `plans/` | Travels with the work; merged or discarded when the plan completes |
| Cross-project user preferences and corrections | Auto-memory (`MEMORY.md`) | Persists across projects and sessions |
| User-facing behavior, setup steps, API usage | README / docs — use the `docs-guardian` agent | Humans read these, not CLAUDE.md |

When several learnings accumulate at the end of a feature, launch the `learn` agent to sweep the session for documentation-worthy insights rather than relying on recall.

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
