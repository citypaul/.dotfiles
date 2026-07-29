---
description: Create a pull request following standards
argument-hint: [optional PR title or focus]
allowed-tools: Bash(git:*), Bash(gh:*), Bash(npm:*), Bash(pnpm:*), Bash(npx:*), Bash(yarn:*), Bash(bun:*)
---

Current branch state:
!`git branch --show-current`

!`git log main..HEAD --oneline`

Changes summary:
!`git diff main...HEAD --stat`

## Guard

If the current branch is `main` (or the repo's default branch), STOP — do not create a PR from the default branch. Ask whether to move the work to a feature branch first.

## Pre-PR Quality Gate

Before creating the PR, verify each of these has been completed:

1. **Implementation skill routing** — Behavior-changing slices loaded `tdd`, `testing`, and applicable refactoring guidance; pure refactors loaded applicable testing/refactoring skills; every reduction transition or terminal reduction loaded `reduce-system-complexity` plus applicable evidence skills. Determine whether current mutation or alternate-evidence results already cover the accumulated mutation-relevant diff—changed production scope plus applicable test or evidence changes—independent of the current commit SHA.
2. **Change-path evidence** — For changed behavior, RED happened before GREEN. Pure refactors record a passing preservation baseline and proportionate evidence. A reduction transition references its program, conserved contract, and terminal slice; passes the behavior gate and independent verification; records owner/removal/bounded-lifetime metadata for any temporary bridge (`N/A` when none); and states `mechanism gate: pending — no net-reduction claim`. A terminal reduction links the reducer program/report/ledger (or states `N/A — authorized single terminal slice`), passes both gates, discharges transition obligations, and removes the superseded mechanism and expired bridges.
3. **Implementation phase complete** — Confirm the applicable `refactoring` and/or `reduce-system-complexity` assessment is complete. A transition may leave the mechanism gate pending but cannot claim net reduction; only a terminal reduction may claim it after both gates pass. Record `N/A` when neither assessment applies.
4. **End-of-phase mutation or alternate-evidence gate** — The target repository's stricter mutation-evidence invalidation rule takes precedence. Only when it has no stricter rule, confirm that a current mutation or alternate-evidence result covers the accumulated mutation-relevant diff using this command's default: treat it as stale only when mutation-relevant production files or applicable tests/evidence changed without being exercised by that result. Documentation- or release-metadata-only commits do not invalidate it, and neither do survivor-fix commits already exercised by the gate's final branch-diff rerun. If the result is missing or stale under the applicable rule, load `mutation-testing` and run it once, scoped to the accumulated branch diff per that skill's **Run and Triage** guidance; widen to a full-project run only for that skill's stated triggers. Keep focused survivor reruns and the final branch-diff rerun inside this gate. If a result is current under the applicable target-repository rule, do not rerun it. Otherwise review the explicit `N/A` rationale and proportionate reachability, configuration, contract, integration, or operational evidence. Do not require or repeat the automated harness for each prior TDD increment or commit.
5. **Project verification passes** — Stop every watcher and verify no watcher process remains. Run the repository-defined complete non-watch test gate against the final tree; in a monorepo this includes every configured project and required integration/E2E suite, not only an affected development subset. Then run the applicable typecheck, lint, and build checks with zero errors; record why any unavailable check is `N/A`. Watch output is not evidence for this gate.
6. **DDD glossary check** (if project uses DDD) — All new/changed types, functions, and test names conform to the project's DDD glossary.

If any step has not been completed, run it now before creating the PR. Reuse mutation or alternate evidence only when it remains current under the target repository's applicable invalidation rule.

## PR Creation

If arguments were provided, use them as the PR title or focus: $ARGUMENTS

Create a PR with:

### Summary
- 1-3 bullet points describing the changes
- Focus on WHAT changed and WHY
- **Prefer small PRs** — if the change could be split into independently mergeable units, consider doing so

Include verification notes for exactly one change path:

- **Behavior change** — RED/GREEN evidence plus mutation results, or explicit mutation `N/A` with proportionate alternate evidence
- **Pure refactor** — passing baseline plus mutation results, or explicit mutation `N/A` with proportionate alternate evidence
- **Reduction transition** — program/terminal-slice link, conserved contract, `behavior gate: pass`, independent verification, owner/removal/bounded-lifetime metadata for any bridge (`N/A` when none), `mechanism gate: pending — no net-reduction claim`, plus mutation results or explicit mutation `N/A` with proportionate alternate evidence
- **Terminal reduction** — reducer program/report/ledger link (or `N/A — authorized single terminal slice`), passing behavior/mechanism gates, discharged transition obligations, removal of superseded machinery and expired bridges, plus mutation results or explicit mutation `N/A` with proportionate alternate evidence

Use `gh pr create` with appropriate title and body.
