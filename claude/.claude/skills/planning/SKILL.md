---
name: planning
description: Planning work as vertical slices in small, known-good increments. Use when starting significant work, turning already-split stories into PR-sized implementation plans, planning PRs, or sequencing complex tasks. If the input is a broad story, epic, feature idea, or backlog item that still needs product slicing, use story-splitting first.
---

# Planning in Vertical Slices

**Plan by vertical slices wherever possible.** Each slice delivers the smallest end-to-end behavior a real actor can observe, while leaving the codebase in a known-good state where all tests pass.

Horizontal work is allowed only when it explicitly unblocks the next vertical slice and is independently verifiable.

Use the `/plan` command to create plans. Use the `/continue` command to resume work after a merged PR.

## Relationship To Story Splitting

`story-splitting` decides **what small user-value stories exist**. `planning` decides **how to implement selected stories safely**.

Use `story-splitting` before this skill when the request is still an epic, large story, feature idea, roadmap item, or backlog item with multiple possible customer outcomes. Once a child story or narrow capability has been selected, use this skill to turn it into a `plans/<feature>.md` file with PR-sized slices, acceptance criteria, and TDD execution steps.

If a plan starts producing database-only, API-only, UI-only, or "do all plumbing first" slices, pause and return to `story-splitting` unless the horizontal work explicitly unlocks the next vertical slice and has independent verification.

Use `grill-me` before planning when the selected story still contains unresolved product or design decisions. Use `find-gaps` before or after drafting the plan when acceptance criteria, failure modes, roles, states, or release constraints are missing or unverifiable.

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

Avoid plans that do all database, API, UI, or infrastructure work up front. Horizontal work may be its own slice only when all of these are true:

- It names the next vertical slice it unlocks
- It leaves the codebase deployable
- It has observable verification (test, command output, migration dry-run, or runtime check)
- It is smaller than doing it inside the vertical slice
- It does not introduce unused abstractions or speculative flexibility

Valid horizontal exceptions include dependency upgrades, migrations, test harness setup, infrastructure wiring, mechanical refactors, and safety fixes. Keep them rare and explicit.

## What Makes a Known-Good Slice

Each slice MUST:
- Leave all tests passing
- Be independently deployable
- Have clear done criteria
- Fit in a single PR (the smallest independently mergeable unit)
- Be describable in one sentence
- Deliver or directly unblock observable behavior

A slice is the unit of planning and review — one PR. Within a slice, TDD increments (RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR) may produce multiple commits, but the slice itself is what gets reviewed and merged as a coherent unit.

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

**Every slice follows RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR.** Before any implementation work for a slice, load `tdd`, `testing`, `mutation-testing`, and `refactoring`. This section is a routing contract, not a replacement for those skills.

```
FOR EACH SLICE:
    │
    ├─► LOAD: Required implementation skills
    │   - `tdd` for RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR workflow
    │   - `testing` for behavior-driven tests and factories
    │   - `mutation-testing` for mutator-aware planning and verification
    │   - `refactoring` for the final refactor assessment
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
    ├─► MUTATE: Verify test effectiveness
    │   - Run `mutation-testing` skill
    │   - Produces a mutation testing report
    │
    ├─► KILL MUTANTS: Address surviving mutants
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
         - Show what was implemented and the mutation testing report
         - Human reviews and approves before commit
```

**No exceptions. No "I'll add tests later."**

## Commit Discipline

**NEVER commit without user approval.**

After completing a slice (RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR):

1. Verify all tests pass
2. Verify static analysis passes
3. Present the mutation testing report
4. **STOP and ask**: "Ready to commit [description]. Approve?"

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

[Behaviour-driven criteria — describe observable business outcomes, not implementation details.
Test at the lowest level that gives confidence: prefer unit tests (vitest) for logic and domain behaviour, browser tests (vitest browser mode) for UI interaction, Playwright integration tests only for end-to-end flows. Avoid defaulting to Playwright for everything.]

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Slices

Every slice follows RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR. No production code without a failing test.
Read the project's CLAUDE.md and testing rules before writing slices.

### Slice 1: [One sentence observable behaviour]

**Value**: [Who gets what value?]
**Path**: [Entry point -> business path -> state/output -> observability. Name any intentionally skipped states.]
**Required implementation skills**: Before code changes, load `tdd`, `testing`, `mutation-testing`, and `refactoring` (plus UI/domain/architecture skills when relevant).
**Acceptance criteria**: [What observable behaviour proves this slice is done? Be specific — "user sees X", "API returns Y", "test covers Z". Vague criteria like "it works" are not acceptable. **Present to human and get confirmation before writing any code.**]
**RED**: What failing test will we write? (Describes expected behaviour, not implementation. Include likely mutator gaps from the `mutation-testing` skill's `resources/mutator-rules.md` resource.)
**GREEN**: What minimum code makes the test pass?
**MUTATE**: Run `mutation-testing` skill — produce a report.
**KILL MUTANTS**: Address surviving mutants (ask human when value is ambiguous).
**REFACTOR**: Assess improvements (only if they add value).
**Done when**: All acceptance criteria met, mutation report reviewed, human approves commit.

### Slice 2: [One sentence observable behaviour]

**Value**: ...
**Path**: ...
**Required implementation skills**: ...
**Acceptance criteria**: ...
**RED**: ...
**GREEN**: ...
**MUTATE**: ...
**KILL MUTANTS**: ...
**REFACTOR**: ...
**Done when**: ...

## Pre-PR Quality Gate

Before each PR:
1. Mutation testing — run `mutation-testing` skill
2. Refactoring assessment — run `refactoring` skill
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

1. **Verify completion** — all acceptance criteria met, all tests passing
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

❌ **Writing code before tests**
- RED comes first, always

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
│   FOR EACH SLICE:
│   │
│   ├─► LOAD: `tdd` + `testing` + `mutation-testing` + `refactoring`
│   ├─► CONFIRM: Present acceptance criteria, **wait for human approval**
│   ├─► RED: Failing test
│   ├─► GREEN: Make it pass
│   ├─► MUTATE: Run mutations, produce report
│   ├─► KILL MUTANTS: Address survivors (ask human when ambiguous)
│   ├─► REFACTOR: If valuable
│   └─► **PRESENT WORK + REPORT, WAIT FOR COMMIT APPROVAL**
│
END FEATURE
│
├─► Verify all criteria met
├─► Merge learnings if significant (learn agent, adr agent)
└─► Delete plan file from plans/
```
