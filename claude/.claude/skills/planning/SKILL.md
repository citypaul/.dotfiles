---
name: planning
description: Planning work as vertical slices or an explicitly selected mechanism-reduction program in small, known-good increments, with a single PR or optional stacked-PR delivery shape for each slice. Use when starting significant work, turning already-split stories into implementation plans, planning PRs, or sequencing complex tasks. For a mechanism-reduction program, use reduce-system-complexity first to define the conserved contract, terminal mechanism-removal state, and behavior/mechanism gates; planning then sequences it. If the input is a broad story, epic, feature idea, or backlog item that still needs product slicing, use story-splitting first; if one planned slice may need dependent review layers, also use stack-pull-requests.
---

# Planning in Vertical Slices

**Plan by vertical slices wherever possible.** Each slice delivers the smallest end-to-end behavior a real actor can observe, while leaving the codebase in a known-good state where all tests pass.

Horizontal work is allowed only when it explicitly unblocks the next vertical slice and is independently verifiable, or when it belongs to an explicitly selected reduction program whose terminal state retires one complete mechanism while conserving behavior.

Use the `/plan` command to create plans. Use `/continue` after a merged independent PR or to advance and sync an active stack.

## Relationship To Story Splitting

`story-splitting` decides **what small user-value stories exist**. `planning` decides **how to implement selected stories safely**.

Use `story-splitting` before this skill when the request is still an epic, large story, feature idea, roadmap item, or backlog item with multiple possible customer outcomes. Once a child story or narrow capability has been selected, use this skill to turn it into a `plans/<feature>.md` file with implementation slices, acceptance criteria, evidence routes, and a delivery shape for each slice.

Keep three units distinct:

| Unit | Meaning | Default relationship |
|---|---|---|
| Backlog story | Fixed product capability and acceptance scope from `story-splitting` | A plan may advance one selected story |
| Implementation slice | Smallest independently mergeable and releasable vertical increment, or one explicit reduction transition/terminal state | One PR |
| PR layer | Dependent review package inside one slice | Exists only when `stack-pull-requests` justifies a stack |

Several implementation slices produce sequential independent PRs, not a stack. After one merges, start the next from trunk. If one slice is difficult to review as a single PR, load `stack-pull-requests`; its layers must not expand the slice's acceptance scope, conserved contract, or reduction obligations.

If a plan starts producing database-only, API-only, UI-only, or "do all plumbing first" slices, pause and return to `story-splitting` unless the horizontal work explicitly unlocks the next vertical slice with independent verification or advances an explicitly selected reduction program toward its named terminal mechanism-removal state.

Use `grill-me` before planning when the selected story still contains unresolved product or design decisions. Use `find-gaps` before or after drafting the plan when acceptance criteria, failure modes, roles, states, or release constraints are missing or unverifiable.

Before freezing slices that introduce a material generic mechanism or durable new dependency, run the proportionate `evaluate-existing-solutions` preflight, due diligence, or full comparison. Link a decision-owner-accepted result when a choice was unresolved. Planning sequences the chosen solution; it does not silently turn the first plausible library or a bespoke sketch into the plan.

| Input state | Use | Output |
|-------------|-----|--------|
| Fuzzy decision tree | `grill-me` | Resolved decisions or named open questions |
| Broad requirement with multiple outcomes | `story-splitting` | Child stories |
| Existing story/plan/AC/mocks with holes | `find-gaps` | Confirmed artifact updates |
| Selected child story ready for delivery sequencing | `planning` | Implementation slices with a delivery shape |
| One planned slice may need dependent review PRs | `stack-pull-requests` + `planning` | Per-slice single PR or ordered PR stack |

## Plans Directory

Plans live in `plans/` at the project root. Each plan is a self-contained file named descriptively (e.g., `plans/gift-tracking.md`, `plans/email-validation.md`).

To discover active plans: `ls plans/`

Multiple plans can coexist — each is independent and won't conflict across branches or worktrees because they have unique filenames.

**When a plan is complete:** delete the plan file. If `plans/` is empty, delete the directory.

## Prefer Small Reviewable PRs

Default to the smallest independently mergeable vertical units, with one PR per slice. Use a stack only as the exception defined by `stack-pull-requests`: dependent layers may package one fixed slice for focused review, while the full stack remains that slice's delivery unit.

**Why this matters:** Small PRs are easier to review, easier to revert, and easier to reason about. When something breaks, the cause is obvious. When a PR sits in review, it doesn't block unrelated work. The goal is to stay as close to main as possible at all times.

**A PR is too big when** the reviewer needs to hold multiple unrelated concepts in their head to understand it, or when you'd struggle to write a clear 1-3 sentence summary of what it does.

There will be exceptions — some changes are inherently coupled and splitting them would create broken intermediate states. Use judgement. First ask whether the work is really several independent slices; only then ask whether one remaining slice needs dependent review layers.

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
- Fit in a single PR by default, or have an approved `stack-pull-requests` delivery map
- Be describable in one sentence
- Deliver or directly unblock observable behavior, or safely advance an explicitly selected reduction program toward its terminal behavior/mechanism gates

A slice is the unit of planning and independently mergeable value. By default it is also one review PR. With an approved stack, dependent PR layers become focused review boundaries and the top remains the slice's completion boundary. Within each behavior-changing PR boundary, fast RED-GREEN-REFACTOR increments may produce multiple commits; mutation testing or alternate evidence runs once when that boundary is otherwise PR-ready, not after each increment.

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

**Every behavior-changing slice uses fast RED-GREEN-REFACTOR increments, followed by one end-of-phase mutation or alternate-evidence gate when the slice is otherwise ready for its PR.** Before implementation, load `tdd`, `testing`, and applicable `refactoring` guidance. Use the `mutation-testing` mutator rules for cheap test-design guidance, but defer the automated harness until PR readiness. A true behavior-preserving refactor or `reduce-system-complexity` slice starts from passing proportionate preservation evidence and uses the same end-of-phase gate. Never fabricate a failing mechanism-count test or structural mutant. This section is a routing contract, not a replacement for those skills.

For a stacked slice, apply that cadence to every PR layer against its parent review boundary. Put tests in the earliest layer that owns the behavior, run the mutation-or-alternate-evidence gate once when each layer is PR-ready, and require the top layer to prove the slice's complete acceptance criteria or reduction gates. Do not defer all tests or evidence to the top.

```
FOR EACH BEHAVIOR-CHANGING SLICE OR PR LAYER:
    │
    ├─► LOAD: Required implementation skills
    │   - `tdd` for RED-GREEN-REFACTOR
    │   - `testing` for behavior-driven tests and factories
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
    │   - Run only the exact test/test name needed to prove RED
    │   - Test plan accounts for likely mutants from the `mutation-testing` skill's `resources/mutator-rules.md` resource
    │
    ├─► GREEN: Write MINIMUM code to pass
    │   - No extra features
    │   - No premature optimization
    │   - Just make the test pass
    │   - Follow the `tdd` skill's canonical watcher selection, lifecycle, cleanup, and live-proof policy
    │   - Prefer a proven repository-owned watcher; use diff-selected Vitest watch only under the canonical version/configuration proof
    │   - Use the affected one-shot when watch is unreliable; do not hand-pick GREEN test files
    │   - Keep watcher discovery live for new tests, or rerun the affected one-shot after creation; reject zero-test/`--passWithNoTests` results
    │   - In monorepos, run through the root project/task graph so shared-package consumers remain eligible
    │
    ├─► REFACTOR: Assess improvements
    │   - See `refactoring` skill
    │   - Only if it adds value
    │   - Focused and affected tests stay green; do not rerun the full suite after every edit
    │
    ├─► REPEAT: Continue RED-GREEN-REFACTOR as needed
    │   - Do not run the automated mutation harness after each increment, refactor, or commit
    │
    └─► STOP: Present the work and wait for commit approval
         - Show what was implemented and the ordinary verification
         - Human reviews and approves before commit

WHEN THE CURRENT REVIEW BOUNDARY IS OTHERWISE READY FOR ITS PR:
    ├─► LOAD: `mutation-testing`
    ├─► MUTATE OR ALTERNATE EVIDENCE: Run once for the focused boundary scope, or record explicit `N/A` plus proportionate alternate evidence
    ├─► KILL MUTANTS: Address valuable survivors and re-run focused/diff mutations within the same gate
    └─► COMPLETE: Finish the remaining PR checks and present the final report
```

A **pure refactor** substitutes: confirm the preserved consumer contract → run the applicable passing baseline → restructure while staying green → verify the preserved surface → at PR readiness, run mutation testing once for the accumulated scope or review proportionate alternate evidence.

A **reduction transition** substitutes: link the reducer program/ledger and terminal slice → confirm the conserved contract → run the applicable baseline → make the independently verifiable transition → pass the behavior gate → record any bridge ownership/removal/bounded lifetime (`N/A` when none) → keep `mechanism gate: pending — no net-reduction claim` → apply the mutation/alternate-evidence gate once at PR readiness.

A **terminal reduction** substitutes: link the program/ledger (or authorized single-slice `N/A`) → run the applicable baseline → remove superseded machinery and expired bridges → discharge transition obligations → pass both behavior and mechanism gates → apply the mutation/alternate-evidence gate once at PR readiness.

**No untested behavior changes. No "I'll add tests later."**

## Commit Discipline

**NEVER commit without user approval.**

After completing an implementation increment:

1. Verify applicable tests pass and/or the approved preservation evidence still holds
2. Verify static analysis passes
3. Present class-specific evidence: RED/GREEN for behavior change; preserved contract for pure refactor; passing behavior gate plus independent verification and pending mechanism gate/no net claim for a transition; or linked program/ledger, discharged obligations, both passing gates, and retired machinery for a terminal reduction

Do not require a mutation report for every commit. When the complete slice is otherwise ready for its PR, run the end-of-phase mutation gate once and present its final report (or the reviewed alternate-evidence record and `N/A` rationale).
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

Classify every slice as **behavior change**, **pure refactor**, **reduction transition**, or **terminal reduction**. Behavior-changing slices use RED-GREEN-REFACTOR increments and all classes use one end-of-phase mutation or alternate-evidence gate at PR readiness. Pure refactors start from passing preservation evidence. Every reduction transition and terminal reduction loads `reduce-system-complexity` and references the plan-level reduction program. A transition may add a bounded bridge but never claims net reduction: its mechanism gate remains explicitly pending until the terminal slice removes the old mechanism and expired bridges. Only the terminal reduction may claim net removal after both behavior and mechanism gates pass.
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
**Delivery**: [Single PR (default), or a `#### Delivery Shape` map from `stack-pull-requests` nested under this slice.]
**Required implementation skills**: For changed behavior, load `tdd`, `testing`, and applicable refactoring guidance. For a pure refactor, load only applicable testing and refactoring skills. Every reduction transition and terminal reduction loads `reduce-system-complexity` plus applicable evidence skills. At each PR boundary's readiness, load `mutation-testing` for the focused scope where meaningful or record the alternate-evidence `N/A`. Add UI/domain/architecture skills only when relevant.
**Reduction program**: [For either reduction class: reference the plan-level program and terminal slice; otherwise `N/A`.]
**Transition/terminal evidence**: [Transition: `behavior gate: pass`, independent verification, bridge owner/removal/bounded-lifetime metadata when a bridge exists (`N/A` otherwise), and `mechanism gate: pending — no net-reduction claim`. Terminal: passing behavior gate, like-for-like mechanism gate, and removal of the superseded mechanism/expired bridges. Otherwise `N/A`.]
**Acceptance criteria**: [Behavior change: specific observable outcome. Pure refactor: conserved surface plus preservation evidence. Transition: passing behavior gate, independent verification, optional bridge metadata or `N/A`, and pending mechanism gate/no net claim. Terminal: both gates pass and superseded machinery/expired bridges are gone. **Present to the human and get confirmation before writing any code.**]
**RED or preservation baseline**: For behavior change, what failing behavior test will we write? For a pure refactor/reduction, which passing oracles and proportionate non-test evidence conserve the affected behavior and guarantees? Never assert implementation shape merely to create RED.
**GREEN or preservation change**: What minimum code makes the new behavior pass, or what smallest mechanism-only change preserves the baseline?
**REFACTOR**: Assess improvements (only if they add value).
**PRE-PR MUTATION or alternate evidence**: Once the slice is otherwise ready for its PR, run mutation testing once for the accumulated scope. Address valuable survivors and re-run focused/diff checks inside the same gate. Otherwise mark `N/A` and name reachability, configuration, contract, integration, or operational evidence; never invent structural mutants.
**Done when**: All acceptance criteria and end-of-phase mutation/alternate-evidence obligations are met. A transition is done when its behavior gate and independent checks pass while the mechanism gate remains truthfully pending with no net claim; a terminal reduction is done only when both gates pass and old machinery/expired bridges are gone. The human approves the commit.

### Slice 2: [One sentence observable behaviour]

Use the same adaptive fields as Slice 1. Classify the slice independently; do not inherit a behavior-change workflow when this slice only preserves behavior or removes mechanism.

## Pre-PR Quality Gate

Before each PR:
1. Implementation complete — confirm applicable refactoring/reduction assessment and ordinary verification are complete
2. Mutation or alternate evidence — run `mutation-testing` once for the accumulated PR scope where meaningful; address valuable survivors within the same gate, or review the explicit `N/A` rationale and proportionate evidence
3. Typecheck and lint pass
4. DDD glossary check — if the project uses DDD, verify all domain terms match the canonical glossary
5. Complete tests — stop watchers and run the repository-defined complete non-watch PR test gate; in a monorepo include every configured project and required integration/E2E suite, not only the affected development subset
6. Evidence freshness — apply the target repository's mutation-evidence rule after later fixes. Use this distribution's `commands/pr.md` model only when the repository has no stricter invalidation policy, and keep project verification current after resulting fixes

For a stacked slice, nest the exact `#### Delivery Shape` and whole-stack gate from `stack-pull-requests` under that slice. Do not set one delivery mode for the whole plan.

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

❌ **Slices that span multiple PRs without a delivery decision**
- Default to one PR. If dependent review layers genuinely help, load `stack-pull-requests`, justify the exception, and keep the slice scope and terminal obligations fixed.

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
│   FOR EACH IMPLEMENTATION SLICE:
│   │
│   ├─► DELIVERY: Single PR by default; otherwise nest an approved stack map
│   ├─► BEHAVIOR CHANGE: LOAD → CONFIRM → RED → GREEN → REFACTOR → REPEAT WITHOUT MUTATION HARNESS
│   ├─► OR PURE REFACTOR/REDUCTION: PASSING BASELINE → REFACTOR/REDUCE → VERIFY GATES
│   ├─► **PRESENT WORK, WAIT FOR COMMIT APPROVAL**
│   ├─► PRE-PR: Run mutation once for each current review boundary (or alternate evidence), handle survivors within the gate
│   └─► Verify focused and top-level criteria; create one PR or the planned stack
│
END FEATURE
│
├─► Verify all criteria met
├─► Merge learnings if significant (learn agent, adr agent)
└─► Delete plan file from plans/
```
