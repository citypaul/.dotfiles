---
name: planning
description: Planning work in small, known-good increments. Use when starting significant work or breaking down complex tasks.
---

# Planning in Small Increments

**All work must be done in small, known-good increments.** Each increment leaves the codebase in a working state where all tests pass.

**Document Management**: Use the `progress-guardian` agent to create and maintain planning documents (PLAN.md, WIP.md, LEARNINGS.md).

## Three-Document Model

For significant work, maintain three documents:

| Document | Purpose | Lifecycle |
|----------|---------|-----------|
| **PLAN.md** | What we're doing | Created at start, changes need approval |
| **WIP.md** | Where we are now | Updated constantly, always accurate |
| **LEARNINGS.md** | What we discovered | Temporary, merged at end then deleted |

### Document Relationships

```
PLAN.md (static)          WIP.md (living)           LEARNINGS.md (temporary)
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Goal            │       │ Current step    │       │ Gotchas         │
│ Acceptance      │  ──►  │ Status          │  ──►  │ Patterns        │
│ Steps 1-N       │       │ Blockers        │       │ Decisions       │
│ (approved)      │       │ Next action     │       │ Edge cases      │
└─────────────────┘       └─────────────────┘       └─────────────────┘
        │                         │                         │
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                                  │
                                  ▼
                         END OF FEATURE
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
              DELETE all              Merge LEARNINGS into:
              three docs              - CLAUDE.md (gotchas, patterns)
                                      - ADRs (architectural decisions)
```

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
- Involves more than 3 files

**Right size if:**
- One clear test case
- One logical change
- Can explain to someone in 30 seconds
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
3. Update WIP.md with progress
4. Capture any learnings in LEARNINGS.md
5. **STOP and ask**: "Ready to commit [description]. Approve?"

Only proceed with commit after explicit approval.

### Why Wait for Approval?

- User maintains control of git history
- Opportunity to review before commit
- Prevents accidental commits of incomplete work
- Creates natural checkpoint for discussion

## PLAN.md Structure

```markdown
# Plan: [Feature Name]

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
```

### Plan Changes Require Approval

If the plan needs to change:

1. Explain what changed and why
2. Propose updated steps
3. **Wait for approval** before proceeding

Plans are not immutable, but changes must be explicit and approved.

## WIP.md Structure

```markdown
# WIP: [Feature Name]

## Current Step

Step N of M: [Description]

## Status

🔴 RED - Writing failing test
🟢 GREEN - Making test pass
🔵 REFACTOR - Assessing improvements
⏸️ WAITING - Awaiting commit approval

## Completed

- [x] Step 1: [Description]
- [x] Step 2: [Description]
- [ ] Step 3: [Description] ← current

## Blockers

[None / List current blockers]

## Next Action

[Specific next thing to do]
```

### WIP Must Always Be Accurate

Update WIP.md:
- When starting a new step
- When status changes (RED → GREEN → REFACTOR)
- When blockers appear or resolve
- After each commit
- At end of each session

**If WIP.md doesn't reflect reality, update it immediately.**

## LEARNINGS.md Structure

```markdown
# Learnings: [Feature Name]

## Gotchas

### [Title]
- **Context**: When this occurs
- **Issue**: What goes wrong
- **Solution**: How to handle it

## Patterns That Worked

### [Title]
- **What**: Description
- **Why it works**: Rationale
- **Example**: Brief code example

## Decisions Made

### [Title]
- **Options considered**: What we evaluated
- **Decision**: What we chose
- **Rationale**: Why
- **Trade-offs**: What we gained/lost

## Edge Cases

- [Edge case 1]: How we handled it
- [Edge case 2]: How we handled it
```

### Capture Learnings As They Occur

Don't wait until the end. When you discover something:

1. Add it to LEARNINGS.md immediately
2. Continue with current work
3. At end of feature, learnings are ready to merge

## End of Feature

When all steps are complete:

### 1. Verify Completion

- All acceptance criteria met
- All tests passing
- All steps marked complete in WIP.md

### 2. Merge Learnings

Review LEARNINGS.md and determine destination:

| Learning Type | Destination | Method |
|---------------|-------------|--------|
| Gotchas | CLAUDE.md | Use `learn` agent |
| Patterns | CLAUDE.md | Use `learn` agent |
| Architectural decisions | ADR | Use `adr` agent |
| Domain knowledge | Project docs | Direct update |

### 3. Delete Documents

After learnings are merged:

```bash
rm PLAN.md WIP.md LEARNINGS.md
git add -A
git commit -m "chore: complete [feature], remove planning docs"
```

**The knowledge lives on in:**
- CLAUDE.md (gotchas, patterns)
- ADRs (architectural decisions)
- Git history (what was done)
- Project docs (if applicable)

## Anti-Patterns

❌ **Committing without approval**
- Always wait for explicit "yes" before committing

❌ **Steps that span multiple commits**
- Break down further until one step = one commit

❌ **Writing code before tests**
- RED comes first, always

❌ **Letting WIP.md become stale**
- Update immediately when reality changes

❌ **Waiting until end to capture learnings**
- Add to LEARNINGS.md as discoveries occur

❌ **Plans that change silently**
- All plan changes require discussion and approval

❌ **Keeping planning docs after feature complete**
- Delete them; knowledge is now in permanent locations

## Quick Reference

```
START FEATURE
│
├─► Create PLAN.md (get approval)
├─► Create WIP.md
├─► Create LEARNINGS.md
│
│   FOR EACH STEP:
│   │
│   ├─► RED: Failing test
│   ├─► GREEN: Make it pass
│   ├─► REFACTOR: If valuable
│   ├─► Update WIP.md
│   ├─► Capture learnings
│   └─► **WAIT FOR COMMIT APPROVAL**
│
END FEATURE
│
├─► Verify all criteria met
├─► Merge learnings (learn agent, adr agent)
└─► Delete PLAN.md, WIP.md, LEARNINGS.md
```
