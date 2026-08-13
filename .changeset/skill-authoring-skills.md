---
"@citypaul/dotfiles": minor
---

Add the writing-for-agents and skill-creator external skills

Two pinned external skills for writing and evaluating the skills in this
distribution — the gap that let a badly triggered skill ship in the first place.

- **`writing-for-agents`** (Matt Pocock, MIT) — writing documents an *agent*
  consumes: a SKILL.md, `CLAUDE.md`/`AGENTS.md`, or a doc reached by a pointer.
  Context pointers and the fact that a pointer's wording rather than its target
  decides when material gets reached; the context-load versus cognitive-load
  split; the information hierarchy and progressive disclosure; and completion
  criteria whose clarity resists premature completion. Installs from the
  **existing** reviewed `84fdeff` pin — `writing-for-agents` is already present
  at that revision, so `grill-me` needs no re-audit.
- **`skill-creator`** (Anthropic, Apache 2.0, pinned `f17010c`) — the authoring
  loop: draft, write test prompts, run the skill against them, evaluate
  qualitatively and quantitatively, rewrite, expand the test set. Ships eval and
  benchmark tooling plus `improve_description.py` for tuning trigger accuracy,
  which is directly the failure class behind the xstate trigger rewrite.

Routed rather than merely installed, because overlapping skills confuse which
one fires: `technical-writing` owns human-facing prose, `writing-for-agents`
owns agent-facing instruction — the split is by audience, not by file type — and
`skill-creator` owns the authoring and measurement loop around the words.
`CLAUDE.md` carries that routing directly. Registered in the installer manifest,
`--no-external` help, README catalogue and external-source lists,
acknowledgements, and `skills/REFERENCES.md`. New test guards assert the
Anthropic pin is a full commit SHA, that the writing skill installs from the
audited Pocock pin, and that the two writing skills stay routed apart.
