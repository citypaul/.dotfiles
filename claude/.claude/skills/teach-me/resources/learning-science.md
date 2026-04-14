# Learning Science Reference

Evidence-based techniques that underpin the teach-me skill. Use this as a reference when deciding which technique to apply and why.

---

## The Big Picture

Dunlosky et al. (2013) evaluated 10 common study strategies. Only two earned "high utility" ratings: **practice testing** (active recall) and **distributed practice** (spaced repetition). Most popular strategies — highlighting, re-reading, summarizing — were rated low utility. This skill is built around the techniques that actually work.

These techniques are synergistic. The most effective approach combines them: present material with concrete examples and dual coding, immediately test via active recall, ask elaborative questions, space reviews over expanding intervals, interleave topics during review, and calibrate difficulty to maintain productive struggle.

---

## 1. Active Recall (Retrieval Practice)

**What:** Actively retrieving information from memory rather than passively re-reading.

**Why it works:** Retrieval strengthens memory traces through a dual mechanism: it reinforces existing retrieval cues and builds new ones by spreading activation through semantic memory networks (Roediger & Butler, 2011). Re-reading creates an illusion of fluency; retrieval creates durable, flexible knowledge.

**How to apply:**
- After presenting material, always prompt the learner to recall before showing answers
- Use free-recall ("Explain X in your own words"), cued recall ("What principle governs X?"), and application ("Given scenario Y, what would happen?")
- Every explanation should end with a retrieval demand — never let the learner passively consume

**Question types by increasing difficulty:**
1. Free recall: "What do you remember about X?"
2. Cued recall: "What is the relationship between X and Y?"
3. Application: "How would you use X to solve this?"
4. Transfer: "How does X apply in this completely different context?"

---

## 2. Spaced Repetition (Distributed Practice)

**What:** Reviewing material at expanding intervals rather than cramming.

**Why it works:** Spacing forces partial forgetting, making each retrieval event more effortful and thus more strengthening. The optimal gap scales with the desired retention period — roughly 10-20% of the target retention interval (Bjork & Bjork, 2011).

**How to apply:**
- Track when each concept was last reviewed
- Reintroduce concepts at expanding intervals: 1 day → 3 days → 1 week → 2 weeks → 1 month
- Weave review into new sessions rather than making review a separate activity
- If the learner struggles with a review item, reset its interval to short

**Scheduling heuristic:**

| Review # | Interval | When |
|----------|----------|------|
| 1st | 1 day | Next session |
| 2nd | 3 days | ~2 sessions later |
| 3rd | 1 week | ~4 sessions later |
| 4th | 2 weeks | ~8 sessions later |
| 5th | 1 month | Long-term retention |

Adjust intervals based on performance. Struggled → shorten. Easy → lengthen.

---

## 3. Interleaving (Mixed Practice)

**What:** Mixing different topics or problem types within practice, rather than practicing one type at a time (blocked practice).

**Why it works:** Interleaving forces discrimination — the learner must identify which concept applies, not just execute a known procedure. One study found interleaving produced 76% better scores at a one-month delay compared to blocked practice.

**When to use each:**
- **Blocked**: When first learning a concept — the learner needs to understand the basic structure
- **Interleaved**: Once foundational understanding is established — builds discrimination and transfer

**How to apply:**
- After teaching 2-3 related concepts individually, mix them in practice
- Do NOT label which concept each problem tests
- Alternate between easily confused topics to build discrimination
- The learner's initial performance will be lower (this is a desirable difficulty) but retention will be dramatically higher

---

## 4. Elaborative Interrogation

**What:** Prompting learners to generate explanations for *why* and *how* facts or concepts are true.

**Why it works:** Generating explanations activates relational processing — connecting new facts to existing schemas. This creates richer, more interconnected memory representations. Especially effective when learners have some prior knowledge to build upon.

**How to apply:**
- After stating a concept, ask "Why is that the case?" or "How does this connect to what you already know?"
- Do not accept surface answers — follow up with probing questions
- Scaffold for novices: "Think about how X is similar to Y, which you already know"
- Require more independent elaboration as expertise grows

**Example sequence:**
1. "Hexagonal architecture separates business logic from external systems."
2. "Why would that separation be valuable?"
3. *Learner answers about testing...*
4. "Good — what else beyond testing? Think about what happens when you need to change a database."
5. *Learner connects to changeability...*
6. "Now connect those two benefits — is there a deeper principle behind both?"

---

## 5. Desirable Difficulties

**What:** Conditions that make learning harder during practice but produce superior long-term retention and transfer (Bjork, 1994).

**Why it works:** Effort during encoding creates stronger, more elaborated memory traces. The key distinction: a difficulty is "desirable" when it triggers deeper processing. It is "undesirable" when it simply overwhelms without productive engagement.

**The calibration challenge:** The learner must have sufficient background to meet the challenge. Productive struggle looks like slow progress with eventual success. Unproductive struggle looks like repeated failure with no path forward.

**How to apply:**
- Resist making things easy — withhold answers to create retrieval opportunities
- Introduce variation in how problems are presented
- If the learner consistently fails → reduce difficulty (the difficulty is undesirable)
- If the learner consistently succeeds without effort → increase difficulty (too easy, no learning)
- The sweet spot: the learner succeeds about 70-85% of the time with genuine effort

---

## 6. The Testing Effect

**What:** The act of taking a test enhances learning — testing is not merely measurement but a powerful learning event (Roediger & Karpicke, 2006).

**Why it works:** Testing strengthens memory through elaborative retrieval and encoding variability. Repeated studying increases confidence but not actual retention; testing does the reverse.

**How to apply:**
- Frame every interaction as a low-stakes test — make testing feel like conversation, not judgment
- Ask questions *before* providing explanations (pre-testing enhances subsequent learning even when the learner gets it wrong)
- Use frequent, short quizzes rather than infrequent long ones
- Always provide feedback: explain why correct answers are correct AND why common errors are wrong
- Post-test feedback is crucial — testing without feedback is far less effective

---

## 7. Concrete Examples

**What:** Grounding abstract concepts in specific, tangible instances before progressing to abstract representations.

**Why it works:** Abstract concepts lack physical referents, making them harder to encode. Concrete examples activate experiential memory systems. The optimal progression is concrete → abstract ("concreteness fading").

**How to apply:**
- Never introduce an abstract concept without at least two concrete examples first
- Use examples from the learner's domain or experience when possible
- After examples, ask the learner to identify the underlying principle
- Then present a novel example and ask them to apply the principle — this tests transfer
- Multiple diverse examples build better abstractions than many similar ones

**Example for "dependency inversion":**
1. Concrete: "Your phone charger has a USB-C port. You don't need to know what's inside the phone to charge it — any USB-C cable works."
2. Concrete: "A restaurant menu is an interface. The kitchen can change recipes without changing the menu."
3. Abstract: "Now — what's the common pattern? What role does the port/menu play?"

---

## 8. Dual Coding

**What:** Combining verbal explanations with visual representations so information is encoded through both linguistic and visual-spatial systems (Paivio, 1986).

**Why it works:** Verbal and visual information process through separate cognitive channels. Dual encoding creates redundant retrieval paths. Mayer (2009) found multimedia learning boosted test scores by 89%. Key constraint: visuals must be integrated and complementary, not decorative.

**How to apply:**
- Accompany explanations with diagrams, concept maps, or spatial representations
- Ask learners to create their own visual representations
- Use ASCII diagrams, tables, or structured layouts to make relationships visible
- Ensure visuals add information — decorative images actually harm learning
- For code topics: the code itself is one representation; add architecture diagrams, data flow charts, or sequence diagrams as a second channel

---

## Key Sources

- Dunlosky, J. et al. (2013). "Improving Students' Learning With Effective Learning Techniques." *Psychological Science in the Public Interest*, 14(1), 4-58.
- Roediger, H. L. & Butler, A. C. (2011). "The critical role of retrieval practice in long-term retention." *Trends in Cognitive Sciences*, 15(1), 20-27.
- Roediger, H. L. & Karpicke, J. D. (2006). "Test-enhanced learning." *Psychological Science*, 17(3), 249-255.
- Bjork, R. A. & Bjork, E. L. (2011). "Making things hard on yourself, but in a good way." In *Psychology and the Real World*, 56-64.
- Brown, P. C., Roediger, H. L. & McDaniel, M. A. (2014). *Make It Stick: The Science of Successful Learning.* Harvard University Press.
- Paivio, A. (1986). *Mental Representations: A Dual Coding Approach.* Oxford University Press.
- Mayer, R. E. (2009). *Multimedia Learning.* 2nd ed. Cambridge University Press.
- Bloom, B. S. (1984). "The 2 Sigma Problem." *Educational Researcher*, 13(6), 4-16.
