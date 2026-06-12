---
"@paulhammond/dotfiles": minor
---

teach-me: HTML lessons, mission grounding, trusted sources, learning records, and a living glossary

Integrates the best ideas from mattpocock/skills' `teach` skill into the existing tutoring-first `teach-me` skill:

- **HTML lessons** — each session can now produce a self-contained, Tufte-style HTML lesson (`lessons/NNNN-slug.html`): printable, cited, cross-linked to the cheat sheet and glossary, with a reveal-answer recap quiz. New `resources/html-lessons.md` covers format, design principles, and a full template. Includes **capture mode**: when the learner is short on time, the lesson is generated up front instead of after the interactive flow — logged as captured-not-taught, with the deferred retrieval owed at the next session's review.
- **Mission grounding** — the discovery interview now distills a concrete mission ("ship a Rust CLI to my team", not "learn Rust") persisted at the top of `plan.md`; every session objective must trace back to it.
- **Trusted-source curation** — new `resources.md` per topic: 2-3 high-trust annotated sources gathered before the first session, cited while teaching, one recommended per session. No teaching from parametric knowledge alone on fast-moving or factual topics.
- **Learning records** — ADR-style decision-grade insights (`LR-NNNN`) in the session log, used to compute the zone of proximal development; covers demonstrated understanding, disclosed prior knowledge, corrected misconceptions, and mission shifts, with supersession rules.
- **Living glossary** — `glossary.md` as canonical terminology; terms promoted only on demonstrated understanding.
- **Fluency vs storage strength** — new learning-science section (Bjork) with the asymmetric difficulty rule: difficulty is the enemy during TEACH, the tool during PRACTICE; mastery judged only on spaced performance.
- **Wisdom delegation** — real-world-judgment questions route to high-reputation communities recorded in `resources.md`.
- **Answer-option hygiene** — multiple-choice rules (equal-length options, parallel grammar, misconception-based distractors) in assessment patterns.
