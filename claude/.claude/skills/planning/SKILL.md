---
name: planning
description: Planning work in small, known-good increments. Use when starting significant work or breaking down complex tasks.
---

# Planning in Small Increments

**All work must be done in small, known-good increments.** Each increment leaves the codebase in a working state where all tests pass.

Use the `/plan` command to create plans. Use the `/continue` command to resume work after a merged PR.

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

## What Makes a "Known-Good Increment"

Each step MUST:
- Leave all tests passing
- Be independently deployable
- Have clear done criteria
- Fit in a single commit
- Be describable in one sentence

**If you can't describe a step in one sentence, break it down further.**

## Step Size Heuristics

**Too big if:**
- Takes more than one session
- Requires multiple commits to complete
- Has multiple "and"s in description
- You're unsure how to test it

**Right size if:**
- One clear test case
- One logical change
- Can explain to someone quickly
- Obvious when done
- Single responsibility

## TDD Integration

**Every step follows RED-GREEN-REFACTOR.** See `testing` skill for factory patterns.

```
FOR EACH STEP:
    │
    ├─► RED: Write failing test FIRST
    │   - Test describes expected behavior
    │   - Test fails for the right reason
    │
    ├─► GREEN: Write MINIMUM code to pass
    │   - No extra features
    │   - No premature optimization
    │   - Just make the test pass
    │
    ├─► REFACTOR: Assess improvements
    │   - See `refactoring` skill
    │   - Only if it adds value
    │   - All tests still pass
    │
    └─► STOP: Wait for commit approval
```

**No exceptions. No "I'll add tests later."**

## Commit Discipline

**NEVER commit without user approval.**

After completing a step (RED-GREEN-REFACTOR):

1. Verify all tests pass
2. Verify static analysis passes
3. **STOP and ask**: "Ready to commit [description]. Approve?"

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

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Steps

### Step 1: [One sentence description]

**Test**: What failing test will we write?
**Implementation**: What code will we write?
**Done when**: How do we know it's complete?

### Step 2: [One sentence description]

**Test**: ...
**Implementation**: ...
**Done when**: ...

## Pre-PR Quality Gate

Before each PR:
1. Mutation testing — run `mutation-testing` skill
2. Refactoring assessment — run `refactoring` skill
3. Typecheck and lint pass
4. DDD glossary check (if applicable)

---
*Delete this file when the plan is complete. If `plans/` is empty, delete the directory.*
```

### Plan Changes Require Approval

If the plan needs to change:

1. Explain what changed and why
2. Propose updated steps
3. **Wait for approval** before proceeding

Plans are not immutable, but changes must be explicit and approved.

## End of Feature

When all steps are complete:

1. **Verify completion** — all acceptance criteria met, all tests passing
2. **Merge learnings** — if significant insights were gained, use the `learn` agent for CLAUDE.md updates or `adr` agent for architectural decisions
3. **Delete plan file** — remove from `plans/`, delete `plans/` if empty

## Anti-Patterns

❌ **Committing without approval**
- Always wait for explicit "yes" before committing

❌ **Steps that span multiple commits**
- Break down further until one step = one commit

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
│   FOR EACH STEP:
│   │
│   ├─► RED: Failing test
│   ├─► GREEN: Make it pass
│   ├─► REFACTOR: If valuable
│   └─► **WAIT FOR COMMIT APPROVAL**
│
END FEATURE
│
├─► Verify all criteria met
├─► Merge learnings if significant (learn agent, adr agent)
└─► Delete plan file from plans/
```
