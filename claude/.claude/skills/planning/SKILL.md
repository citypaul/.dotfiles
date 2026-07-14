---
name: planning
description: Planning work as vertical slices or an explicitly selected mechanism-reduction program in small, known-good increments. Use when starting significant work, turning already-split stories into PR-sized implementation plans, planning PRs, or sequencing complex tasks. For a mechanism-reduction program, use reduce-system-complexity first to define the conserved contract, terminal mechanism-removal state, and behavior/mechanism gates; planning then sequences it. If the input is a broad story, epic, feature idea, or backlog item that still needs product slicing, use story-splitting first.
---

# Planning in Vertical Slices

**Plan by vertical slices wherever possible.** Each slice delivers the smallest end-to-end behavior a real actor can observe, while leaving the codebase in a known-good state where all tests pass.

Horizontal work is allowed only when it explicitly unblocks the next vertical slice and is independently verifiable, or when it belongs to an explicitly selected reduction program whose terminal state retires one complete mechanism while conserving behavior.

Use the `/plan` command to create plans. Use the `/continue` command to resume work after a merged PR.

## Relationship To Story Splitting

`story-splitting` decides **what small user-value stories exist**. `planning` decides **how to implement selected stories safely**.

Use `story-splitting` before this skill when the request is still an epic, large story, feature idea, roadmap item, or backlog item with multiple possible customer outcomes. Once a child story or narrow capability has been selected, use this skill to turn it into a `plans/<feature>.md` file with PR-sized slices, acceptance criteria, and TDD execution steps.

If a plan starts producing database-only, API-only, UI-only, or "do all plumbing first" slices, pause and return to `story-splitting` unless the horizontal work explicitly unlocks the next vertical slice with independent verification or advances an explicitly selected reduction program toward its named terminal mechanism-removal state.

Use `grill-me` before planning when the selected story still contains unresolved product or design decisions. Use `find-gaps` before or after drafting the plan when acceptance criteria, failure modes, roles, states, or release constraints are missing or unverifiable.

Before freezing slices that introduce a material generic mechanism or durable new dependency, run the proportionate `evaluate-existing-solutions` preflight, due diligence, or full comparison. Link a decision-owner-accepted result when a choice was unresolved. Planning sequences the chosen solution; it does not silently turn the first plausible library or a bespoke sketch into the plan.

| Input state | Use | Output |
|-------------|-----|--------|
| Fuzzy decision tree | `grill-me` | Resolved decisions or named open questions |
| Broad requirement with multiple outcomes | `story-splitting` | Child stories |
| Existing story/plan/AC/mocks with holes | `find-gaps` | Confirmed artifact updates |
| Selected child story ready for delivery sequencing | `planning` | PR-sized implementation slices |

## Plans Directory

Plans live in `plans/` at the project root. Each plan is a self-contained file named descriptively (e.g., `plans/gift-tracking.md`, `plans/email-validation.md`).

To discover active plans: `ls plans/`

Multiple plans can coexist — each is independent and won't conflict across branches or worktrees because they have unique filenames.

**When a plan is complete:** delete the plan file. If `plans/` is empty, delete the directory.

## Prefer Multiple Small PRs

**Break work into the smallest independently mergeable units.** Each PR should be reviewable in isolation and deliver a coherent slice of value.

**Why this matters:** Small PRs are easier to review, easier to revert, and easier to reason about. When something breaks, the cause is obvious. When a PR sits in review, it doesn't block unrelated work. The goal is to stay as close to main as possible at all times.

**A PR is too big when** the reviewer needs to hold multiple unrelated concepts in their head to understand it, or when you'd struggle to write a clear 1-3 sentence summary of what it does.

There will be exceptions — some changes are inherently coupled and splitting them would create broken intermediate states. Use judgement. But the default should always be to ask "can this be split?"

## What Makes a Vertical Slice

A vertical slice is not "small because it touches one layer." It is small because it delivers one observable behavior through the real production path.

Each slice MUST name:
- **Actor**: who receives the value (user, admin, API client, scheduled job, support operator)
- **Trigger**: what starts the behavior (click, request, event, command, timer)
- **Observable outcome**: what proves the behavior happened
- **Production path**: the real surfaces, use case, domain logic, persistence, and external adapters involved
- **Smallest deployable value**: the narrowest useful version that can ship safely

Good slices are often thin but complete:
- A form submits one valid field through the real API and persists it
- A background job handles one event type and emits the expected audit result
- A CLI command supports one input shape and returns stable stdout/stderr
- A read-only screen shows one real state using production data loading

## Choosing Slices

Before writing plan slices:

1. **Name the outcome** — describe the user- or system-visible result in one sentence.
2. **Map the path** — list the real entry point, business path, state change, output, and observability.
3. **Pick the walking skeleton** — choose the thinnest end-to-end version that proves the path works.
4. **Add one behavior or state at a time** — validation, permissions, error states, empty states, retries, analytics, and polish become later slices.
5. **Check reversibility** — each slice should be easy to revert or disable without undoing unrelated work.

Ask "what is the smallest real behavior we can ship?" before asking "what files need to change?"
If the answer still contains multiple customer outcomes, roles, workflow branches, or quality levels, load `story-splitting` and split the parent before writing the plan.

## Horizontal Work Exceptions

Avoid plans that do all database, API, UI, or infrastructure work up front. Horizontal work may be its own slice only when all applicable conditions are true:

- It names the next vertical slice it unlocks, or belongs to an explicitly selected reduction program with a terminal mechanism-removal outcome
- It leaves the codebase deployable
- It has observable verification (test, command output, migration dry-run, or runtime check)
- It is smaller than doing it inside the vertical slice
- It does not introduce unused abstractions or speculative flexibility

Valid horizontal exceptions include dependency upgrades, migrations, test harness setup, infrastructure wiring, mechanical refactors, safety fixes, and a selected `reduce-system-complexity` program whose **terminal state** conserves behavior while retiring one complete mechanism. Keep them rare and explicit. An intermediate reduction transition may temporarily add a bridge when it is independently verifiable and the same plan names the terminal slice and behavior/mechanism gates; record an owner, removal condition, and bounded lifetime for any bridge, or `N/A` when none exists.

## What Makes a Known-Good Slice

Each slice MUST:
- Leave all tests passing
- Be independently deployable
- Have clear done criteria
- Fit in a single PR (the smallest independently mergeable unit)
- Be describable in one sentence
- Deliver or directly unblock observable behavior, or safely advance an explicitly selected reduction program toward its terminal behavior/mechanism gates

A slice is the unit of planning and review — one PR. Within a behavior-changing slice, TDD increments (RED-GREEN with mutation or alternate evidence, conditional mutant handling, and refactoring when applicable) may produce multiple commits, but the slice itself is what gets reviewed and merged as a coherent unit.

**If you can't describe a slice in one sentence, break it down further.**

## Slice Size Heuristics

**Too big if:**
- Takes more than one session
- Has multiple "and"s in description
- You're unsure how to test it
- Needs many unrelated fixtures, mocks, screens, or endpoints
- Builds a layer without proving an outcome

**Right size if:**
- One clear behavior
- One primary test case plus focused edge cases
- Can explain to someone quickly
- Obvious when done
- Touches only the path needed for the behavior
- Leaves a useful checkpoint even if later slices never happen

## TDD Integration

**Every behavior-changing slice follows RED-GREEN with mutation or alternate evidence, conditional mutant handling, and refactoring when applicable.** Before implementation, load `tdd` and `testing`, plus applicable `mutation-testing` and `refactoring` guidance; record `N/A` where either does not apply. A true behavior-preserving refactor or `reduce-system-complexity` slice starts from passing proportionate preservation evidence. Never fabricate a failing mechanism-count test or structural mutant. This section is a routing contract, not a replacement for those skills.

```
FOR EACH BEHAVIOR-CHANGING SLICE:
    │
    ├─► LOAD: Required implementation skills
    │   - `tdd` for RED-GREEN plus mutation or alternate evidence
    │   - `testing` for behavior-driven tests and factories
    │   - `mutation-testing` where meaningful; otherwise explicit `N/A` plus proportionate alternate evidence
    │   - `refactoring` when restructuring is applicable; otherwise `N/A`
    │
    ├─► CONFIRM: Present acceptance criteria for this slice
    │   - Human must approve criteria before any code is written
    │   - Criteria must be specific and observable
    │   - Do NOT proceed until human confirms
    │
    ├─► RED: Write failing test FIRST
    │   - Test describes expected behavior
    │   - Test fails for the right reason
    │   - Test plan accounts for likely mutants from the `mutation-testing` skill's `resources/mutator-rules.md` resource
    │
    ├─► GREEN: Write MINIMUM code to pass
    │   - No extra features
    │   - No premature optimization
    │   - Just make the test pass
    │
    ├─► MUTATE OR ALTERNATE EVIDENCE: Verify preservation strength
    │   - Run `mutation-testing` where meaningful and produce a report
    │   - Otherwise record explicit `N/A` plus proportionate reachability, configuration, contract, integration, or operational evidence
    │
    ├─► KILL MUTANTS WHEN APPLICABLE: Address surviving mutants
    │   - Add or strengthen tests for surviving mutants
    │   - Ask the human when a surviving mutant's value is ambiguous
    │   - All tests pass after fixes
    │
    ├─► REFACTOR: Assess improvements
    │   - See `refactoring` skill
    │   - Only if it adds value
    │   - All tests still pass
    │
    └─► STOP: Present the work and wait for commit approval
         - Show what was implemented and the mutation report or reviewed alternate-evidence record
         - Human reviews and approves before commit
```

A **pure refactor** substitutes: confirm the preserved consumer contract → run the applicable passing baseline → establish proportionate preservation strength through mutation or reviewed alternate evidence → restructure while staying green → verify the preserved surface.

A **reduction transition** substitutes: link the reducer program/ledger and terminal slice → confirm the conserved contract → run the applicable baseline and mutation/alternate evidence → make the independently verifiable transition → pass the behavior gate → record any bridge ownership/removal/bounded lifetime (`N/A` when none) → keep `mechanism gate: pending — no net-reduction claim`.

A **terminal reduction** substitutes: link the program/ledger (or authorized single-slice `N/A`) → run the applicable baseline and mutation/alternate evidence → remove superseded machinery and expired bridges → discharge transition obligations → pass both behavior and mechanism gates.

**No untested behavior changes. No "I'll add tests later."**

## Commit Discipline

**NEVER commit without user approval.**

After completing one classified slice:

1. Verify applicable tests pass and/or the approved preservation evidence still holds
2. Verify static analysis passes
3. Present the mutation testing report, or the reviewed alternate-evidence record and `N/A` rationale when mutation testing is not meaningful
4. Present class-specific evidence: RED/GREEN for behavior change; preserved contract for pure refactor; passing behavior gate plus independent verification and pending mechanism gate/no net claim for a transition; or linked program/ledger, discharged obligations, both passing gates, and retired machinery for a terminal reduction
5. **STOP and ask**: "Ready to commit [description]. Approve?"

Only proceed with commit after explicit approval.

### Why Wait for Approval?

- User maintains control of git history
- Opportunity to review before commit
- Prevents accidental commits of incomplete work
- Creates natural checkpoint for discussion

## Plan File Structure

Each plan file in `plans/` follows this structure:

```markdown
# Plan: [Feature Name]

**Branch**: feat/feature-name
**Status**: Active

## Goal

[One sentence describing the outcome]

## Acceptance Criteria

[For a behavior-change delivery plan, use behavior-driven criteria that describe observable business outcomes, not implementation details. Test at the lowest level that gives confidence: prefer unit tests for logic/domain behavior, browser tests for UI interaction, and end-to-end tests only for end-to-end flows.

For a reduction program, define the conserved observable contract, terminal same-scope mechanism delta, retirement of superseded machinery and expired bridges, passing behavior/mechanism gates, and mutation results or explicit mutation `N/A` with proportionate alternate evidence. Do not invent new product behavior or tests for mechanism shape.]

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Slices

Classify every slice as **behavior change**, **pure refactor**, **reduction transition**, or **terminal reduction**. Behavior-changing slices follow RED-GREEN with mutation or alternate evidence. Pure refactors start from passing preservation evidence. Every reduction transition and terminal reduction loads `reduce-system-complexity` and references the plan-level reduction program. A transition may add a bounded bridge but never claims net reduction: its mechanism gate remains explicitly pending until the terminal slice removes the old mechanism and expired bridges. Only the terminal reduction may claim net removal after both behavior and mechanism gates pass.
Read the project's CLAUDE.md and testing rules before writing slices.

## Reduction Program (include only when applicable)

**Ledger/report**: [Link to the `reduce-system-complexity` diagnosis and conservation ledger.]
**Conserved contract**: [Behavior and guarantees that every transition and the terminal state preserve.]
**Superseded mechanism**: [The complete mechanism the terminal slice will retire.]
**Terminal slice**: [Slice name/number that removes the old mechanism and expired bridges.]
**Owner and removal condition**: [For each temporary bridge: accountable owner, objective removal condition, and latest acceptable removal point; otherwise `N/A — no temporary bridge`.]
**Behavior gate**: [Required evidence and fidelity.]
**Mechanism gate**: [Like-for-like whole-mechanism accounting required at the terminal slice.]

### Slice 1: [One sentence observable behaviour]

**Value**: [Behavior change: actor and observable outcome. Pure refactor: preserved consumer surface and maintenance value. Reduction transition: why this independently verifiable increment is necessary to reach the terminal state. Terminal reduction: conserved contract plus the ownership/mechanism retired.]
**Path**: [Behavior change: entry point -> business path -> state/output -> observability. Pure refactor: preserved public surface. Either reduction class: affected trigger-to-outcome path, program/terminal link, and mechanism scope.]
**Class**: Behavior change / pure refactor / reduction transition / terminal reduction.
**Required implementation skills**: For changed behavior, load `tdd`, `testing`, and applicable mutation-testing/refactoring guidance. For a pure refactor, load only applicable testing, mutation-testing, and refactoring skills. Every reduction transition and terminal reduction loads `reduce-system-complexity` plus applicable evidence skills. Record why any otherwise expected skill is `N/A`. Add UI/domain/architecture skills only when relevant.
**Reduction program**: [For either reduction class: reference the plan-level program and terminal slice; otherwise `N/A`.]
**Transition/terminal evidence**: [Transition: `behavior gate: pass`, independent verification, bridge owner/removal/bounded-lifetime metadata when a bridge exists (`N/A` otherwise), and `mechanism gate: pending — no net-reduction claim`. Terminal: passing behavior gate, like-for-like mechanism gate, and removal of the superseded mechanism/expired bridges. Otherwise `N/A`.]
**Acceptance criteria**: [Behavior change: specific observable outcome. Pure refactor: conserved surface plus preservation evidence. Transition: passing behavior gate, independent verification, optional bridge metadata or `N/A`, and pending mechanism gate/no net claim. Terminal: both gates pass and superseded machinery/expired bridges are gone. **Present to the human and get confirmation before writing any code.**]
**RED or preservation baseline**: For behavior change, what failing behavior test will we write? For a pure refactor/reduction, which passing oracles and proportionate non-test evidence conserve the affected behavior and guarantees? Never assert implementation shape merely to create RED.
**GREEN or preservation change**: What minimum code makes the new behavior pass, or what smallest mechanism-only change preserves the baseline?
**MUTATE or alternate evidence**: Run mutation testing where meaningful. Otherwise mark `N/A` and name reachability, configuration, contract, integration, or operational evidence; never invent structural mutants.
**KILL MUTANTS**: Address valuable survivors when mutation testing applies (ask human when value is ambiguous).
**REFACTOR**: Assess improvements (only if they add value).
**Done when**: All acceptance criteria and mutation/alternate-evidence obligations are met. A transition is done when its behavior gate and independent checks pass while the mechanism gate remains truthfully pending with no net claim; a terminal reduction is done only when both gates pass and old machinery/expired bridges are gone. The human approves the commit.

### Slice 2: [One sentence observable behaviour]

Use the same adaptive fields as Slice 1. Classify the slice independently; do not inherit a behavior-change workflow when this slice only preserves behavior or removes mechanism.

## Pre-PR Quality Gate

Before each PR:
1. Mutation or alternate evidence — run `mutation-testing` where meaningful; otherwise review the explicit `N/A` rationale and proportionate evidence
2. Refactoring/reduction assessment — run the applicable `refactoring` and/or `reduce-system-complexity` skill; record `N/A` when neither applies
3. Typecheck and lint pass
4. DDD glossary check — if the project uses DDD, verify all domain terms match the canonical glossary

---
*Delete this file when the plan is complete. If `plans/` is empty, delete the directory.*
```

### Plan Changes Require Approval

If the plan needs to change:

1. Explain what changed and why
2. Propose updated slices
3. **Wait for approval** before proceeding

Plans are not immutable, but changes must be explicit and approved.

## End of Feature

When all slices are complete:

1. **Verify completion** — all acceptance criteria met; applicable tests and mutation/alternate evidence pass; any reduction program reaches a terminal slice with both gates passed and old machinery/expired bridges gone
2. **Merge learnings** — if significant insights were gained, use the `learn` agent for CLAUDE.md updates or `adr` agent for architectural decisions
3. **Delete plan file** — remove from `plans/`, delete `plans/` if empty

## Anti-Patterns

❌ **Committing without approval**
- Always wait for explicit "yes" before committing

❌ **Layer-cake plans**
- "Build database, then API, then UI" delays learning and hides broken integration

❌ **Foundation work with no named slice**
- If setup is needed, name the vertical slice it unlocks and how the setup is verified

❌ **Database-only, API-only, or UI-only slices by default**
- These are usually implementation tasks, not independently valuable behavior

❌ **Do all plumbing first**
- Prefer a walking skeleton that proves the real path, then widen it behavior by behavior

❌ **Slices that span multiple PRs**
- Break down further until one slice = one PR

❌ **Writing changed behavior before its test**
- RED comes first for behavior change; a true REFACTOR slice records passing preservation evidence instead

❌ **Plans that change silently**
- All plan changes require discussion and approval

❌ **Keeping plan files after feature complete**
- Delete them; knowledge lives in CLAUDE.md, ADRs, and git history

## Quick Reference

```
START FEATURE
│
├─► Create plan in plans/ (get approval)
│
│   FOR EACH BEHAVIOR-CHANGING SLICE:
│   │
│   ├─► LOAD: `tdd` + `testing` + `mutation-testing` + `refactoring`
│   ├─► CONFIRM: Present acceptance criteria, **wait for human approval**
│   ├─► RED: Failing test
│   ├─► GREEN: Make it pass
│   ├─► MUTATE OR ALT: Run mutations and report, or record reviewed `N/A` alternate evidence
│   ├─► KILL MUTANTS: Address survivors when mutation testing applies (ask human when ambiguous)
│   ├─► REFACTOR: If applicable and valuable
│   └─► **PRESENT WORK + REPORT, WAIT FOR COMMIT APPROVAL**
│
│   FOR EACH PURE REFACTOR/REDUCTION SLICE:
│   └─► PASSING BASELINE → MUTATION OR ALTERNATE EVIDENCE → REFACTOR/REDUCE → VERIFY GATES
│
END FEATURE
│
├─► Verify all criteria met
├─► Merge learnings if significant (learn agent, adr agent)
└─► Delete plan file from plans/
```
