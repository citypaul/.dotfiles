# Vitest Watch Feedback

Use this reference when selecting, adding, or changing a reusable Vitest watch command. The repository's tested command and configuration take precedence over generic CLI examples.

## Choose the Seed Strategy

### Repository-Owned Graph-Complete Watch

Prefer an existing, behaviorally proven command such as `pnpm test:watch`. A repository may intentionally run its complete relevant development tier once to populate Vitest's runtime module graph, then rely on ordinary watch mode to rerun affected tests. That one initial tier run is acceptable: it is often safer than a partially seeded diff watcher for standard development, behavior-preserving refactoring from a clean baseline, or a watcher started before a RED test exists.

Inspect what the command includes and excludes. Do not replace it with raw `vitest --changed --watch` merely because the generic command looks narrower.

### Diff-Selected Initial Execution

`vitest --changed <real-base> --watch` uses VCS state to select its initial execution. Vitest clears the `changed`/`related` selectors after initial selection, so later saves do not continuously recompute Git impact. They follow retained Vite module graphs and ordinary watcher rules.

Do not equate the initial execution set with the retained graph. Vitest 4.1.10's Node/SSR changed-selection path statically analyzes every discovered test specification. Its own regression test starts clean, reports no affected test files, then reruns the importing test after an implementation edit. That behavior has also been reproduced locally against 4.1.10. Tests do not have to execute initially for every graph-visible implementation edge to be retained.

That is an implementation-specific capability, not a universal promise. Browser Mode, other versions, dynamic/non-import dependencies, configuration boundaries, and repository-specific tiers can differ. Use raw `--changed --watch` only after a live repository-level proof for the installed version and configuration. Starting it after RED is useful because the expected test can be observed immediately. For standard development or clean-baseline refactoring, prefer a proven graph-complete repository watcher unless the diff-selected command has independently passed the same proof.

Sources: Vitest [Watch Mode](https://main.vitest.dev/guide/features#watch-mode), [`changed`](https://main.vitest.dev/config/changed), and the Vitest 4.1.10 [clean-start regression test](https://github.com/vitest-dev/vitest/blob/v4.1.10/test/cli/test/watch/related.test.ts#L5-L24), [dependency scan](https://github.com/vitest-dev/vitest/blob/v4.1.10/packages/vitest/src/node/specifications.ts#L122-L186), and [selector cleanup](https://github.com/vitest-dev/vitest/blob/v4.1.10/packages/vitest/src/node/core.ts#L986-L993).

### One-Shot Fallback

When a reusable watcher cannot be owned reliably, run the repository's affected one-shot or the runner's related/changed one-shot after each edit. Exact file/name selectors prove RED or debug a known failure; they are not sufficient GREEN/REFACTOR evidence.

## Keep Discovery Native

Keep open include globs so Vitest can natively discover a new matching test file. Do not add custom filesystem listeners or call Vitest rerun APIs unless a behavioral proof shows native discovery is insufficient. A custom new-file path can duplicate execution when Vitest has already scheduled the test.

Static graphs still miss filesystem reads, subprocess targets, templates, generated or proxy-fetched files, type-only relationships, repository guards that scan files without importing them, browser-mode execution, and Docker-backed tiers. Keep repository-specific configuration responsible for these relationships:

- Use `watchTriggerPatterns` to map later non-import file events to tests.
- Use `forceRerunTriggers` when a matching file in the initial diff must force the full configured suite.
- Use the root project/task graph for monorepos and preserve transitive consumers.
- Restart or reseed for a stale or newly graph-visible relationship.
- For a dependency the graph cannot represent, add a repository-owned trigger/mapping or widen to the owning suite/tier; restarting alone does not create the missing edge.
- Use the complete repository-defined non-watch PR gate for final evidence.

## Prove a Reusable Watch Command

When a repository introduces or changes a reusable watch command, exercise a live process. Prove the setup that command claims:

- **Graph-complete repository watch:** the complete intended development tier executes initially.
- **Diff-selected strict TDD:** the changed/new RED test executes initially.
- **Diff-selected clean-start or clean-refactor support:** from a committed clean VCS state, observe the initial zero-affected result as setup only, edit an existing graph-visible implementation, and prove every importing test reruns. The initial zero-test result is never RED/GREEN evidence.

For every strategy, also prove:

1. A matching test created after startup is discovered and executed.
2. Changing an imported implementation reruns every affected test.
3. Tests excluded from the development tier remain excluded.
4. A test that changes execution tier is not incorrectly retained.
5. At least one expected test executes after the relevant change; zero tests and `--passWithNoTests` are rejected as test evidence.
6. Assertions inspect output emitted after the implementation rerun, not a stale waiting marker.
7. Normal completion and forced timeout leave no watcher process or temporary directory behind.

For deterministic automated fixtures on macOS, polling may be enabled inside the ephemeral fixture when native events for a newly created temporary root are unreliable. Do not enable polling in the real development command without evidence that it is needed.

The proof harness is the only finite automation allowed to spawn watch mode. Bound it with a hard timeout, kill the entire watcher process group on every exit path, and remove its ephemeral fixture. Ordinary CI, hook, lint, test, build, and verification commands must remain finite; for Vitest they must use `vitest run`, `--run`, or `--watch=false`. Bare `vitest` can auto-watch in a TTY when neither CI nor Vitest's agent detection disables it, so never rely on environment detection for termination.
