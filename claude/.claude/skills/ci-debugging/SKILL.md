---
name: ci-debugging
description: Systematic CI/CD failure diagnosis using hypothesis-first investigation, local reproduction, and environment delta analysis. Use when a CI pipeline, GitHub Actions workflow, or build job fails; when tests pass locally but fail in CI; when diagnosing flaky tests, timeouts, or red pipelines; or when the user says "CI is failing", "the build is broken", or "works on my machine".
---

# CI Debugging

Every CI failure is real until proven otherwise. Never assume flakiness.

This skill owns pipeline-specific evidence and environment deltas. For a local
or runtime failure outside CI, use `debugging`.

## Getting the Data

Identify the CI provider from the repository configuration, then pull the actual failure output with that provider's connected tool, CLI, or UI before forming hypotheses. Preserve the run, job, attempt, commit SHA, and timestamps so later comparisons refer to the same execution.

For GitHub Actions:

```bash
gh run list --branch <branch> --limit 5        # find the failing run
gh run view <run-id> --log-failed              # only the failed steps' logs
gh run view <run-id> --job <job-id> --log      # one job's full log
gh run download <run-id>                       # artifacts (coverage, reports, screenshots)
```

Rerunning a workflow or changing a CI variable mutates external state and may
repeat deploys, migrations, notifications, or other effects. Do that only
with explicit authority after inspecting the workflow and failed job for side
effects. When authorized, rerun only the failed jobs with
`gh run rerun <run-id> --failed`, or use
`gh run rerun <run-id> --debug` for step-level logging; remove any temporary
debug variable afterwards. For another provider, use its equivalent controls
without translating commands by guesswork. Compare the failing run against
the last green run on the same branch — the diff in commits, dependency
lockfiles, and pipeline files between those two runs is the primary suspect
list.

If the system under test emits structured telemetry (canonical events, traces, in-memory exporter output from test runs), pull it as evidence alongside the logs — see the `observability` skill.

## Hypothesis-First Diagnosis

Before editing, list plausible causes, rank them by evidence, and test one falsifiable hypothesis at a time. Do not invent a fixed minimum merely to fill a list.

**Example hypotheses for a test timeout:**
1. Test relies on network access unavailable in CI
2. Parallel test execution causes resource contention
3. CI runner has less memory/CPU than local machine

## Local Reproduction

Reproduce locally when a faithful environment is available before pushing fixes.

- Run the **exact** failing command, not a close equivalent
- Match the CI environment as closely as possible (Node version, env vars)
- If it passes locally, treat the environment delta as evidence to localize; the cause may still be timing, state, or an external dependency

## Environment Delta Analysis

Compare CI vs local:

| Factor | Check |
|--------|-------|
| Node/runtime version | CI config vs `node -v` locally |
| OS | Linux CI vs macOS local |
| Dependency resolution | Repository's locked clean-install command and package cache (for npm, `npm ci` vs cached `node_modules`) |
| Env vars | CI secrets/config vs local `.env` |
| Parallelism | CI may run tests in parallel differently |
| Memory/CPU | CI runners often have less resources |
| Network | CI may block external network access |
| File system | Case sensitivity (Linux) vs insensitive (macOS) |

## Read the Full Error

- Read the **complete** error output, not just the last line
- Check preceding log lines and warnings — they often contain the real cause
- Look at stack traces to identify the actual failure point
- Check for earlier failures that may cascade into the visible error

## Fix Verification

If the request is diagnosis-only, report the supported root cause, evidence,
affected jobs, uncertainty, and recommended fix, then stop. Diagnosis does not
authorize workflow, production, dependency, test, or configuration changes.

When the user requested a fix, after identifying it:

1. Explain **why** it addresses the root cause (not just the symptom)
2. Run the exact failing command locally
3. Verify the fix doesn't mask the real issue (e.g., adding a retry hides a race condition)

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Instead |
|-------------|----------------|---------|
| "It's flaky, re-run it" | Masks real issues | Investigate the failure |
| Adding blind retries/sleeps | Can hide timing bugs | Identify the cause; add bounded retry only when the external contract requires it |
| Pushing speculative fixes | Wastes CI cycles | Reproduce and verify locally |
| Reading only the last error line | Misses root cause | Read full output from the top |
| Fixing symptoms | Problem will recur | Trace to root cause |

## Proving Flakiness

Different outcomes across independent runs with the same controlled inputs are
evidence that the outcome is nondeterministic. That proves flakiness even when
the source is not yet diagnosed. Record which inputs and environment facts were
actually controlled, then localize the cause: race, time, shared state, resource
pressure, or an external dependency. A single unexplained failure remains a
real failure, not permission to re-run until green.

## Handoff

Once the root cause is identified, a diagnosis-only handoff ends with the
evidence and recommended guard. For an authorized fix, leave the smallest
durable regression guard that fits it. For production behavior, write the
failing behavior test before the fix using `tdd` (or
`characterisation-tests` when legacy behavior first needs capture). For
provider configuration, permissions, or an external outage, use a config
assertion, dry-run, contract check, or monitored recovery proof as appropriate.
If no executable guard is feasible, record the evidence and remaining
detection path instead of fabricating a test.
