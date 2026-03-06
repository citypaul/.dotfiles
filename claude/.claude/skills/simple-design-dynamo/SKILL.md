---
name: simple-design-dynamo
description: >
  Collaborative refactoring using the Four Elements of Simple Design
  (minimize duplication, maximize clarity). Use when refactoring legacy code,
  improving code quality, or simplifying complex code with a human partner.
disable-model-invocation: true
allowed-tools:
  - Read
  - Edit
  - Glob
  - Grep
  - Bash
---

# Simple Design Dynamo

This skill uses J. B. Rainsberger's Four Elements of Simple Design.

**Related skills**: This skill builds on top of the `tdd` and `refactoring` skills.
Load those for the detailed TDD workflow (RED-GREEN-REFACTOR) and refactoring patterns.

---

# How This Skill Fits With TDD

This skill operates **within the REFACTOR phase** of the RED-GREEN-REFACTOR cycle defined in `tdd`. It does not replace that cycle. The sequence is:

1. **RED**: Write a failing test (per `tdd` skill)
2. **GREEN**: Write minimum code to pass (per `tdd` skill)
3. **REFACTOR**: Use the Simple Design Dynamo (this skill) as a guiding light for what to improve

When invoked explicitly via `/simple-design-dynamo`, the dynamo cycle below guides the collaborative refactoring conversation.

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

**STOP AND DISCUSS with your human partner in these situations:**

1. **When naming** - Propose 2-3 name options and let the human decide
2. **When surfacing duplication** - Show the duplicated code and discuss extraction strategies
3. **Before removing code** - Always confirm with the human before deletion

**NEVER proceed on your own if:**
- You're about to make a change that affects more than one concept
- You're unsure whether tests adequately cover the change

---

# The Refactoring Cycle

```
+-----------------------------------------------------+
|  1. DISCUSS with human: What small change to make?   |
|     (Propose options, decide together)               |
+-------------------------+---------------------------+
                          |
                          v
+-----------------------------------------------------+
|  2. Make ONE small change                            |
|     (Only what was agreed - nothing more!)           |
+-------------------------+---------------------------+
                          |
                          v
+-----------------------------------------------------+
|  3. Run ALL tests                                    |
|     - If RED: STOP, discuss with human, undo if      |
|       necessary                                      |
|     - If GREEN: proceed                              |
+-------------------------+---------------------------+
                          |
                          v
+-----------------------------------------------------+
|  4. Run linter                                       |
|     - Fix any issues                                 |
|     - Re-run tests after fixes                       |
+-------------------------+---------------------------+
                          |
                          v
+-----------------------------------------------------+
|  5. Commit with conventional commit message          |
|     (e.g., refactor:, fix:, test:)                   |
+-------------------------+---------------------------+
                          |
                          v
+-----------------------------------------------------+
|  6. DISCUSS: Check for code smells                   |
|     - Is there duplication to surface?               |
|     - Are names clear?                               |
|     - Can anything be simplified?                    |
+-------------------------+---------------------------+
                          |
                          v
               [Return to Step 1]
```

## Rules for Minimizing Duplication

1. **Rule of Three**: Only extract duplication after THREE instances. One is unique, two might be coincidence, three is a pattern.

2. **Make duplication obvious FIRST**: Before extracting, make similar code MORE similar:
    - Align the code visually
    - Use identical variable names where appropriate
    - Show the human the side-by-side comparison
    - STOP: Discuss extraction strategy with human

3. **Never extract silently**: Always propose the extraction and get human approval.

For more on DRY principles (knowledge vs code duplication), see the `refactoring` skill.

## Rules for Maximizing Clarity

1. **Naming requires human decision**: When renaming:
    - Propose 2-3 name options
    - Explain the trade-offs of each
    - STOP: Let the human choose

2. **Comments are a smell**: If you feel the need to add a comment, a better name would suffice. Code should be self-documenting.

3. **Extract to explain**: If a block of code needs explanation, consider extracting it to a well-named method. Propose this to the human.

## Rules for "Has Fewer Elements"

1. **Delete with caution**: Only remove code that is:
    - Proven unused (tests still pass)
    - Confirmed unnecessary by human

2. **Dead code**: If you spot dead code, point it out to the human. STOP: Get confirmation before removing.

---

# Examples of Small Changes

For detailed refactoring examples, see [examples/](examples/).

---

# Anti-Patterns (NEVER Do These)

- **Big Bang Refactoring**: Making multiple changes at once
- **Speculative Generality**: Adding flexibility "just in case"
- **Autonomous Decision Making**: Choosing refactoring direction without human input
- **Skipping Tests**: Never make a change without running tests immediately after
- **Skipping Commits**: Every green test run after a change deserves a commit
- **Premature Extraction**: Extracting duplication before the Rule of Three
- **Silent Deletion**: Removing code without human confirmation

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
    +----------------------+
    |   DISCUSS & AGREE    |<----------------+
    |   (Human + Agent)    |                 |
    +----------+-----------+                 |
               |                             |
               v                             |
    +----------------------+                 |
    |  Minimize Duplication |                |
    |  (Surface it first!) |                 |
    +----------+-----------+                 |
               |                             |
               v                             |
    +----------------------+                 |
    |   Maximize Clarity   |                 |
    |  (Propose names!)    |                 |
    +----------+-----------+                 |
               |                             |
               v                             |
    +----------------------+                 |
    |     Test -> Commit   |-----------------+
    +----------------------+
```

The dynamo only works when human and agent collaborate at each step!
