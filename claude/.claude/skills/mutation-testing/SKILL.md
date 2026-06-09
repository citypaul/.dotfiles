---
name: mutation-testing
description: Set up and run mutation testing with Stryker, including full-project and diff-against-main runs, then use surviving mutants to strengthen weak or missing tests. Use during the MUTATE phase of the TDD cycle, when verifying that tests actually catch bugs (coverage alone is not enough), when the user mentions mutation testing, Stryker, mutation score, or surviving mutants, or when assessing whether a test suite would detect realistic regressions. For writing the tests themselves, see testing.
---

# Mutation Testing

For writing good tests (factories, behavior-driven patterns), load the `testing` skill. This skill focuses on verifying test effectiveness.

Mutation testing answers the question: **"Are my tests actually catching bugs?"**

Code coverage tells you what code your tests execute. Mutation testing tells you if your tests would **detect changes** to that code. A test suite with 100% coverage can still miss 40% of potential bugs.

**Default posture:** use an automated mutation harness first. For JavaScript and TypeScript projects, recommend Stryker as the starting point if it is not already set up. Use manual/mental mutations only as a fallback, a teaching aid, or a focused follow-up for subtle survivors.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `mutator-rules.md` | Planning tests, scanning changed code for likely gaps, manually applying mutations, or interpreting surviving/equivalent mutants |

---

## Core Concept

**The Mutation Testing Process:**

1. **Generate mutants**: Introduce small bugs (mutations) into production code
2. **Run tests**: Execute your test suite against each mutant
3. **Evaluate results**: If tests fail, the mutant is "killed" (good). If tests pass, the mutant "survived" (bad - your tests missed the bug)

**The Insight**: A surviving mutant represents a bug your tests wouldn't catch.

---

## When to Use This Skill

Use mutation testing analysis when:

- Reviewing code changes on a branch
- Verifying test effectiveness after TDD
- Identifying weak tests that appear to have coverage
- Finding missing edge case tests
- Validating that refactoring didn't weaken test suite

**Integration with planning and TDD:**

```
FOR EACH STEP:
    ├─► CONFIRM: Human approves observable acceptance criteria
    ├─► RED: Write failing test, using mutator rules to spot likely gaps
    ├─► GREEN: Make it pass
    ├─► Run mutation testing
    ├─► KILL MUTANTS: Strengthen tests for worthwhile survivors
    ├─► REFACTOR: If valuable
    └─► STOP: Present work, mutation report, and wait for commit approval

PRE-PR QUALITY GATE:
    └─► Re-run mutation testing for the branch/repo scope
```

Mutation testing is not a replacement for RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR. It verifies the tests created during those increments are strong enough to catch real behavioral regressions before refactoring and before PR.

---

## Harness-First Mutation Workflow

When analyzing code on a branch, prove test effectiveness with Stryker whenever practical. Do not stop at reasoning about whether a test would catch a mutation; run the harness, then use the report to drive focused test improvements.

### Step 1: Inspect Setup and Scope

```bash
rg --files | rg '(^|/)(package.json|stryker\.config\.(mjs|cjs|js|json)|stryker\.conf\.(js|json))$'
git diff main...HEAD --name-only
```

- Identify the package manager, test runner, affected package(s), and existing Stryker config.
- If the repo uses a base branch other than `main`, substitute that branch in all diff commands.
- In monorepos, start in the smallest affected package, then widen to the repo-level command when the targeted run is healthy.
- If no Stryker setup exists in a JS/TS project, recommend adding it before doing manual mutation analysis.

### Step 2: Set Up Stryker When Missing

Use the official initializer as the starting point:

```bash
npm init stryker@latest
```

Then inspect and adapt the generated `stryker.config.*`:

- Prefer the project test runner plugin when available (`vitest`, `jest`, `mocha`, etc.). Use the generic command runner only when no tighter integration is practical.
- Mutate first-party production source only. Exclude tests, fixtures, snapshots, generated files, declaration files, build outputs, migrations, and low-signal barrels.
- For TypeScript, consider `@stryker-mutator/typescript-checker` so type-invalid mutants are reported as compile errors instead of wasting test time.
- Keep setup changes reviewable: add dependencies, config, scripts, and `.gitignore` entries for Stryker temp/report output only when the project needs them.

### Step 3: Recommend Useful Commands

Suggest project scripts for full-project, cached, and branch-diff mutation runs:

```json
{
  "scripts": {
    "mutation": "stryker run",
    "mutation:incremental": "stryker run --incremental",
    "mutation:diff": "node scripts/stryker-diff.mjs main"
  }
}
```

The `mutation:diff` helper should:

- Read the base branch argument, defaulting to `main`.
- Collect changed files with `git diff --name-only --diff-filter=ACMRTUXB <base>...HEAD`.
- Keep changed production files matching the project's source extensions.
- Exclude test/spec files, fixtures, snapshots, generated files, declaration files, and build output.
- Run `stryker run --incremental --force --mutate <comma-separated-files>`.
- Exit clearly when there are no changed production files to mutate.

Prefer a small Node helper over dense shell inside `package.json`; quoting `*`, `!`, and command substitution is fragile across shells. For quick local use, this POSIX one-liner is acceptable:

```bash
CHANGED=$(git diff --name-only --diff-filter=ACMRTUXB main...HEAD -- '*.ts' '*.tsx' '*.js' '*.jsx' | grep -Ev '(^|/)(__tests__|test|tests|fixtures|generated)/|\.(test|spec|d)\.' | paste -sd, -)
test -n "$CHANGED" && npx stryker run --incremental --force --mutate "$CHANGED"
```

Use exact line ranges for tiny follow-up checks when the report points to a specific survivor:

```bash
npx stryker run --incremental --force --mutate src/example.ts:42-57
```

### Step 4: Run and Triage

Start with `mutation:diff` for branch feedback. Run `mutation` across the full project when introducing Stryker, changing shared test infrastructure, preparing CI gates, or validating a broad test-strengthening pass.

Categorize Stryker findings:

| Category | Description | Action Required |
|----------|-------------|-----------------|
| Killed | Test failed when mutant was applied | None - tests are effective |
| Survived | Tests passed with mutant active | Add/strengthen test, unless equivalent |
| No Coverage | No test exercises this code | Add behavior test |
| Equivalent | Mutant produces same behavior | None - not a real bug |

Fix obvious issues immediately:

- Missing boundary tests
- Weak or absent assertions
- One-sided branch coverage
- Missing side-effect verification
- High-value business rules such as money, permissions, eligibility, safety, or data loss

Use the harness's ask-question facility for subtle survivors that require human judgment. Ask one concise question with concrete choices, explain the mutation, and describe the tradeoff. Use this when behavior is intentionally unspecified, the correct domain rule is unclear, the test would be expensive or brittle, or the mutant may be equivalent but you are not certain.

### Step 5: Kill Survivors With TDD

For each survivor worth killing:

1. Keep or recreate the mutant.
2. Write the smallest behavior test that fails against the mutant for the right reason.
3. Restore the original production code.
4. Verify the new test passes.
5. Re-run Stryker scoped to the mutated file or line range, then re-run the diff command.

Avoid overfitting tests to implementation details. Strong mutation tests assert observable behavior: return values, persisted state, emitted events, permissions, messages, or meaningful collaborator calls.

## Stryker Configuration Guidance

Stryker should be the normal entry point for JS/TS mutation testing.

### Starting Configuration

Prefer `stryker.config.mjs` or the format generated by the initializer. Using the Vitest runner requires installing `@stryker-mutator/vitest-runner` alongside `@stryker-mutator/core`. A typical starting point:

```javascript
export default {
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  reporters: ["html", "clear-text", "progress"],
  mutate: [
    "src/**/*.{ts,tsx,js,jsx}",
    "!src/**/*.test.{ts,tsx,js,jsx}",
    "!src/**/*.spec.{ts,tsx,js,jsx}",
    "!src/**/*.d.ts"
  ]
}
```

Adapt `testRunner`, `mutate`, `vitest.configFile`, build commands, and checker plugins to match the project. Do not cargo-cult this exact config into a repo with a different layout.

**Vitest Browser Mode caveat:** Stryker's Vitest runner targets Node-based test projects, not browser-mode ones. In a repo that follows the house preference for Browser Mode UI tests, scope `mutate` to non-UI source covered by Node tests, or point Stryker at the Node project of a multi-project Vitest setup. Verify current Browser Mode support in the Stryker docs before assuming a UI package can be mutated.

### CI and Quality Gates

- Start with report-only or diff-only mutation checks if the existing suite has many survivors.
- Add failing thresholds only after establishing a realistic baseline.
- Persist HTML and clear-text reports as CI artifacts.
- Use incremental mode for fast local feedback, but periodically force a full run to avoid stale assumptions.
- Treat mutation score as a signal, not a vanity metric. Prioritize surviving/no-coverage mutants in changed and high-risk code.

### Manual Mutation Fallback

If Stryker is unavailable or cannot target the code under review, load `resources/mutator-rules.md` and manually apply the relevant operators. Always revert each mutation before the next one. Manual mutation should still follow the same loop: mutate, run tests, classify, fix obvious gaps, ask about judgment calls, and report the result.

---

## Summary: Mutation Testing Mindset

**The key question for every line of code:**

> "If I introduced a bug here, would my tests catch it?"

**For each test, verify it would catch:**
- Arithmetic operator changes
- Boundary condition shifts
- Boolean logic inversions
- Removed statements
- Changed return values

**Remember:**
- Coverage measures execution, mutation testing measures detection
- A test that doesn't make assertions can't kill mutants
- Boundary values, mixed boolean cases, non-identity values, and observable side effects kill many common mutants
- For the full mutator checklist and examples, load `resources/mutator-rules.md`
