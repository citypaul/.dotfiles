# Assessment Patterns

How to design questions, quizzes, and exercises that reveal genuine understanding — not just memorization.

---

## Bloom's Taxonomy Question Bank

Use these templates to generate questions at the right level for the learner's current ability. Diagnose their level first, then pitch questions there. Only advance when the current level is solid.

### Level 1: Remember (Recall facts)

**Purpose:** Verify the learner can retrieve basic information. Use sparingly — this is the lowest form of understanding.

**Templates:**
- "What is the definition of [concept]?"
- "List the [N] types/steps/components of [concept]."
- "What does [term] mean in the context of [topic]?"
- "Name the [principle/pattern] that describes [scenario]."

**When to use:** Early in learning a new concept, or to verify baseline knowledge before advancing.

**When to move past:** As soon as the learner can recall consistently. Spending too long here creates an illusion of learning.

### Level 2: Understand (Explain meaning)

**Purpose:** Verify the learner can explain concepts in their own words, not just parrot definitions.

**Templates:**
- "Explain [concept] in your own words."
- "Why does [concept] work this way?"
- "What is the main idea behind [concept]?"
- "How would you summarize [concept] to someone unfamiliar with [topic]?"
- "What's an analogy for [concept] from everyday life?"

**Key technique:** If the learner uses jargon from the source material, ask them to rephrase without it. Jargon recitation ≠ understanding.

### Level 3: Apply (Use in new contexts)

**Purpose:** Verify the learner can use the concept to solve problems they haven't seen before.

**Templates:**
- "How would you apply [concept] to solve [new problem]?"
- "Given [scenario], which [approach/pattern] would you use, and how?"
- "Write code that demonstrates [concept] for [specific case]."
- "Here's a situation: [describe]. Walk me through how you'd handle it using [concept]."

**Key technique:** The scenario must be novel — not a rehash of examples already shown. Transfer to new contexts is the test.

### Level 4: Analyze (Break apart, compare)

**Purpose:** Verify the learner can decompose concepts and see relationships between parts.

**Templates:**
- "What's the difference between [concept A] and [concept B]?"
- "What are the trade-offs of [approach A] vs [approach B]?"
- "What would happen if [element] were removed from [concept]?"
- "What assumptions does [approach] make? When would those assumptions break?"
- "Look at this [code/diagram]. What design decisions were made, and what alternatives existed?"

**Key technique:** Analysis questions should reveal the learner's mental model. Incorrect analysis reveals structural misunderstanding that correct recall would mask.

### Level 5: Evaluate (Judge, justify, critique)

**Purpose:** Verify the learner can make and defend judgments using the concept.

**Templates:**
- "Which approach is better for [scenario], and why?"
- "Here's a solution using [concept]. What are its strengths and weaknesses?"
- "A colleague argues [position]. Do you agree? Why or why not?"
- "Under what conditions would [approach] be the *wrong* choice?"
- "Critique this [code/design/argument]. What would you change?"

**Key technique:** Require justification, not just opinion. "B is better" is incomplete. "B is better because [reason], and that matters in this context because [why]" shows real evaluation.

### Level 6: Create (Design, build, synthesize)

**Purpose:** Verify the learner can use concepts to produce something new.

**Templates:**
- "Design a [system/solution] that applies [concept] to [novel problem]."
- "How would you combine [concept A] and [concept B] to solve [problem]?"
- "Create a [diagram/plan/outline] for [scenario] using what you've learned."
- "Build [something] that demonstrates [concept] — explain your design choices."

**Key technique:** Creation tasks should require synthesis of multiple concepts, not just application of one. The design choices and trade-offs are more revealing than the output itself.

---

## Quiz Design Patterns

### Progressive Difficulty Quiz

Start easy, escalate. Stop when the learner's level is clear.

```
Question 1: Remember level — baseline check
Question 2: Understand level — explain in own words
Question 3: Apply level — use in new scenario
Question 4: Analyze level — compare or decompose
Question 5: Evaluate/Create level — judge or build
```

**Scoring interpretation:**
- Solid through Apply → ready for intermediate material
- Struggles at Understand → needs more foundational work
- Strong through Evaluate → ready for advanced/creative challenges

### Misconception-Targeted Quiz

Design questions that specifically test common misconceptions about the topic. These are more diagnostic than generic questions.

**Process:**
1. Identify 3-5 common misconceptions about [topic]
2. For each, design a question where the misconception leads to one answer and correct understanding leads to another
3. Use the wrong answers diagnostically — they reveal *which* misconception the learner holds

### Interleaved Review Quiz

Mix questions from the current topic with questions from previous topics. Do not label which is which.

**Structure:**
- 2 questions on current topic
- 1 question on most recent previous topic
- 1 question on an earlier topic
- 1 question requiring connection between topics

This builds discrimination (knowing which concept to apply) and prevents the decay of earlier material.

---

## Feedback Patterns

### After Correct Answers

Do not just say "Correct!" — this wastes a learning opportunity.

- "Yes — and can you explain *why* that's the case?"
- "Right. How does this connect to [related concept]?"
- "Correct. Now, what would change if [condition changed]?"

Deepen understanding even when the answer is right.

### After Incorrect Answers

Never just say "Wrong, the answer is X." This bypasses the learning.

- "Not quite. What led you to that answer?" — diagnose the reasoning
- "Close — you've got [part right], but reconsider [specific aspect]"
- "Think about [hint]. How does that change your answer?"
- Only reveal the correct answer after the learner has genuinely exhausted their reasoning

### After "I Don't Know"

Distinguish two cases:

1. **Haven't learned yet**: Teach it. This is expected for new material.
2. **Learned but can't recall**: This is a retrieval opportunity — don't waste it.

For case 2:
- "You covered this in session [N]. Think about [context clue]."
- "What do you remember about [related concept]? This connects to that."
- "Try anyway — your best guess is more valuable than no answer."

---

## Confidence Calibration

### The Protocol

Before answering, the learner rates confidence: "How sure are you? (1 = guessing, 5 = certain)"
After answering, compare self-rated confidence to actual accuracy.

### Interpreting the Gap

| Confidence | Accuracy | Interpretation | Action |
|-----------|----------|---------------|--------|
| High | High | Well-calibrated, genuine understanding | Advance to harder material |
| High | Low | Blind spot — the most dangerous state | Target this area with deliberate practice |
| Low | High | Underconfidence — often from impostor syndrome | Encourage; show them their track record |
| Low | Low | Accurate self-assessment of a gap | Normal learning — teach and practice |

**High-confidence errors are the priority.** The learner doesn't know what they don't know. These require immediate, targeted intervention.

---

## Exercise Design for Code Topics

### Predict-Explain-Modify-Create (PEMC)

A four-stage progression for code-based exercises:

1. **Predict**: Show code, ask what it will output. Reveals mental model accuracy.
2. **Explain**: Ask why it produces that output. Reveals depth of understanding.
3. **Modify**: Ask the learner to change the code to handle a new requirement. Tests application.
4. **Create**: Ask the learner to write code from scratch using the concept. Tests synthesis.

### Bug Hunt

Present code with a subtle bug related to the concept being taught. Ask the learner to:
1. Identify the bug
2. Explain why it's a bug (connect to the concept)
3. Fix it
4. Explain what test would catch this bug

### Code Review Exercise

Show a working but suboptimal implementation. Ask the learner to:
1. Identify what could be improved
2. Explain why (connect to principles)
3. Propose a better approach
4. Discuss trade-offs of each approach
