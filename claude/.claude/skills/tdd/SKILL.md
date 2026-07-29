---
name: tdd
description: RED-GREEN-REFACTOR for production behavior changes, followed by mutation testing or alternate evidence once at the end-of-phase PR-readiness gate. Use before implementing new features, bug fixes, or any changed observable behavior, and as the governing workflow for mixed implementation work. Do not use for pure behavior-preserving refactoring or mechanism reduction; those start from passing proportionate evidence via refactoring or reduce-system-complexity, never fabricated RED or structural mutants. Not for plan-only requests; use planning first for significant multi-slice work.
---

# Test-Driven Development

TDD is the fundamental practice for new or changed observable behavior: every such production change must be written in response to a failing behavior test.

Pure behavior-preserving work is different. `refactoring` and `reduce-system-complexity` begin from passing proportionate preservation evidence and stay behaviorally green while internal structure changes. At the end-of-phase PR-readiness gate, use mutation testing where meaningful; otherwise record reachability, configuration, contract, integration, or operational evidence and mark mutation `N/A`. Do not manufacture a failing test or structural mutant merely to make a REFACTOR slice look RED. If the work changes behavior or fixes a disputed bug, return to RED.

**For how to write good tests**, load the `testing` skill. This skill focuses on the TDD workflow/process. For mutation-aware test planning, load the `mutation-testing` skill and use its `resources/mutator-rules.md` resource as the source of truth.

---

## RED-GREEN-REFACTOR Development Cycle

### RED: Write Failing Test First
- For new or changed behavior, NO production code until you have a failing behavior test
- Test describes desired behavior, not implementation
- Test should fail for the right reason
- Before finalizing the test, scan the intended behavior against the mutator rules: boundaries, boolean combinations, equality, arithmetic identities, array/string operations, optional chaining, and side effects
- Add obvious missing cases immediately; use the harness's ask-question facility when the expected behavior is a product/domain judgment

### GREEN: Minimum Code to Pass
- Write ONLY enough code to make the test pass
- Resist adding functionality not demanded by a test
- Faking it is legitimate: hardcode the return value if that passes, then triangulate — add a second test case that forces the real implementation. Generalize only when a test demands it

### REFACTOR: Assess Improvements
- Assess after GREEN using the passing behavior tests as the working safety net
- Load the `refactoring` skill only when restructuring is applicable; record `N/A` otherwise
- Obtain approval for the working-baseline commit before refactoring when the workflow uses commits as safety checkpoints
- All tests must pass after refactoring

Repeat RED-GREEN-REFACTOR as needed until the phase's PR scope is complete. Do not run the automated mutation harness after each increment, refactor, or commit.

## End-of-Phase PR-Readiness Gate

Run this gate once the implementation and refactoring phase is complete and the work is otherwise ready to become a PR:

1. **MUTATE OR ALTERNATE EVIDENCE**: Run `mutation-testing` against the accumulated branch/PR scope where meaningful and produce a killed/survived/score report. Otherwise record an explicit `N/A` rationale plus proportionate reachability, configuration, contract, integration, or operational evidence.
2. **KILL MUTANTS WHEN APPLICABLE**: Add or strengthen behavior tests for valuable survivors, fix obvious gaps directly, and ask the human when a survivor's value is ambiguous.
3. **RE-RUN WITHIN THE GATE**: Use focused mutation runs while addressing survivors, then re-run the branch diff command. These reruns belong to the same PR gate; they do not put mutation testing back into every TDD increment.
4. **VERIFY**: Finish the remaining PR checks with all tests passing. Never invent structural mutants merely to fill the workflow.

---

## TDD Evidence in Commit History

### Default Expectation

Commit history should show clear RED → GREEN → REFACTOR when applicable. Mutation testing is PR-readiness evidence for the completed phase, not a required commit after every TDD increment.

**Ideal progression:**
```
commit abc123: test: add failing test for user authentication
commit def456: feat: implement user authentication to pass test
commit ghi789: refactor: extract validation logic for clarity

Pre-PR gate: run mutation testing for the accumulated branch scope. If valuable
survivors require stronger tests, add those tests and include their commit before
creating the PR.
```

### Rare Exceptions

TDD evidence may not be linearly visible in commits in these cases:

**1. Multi-Session Work**
- Feature spans multiple development sessions
- Work done with TDD in each session
- Commits organized for PR clarity rather than strict TDD phases
- **Evidence**: Tests exist, all passing, implementation matches test requirements

**2. Context Continuation**
- Resuming from previous work
- Original RED phase done in previous session/commit
- Current work continues from that point
- **Evidence**: Reference to RED commit in PR description

**3. Refactoring Commits**
- Large refactors after GREEN with a passing behavior-test baseline
- Multiple small refactors combined into single commit
- All tests remained green throughout
- **Evidence**: Commit message notes "refactor only, no behavior change"

### Documenting Exceptions in PRs

When exception applies, document in PR description:

```markdown
## TDD Evidence

RED phase: commit c925187 (added failing tests for shopping cart)
GREEN phase: commits 5e0055b, 9a246d0 (implementation + bug fixes)
REFACTOR: commit 11dbd1a (test isolation improvements)
PRE-PR MUTATION GATE: 96% mutation score; commit 7b8c9d0 strengthened boundary tests

Test Evidence:
✅ 4/4 tests passing (7.7s with 4 workers)
```

**Important**: These exceptions concern evidence presentation. New or changed behavior still follows RED. A true behavior-preserving refactor follows the explicit REFACTOR path above and should document its passing pre-change oracles rather than inventing a RED phase.

---

## Coverage Verification - CRITICAL

### NEVER Trust Coverage Claims Without Verification

**Always run coverage yourself before approving PRs.**

### Verification Process

**Before approving any PR claiming "100% coverage":**

1. Check out the branch
   ```bash
   git checkout feature-branch
   ```

2. Run coverage verification (adapt to the project's package manager and layout):
   ```bash
   pnpm test:coverage
   # OR
   pnpm exec vitest run --coverage
   ```

3. Verify ALL metrics hit 100%:
   - Lines: 100% ✅
   - Statements: 100% ✅
   - Branches: 100% ✅
   - Functions: 100% ✅

4. Check that tests are behavior-driven (not testing implementation details)

**For anti-patterns that create fake coverage (coverage theater)**, see the `testing` skill.

### Reading Coverage Output

Look for the "All files" line in coverage summary:

```
File           | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
---------------|---------|----------|---------|---------|-------------------
All files      |     100 |      100 |     100 |     100 |
setup.ts       |     100 |      100 |     100 |     100 |
context.ts     |     100 |      100 |     100 |     100 |
endpoints.ts   |     100 |      100 |     100 |     100 |
```

✅ This is 100% coverage - all four metrics at 100%.

### Red Flags

Watch for these signs of incomplete coverage:

❌ **PR claims "100% coverage" but you haven't verified**
- Never trust claims without running coverage yourself

❌ **Coverage summary shows <100% on any metric**
```
All files      |   97.11 |    93.97 |   81.81 |   97.11 |
```
- This is NOT 100% coverage (Functions: 81.81%, Lines: 97.11%)

❌ **"Uncovered Line #s" column shows line numbers**
```
setup.ts       |   95.23 |      100 |      60 |   95.23 | 45-48, 52-55
```
- Lines 45-48 and 52-55 are not covered

❌ **Coverage gaps without explicit exception documentation**
- If coverage <100%, exception should be documented (see Exception Process below)

### When Coverage Drops, Ask

**"What business behavior am I not testing?"**

NOT "What line am I missing?"

Add tests for behavior, and coverage follows naturally.

---

## 100% Coverage Exception Process

### Default Rule: 100% Coverage Required

No exceptions without explicit approval and documentation.

This applies to code developed with TDD. When working in legacy code, the scope is the change area, not the whole codebase — see the `characterisation-tests` skill for that workflow.

### Requesting an Exception

If 100% coverage cannot be achieved:

**Step 1: Document in package README**

Explain:
- Current coverage metrics
- WHY 100% cannot be achieved in this package
- WHERE the missing coverage will come from (integration tests, E2E, etc.)

**Step 2: Get explicit approval**

From project maintainer or team lead

**Step 3: Document in CLAUDE.md**

Under "Test Coverage: 100% Required" section, list the exception

**Example Exception:**

```markdown
## Current Exceptions

- **Next.js Adapter**: 86% function coverage
  - Documented in `/packages/nextjs-adapter/README.md`
  - Missing coverage from SSR functions (tested in E2E layer)
  - Approved: 2024-11-15
```

### Remember

The burden of proof is on the requester. 100% is the default expectation.

---

## Development Workflow

### Adding a New Feature

1. **Write failing test** - describe expected behavior
2. **Run test** - confirm it fails (`pnpm test:watch`)
3. **Implement minimum** - just enough to pass
4. **Run test** - confirm it passes
5. **Refactor if applicable and valuable** - improve code structure while the behavior tests stay green
6. **STOP and wait for commit approval** - present the increment and ordinary verification; never commit without explicit user approval
7. **Commit** - with conventional commit message, once approved
8. **Repeat RED-GREEN-REFACTOR** - continue with further increments and commits without running the mutation harness until the planned PR scope is complete
9. **At PR readiness, run the mutation gate once** - run mutation testing where meaningful (or record explicit `N/A` plus proportionate alternate evidence), address valuable survivors, and complete PR verification

### Workflow Example

```bash
# 1. Write failing test
it('should reject empty user names', () => {
  const result = createUser({ id: 'user-123', name: '' });
  expect(result.success).toBe(false);
}); # ❌ Test fails (no implementation)

# 2. Implement minimum code
if (user.name === '') {
  return { success: false, error: 'Name required' };
} # ✅ Test passes

# 3. Refactor if needed (extract validation, improve naming)

# 4. STOP — present the increment + ordinary verification, wait for commit approval

# 5. Commit (after approval)
git add .
git commit -m "feat: reject empty user names"

# 6. Repeat RED-GREEN-REFACTOR increments without running the mutation harness

# 7. When the accumulated work is ready to create the PR, run the mutation gate once
#    and address valuable survivors before submitting
```

---

## Commit Messages

Use conventional commits format:

```
feat: add user role-based permissions
fix: correct email validation regex
refactor: extract user validation logic
test: add edge cases for permission checks
docs: update architecture documentation
```

**Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code change that neither fixes bug nor adds feature
- `test:` - Adding or updating tests
- `docs:` - Documentation changes

---

## Pull Request Requirements

Before submitting PR:

- [ ] All tests must pass
- [ ] All linting and type checks must pass
- [ ] **Coverage verification REQUIRED** - claims must be verified before review/approval
- [ ] **End-of-phase mutation gate REQUIRED where meaningful** - run once for the accumulated PR scope, address valuable survivors, or document explicit `N/A` plus proportionate alternate evidence
- [ ] PRs focused on single feature or fix
- [ ] Include behavior description (not implementation details)

**Example PR Description:**

```markdown
## Summary

Adds support for user role-based permissions with configurable access levels.

## Behavior Changes

- Users can now have multiple roles with fine-grained permissions
- Permission check via `hasPermission(user, resource, action)`
- Default role assigned if not specified

## Test Evidence

✅ 42/42 tests passing
✅ 100% coverage verified (see coverage report)

## TDD Evidence

RED: commit 4a3b2c1 (failing tests for permission system)
GREEN: commit 5d4e3f2 (implementation)
REFACTOR: commit 6e5f4a3 (extract permission resolution logic)
```

---

## Refactoring Priority

After GREEN establishes a passing behavior-test baseline, assess and classify improvement opportunities when restructuring is applicable. For the priority classification table and detailed methodology, load the `refactoring` skill — it owns that guidance. Mutation testing verifies the accumulated result later at the end-of-phase PR-readiness gate.

---

## Anti-Patterns to Avoid

- ❌ Writing new or changed production behavior without a failing behavior test
- ❌ Fabricating failing tests for implementation shape to justify a behavior-preserving refactor
- ❌ Testing implementation details (spies on internal methods)
- ❌ 1:1 mapping between test files and implementation files
- ❌ Using `let`/`beforeEach` for test data
- ❌ Trusting coverage claims without verification
- ❌ Mocking the function being tested
- ❌ Redefining schemas in test files
- ❌ Factories returning partial/incomplete objects
- ❌ Speculative code ("just in case" logic without tests)

**For detailed testing anti-patterns**, load the `testing` skill.

---

## Summary Checklist

Before marking work complete:

- [ ] Every new or changed behavior has a failing behavior test that demanded it, or the change is explicitly evidenced as a behavior-preserving REFACTOR slice
- [ ] Commit history shows TDD evidence (or documented exception)
- [ ] All tests pass
- [ ] Coverage verified at 100% (or exception documented)
- [ ] If the work is ready for a PR, the end-of-phase mutation gate ran once for the accumulated scope and valuable survivors were addressed where meaningful, or explicit `N/A` plus proportionate alternate evidence was reviewed
- [ ] Test factories used (no `let`/`beforeEach`)
- [ ] Tests verify behavior (not implementation details)
- [ ] Refactoring assessed when applicable and applied if valuable, or explicitly `N/A`
- [ ] Conventional commit messages used
