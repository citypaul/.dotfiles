---
name: simple-design-dynamo
description: The Four Elements of Simple Design, rules 2 and 3 of which form a feedback loop. Use as a guiding light when refactoring legacy code.
allowed-tools:
  - Read
  - Edit
  - Glob
  - Grep
  - Bash
---

# Simple Design Dynamo

This skill uses J. B. Rainsberger's Four Elements of Simple Design.

---

# Core Concept

The Four Elements of Simple Design are:

1. Passes its tests
2. Minimizes duplication
3. Maximizes clarity
4. Has fewer elements

J. B. Rainsberger found:
> removing duplication and improving clarity in small cycles creates a dynamo that drives simple design.

---

# MANDATORY: Human Involvement Checkpoints

**🛑 STOP AND DISCUSS with your human partner in these situations:**

1. **Before ANY code change** - Propose the small change and discuss options together
2. **When naming** - Propose 2-3 name options and let the human decide
3. **When surfacing duplication** - Show the duplicated code and discuss extraction strategies
4. **When uncertain about next step** - Never proceed autonomously when unsure
5. **When tests fail unexpectedly** - Discuss the failure before attempting a fix
6. **When considering multiple refactoring approaches** - Present options, don't choose alone
7. **Before removing code** - Always confirm with the human before deletion
8. **When a refactoring feels "too big"** - Break it down together

**⚠️ NEVER proceed on your own if:**
- You're about to make a change that affects more than one concept
- You're unsure whether tests adequately cover the change
- The change could break existing functionality

---

# Rigorous Process (Follow Exactly)

## The Refactoring Cycle

```
┌─────────────────────────────────────────────────────┐
│  1. DISCUSS with human: What small change to make? │
│     (Propose options, decide together)             │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  2. Make ONE small change                          │
│     (Only what was agreed - nothing more!)         │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  3. Run ALL tests                                  │
│     - If RED: STOP, discuss with human, undo if    │
│       necessary                                    │
│     - If GREEN: proceed                            │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  4. Run linter (e.g., rubocop -a)                  │
│     - Fix any issues                               │
│     - Re-run tests after fixes                     │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  5. Commit with conventional commit message        │
│     (e.g., refactor:, fix:, test:)                 │
└────────────────────────┬────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────┐
│  6. DISCUSS: Check for code smells                 │
│     - Is there duplication to surface?             │
│     - Are names clear?                             │
│     - Can anything be simplified?                  │
└────────────────────────┬────────────────────────────┘
                         ▼
              [Return to Step 1]
```

## Rules for Minimizing Duplication

1. **Rule of Three**: Only extract duplication after THREE instances. One is unique, two might be coincidence, three is a pattern.

2. **Make duplication obvious FIRST**: Before extracting, make similar code MORE similar:
    - Align the code visually
    - Use identical variable names where appropriate
    - Show the human the side-by-side comparison
    - **🛑 STOP**: Discuss extraction strategy with human

3. **Never extract silently**: Always propose the extraction and get human approval.

## Rules for Maximizing Clarity

1. **Naming requires human decision**: When renaming:
    - Propose 2-3 name options
    - Explain the trade-offs of each
    - **🛑 STOP**: Let the human choose

2. **Comments are a smell**: If you feel the need to add a comment, consider whether a better name would suffice. Discuss with human.

3. **Extract to explain**: If a block of code needs explanation, consider extracting it to a well-named method. Propose this to the human.

## Rules for "Has Fewer Elements"

1. **Delete with caution**: Only remove code that is:
    - Proven unused (tests still pass)
    - Confirmed unnecessary by human

2. **Dead code**: If you spot dead code, point it out to the human. **🛑 STOP**: Get confirmation before removing.

---

# Examples of Small Changes

## Parallel Change/Expand and Contract

This is a pattern to implement backward-incompatible changes to an interface in a safe manner, by breaking the change into three distinct phases: expand, migrate, and contract.

**CRITICAL**: Each phase is a SEPARATE commit with passing tests!

### Phase 1: Expand (Add the new thing)
- Add the new method/class/interface alongside the old one
- Both old and new coexist
- **🛑 STOP**: Run tests, commit, discuss next step with human

### Phase 2: Migrate (Move clients to new thing)
- Update each caller one at a time
- After EACH caller migration: run tests, commit
- **🛑 STOP**: After all migrations, discuss with human before proceeding

### Phase 3: Contract (Remove the old thing)
- **🛑 STOP**: Confirm with human that all clients are migrated
- Remove the old method/class/interface
- Run tests, commit

## Rename Refactoring

1. **🛑 STOP**: Propose new name options to human
2. After human chooses: Add new name (alias or wrapper)
3. Run tests, commit
4. Migrate callers one by one (test + commit each)
5. **🛑 STOP**: Confirm with human before removing old name
6. Remove old name
7. Run tests, commit

## Extract Method

1. **🛑 STOP**: Identify code to extract, discuss with human
2. **🛑 STOP**: Propose method name options, let human choose
3. Extract to new method (keep original code calling it)
4. Run tests, commit
5. Check for other call sites that could use the new method

---

# Anti-Patterns (NEVER Do These)

❌ **Big Bang Refactoring**: Making multiple changes at once
❌ **Speculative Generality**: Adding flexibility "just in case"
❌ **Autonomous Decision Making**: Choosing refactoring direction without human input
❌ **Skipping Tests**: Never make a change without running tests immediately after
❌ **Skipping Commits**: Every green test run after a change deserves a commit
❌ **Premature Extraction**: Extracting duplication before the Rule of Three
❌ **Silent Deletion**: Removing code without human confirmation

---

# Checklist Before Each Change

- [ ] Have I discussed this change with my human partner?
- [ ] Is this the SMALLEST possible change?
- [ ] Do I understand what tests will verify this change?
- [ ] Am I changing only ONE thing?
- [ ] Will I run tests IMMEDIATELY after this change?
- [ ] Will I commit if tests are green?

---

# Summary: The Dynamo in Action

```
    ┌──────────────────────┐
    │   DISCUSS & AGREE    │◄────────────────┐
    │   (Human + Agent)    │                 │
    └──────────┬───────────┘                 │
               ▼                             │
    ┌──────────────────────┐                 │
    │  Minimize Duplication │                │
    │  (Surface it first!) │                 │
    └──────────┬───────────┘                 │
               │                             │
               ▼                             │
    ┌──────────────────────┐                 │
    │   Maximize Clarity   │                 │
    │  (Propose names!)    │                 │
    └──────────┬───────────┘                 │
               │                             │
               ▼                             │
    ┌──────────────────────┐                 │
    │     Test → Commit    │─────────────────┘
    └──────────────────────┘
```

The dynamo only works when human and agent collaborate at each step!
