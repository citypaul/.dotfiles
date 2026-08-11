---
name: tdd
description: RED-GREEN-REFACTOR for production behavior changes, followed by mutation testing or alternate evidence once at the end-of-phase PR-readiness gate. Use before implementing new features, bug fixes, or any changed observable behavior, and as the governing workflow for mixed implementation work. Do not use for pure behavior-preserving refactoring or mechanism reduction; those start from passing proportionate evidence via refactoring or reduce-system-complexity, never fabricated RED or structural mutants. Not for plan-only requests; use planning first for significant multi-slice work.
---

# Test-Driven Development

TDD is the fundamental practice for new or changed observable behavior: every such production change must be written in response to a failing behavior test.

Pure behavior-preserving work is different. `refactoring` and `reduce-system-complexity` begin from passing proportionate preservation evidence and stay behaviorally green while internal structure changes. At the end-of-phase PR-readiness gate, use mutation testing where meaningful; otherwise record reachability, configuration, contract, integration, or operational evidence and mark mutation `N/A`. Do not manufacture a failing test or structural mutant merely to make a REFACTOR slice look RED. If the work changes behavior or fixes a disputed bug, return to RED.

In this skill, a **phase** means one PR-sized, independently mergeable slice: the accumulated scope of one branch and PR. It does not mean a multi-PR feature or the numbered lifecycle phases in `README.md`.

**For how to write good tests**, load the `testing` skill. This skill focuses on the TDD workflow/process. For mutation-aware test planning, load the `mutation-testing` skill and use its `resources/mutator-rules.md` resource as the source of truth.

---

## Fast TDD Feedback Loop (AI Default)

The RED-GREEN-REFACTOR inner loop must optimize for fast, relevant feedback. **Do not run the full test suite after every edit.**

Before RED, inspect package scripts, test configuration, and runner help. Repository-owned commands take precedence over generic examples:

1. **Honor the repository's watcher start point** — if it requires a proven watcher before the first edit, start it once now. Otherwise strict TDD may write RED first and start the watcher immediately afterwards. Repository timing overrides the generic example below.
2. **RED** — run the new or changed test file/name and confirm the expected failure.
3. **Select or reuse the watcher deliberately** — prefer a tested repository-owned watch command. It may run the complete relevant development tier once to populate the runtime graph, then rerun only affected tests. For Vitest without such a command, use `--changed <real-base> --watch` only when the installed version and repository configuration have the required live proof.
4. **GREEN/REFACTOR** — keep one watcher in a dedicated reusable terminal/session. Let the runner or repository graph choose affected tests; do not hand-pick a smaller ongoing GREEN scope.
5. **AI/non-interactive fallback** — when a persistent watcher cannot be owned reliably, run the equivalent affected one-shot after each edit.
6. **Repair the right boundary** — restart or reseed for stale or newly graph-visible relationships. For non-import/dynamic dependencies, configuration, global setup, public contracts, or shared-package uncertainty, add repository-owned triggers or widen to the owning suite/tier; restart alone cannot create an absent graph edge.
7. **PR readiness** — stop every watcher, then follow the repository's mutation/alternate-evidence policy and complete non-watch PR gate. In a monorepo, that final gate includes every configured project and required integration/E2E suite, not only the development subset.

Read [resources/vitest-watch-feedback.md](resources/vitest-watch-feedback.md) before selecting, adding, or changing a reusable Vitest watcher. It is the canonical detail for seed strategies, native discovery, blind spots, and the required live process proof.

### Vitest Seed Semantics

`vitest --changed <real-base> --watch` is **diff-selected for its initial execution**. Vitest clears the VCS selectors after that selection; it does not continuously recompute VCS impact after every save. Later reruns use retained Vite module graphs. In Vitest 4.1.10's ordinary Node/SSR path, initial changed selection statically analyzes every discovered test specification, so an imported implementation edit can rerun its test even when the clean-start initial execution reported no affected tests. Later reruns are therefore not limited to tests that executed initially.

Do not generalize that Vitest 4.1.10 implementation detail to other versions, Browser Mode, dynamic/non-import dependencies, or arbitrary repository configurations. Prefer a behaviorally proven repository-owned command such as `pnpm test:watch` for standard development, a clean refactoring baseline, or a watcher started before RED. A repository may safely run its complete relevant tier once to populate the graph. For strict TDD, starting a proven diff-selected watcher after RED makes it straightforward to confirm that the expected test actually executed. Do not replace a repository command with a generic raw Vitest example.

Examples (adapt to the repository; the first existing command that satisfies the required behavior wins):

```bash
# Repository-owned graph-complete watch, when defined and proven
pnpm test:watch

# Vitest diff-selected initial execution: use only after repository-level proof
pnpm exec vitest --changed origin/main --watch

# Vitest fallbacks: mechanically derived affected sources or one-shots
pnpm exec vitest related src/example.ts --watch
pnpm exec vitest related --run src/example.ts
pnpm exec vitest --changed origin/main --run

# Exact selector: RED/debug only
pnpm exec vitest run tests/example.test.ts -t "rejects empty names"

# Jest: repository/runner changed watch, or affected one-shot
pnpm exec jest --watch
pnpm exec jest --watch --changedSince=origin/main
pnpm exec jest --findRelatedTests src/example.ts --watch=false
pnpm exec jest --onlyChanged --watch=false
pnpm exec jest --changedSince=origin/main --watch=false
pnpm exec jest --runTestsByPath tests/example.test.ts -t "rejects empty names"

# Playwright: runner-selected affected one-shot (heuristic; inspect the selected tests)
pnpm exec playwright test --only-changed
pnpm exec playwright test --only-changed=origin/main
```

Vitest natively discovers a new matching test file when include globs remain open. Confirm that the new test actually executes and loads its implementation before trusting later implementation reruns. Do not add custom filesystem listeners or call rerun APIs unless live proof shows native discovery is insufficient; doing both can execute a new test twice.

`vitest related <sources...>` is a fallback only when every source path is derived mechanically. It implicitly permits an empty result to pass, so confirm an expected test executed. Do not use `--passWithNoTests` as evidence. Do not use `--standalone`: it either skips the initial run without a file filter or reduces the workflow to a supplied filter.

### Watcher Lifecycle and Automation Safety

- Start one watcher in a dedicated reusable terminal/session and reuse it throughout the inner loop.
- After the final edit, stop it with `Ctrl+C` before PR gates or task handoff. Do not leave background watchers behind.
- When automation spawns a watcher, timeout and signal cleanup must terminate the entire watcher process group—not only its immediate parent—and remove temporary directories.
- Never invoke a watch command from CI, Git hooks, finite lint/test/build/verification scripts, or another package script intended to terminate. Detect common forms including bare `vitest` in an interactive TTY, `vitest watch`, `vitest --watch`, `vitest --watch=true`, `vitest -w`, and `vitest -w=true`. Finite Vitest commands must force termination with `vitest run`, `--run`, or `--watch=false`.
- Treat a command that mixes a watch subcommand or positive watch flag with a finite marker as watch mode: `vitest run --watch` and `vitest watch --watch=false` are not finite.
- The sole exception is an isolated live-proof harness whose subject is the watcher itself. It must use an ephemeral fixture, enforce a hard timeout, terminate the entire watcher process group on success or failure, remove the fixture, and never expose the watch invocation as an ordinary finite package/CI command.
- Observe output emitted after the relevant rerun. A stale waiting marker, zero tests, or a process made green by a pass-with-no-tests option is not evidence.

Explicit watch remains long-lived even without a TTY; it does not become a finite command in CI. Bare `vitest` can default to watch when stdin is a TTY and neither CI nor Vitest's agent detection disables it. Never rely on environment auto-detection to make a finite command terminate. For other runners, prefer a tested repository-owned watcher, then native changed/affected selection, dependency-aware selection from a complete mechanically derived source list, the graph-derived affected package/project set, and finally an affected one-shot. Exact selectors remain RED/debug-only.

### Monorepos

Run changed/affected selection from the repository root through the project-defined test command, root Vitest `projects` configuration, or monorepo orchestrator that owns the complete workspace dependency graph. A shared-package edit may affect tests in several consumers, so do not `cd` into one package or add `--project` based only on the file being edited. A project filter is safe only when Vitest or the repository's package/task graph mechanically derived the complete affected project set, including transitive dependents.

Confirm the root configuration enumerates every relevant project and that cross-package imports are graph-visible. Filesystem reads, subprocess targets, generated output, templates, proxy-fetched dependencies, type-only relationships, file-scanning repository guards, browser-mode tests, and Docker-backed tiers may need repository-specific triggers or separate commands. Preserve `watchTriggerPatterns` and `forceRerunTriggers` where configured. Restart/reseed only repairs stale or newly graph-visible relationships; configure an explicit mapping or run the owning suite/tier for dependencies the graph cannot represent.

Watch mode is an inner-loop accelerator, not PR evidence. The pre-PR record must come from a completed non-watch full run against the final tree.

### Repository Authority

Repository-specific test, coverage, mutation, and evidence-freshness rules take precedence. Use this distribution's freshness model (the `panel-review` skill's `references/pr-readiness.md`) only when the target repository has not defined a stricter invalidation rule. This global guidance must never weaken a repository rule that invalidates evidence after later production or applicable test changes.

---

## RED-GREEN-REFACTOR Development Cycle

### RED: Write Failing Test First
- For new or changed behavior, NO production code until you have a failing behavior test
- Test describes desired behavior, not implementation
- Test should fail for the right reason
- Run the narrowest test selector that demonstrates this RED; do not spend the inner loop running unrelated tests
- Before finalizing the test, scan the intended behavior against the mutator rules: boundaries, boolean combinations, equality, arithmetic identities, array/string operations, optional chaining, and side effects
- Add obvious missing cases immediately; use the harness's ask-question facility when the expected behavior is a product/domain judgment

### GREEN: Minimum Code to Pass
- Write ONLY enough code to make the test pass
- Resist adding functionality not demanded by a test
- Faking it is legitimate: hardcode the return value if that passes, then triangulate — add a second test case that forces the real implementation. Generalize only when a test demands it
- Use the active focused watcher or related/affected one-shot command; widen only after the focused behavior is green

### REFACTOR: Assess Improvements
- Assess after GREEN using the passing behavior tests as the working safety net
- Load the `refactoring` skill only when restructuring is applicable; record `N/A` otherwise
- Obtain approval for the working-baseline commit before refactoring when the workflow uses commits as safety checkpoints
- Keep focused and affected tests green after each small refactor; run the full suite at the pre-PR gate

Repeat RED-GREEN-REFACTOR as needed until the phase's PR scope is complete. Do not run the automated mutation harness after each increment, refactor, or commit.

## End-of-Phase PR-Readiness Gate

Run this gate once the implementation and refactoring phase is complete and the work is otherwise ready to become a PR:

1. **MUTATE OR ALTERNATE EVIDENCE**: Run `mutation-testing` against the accumulated branch/PR scope where meaningful and produce a killed/survived/score report. Otherwise record an explicit `N/A` rationale plus proportionate reachability, configuration, contract, integration, or operational evidence.
2. **KILL MUTANTS WHEN APPLICABLE**: Add or strengthen behavior tests for valuable survivors, fix obvious gaps directly, and ask the human when a survivor's value is ambiguous.
3. **RE-RUN WITHIN THE GATE**: Use focused mutation runs while addressing survivors, then re-run the branch diff command. These reruns belong to the same PR gate; they do not put mutation testing back into every TDD increment.
4. **VERIFY**: Finish the remaining PR checks with all tests passing. Never invent structural mutants merely to fill the workflow.

---

## Evidence, History, And Coverage

Capture the expected RED failure, the GREEN pass, and the final non-watch verification. Existing commit history may corroborate the sequence, but do not reshape commits merely to perform TDD theatre; follow the repository's delivery policy.

Coverage is a diagnostic, not a universal target. Run the repository's coverage command when policy requires it or when making a coverage claim. Verify the exact lines, branches, statements, and functions claimed, then ask whether any gap represents untested behavior. A high percentage does not prove test quality; use the `testing` skill's coverage-theatre checks and mutation or alternate evidence where proportionate.

---

## Development Workflow

### Adding a New Feature

1. **Honor the repository start point** - start its proven watcher before the first edit when required; otherwise start it immediately after RED
2. **Write failing test** - describe expected behavior
3. **Start or observe focused feedback** - prefer the repository-owned watcher; otherwise use a diff-selected Vitest watcher only after its installed version/configuration has passed the canonical live proof, or use the affected one-shot equivalent; confirm the expected test fails for the expected reason
4. **Implement minimum** - just enough to pass
5. **Run focused/affected tests** - confirm the behavior and its related tests pass
6. **Refactor if applicable and valuable** - improve code structure while focused and affected tests stay green
7. **Repeat RED-GREEN-REFACTOR** - continue without running the mutation harness until the planned PR scope is complete
8. **At PR readiness, run the mutation gate once** - stop watchers, run mutation testing where meaningful (or record explicit `N/A` plus proportionate alternate evidence), address valuable survivors within that gate, and complete the repository-defined non-watch PR checks. Apply the target repository's evidence-invalidation rule; use this distribution's freshness model (`panel-review` skill, `references/pr-readiness.md`) only when no stricter repository rule exists

### Workflow Example

```bash
# 1. If the repository requires its watcher before the first edit, start it now:
# pnpm test:watch

# 2. Write failing test
it('should reject empty user names', () => {
  const result = createUser({ id: 'user-123', name: '' });
  expect(result.success).toBe(false);
}); # ❌ Test fails (no implementation)

# 3. If it is not already running, start the tested repository watcher now.
#    Starting after RED makes the expected initial execution easy to verify when
#    the repository does not mandate an earlier start.
pnpm test:watch
# If no repository watcher exists and this Vitest version/configuration has
# passed the live proof:
pnpm exec vitest --changed origin/main --watch
# Or use an affected one-shot:
pnpm exec vitest --changed origin/main --run

# 4. Confirm the expected RED test executed, then implement minimum code
if (user.name === '') {
  return { success: false, error: 'Name required' };
} # ✅ Test passes

# 5. Refactor if needed (extract validation, improve naming)

# 6. Repeat RED-GREEN-REFACTOR increments without running the mutation harness

# 7. After the final edit, stop the watcher with Ctrl+C. When the accumulated work
#    is otherwise ready to create the PR, run the
#    end-of-phase mutation gate once and address valuable survivors within it.

# 8. Exit watch mode and finish the remaining PR verification, including the
#    inspected repository-defined complete non-watch test gate.

#     If later verification changes mutation-relevant production or applicable
#     tests/evidence, apply the target repository's invalidation rule and rerun
#     the evidence it invalidates; use this distribution's review
#     pr-readiness freshness model only when no stricter rule exists. Keep
#     final-tree verification current.
```

---

## Pull Request Requirements

Before submitting PR:

- [ ] All repository-required tests pass
- [ ] All repository-required linting and type checks pass
- [ ] Coverage claims and repository thresholds are verified with the repository's own command
- [ ] Where meaningful, run the end-of-phase mutation gate once for the accumulated PR scope and address valuable survivors; otherwise document explicit `N/A` plus proportionate alternate evidence
- [ ] Mutation or alternate evidence satisfies the target repository's invalidation rule; global reuse guidance did not weaken a stricter repository policy
- [ ] Watchers are stopped and the repository-defined complete non-watch PR test gate passes; in monorepos it includes all configured projects and required integration/E2E suites
- [ ] The PR scope is cohesive and follows repository delivery policy
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
✅ Repository coverage gate passed (see attached report)

## TDD Evidence

RED: expected permission test failed before production changes
GREEN: focused permission tests passed after the minimum implementation
REFACTOR: affected tests remained green after permission resolution was simplified
```

---

## Refactoring Priority

After GREEN establishes a passing behavior-test baseline, assess and classify improvement opportunities when restructuring is applicable. For the priority classification table and detailed methodology, load the `refactoring` skill — it owns that guidance. Mutation testing verifies the accumulated result later at the end-of-phase PR-readiness gate.

---

## Anti-Patterns to Avoid

- ❌ Writing new or changed production behavior without a failing behavior test
- ❌ Fabricating failing tests for implementation shape to justify a behavior-preserving refactor
- ❌ Testing implementation details (spies on internal methods)
- ❌ Mirroring every implementation file with a test file by reflex
- ❌ Shared mutable test state or lifecycle hooks without reliable isolation and cleanup
- ❌ Trusting coverage claims without verification
- ❌ Mocking the function being tested
- ❌ Duplicating a production-owned contract schema in test files
- ❌ Factories silently returning objects incomplete for the scenario; intentional invalid fixtures must be explicit in their name and type
- ❌ Speculative code ("just in case" logic without tests)
- ❌ Re-running the full suite after every edit instead of using focused watch or related/affected test selection
- ❌ Hand-picking one test file for GREEN/REFACTOR when the runner can derive all affected tests from the complete change set
- ❌ Freezing an exact test-file list at watcher startup so newly created tests cannot join the loop
- ❌ Treating zero collected tests or `--passWithNoTests` as passing RED/GREEN evidence
- ❌ Treating a watch-mode result as the completed pre-PR full-suite gate
- ❌ Assuming `--changed --watch` recomputes VCS impact after every save, or that later reruns are limited to tests executed by the initial VCS-selected run
- ❌ Leaving a watcher or its child processes running after the loop, timeout, or handoff
- ❌ Invoking watch mode from CI, hooks, or another finite command except inside its bounded, cleanup-proven live-proof harness

**For detailed testing anti-patterns**, load the `testing` skill.

---

## Summary Checklist

Before marking work complete:

- [ ] Every new or changed behavior has a failing behavior test that demanded it, or the change is explicitly evidenced as a behavior-preserving REFACTOR slice
- [ ] RED, GREEN, and final verification evidence is recorded; commit history is supporting evidence only when the repository uses it that way
- [ ] Focused and affected tests stayed green during the inner loop
- [ ] Every claimed RED/GREEN result names an expected test that was actually collected and executed
- [ ] The watcher was stopped and no watcher process or temporary fixture was left behind
- [ ] A completed non-watch full-suite run passes before PR
- [ ] Any coverage claim or repository threshold was verified with the repository-owned command
- [ ] If the work is ready for a PR, the end-of-phase mutation gate ran once for the accumulated scope and valuable survivors were addressed where meaningful, or explicit `N/A` plus proportionate alternate evidence was reviewed
- [ ] Test state is isolated; fixtures or factories are used where they improve clarity
- [ ] Tests verify behavior (not implementation details)
- [ ] Refactoring assessed when applicable and applied if valuable, or explicitly `N/A`
