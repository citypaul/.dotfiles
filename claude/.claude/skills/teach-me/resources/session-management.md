# Session Management

How to manage multi-session learning: progress tracking, spaced repetition scheduling, continuity across conversations.

---

## Resuming a Learning Journey

When `/teach-me [topic]` is invoked and existing progress exists:

### 1. Load State

```
CHECK (in order):
├─► learning/[topic-slug]/session-log.md     (project-local)
├─► ~/.claude/learning/[topic-slug]/session-log.md  (general)
├─► Memory system — search for learning memories about [topic]
└─► Any of the above may be the source of truth; prefer the most recent
```

### 2. Summarize Where We Left Off

Tell the learner:
- Last session date and what was covered
- Current position in the learning plan
- Any gaps flagged for review
- Items due for spaced repetition

### 3. Run Spaced Review

Before new material, review items that are due. This is non-negotiable — spaced repetition is the highest-impact technique for retention.

Pull review items from the session log's "Spaced review due" section. Ask 3-5 questions covering due items.

**After review:**
- Items answered correctly → extend interval (see schedule below)
- Items answered incorrectly → reset to shortest interval
- Update the session log

### 4. Continue to Next Session

Proceed with the next unfinished session in the learning plan.

---

## Spaced Repetition Schedule

### Base Schedule

| Review # | Interval | Notes |
|----------|----------|-------|
| 1st review | Next session | Always review new material in the immediately following session |
| 2nd review | 2-3 sessions later | Begin spacing out |
| 3rd review | 5-7 sessions later | Material should be solidifying |
| 4th review | 10+ sessions later | Long-term retention check |
| Graduated | No further review | Consistently correct with high confidence across 3+ reviews |

### Adjustment Rules

- **Correct with high confidence** → advance to next interval
- **Correct with low confidence** → repeat at same interval
- **Incorrect** → reset to "next session" regardless of current interval
- **High-confidence incorrect** (blind spot) → reset to "next session" AND add targeted practice

### What to Track Per Review Item

```
- Concept name
- First learned: [session/date]
- Current interval: [1/2/3/4/graduated]
- Next review due: [session number or date]
- Review history: [correct/incorrect per review]
- Notes: [specific aspects that caused difficulty]
```

---

## Memory Integration

### What to Save to Memory

After each session, save or update a memory with type `project`:

```markdown
---
name: learning-[topic-slug]
description: Learning progress for [topic] — current level, gaps, next session
type: project
---

**Topic:** [topic]
**Current level:** [beginner/intermediate/advanced]
**Sessions completed:** [N] of [total]
**Last session:** [date]
**Current focus:** [what's being learned now]

**Gaps identified:**
- [Gap 1] — [Bloom's level where it breaks down]
- [Gap 2] — [specific misconception or weakness]

**Strengths:**
- [Area 1] — solid through [Bloom's level]

**Next session:** [topic of next session]
**Spaced review due:** [concepts due for review]

**How to apply:** When resuming `/teach-me [topic]`, load learning files and start with spaced review of gaps before advancing.
```

### When to Update Memory

- After every session (update existing, don't create new)
- When the learner demonstrates a breakthrough or reveals a persistent gap
- When the learning plan changes (new goals, adjusted scope)

### When to Read Memory

- At the start of every `/teach-me` invocation
- When the learner references previous learning in a different context
- When teaching a related topic — check if the learner has studied prerequisites

---

## Adapting Across Sessions

### Signs the Pace Is Too Fast

- Learner frequently says "I think so" or "maybe" instead of confident answers
- Performance on review items is poor (< 60% correct)
- Confidence calibration shows consistent over-confidence (thinks they know, but doesn't)
- Learner asks to re-explain things from previous sessions

**Action:** Slow down. Add more practice at the current level. Use more concrete examples. Consider revisiting earlier sessions with fresh examples.

### Signs the Pace Is Too Slow

- Learner answers correctly and quickly without visible effort
- Learner expresses impatience or asks to skip ahead
- Review items are consistently answered correctly with high confidence
- Learner is making connections the curriculum hasn't introduced yet

**Action:** Speed up. Skip or compress remaining material at this level. Move to higher Bloom's levels. Introduce optional deep-dive topics.

### Signs of a Blind Spot

- High confidence but incorrect answers on a specific sub-topic
- Learner uses a concept correctly in one context but incorrectly in another
- Learner's explanations contain a consistent error they don't notice

**Action:** Do not simply correct. Design a scenario where the misconception leads to a visibly wrong outcome. Let the learner discover the error through the consequences. This is more effective than being told.

---

## Session Continuity Across Conversations

Each conversation with Claude is independent — there is no automatic memory of previous conversations. Continuity relies on:

1. **Learning files** — the session log, plan, and cheat sheet persist on disk
2. **Memory system** — learning progress memories persist across conversations
3. **The learner themselves** — they remember what they've learned (and the skill should leverage this through review)

### Starting a New Conversation

When the learner types `/teach-me [topic]` in a new conversation:

1. Check for learning files at both locations
2. Check memory for learning progress
3. Read the session log to understand where things stand
4. Begin with a brief check-in: "Last time we covered [X]. Let me ask a few review questions before we continue."
5. Run spaced review
6. Continue from where the plan says we left off

### Handling Gaps Between Sessions

If significant time has passed since the last session:

- **1-3 days**: Normal review, proceed as planned
- **1-2 weeks**: Extended review (5-7 questions instead of 3-5), may need to revisit previous session briefly
- **2+ weeks**: Significant forgetting likely. Run a diagnostic quiz covering all previous material. Use results to decide whether to continue or revisit.

---

## Ending a Learning Journey

When the learner has completed all sessions in the plan:

### Final Assessment

Run a comprehensive assessment covering all major topics:
- 2-3 questions per session topic, at Apply level or higher
- Include interleaved questions that require combining concepts
- Include at least one Create-level question

### Graduation Criteria

The learner has graduated when they can:
- Explain the core concepts without prompting (Feynman test)
- Apply concepts to novel scenarios not covered in the course
- Identify which concepts apply in ambiguous situations
- Evaluate trade-offs and make justified decisions

### Wrap-Up

1. Update the learning plan status to "Complete"
2. Generate or update the final cheat sheet
3. Update memory to reflect completion and final level
4. Suggest next topics if the learner wants to continue deeper
5. Note any persistent gaps for future reference

### Post-Graduation Review

Even after completion, the learner benefits from occasional review. Suggest checking back in 2-4 weeks for a quick retention quiz. If they invoke `/teach-me [topic]` after graduation, run a retention check instead of starting fresh.
