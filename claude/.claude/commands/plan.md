---
description: Create a vertical-slice or selected reduction plan on a branch with a PR - no code changes
argument-hint: [feature or work to plan]
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log --oneline -5`

Current branch:
!`git branch --show-current`

Active plans:
!`ls plans/ 2>/dev/null || echo "No plans/ directory found"`

Create a vertical-slice plan for the requested work: $ARGUMENTS

1. Detect the repository's default branch. If currently on it, create a new feature branch first
2. Explore the codebase to understand the relevant areas
3. If the request has unresolved product or design decisions, use `grill-me` before writing stories or plans
4. If the request is still a large story, epic, broad feature idea, or backlog item, use the `story-splitting` skill first to identify independently valuable child stories
5. Define known-good vertical implementation slices; default each to one trunk-based PR, and use `stack-pull-requests` when one slice needs review layers or later slices should start on the same evolving baseline before lower PRs merge
6. If the selected story, acceptance criteria, or mocks are ambiguous, use `find-gaps` to tighten the artifact before finalizing the plan
7. For a mechanism-reduction program, use `reduce-system-complexity` first to define the conserved contract, ledger, terminal mechanism-removal state, and behavior/mechanism gates
8. Write the plan to `plans/<feature-name>.md` (create the directory if needed)
9. Create a PR with the plan for review

## Plan File Structure

Each plan file is self-contained:

```markdown
# Plan: [Feature Name]

**Branch**: feat/feature-name
**Status**: Active

## Goal

[One sentence describing the outcome]

## Acceptance Criteria

[For a behavior-change delivery plan, describe observable business outcomes rather than implementation details and test at the lowest level that gives confidence.

For a reduction program, define the conserved observable contract, terminal same-scope mechanism delta, retirement of superseded machinery and expired bridges, passing behavior/mechanism gates, and mutation results or explicit mutation `N/A` with proportionate alternate evidence. Do not invent new product behavior or tests for mechanism shape.]

- [ ] Criterion 1
- [ ] Criterion 2

## Slices

Classify every slice as **behavior change**, **pure refactor**, **reduction transition**, or **terminal reduction**. Delivery slices should be the thinnest useful end-to-end behavior. Default each slice to one trunk-based PR. If one slice needs review layers, nest the delivery map from `stack-pull-requests` beneath it. If later slices should start on the same evolving baseline before lower PRs merge, place one shared cross-slice map before the first included slice and reference it from each. Every reduction transition and terminal reduction loads `reduce-system-complexity` and references the plan-level reduction program. A transition may add a bounded bridge but must keep `mechanism gate: pending — no net-reduction claim`; only the terminal slice may claim net removal after both gates pass and old machinery/expired bridges are gone. Read the project's CLAUDE.md and testing rules before writing slices.

## Reduction Program (include only when applicable)

**Ledger/report**: Link to the `reduce-system-complexity` diagnosis and conservation ledger.
**Conserved contract**: Behavior and guarantees every slice preserves.
**Superseded mechanism**: Complete mechanism the terminal slice retires.
**Terminal slice**: Slice name/number.
**Owner and removal condition**: For each temporary bridge, name the owner, objective condition, and latest acceptable removal point; otherwise `N/A — no temporary bridge`.
**Behavior gate**: Required evidence and fidelity.
**Mechanism gate**: Like-for-like whole-mechanism accounting at the terminal slice.

### Slice 1: [One sentence observable behaviour]

**Value**: Behavior change — actor and observable outcome; pure refactor — preserved consumer surface and maintenance value; reduction transition — why this independently verifiable increment is necessary for the terminal state; terminal reduction — conserved contract plus ownership/mechanism retired.
**Path**: Behavior change — entry point -> business path -> state/output -> observability; pure refactor — preserved public surface; either reduction class — affected trigger-to-outcome path, program/terminal link, and mechanism scope.
**Class**: Behavior change / pure refactor / reduction transition / terminal reduction.
**Delivery**: Independent PR against trunk (default); cross-slice stack member referencing a shared `#### Delivery Shape`; or a nested intra-slice `#### Delivery Shape` map.
**Required implementation skills**: Changed behavior loads `tdd`, `testing`, and applicable refactoring guidance. A pure refactor loads applicable testing/refactoring skills. Every reduction transition and terminal reduction loads `reduce-system-complexity` plus applicable evidence skills. At each PR boundary's readiness, load `mutation-testing` for the focused scope where meaningful or record the alternate-evidence `N/A`.
**Reduction program**: For either reduction class, reference the plan-level program and terminal slice; otherwise `N/A`.
**Transition/terminal evidence**: Transition — `behavior gate: pass`, independent verification, bridge owner/removal/bounded-lifetime metadata when a bridge exists (`N/A` otherwise), and `mechanism gate: pending — no net-reduction claim`. Terminal — both gates pass and superseded machinery/expired bridges are removed. Otherwise `N/A`.
**Acceptance criteria**: Behavior change — observable outcome; pure refactor — conserved surface and evidence; transition — passing behavior gate, independent verification, optional bridge metadata or `N/A`, pending mechanism gate/no net claim; terminal — both gates pass and superseded machinery/expired bridges are gone. Present to the human and get confirmation before writing any code.
**RED or preservation baseline**: For behavior change, what failing behavior test comes first? For pure preservation, which passing oracles and non-test evidence conserve the affected behavior/guarantees?
**GREEN or preservation change**: What minimum implementation satisfies the new behavior, or what smallest mechanism-only change preserves the baseline?
**REFACTOR**: Assess improvements (only if they add value).
**PRE-PR MUTATION or alternate evidence**: Once the slice is otherwise ready for its PR, run mutation testing once for the accumulated scope. Address valuable survivors and re-run focused/diff mutations within that gate. Otherwise mark `N/A` and name reachability, configuration, contract, integration, or operational evidence. Never invent structural mutants.
**Done when**: Include the end-of-phase mutation or alternate evidence. A transition requires its behavior gate and independent checks to pass while the mechanism gate remains pending with no net claim; a terminal reduction requires both gates to pass and old machinery/expired bridges to be gone.

### Slice 2: ...

## Pre-PR Quality Gate

Before each PR:
1. Implementation complete — confirm applicable refactoring/reduction assessment and ordinary verification are complete
2. Mutation or alternate evidence — run `mutation-testing` once for the accumulated PR scope where meaningful and address valuable survivors within the same gate; otherwise review the explicit `N/A` rationale and proportionate evidence
3. Typecheck and lint pass
4. DDD glossary check — if the project uses DDD, verify all domain terms match the canonical glossary

For an intra-slice stack, nest the exact `#### Delivery Shape` and whole-stack gate under that slice. For a cross-slice stack, place one shared map before the first included slice and reference it from each included slice. Never stack the whole plan by default.

---
*Delete this file when the plan is complete. If `plans/` is empty, delete the directory.*
```

## Constraints

- **Do NOT write any production code, test code, or implementation files**
- **Plan document only** — the only file you should create/modify is in `plans/`
- Write the plan to a file, never present it inline in chat
- **Prefer vertical slices** — break work into the smallest independently mergeable units that deliver observable value through the real production path.
- **Avoid layer-cake plans** — database-only, API-only, UI-only, and "do all plumbing first" work is allowed only when it names the next vertical slice it unlocks with independent verification, or advances an explicitly selected reduction program toward a named terminal mechanism-removal state.
- Each slice defaults to one trunk-based PR. Use independent PRs when slices can merge in any order without blocking or duplicating work, or later work waits for earlier merge. Load `stack-pull-requests` for intra-slice review layers or a cross-slice hard/flow lineage where upper work starts before lower merge; require benefits worth cascading rebase, CI, and approval churn.
- **Skill routing is mandatory** — behavior-changing and pure preservation paths must list their distinct required skills before code changes begin.
- **TDD is mandatory for behavior change** — specify fast RED-GREEN-REFACTOR increments, then one accumulated-scope mutation/alternate-evidence gate at PR readiness. Pure preservation specifies a passing baseline and proportionate evidence instead of fabricated RED or structural mutants.
- **Test behaviour, not implementation** — acceptance criteria and test descriptions must describe observable outcomes (what the user sees, what the API returns), never internal details (what function was called, what query was run)
- **Read project testing rules** — before writing slices, read the project's CLAUDE.md and any testing guidelines to ensure tests follow the project's conventions (factories, MSW vs mocks, real DB vs stubs, etc.)
