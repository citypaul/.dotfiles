---
name: mutation-testing
description: Mutation testing patterns for verifying test effectiveness. Use when analyzing branch code to find weak or missing tests. Prefers Stryker with an incremental diff-vs-main run and a visual surviving-mutants report; falls back to manual mutation-by-hand when Stryker is unavailable; can scaffold a nightly CI pipeline against mainline.
---

# Mutation Testing

For writing good tests (factories, behavior-driven patterns), load the `testing` skill. This skill focuses on verifying test effectiveness.

Mutation testing answers the question: **"Are my tests actually catching bugs?"**

Code coverage tells you what code your tests execute. Mutation testing tells you if your tests would **detect changes** to that code. A test suite with 100% coverage can still miss 40% of potential bugs.

---

## Core Concept

**The Mutation Testing Process:**

1. **Generate mutants** — introduce small bugs (mutations) into production code.
2. **Run tests** — execute the suite against each mutant.
3. **Evaluate** — if tests fail, the mutant is *killed* (good). If tests pass, the mutant *survived* (bad — your tests missed the bug).

**The Insight:** a surviving mutant represents a bug your tests wouldn't catch.

**Integration with TDD:**

```
RED → GREEN → MUTATE → KILL MUTANTS → REFACTOR
```

Mutation testing validates test strength *before* you restructure code. Refactoring with unverified tests means restructuring code whose safety net you haven't checked.

---

## Two Modes

This skill runs in one of two modes. Choose the first that applies:

| | **Stryker mode (preferred)** | **Manual mode (fallback)** |
|---|---|---|
| When | Project uses JS/TS and Stryker is installed — or can be — and the user agrees | Non-JS project, Stryker cannot/should-not be installed, or quick ad-hoc check on a handful of lines |
| Scope | Every mutation operator Stryker supports, applied to changed files | Hand-picked mutations on the diff hotspots |
| Speed | Seconds–minutes (incremental) | Minutes of human-driven edits |
| Output | Parsed JSON → visual report + suggested behavior-driven tests | Same visual report, produced by hand |

**Always open the conversation by asking which mode to use.** Detect what's available first (see "Mode Selection" below) so the recommendation is concrete, not generic.

### Mode Selection

Run these checks and report what you found, then propose a mode:

```bash
# Is there a JS/TS project?
test -f package.json && jq -r '.name // "no-name"' package.json

# Is Stryker already configured?
ls stryker.conf.{json,js,cjs,mjs,ts} 2>/dev/null
jq -r '.devDependencies // {} | keys[] | select(startswith("@stryker-mutator/"))' package.json 2>/dev/null

# Which test runner is in use? (informs Stryker plugin choice)
jq -r '.devDependencies // {} | keys[] | select(. == "vitest" or . == "jest" or . == "mocha" or . == "jasmine")' package.json 2>/dev/null
```

**Decision tree:**

- Stryker **already installed** → go to Stryker mode, skip install.
- JS/TS project, Stryker **not installed** → ask: *"Shall I set up Stryker? Alternative is to run mutations by hand."* Respect the answer.
- Non-JS project, or user declines Stryker → Manual mode.

Never install Stryker silently. It adds a dev dependency and a config file; the user must approve.

---

## Stryker Mode

### Step 1 — Install and configure (only if not already set up)

Pick the runner plugin that matches the project. For a Vitest project:

```bash
npm i -D @stryker-mutator/core @stryker-mutator/vitest-runner
```

For Jest:

```bash
npm i -D @stryker-mutator/core @stryker-mutator/jest-runner
```

Write `stryker.conf.json` (Vitest example):

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "packageManager": "npm",
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "reporters": ["json", "html", "clear-text", "progress"],
  "jsonReporter": { "fileName": "reports/mutation/mutation.json" },
  "htmlReporter": { "fileName": "reports/mutation/index.html" },
  "mutate": ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
  "incremental": true,
  "incrementalFile": "reports/stryker-incremental.json",
  "thresholds": { "high": 85, "low": 70, "break": 60 },
  "timeoutMS": 15000,
  "concurrency": 4
}
```

Key settings to explain to the user:

- `reporters: ["json", ...]` — the **json** reporter is how we build the visual report in Step 3. Do not remove it.
- `incremental: true` — Stryker caches per-mutant results so re-runs only re-test what changed. Commit `reports/stryker-incremental.json` to speed up subsequent runs, or gitignore it and rebuild each time — user's call.
- `thresholds.break` — fail the run below this score. Start forgiving (60) and tighten over time.

Add a script:

```json
{ "scripts": { "test:mutation": "stryker run" } }
```

Add to `.gitignore`:

```
reports/mutation/
.stryker-tmp/
```

### Step 2 — Incremental run: diff-vs-main only

The point of running on a branch is to test **only what changed**. Stryker accepts an explicit file list via `--mutate`, so derive it from the diff:

```bash
# Files changed on this branch vs main, restricted to source
CHANGED=$(git diff --name-only --diff-filter=AM origin/main...HEAD \
  | grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' \
  | grep -vE '\.(test|spec)\.' \
  | grep -v node_modules \
  | paste -sd, -)

# No changes? Nothing to mutate — exit quietly.
if [ -z "$CHANGED" ]; then
  echo "No source files changed vs main. Skipping mutation run."
  exit 0
fi

echo "Mutating: $CHANGED"
npx stryker run --mutate "$CHANGED"
```

Notes:

- `origin/main...HEAD` (three dots) — files changed on the branch since it forked. Prefer this to `main..HEAD` so you don't re-mutate code main moved on from.
- `--diff-filter=AM` — added + modified only. Deleted files can't be mutated.
- If the project supports it, `--mutate` can also accept `path:startLine-endLine` ranges to mutate only the changed lines within a file. This is faster but hides weak tests around changed code; start with whole-file and narrow later if runs are too slow.

**For deeper change scoping**, Stryker's own `since` feature (`--since main`) also works — but the explicit `--mutate` approach is transparent and portable across Stryker versions.

### Step 3 — The visual report

After the run, parse `reports/mutation/mutation.json` and print a report to the terminal. This is the artifact that gets shown back to the user on **every** run — not just buried as an HTML file.

**Required sections, in order:**

1. **Header** — branch, base ref, files included.
2. **Summary** — mutation score, killed / survived / timeout / no-coverage counts, vs. threshold.
3. **Surviving mutants** — numbered, one card per survivor (see format below).
4. **Next actions** — short list of what to do now (add test, investigate equivalence, adjust threshold).

**Surviving-mutant card format:**

```
[1/5]  src/pricing/discount.ts:23  (ConditionalExpression)
──────────────────────────────────────────────────────────────────────
Mutation:
    -  if (order.total >= 100) {
    +  if (order.total >  100) {

Business behavior missed:
    Orders totalling EXACTLY £100 qualify for the discount. No test
    covers the boundary; a regression that shifted ">=" to ">" would
    ship undetected and silently deny the discount to £100 orders.

Suggested test (behavior-driven — name describes the rule, not the code):
    it("applies the discount at the exact £100 threshold", () => {
      const order = anOrder({ total: 100 });
      expect(applyDiscount(order).discounted).toBe(true);
    });

Why this test kills the mutant:
    100 >= 100 → true (original). 100 > 100 → false (mutant). The
    assertion diverges, so the test fails against the mutated code.
```

**Rules for the "Business behavior missed" line:**

- State the *rule* in domain language, not in code terms. "Orders totalling exactly £100 qualify" — not "the `>=` comparison at line 23 is untested."
- Name the *consequence* of the un-caught bug — what would the user/customer actually experience?
- If you cannot articulate a business rule for the surviving mutant, flag it as a candidate **equivalent mutant** (see below) rather than invent one.

**Rules for the "Suggested test":**

- The test name is a sentence about the rule, in the system's voice ("applies the discount at the exact £100 threshold") — not about the code ("returns true when `>=` path is taken").
- The test sets up a concrete, non-identity input (e.g. £100, not £0; quantity 3, not 1) so it can actually distinguish the mutant from the original.
- Use the project's factory/arrange style if you can see one in `src/**/*.{test,spec}.*`. Match their vocabulary.
- One assertion that names the observable outcome. Don't assert on internals or on whether a function was called — those tests also survive mutations.
- **Never** suggest a test that asserts on the *code* ("expect the `>=` branch to run"). That's the implementation trap this skill exists to avoid.

**Equivalent mutant handling:** if the mutation has no observable effect (e.g. `a + 0` → `a - 0`, or a branch that's dead given upstream invariants), print it in a separate "Likely equivalent — no test needed" section with a one-line justification. Do not pad the suggested-test list with tests that can't be written meaningfully.

### Step 4 — Kill surviving mutants (TDD)

Work through survivors in order. For each:

1. Write the suggested test. Run it — confirm it **passes** against current code.
2. Apply the mutation by hand (revert after) — confirm the test now **fails**. This proves the test actually kills the mutant rather than passing vacuously.
3. Revert the mutation. Commit the new test.
4. Re-run `npm run test:mutation` (incremental mode skips already-killed mutants).

Ask the human before adding a test when:
- You suspect the mutant is equivalent.
- The value of the test is ambiguous (boundary nobody has a business opinion about).
- Killing the mutant would require mocking something that isn't normally mocked.

### Step 5 — The CI nightly pipeline (optional, offer once per project)

Incremental per-branch runs catch regressions on changed code. A **nightly full run on main** catches test suite rot across the rest of the codebase.

Offer this to the user once per project. If they accept, write `.github/workflows/mutation-nightly.yml`:

```yaml
name: Mutation Testing (nightly)

on:
  schedule:
    - cron: "0 3 * * *"   # 03:00 UTC daily
  workflow_dispatch: {}

jobs:
  stryker:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    permissions:
      contents: read
      issues: write        # for filing a report issue on threshold break
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - run: npm ci

      - name: Run Stryker on full repo
        run: npx stryker run
        # Uses stryker.conf.json — mutates everything under `mutate` globs.

      - name: Upload HTML + JSON reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation/
          retention-days: 30

      - name: Open issue if threshold broken
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            const body = [
              "Nightly mutation run dropped below threshold.",
              "",
              "- Run: " + context.runId,
              "- Report artifact: `mutation-report`",
              "",
              "Review surviving mutants in the HTML report; add behavior-driven tests.",
            ].join("\n");
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo:  context.repo.repo,
              title: "Mutation score below threshold on main",
              body,
              labels: ["tests", "quality"],
            });
```

Explain to the user:

- This runs a **full** mutation pass on main, not the incremental branch one.
- It uploads the HTML report as an artifact so anyone can download and read it.
- It opens a GitHub issue only on threshold break, to avoid nightly noise.
- Runtime scales with codebase size. If this exceeds the GitHub runner's 6-hour limit, split by directory or shard with `--mutate` globs per job.

Do not enable this for repos where the test suite itself is flaky — fix flake first; mutation testing magnifies flake into false survivors.

---

## Manual Mode (fallback)

Use this when Stryker isn't an option — non-JS projects, or a quick sanity check on a handful of changed lines. The deliverable is the **same visual report** as Stryker mode (Step 3). Only the data collection is different.

### Step 1 — Identify changed code

```bash
git diff --name-only origin/main...HEAD \
  | grep -vE '(test|spec)\.' \
  | xargs -I{} echo "CHANGED: {}"

git diff origin/main...HEAD -- src/
```

### Step 2 — Apply mutations and run tests

For each changed function, walk the mutation operators (see Operators Reference below). For each mutation:

1. **Mutate** — edit the production code (flip `*` to `/`, negate a condition, empty a block).
2. **Run** — execute the test suite.
3. **Evaluate** — did a test fail?
   - **Yes** → mutant killed (good). Revert and move on.
   - **No** → mutant survived. Revert, then queue it for the report.
4. **Revert** — always restore the original code before the next mutation. **Never leave mutated code in place.**

Focus on:

- Changed code on the branch — not the whole file.
- Operators most likely to have survivors (see Quick Reference at the bottom).
- Boundary values on conditions.
- Boolean logic with multiple operands.

You do not need to apply every possible mutation to every line. Aim for coverage of the high-signal operators on the changed lines.

### Step 3 — Produce the same visual report

Format survivors exactly as in Stryker mode Step 3 — the user sees one consistent report regardless of mode. Section headers, card format, and the "business behavior missed" / "suggested test" fields are identical.

### Step 4 — Kill survivors (TDD)

Same TDD loop as Stryker mode Step 4: write the suggested test, apply the mutation by hand to confirm the test fails against it, revert the mutation, commit the test.

---

## Operators Reference

Used by both modes. Stryker applies these automatically; in manual mode pick from the table.

### Arithmetic

| Original | Mutated | Test should verify |
|---|---|---|
| `a + b` | `a - b` | Addition matters |
| `a - b` | `a + b` | Subtraction matters |
| `a * b` | `a / b` | Multiplication matters |
| `a / b` | `a * b` | Division matters |
| `a % b` | `a * b` | Modulo matters |

```typescript
const calculateTotal = (price: number, quantity: number): number =>
  price * quantity;

// Weak — identity value makes * and / indistinguishable
expect(calculateTotal(10, 1)).toBe(10);

// Strong — non-identity input reveals the operator
expect(calculateTotal(10, 3)).toBe(30);
```

### Conditional / Comparison

| Original | Mutated | Test should verify |
|---|---|---|
| `a < b` | `a <= b`, `a >= b` | Boundary at equality; both sides |
| `a <= b` | `a < b`, `a > b` | Boundary at equality; both sides |
| `a > b` | `a >= b`, `a <= b` | Boundary at equality; both sides |
| `a >= b` | `a > b`, `a < b` | Boundary at equality; both sides |

```typescript
const isAdult = (age: number): boolean => age >= 18;

// Weak — doesn't test the boundary
expect(isAdult(25)).toBe(true);

// Strong — boundary
expect(isAdult(18)).toBe(true);   // mutant `>` returns false here
expect(isAdult(17)).toBe(false);  // mutant `<` returns true here
```

### Equality

| Original | Mutated | Test should verify |
|---|---|---|
| `a === b` | `a !== b` | Both equal and not-equal cases |
| `a !== b` | `a === b` | Both equal and not-equal cases |

### Logical

| Original | Mutated | Test should verify |
|---|---|---|
| `a && b` | `a \|\| b` | One true, one false |
| `a \|\| b` | `a && b` | One true, one false |
| `a ?? b` | `a && b` | Nullish vs falsy distinction |

```typescript
const canAccess = (isAdmin: boolean, isOwner: boolean): boolean =>
  isAdmin || isOwner;

// Weak — both true means || and && agree
expect(canAccess(true, true)).toBe(true);

// Strong — mixed inputs distinguish || from &&
expect(canAccess(true, false)).toBe(true);
expect(canAccess(false, true)).toBe(true);
expect(canAccess(false, false)).toBe(false);
```

### Boolean / Negation

| Original | Mutated | Test should verify |
|---|---|---|
| `true` | `false` | Both outcomes |
| `false` | `true` | Both outcomes |
| `!x` | `x` | Negation is load-bearing |

### Block statements

| Original | Mutated | Test should verify |
|---|---|---|
| `{ side effects }` | `{ }` | Observable side effect occurs |

Removing a function body is a brutal test — if the suite doesn't notice, the function has no verified effect.

```typescript
// Weak — an empty function body also doesn't throw
expect(() => processOrder(order)).not.toThrow();

// Strong — verifies the observable outcome
processOrder(order);
expect(orderRepository.save).toHaveBeenCalledWith(order);
```

### String / Array literals

| Original | Mutated | Test should verify |
|---|---|---|
| `"text"` | `""` | Non-empty string matters |
| `""` | `"Stryker was here!"` | Empty string matters |
| `[1, 2, 3]` | `[]` | Non-empty array matters |

### Unary

| Original | Mutated | Test should verify |
|---|---|---|
| `+a` / `-a` | swap sign | Sign matters |
| `++a` / `--a` | swap direction | Direction matters |

### Method / call expressions

| Original | Mutated | Test should verify |
|---|---|---|
| `startsWith()` | `endsWith()` | Position matters |
| `toUpperCase()` | `toLowerCase()` | Case matters |
| `some()` | `every()` | Partial vs full match |
| `every()` | `some()` | Partial vs full match |
| `filter()` | removed | Filter matters |
| `sort()` / `reverse()` | removed | Order matters |
| `min()` / `max()` | swap | Extremum matters |
| `trim()` | `trimStart()` / `trimEnd()` | Trim direction matters |

### Optional chaining

| Original | Mutated | Test should verify |
|---|---|---|
| `foo?.bar` | `foo.bar` | Null/undefined handling |
| `foo?.()` | `foo()` | Null/undefined handling |

---

## Mutant states and metrics

| State | Meaning | Action |
|---|---|---|
| Killed | A test failed under the mutant | Good |
| Survived | Tests passed with the mutant active | Add / strengthen a test |
| No coverage | No test executes this code | Add a behavior test |
| Timeout | Tests timed out (e.g., infinite loop) | Counted as detected |
| Equivalent | Mutant can't change observable behavior | No test — document |

- **Mutation score** = killed / (killed + survived + no-coverage) × 100
- **Detected** = killed + timeout
- **Undetected** = survived + no coverage

Target bands: `<60%` weak · `60–80%` moderate · `80–90%` good · `>90%` strong (watch for equivalents).

---

## Equivalent mutants

Equivalent mutants produce identical observable behavior — they cannot be killed. The skill's job is to **recognise** them, not to invent a test.

Common patterns:

```typescript
// Identity element — mutating +0 to -0 does nothing observable
number += 0;

// Dead branch — given upstream invariants, this is unreachable
if (a >= b) {
  result = 10 ** (max - min);  // max - min is 0 when a === b
}

// Defensive check that is always hit in practice
if (typeof x === "object" && x !== null) { /* ... */ }
```

How to handle:

1. **Identify** — analyse whether the mutation changes any observable outcome.
2. **Document** — in the report, list it under "Likely equivalent" with a one-line justification.
3. **Accept** — 100% mutation score is often not achievable. Aim high; don't pad tests.
4. **Consider refactoring** — persistent equivalents sometimes indicate dead code worth removing.

---

## Branch analysis checklist

For each changed function:

- [ ] Arithmetic operators — would `+ − × ÷` swaps be detected?
- [ ] Conditionals — are boundary values tested on `<= < > >=`?
- [ ] Boolean logic — are mixed-input cases tested on `&& ||`?
- [ ] Return statements — would a different return value be detected?
- [ ] Method calls — would swapping `some` ↔ `every`, `startsWith` ↔ `endsWith` be detected?
- [ ] String / array literals — would emptying them be detected?

Red flags (likely survivors):

- Tests only assert "no error thrown".
- Tests only exercise one side of a condition.
- Tests use identity values (`0`, `1`, `""`, `[]`) for operators.
- Tests only verify a function was called, not with what.
- Tests don't verify the return value.
- Boundary values are missing.

---

## Strengthening weak tests

**Boundary values**

```typescript
// Weak
expect(isAdult(25)).toBe(true);
expect(isAdult(10)).toBe(false);

// Strong
expect(isAdult(17)).toBe(false);
expect(isAdult(18)).toBe(true);
expect(isAdult(19)).toBe(true);
```

**Both branches of conditions**

```typescript
// Weak — only tests one combination
expect(canAccess(true, true)).toBe(true);

// Strong — tests the rule, not one happy path
expect(canAccess(true,  false)).toBe(true);   // admin-only grants
expect(canAccess(false, true )).toBe(true);   // owner-only grants
expect(canAccess(false, false)).toBe(false);  // neither denies
```

**Non-identity values**

```typescript
// Weak — 1 and 0 are identity for * and +
expect(multiply(10, 1)).toBe(10);
expect(add(5, 0)).toBe(5);

// Strong — values the operators disagree on
expect(multiply(10, 3)).toBe(30);
expect(add(5, 3)).toBe(8);
```

**Observable side effects**

```typescript
// Weak — no assertion at all
processOrder(order);

// Strong — verifies what the business cares about
processOrder(order);
expect(orderRepository.save).toHaveBeenCalledWith(order);
expect(emailService.send).toHaveBeenCalledWith(
  expect.objectContaining({ to: order.customerEmail }),
);
```

---

## Summary

**The question for every line of changed code:**

> "If I introduced a bug here, would my tests catch it?"

**For each surviving mutant, the report must answer:**

1. What business rule is no longer protected?
2. What would a user/customer experience if this mutation shipped?
3. What behavior-driven test would kill it — named after the rule, not the code?

**Remember:**

- Coverage measures execution. Mutation testing measures detection.
- Prefer Stryker with an incremental diff-vs-main run. Fall back to manual only when Stryker is unavailable or refused.
- Offer the nightly CI pipeline once per project, not every run.
- Suggested tests are always **behavior-driven**: named after the rule, asserting the observable outcome, on a non-identity input.

---

## Quick Reference

**Operators most likely to leave survivors**

1. `>=` vs `>` (boundary not tested)
2. `&&` vs `||` (no mixed-input case)
3. `+` vs `-` (only tested with 0)
4. `*` vs `/` (only tested with 1)
5. `some()` vs `every()` (only tested with all-match inputs)

**Test values that kill mutants**

| Avoid | Use instead |
|---|---|
| `0` for `+ −` | Non-zero values |
| `1` for `× ÷` | Values > 1 |
| Empty arrays | Arrays with multiple items |
| Identical values for comparisons | Distinct values |
| All-true / all-false for logical ops | Mixed true/false |
