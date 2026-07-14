---
description: Create a vertical-slice or selected reduction plan on a branch with a PR - no code changes
argument-hint: [feature or work to plan]
allowed-tools: Read, Glob, Grep, Write, Bash(git:*), Bash(gh:*)
---

Current branch state:
!`git log main..HEAD --oneline`

Current branch:
!`git branch --show-current`

Active plans:
!`ls plans/ 2>/dev/null || echo "No plans/ directory found"`

Create a vertical-slice plan for the requested work: $ARGUMENTS

1. If on main, create a new feature branch first
2. Explore the codebase to understand the relevant areas
3. If the request has unresolved product or design decisions, use `grill-me` before writing stories or plans
4. If the request is still a large story, epic, broad feature idea, or backlog item, use the `story-splitting` skill first to identify independently valuable child stories
5. If the selected story, acceptance criteria, or mocks are ambiguous, use `find-gaps` to tighten the artifact before finalizing the plan
6. For a mechanism-reduction program, use `reduce-system-complexity` first to define the conserved contract, ledger, terminal mechanism-removal state, and behavior/mechanism gates
7. Write the plan to `plans/<feature-name>.md` (create the directory if needed)
8. Create a PR with the plan for review

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

Classify every slice as **behavior change**, **pure refactor**, **reduction transition**, or **terminal reduction**. Delivery slices should be the thinnest useful end-to-end behavior. Every reduction transition and terminal reduction loads `reduce-system-complexity` and references the plan-level reduction program. A transition may add a bounded bridge but must keep `mechanism gate: pending — no net-reduction claim`; only the terminal slice may claim net removal after both gates pass and old machinery/expired bridges are gone. Read the project's CLAUDE.md and testing rules before writing slices.

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
**Required implementation skills**: Changed behavior loads `tdd`, `testing`, and applicable mutation-testing/refactoring guidance. A pure refactor loads applicable testing/mutation-testing/refactoring skills. Every reduction transition and terminal reduction loads `reduce-system-complexity` plus applicable evidence skills. Record why any otherwise expected skill is `N/A`.
**Reduction program**: For either reduction class, reference the plan-level program and terminal slice; otherwise `N/A`.
**Transition/terminal evidence**: Transition — `behavior gate: pass`, independent verification, bridge owner/removal/bounded-lifetime metadata when a bridge exists (`N/A` otherwise), and `mechanism gate: pending — no net-reduction claim`. Terminal — both gates pass and superseded machinery/expired bridges are removed. Otherwise `N/A`.
**Acceptance criteria**: Behavior change — observable outcome; pure refactor — conserved surface and evidence; transition — passing behavior gate, independent verification, optional bridge metadata or `N/A`, pending mechanism gate/no net claim; terminal — both gates pass and superseded machinery/expired bridges are gone. Present to the human and get confirmation before writing any code.
**RED or preservation baseline**: For behavior change, what failing behavior test comes first? For pure preservation, which passing oracles and non-test evidence conserve the affected behavior/guarantees?
**GREEN or preservation change**: What minimum implementation satisfies the new behavior, or what smallest mechanism-only change preserves the baseline?
**MUTATE or alternate evidence**: Run mutation testing where meaningful; otherwise mark `N/A` and name reachability, configuration, contract, integration, or operational evidence. Never invent structural mutants.
**KILL MUTANTS**: Address valuable survivors when mutation testing applies (ask human when value is ambiguous).
**REFACTOR**: Assess improvements (only if they add value).
**Done when**: Include mutation or alternate evidence. A transition requires its behavior gate and independent checks to pass while the mechanism gate remains pending with no net claim; a terminal reduction requires both gates to pass and old machinery/expired bridges to be gone.

### Slice 2: ...

## Pre-PR Quality Gate

Before each PR:
1. Mutation or alternate evidence — run `mutation-testing` where meaningful; otherwise review the explicit `N/A` rationale and proportionate evidence
2. Refactoring/reduction assessment — run the applicable `refactoring` and/or `reduce-system-complexity` skill; record `N/A` when neither applies
3. Typecheck and lint pass
4. DDD glossary check — if the project uses DDD, verify all domain terms match the canonical glossary

---
*Delete this file when the plan is complete. If `plans/` is empty, delete the directory.*
```

## Constraints

- **Do NOT write any production code, test code, or implementation files**
- **Plan document only** — the only file you should create/modify is in `plans/`
- Write the plan to a file, never present it inline in chat
- **Prefer vertical slices** — break work into the smallest independently mergeable units that deliver observable value through the real production path.
- **Avoid layer-cake plans** — database-only, API-only, UI-only, and "do all plumbing first" work is allowed only when it names the next vertical slice it unlocks with independent verification, or advances an explicitly selected reduction program toward a named terminal mechanism-removal state.
- Each slice in the plan must be small enough for a single PR. A slice may contain multiple TDD commits, but it must be reviewable and mergeable as one coherent unit.
- **Skill routing is mandatory** — behavior-changing and pure preservation paths must list their distinct required skills before code changes begin.
- **TDD is mandatory for behavior change** — specify RED, GREEN, mutation verification where meaningful, valuable survivor handling, and refactoring. Pure preservation specifies a passing baseline and proportionate evidence instead of fabricated RED or structural mutants.
- **Test behaviour, not implementation** — acceptance criteria and test descriptions must describe observable outcomes (what the user sees, what the API returns), never internal details (what function was called, what query was run)
- **Read project testing rules** — before writing slices, read the project's CLAUDE.md and any testing guidelines to ensure tests follow the project's conventions (factories, MSW vs mocks, real DB vs stubs, etc.)
