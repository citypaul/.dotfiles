# Course Generation

How to produce structured, standalone course materials that can be studied independently or used as session guides.

---

## When to Generate a Course

Generate course materials when the learner:
- Wants a structured curriculum they can follow at their own pace
- Wants shareable materials for a team or study group
- Is learning a topic deeply enough to warrant 5+ sessions
- Asks explicitly for a course, curriculum, or structured guide

Do not generate a course for quick learning (1-2 sessions). Use the session protocol directly instead.

---

## Learning Plan Template

The learning plan is the first file created. It drives everything else.

```markdown
# Learning Plan: [Topic]

**Learner level:** [From discovery interview]
**Goal:** [Specific, observable outcome — what the learner will be able to DO]
**Time budget:** [Total hours committed]
**Location:** [project-local / general]
**Created:** [date]
**Last session:** [date]

## The Critical 20%

[Identify the sub-topics that drive 80% of practical value. These form the core curriculum.
Everything else is optional depth.]

1. [Core concept 1] — why it matters
2. [Core concept 2] — why it matters
3. [Core concept 3] — why it matters
...

## Session Outline

### Session 1: [Title] — [Estimated duration]
**Objective:** After this session you will be able to [observable verb] [specific thing].
**Prerequisites:** None / [list]
**Status:** ✅ Complete / 🔄 In Progress / ⬚ Not Started

### Session 2: [Title] — [Estimated duration]
**Objective:** After this session you will be able to...
**Prerequisites:** Session 1
**Status:** ⬚ Not Started

### Session 3: [Title] — [Estimated duration]
...

## Optional Deep-Dives

[Advanced topics beyond the core 20%. Include only if time budget allows.]

- [Advanced topic 1] — when you'd need this
- [Advanced topic 2] — when you'd need this

## Resources

[Books, articles, videos, existing skills the learner can reference]

- [Resource 1] — why it's worth their time
- [Resource 2] — why it's worth their time
```

---

## Course File Structure

```
learning/[topic-slug]/
├── plan.md                    # Learning plan (always created)
├── cheat-sheet.md             # Reference card (created after first session)
├── session-log.md             # Progress tracking (created after first session)
└── course/                    # Course materials (created on request)
    ├── 00-overview.md         # Course map, prerequisites, how to use
    ├── 01-[topic].md          # Session 1 material
    ├── 02-[topic].md          # Session 2 material
    ├── ...
    └── exercises/
        ├── 01-exercises.md    # Exercises for session 1
        ├── 02-exercises.md    # Exercises for session 2
        └── ...
```

---

## Course Overview Template (00-overview.md)

```markdown
# [Topic]: A Structured Course

## Who This Is For

[Target audience, assumed prerequisites, what you should already know]

## What You'll Learn

By the end of this course you will be able to:
1. [Observable outcome 1]
2. [Observable outcome 2]
3. [Observable outcome 3]

## Course Map

| Session | Topic | Duration | You'll be able to... |
|---------|-------|----------|---------------------|
| 1 | [Title] | [Est.] | [Outcome] |
| 2 | [Title] | [Est.] | [Outcome] |
| ... | ... | ... | ... |

## How to Use This Course

- **With Claude:** Run `/teach-me [topic]` for interactive, guided sessions
- **Self-study:** Read each session file, then work through the exercises
- **Reference:** Use the cheat sheet for quick lookups after studying

## Prerequisites

[What the learner needs to know before starting. Be specific.]
```

---

## Session Material Template (01-[topic].md)

```markdown
# Session [N]: [Title]

**Objective:** After this session you will be able to [observable verb] [specific thing].
**Prerequisites:** [Previous sessions or knowledge required]
**Estimated time:** [Duration]

## Why This Matters

[1-2 paragraphs connecting this topic to the learner's goals. Motivation before content.]

## Key Concepts

### [Concept 1]

[Concrete example first]

[Second concrete example from a different context]

[Abstract principle extracted from the examples]

[Diagram or visual if applicable]

### [Concept 2]

[Same pattern: concrete → concrete → abstract]

## Connections

- **Builds on:** [What previous sessions/knowledge this extends]
- **Leads to:** [What future sessions will build on this]
- **Contrast with:** [Related concepts that are easily confused]

## Self-Check

[3-5 questions at increasing Bloom's levels. Answers in a collapsed section or separate file.]

1. [Remember/Understand level]
2. [Apply level]
3. [Analyze level]

## Summary

[3-5 bullet points — the minimum viable takeaway from this session]
```

---

## Exercise File Template (exercises/01-exercises.md)

```markdown
# Exercises: Session [N] — [Title]

## Warm-Up (Remember/Understand)

[1-2 quick recall questions to activate prior knowledge]

## Practice (Apply)

### Exercise 1: [Title]

[Problem statement — specific scenario the learner must address]

**Your task:** [Clear instruction of what to produce — explanation, code, diagram, decision]

<details>
<summary>Hint (try without this first)</summary>
[Scaffolded hint that guides without giving the answer]
</details>

<details>
<summary>Solution</summary>
[Complete solution with explanation of reasoning]
</details>

### Exercise 2: [Title]

[Harder problem, building on Exercise 1]

## Challenge (Analyze/Evaluate)

### Exercise 3: [Title]

[Problem requiring comparison, critique, or design decisions]

## Stretch (Create)

### Exercise 4: [Title]

[Open-ended problem requiring synthesis of multiple concepts]
```

---

## Session Log Template

```markdown
# Session Log: [Topic]

## Session 1 — [Date]

**Duration:** [Estimated time spent]
**Topics:** [What was covered]
**Bloom's level reached:** [Highest level demonstrated]

**Performance:**
- [Concept 1]: ✅ Solid / ⚠️ Shaky / ❌ Gap
- [Concept 2]: ✅ / ⚠️ / ❌

**Confidence calibration:**
- Self-rated: [N]/10
- Actual performance: [description]
- Gap: [Over-confident / Under-confident / Well-calibrated]

**Gaps identified:**
- [Gap 1] — schedule for review in session [N]
- [Gap 2] — needs more practice at [Bloom's level]

**Spaced review due:**
- [Concept from session 1]: Due session 2
- [Concept from session 1]: Due session 4

---

## Session 2 — [Date]
...
```

---

## The 80/20 Decomposition Process

To identify the critical 20% for any topic:

1. **List all sub-topics** — brainstorm everything the topic contains
2. **Rank by frequency of use** — which sub-topics appear in the most common real-world scenarios?
3. **Identify dependencies** — which sub-topics are prerequisites for others?
4. **Find the leverage points** — which sub-topics, once understood, make the rest dramatically easier?
5. **Cut ruthlessly** — the core curriculum should be 3-7 sub-topics. Everything else is optional depth.

**Example: Hexagonal Architecture**

All sub-topics: ports, adapters, driving vs driven, dependency inversion, domain isolation, use cases, repositories, testing with fakes, CQRS, event sourcing, cross-cutting concerns, incremental adoption...

Critical 20%:
1. Core concept (domain in the center, dependencies point inward)
2. Ports as interfaces, adapters as implementations
3. Driving vs driven distinction
4. Testing with swappable adapters

These four unlock the ability to read, understand, and contribute to a hex arch codebase. CQRS, event sourcing, and cross-cutting concerns are optional depth.

---

## Work-Derived Courses

When generating courses from actual project work:

1. **Reference real code** — use actual file paths and code from the project as examples
2. **Use real decisions** — reference architectural decisions made in the project and explain the reasoning
3. **Show real trade-offs** — discuss alternatives that were considered and rejected
4. **Include real mistakes** — what went wrong and what was learned (with permission)
5. **Keep it current** — note that code examples reference specific file paths that may change

This produces courses that are immediately practical and grounded in real experience, not abstract theory.

---

## Adapting Courses for Different Audiences

If the learner asks to generate course materials for others:

- **Beginner audience**: More concrete examples, smaller steps, more scaffolding in exercises, longer warm-ups
- **Intermediate audience**: Fewer basics, more application and analysis exercises, real-world scenarios
- **Advanced audience**: Focus on edge cases, trade-offs, evaluation and creation exercises, open-ended problems
- **Mixed audience**: Modular structure where each session has "core" (everyone) and "advanced" (optional) sections
