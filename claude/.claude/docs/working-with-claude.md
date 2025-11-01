# Working with Claude

## Expectations

When working with my code:

1. **ALWAYS FOLLOW TDD** - No production code without a failing test. This is not negotiable.
2. **Think deeply** before making any edits
3. **Understand the full context** of the code and requirements
4. **Ask clarifying questions** when requirements are ambiguous
5. **Think from first principles** - don't make assumptions
6. **Assess refactoring after every green** - Look for opportunities to improve code structure, but only refactor if it adds value
7. **Keep project docs current** - Update CLAUDE.md whenever you introduce meaningful changes.

   **At the end of every significant change, ask: "What do I wish I'd known at the start?"**

   Document if ANY of these are true:
   - ✅ Would save future developers >30 minutes
   - ✅ Prevents a class of bugs or errors
   - ✅ Reveals non-obvious behavior or constraints
   - ✅ Captures architectural rationale or trade-offs
   - ✅ Documents domain-specific knowledge
   - ✅ Identifies effective patterns or anti-patterns
   - ✅ Clarifies tool setup or configuration gotchas

   **Types of learnings to capture:**
   - **Gotchas**: Unexpected behavior discovered (e.g., "API returns null instead of empty array")
   - **Patterns**: Approaches that worked particularly well
   - **Anti-patterns**: Approaches that seemed good but caused problems
   - **Decisions**: Architectural choices with rationale and trade-offs
   - **Edge cases**: Non-obvious scenarios that required special handling
   - **Tool knowledge**: Setup, configuration, or usage insights

   **Format for documentation:**
   ```markdown
   #### Gotcha: [Descriptive Title]

   **Context**: When this occurs
   **Issue**: What goes wrong
   **Solution**: How to handle it

   ```typescript
   // ✅ CORRECT - Solution
   const example = "correct approach";

   // ❌ WRONG - What causes the problem
   const wrong = "incorrect approach";
   ```
   ```

   This continuous documentation ensures future work benefits from accumulated knowledge. **Don't wait until project end - capture learnings while context is fresh.**

## Code Changes

When suggesting or making changes:

- **Start with a failing test** - always. No exceptions.
- After making tests pass, always assess refactoring opportunities (but only refactor if it adds value)
- After refactoring, verify all tests and static analysis pass, then commit
- Respect the existing patterns and conventions
- Maintain test coverage for all behavior changes
- Keep changes small and incremental
- Ensure all TypeScript strict mode requirements are met
- Provide rationale for significant design decisions

**If you find yourself writing production code without a failing test, STOP immediately and write the test first.**

## Communication

- Be explicit about trade-offs in different approaches
- Explain the reasoning behind significant design decisions
- Flag any deviations from these guidelines with justification
- Suggest improvements that align with these principles
- When unsure, ask for clarification rather than assuming
