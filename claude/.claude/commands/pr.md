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

1. **Implementation skill routing** — Behavior-changing slices loaded `tdd`, `testing`, and applicable mutation-testing/refactoring guidance; pure refactors loaded applicable testing/mutation-testing/refactoring skills; every reduction transition or terminal reduction loaded `reduce-system-complexity` plus applicable evidence skills.
2. **Change-path evidence** — For changed behavior, RED happened before GREEN. Pure refactors record a passing preservation baseline and proportionate evidence. A reduction transition references its program, conserved contract, and terminal slice; passes the behavior gate and independent verification; records owner/removal/bounded-lifetime metadata for any temporary bridge (`N/A` when none); and states `mechanism gate: pending — no net-reduction claim`. A terminal reduction links the reducer program/report/ledger (or states `N/A — authorized single terminal slice`), passes both gates, discharges transition obligations, and removes the superseded mechanism and expired bridges.
3. **Mutation or alternate evidence** — Run `mutation-testing` where meaningful and address valuable survivors; otherwise review the explicit `N/A` rationale and proportionate reachability, configuration, contract, integration, or operational evidence.
4. **Refactoring/reduction assessment** — Run the applicable `refactoring` and/or `reduce-system-complexity` skill. A transition may leave the mechanism gate pending but cannot claim net reduction; only a terminal reduction may claim it after both gates pass. Record `N/A` when neither assessment applies.
5. **Project verification passes** — The applicable test suite, typecheck, lint, and build checks pass with zero errors; record why any unavailable check is `N/A`.
6. **DDD glossary check** (if project uses DDD) — All new/changed types, functions, and test names conform to the project's DDD glossary.

If any step has not been completed, run it now before creating the PR.

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
