# Codebase Design Source Notes

This skill is an attributed adaptation, not a verbatim copy. These notes preserve provenance and explain the local decisions that differ from the upstream material.

## Sources

### Matt Pocock — `codebase-design`

- Repository: <https://github.com/mattpocock/skills>
- Pinned revision reviewed: [`66898f60e8c744e269f8ce06c2b2b99ce7660d5f`](https://github.com/mattpocock/skills/tree/66898f60e8c744e269f8ce06c2b2b99ce7660d5f)
- Source files:
  - [`skills/engineering/codebase-design/SKILL.md`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/codebase-design/SKILL.md)
  - [`agents/openai.yaml`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/codebase-design/agents/openai.yaml) (adapted agent metadata)
  - [`DEEPENING.md`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/codebase-design/DEEPENING.md)
  - [`DESIGN-IT-TWICE.md`](https://github.com/mattpocock/skills/blob/66898f60e8c744e269f8ce06c2b2b99ce7660d5f/skills/engineering/codebase-design/DESIGN-IT-TWICE.md)
- License: MIT, Copyright (c) 2026 Matt Pocock. The complete notice is preserved in [`../LICENSE`](../LICENSE).

Retained and adapted:

- Deep modules as substantial behavior hidden behind a small caller-facing interface.
- Interface as all caller-visible knowledge, not only a type signature.
- Depth framed as leverage for callers and locality for maintainers rather than a line-count ratio.
- The behavior-preserving deletion/inlining thought experiment for shallow pass-through modules.
- External and internal seams as separate design concerns.
- A parallel “Design It Twice” comparison of materially different contracts.
- Dependency-aware deepening and replacement of implementation-shaped tests with stable behavior tests.

### John Ousterhout — deep modules and Design It Twice

- [*A Philosophy of Software Design*, Second Edition](https://web.stanford.edu/~ouster/cgi-bin/book.php)
- [Stanford CS 190 modular-design notes](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter18/lecture.php?topic=modularDesign)
- [Stanford CS 190 book-review topics](https://web.stanford.edu/~ouster/cgi-bin/cs190-winter21/lecture.php?topic=bookReview)

Used for information hiding, deep versus shallow modules, pulling complexity into an implementation rather than its callers, and comparing more than one design before committing.

### Michael Feathers — seams

- *Working Effectively with Legacy Code* (2004)
- [Martin Fowler's summary of the legacy seam](https://martinfowler.com/bliki/LegacySeam.html)

The canonical local definition lives in `finding-seams`: a seam changes behavior without editing at that place and has an enabling point.

## Local Adaptations

This version deliberately changes several upstream rules to remain consistent with the surrounding skill system:

- Keep `API`, `component`, `service`, `signature`, and `boundary` when they name precise existing concepts instead of banning them.
- Treat a module as capable of exposing several role-shaped contracts rather than requiring exactly one interface.
- Reserve **seam** for behavioral substitution; do not equate every module interface with a Feathers seam.
- Justify seams through variation, ownership, trust, failure, runtime, or testing evidence instead of counting adapters.
- Prefer faithful fakes, test interactors, local resources, sandboxes, and contract tests to interaction-heavy mocks.
- Configure stable dependencies at construction/composition rather than passing every dependency through every operation.
- Make effects explicit instead of applying “return results, never side effects” to effectful application orchestration.
- Require cohesion, ownership, and failure-boundary checks so apparent depth cannot excuse a god module.
- Treat thin adapters, endpoints, framework entrypoints, generated clients, and composition roots as intentionally thin roles.
- Retire old tests only after equivalent behavior coverage and mutation evidence exist; do not delete them categorically.
- Split dependency analysis into runtime, ownership, trust, consistency, volatility, state, and test-fidelity questions.
- Use the repository's own project instructions, ADR convention, and optional per-context glossary instead of hard-coded `CONTEXT.md` and `docs/adr/` paths.
