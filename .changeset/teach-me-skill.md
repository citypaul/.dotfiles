---
"@paulhammond/dotfiles": minor
---

feat: add teach-me skill for structured learning and tutoring

Add a new `/teach-me [topic]` skill that turns Claude into an evidence-based private tutor for any topic. Grounded in learning science research (active recall, spaced repetition, Bloom's Taxonomy, Feynman Technique, deliberate practice, metacognition).

**What it does:**
- Discovery interview to assess learner level, goals, and context
- Generates structured learning plans using the 80/20 principle and spiral curriculum
- Interactive sessions: review → teach → check → practice → reflect → log
- Socratic questioning — guides discovery rather than giving answers
- Progressive difficulty through Bloom's Taxonomy levels
- Spaced repetition scheduling across sessions
- Confidence calibration (self-rated vs actual performance)
- Integrates with existing skills when the topic matches (e.g., `/teach-me hexagonal-architecture` uses the hex arch skill as curriculum)

**Course generation:**
- Creates structured, standalone course materials with sessions and exercises
- Project-local (`learning/`) or general (`~/.claude/learning/`) placement
- Work-derived courses that reference actual project code as examples
- Cheat sheet / reference card generation

**Persistence:**
- Learning files (plan, session log, cheat sheet) persist on disk
- Memory system integration for cross-session continuity
- Automatic resume on re-invocation with spaced review

**Resources (4):**
- `learning-science.md` — evidence-based techniques reference (active recall, spaced repetition, interleaving, elaborative interrogation, desirable difficulties, testing effect, concrete examples, dual coding)
- `assessment-patterns.md` — Bloom's Taxonomy question bank, quiz design, feedback patterns, confidence calibration, code exercise patterns (PEMC)
- `course-generation.md` — templates for learning plans, course files, session materials, exercises, session logs
- `session-management.md` — multi-session tracking, spaced repetition scheduling, adaptation signals, graduation criteria
