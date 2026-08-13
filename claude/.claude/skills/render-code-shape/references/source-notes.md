# Render Code Shape Source Notes

This skill is an attributed adaptation, not a verbatim copy. These notes preserve the exact upstream source and explain the local decisions that differ from it.

## Upstream source

- Author: Adam Bulmer (`mintuz`)
- Repository: <https://github.com/mintuz/skills>
- Pinned revision reviewed: [`976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324`](https://github.com/mintuz/skills/tree/976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324)
- Original bundle: [`src/core/skills/pseudocode/`](https://github.com/mintuz/skills/tree/976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324/src/core/skills/pseudocode)
- Exact source file:
  - [`SKILL.md`](https://github.com/mintuz/skills/blob/976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324/src/core/skills/pseudocode/SKILL.md)
- License: [MIT](https://github.com/mintuz/skills/blob/976d4a0ccda4fc8468ffd2e96e0c6f7db5f42324/LICENSE), Copyright (c) 2025 Adam Bulmer. The complete notice is preserved in [`../LICENSE`](../LICENSE).

The upstream `SKILL.md` links no additional documents and ships no companion files at this revision; the repository license was inspected directly.

## Retained concepts

- The **waterline** metaphor: the shape sits above it, syntax and statement-level bodies below.
- Only bodies are pseudo — every name, type, and path is read from source and cited, or marked `[NEW]`.
- The five-step workflow: frame the render, read the parts, render the shape, render the call graph, return the render.
- **Wirings** — production plus any composition root that substitutes a dependency (tests, local dev, feature flags) — each drawn separately.
- The four path-termination conditions: a boundary crossing, a pure leaf, the frame edge, or an already-recorded function.
- The above/below-the-waterline cut table, including "an effect that leaves the process" as the boundary test.
- The three-part shape render: types crossing boundaries, a module boundary table stating what each module hides, and signatures grouped by module.
- The indented call-graph format, the `→ Receiver.method(arg: Type) : Return` edge notation, and the annotation vocabulary (`[if …]`, `[each …]`, `[async]`, `[error …]`, `[boundary: …]`, `[NEW]`).
- `→ Name (above)` in place of a second expansion of an already-drawn function.
- Closing with observable facts rather than judgements, and naming what stayed unread.
- Saving the render when it is a plan for work about to be done.
- Read-only operation: the render is the deliverable, not the edit.

## Local adaptations

- Renamed `pseudocode` to `render-code-shape`. "Pseudocode" reads as throwaway sketching and under-triggers on the questions this skill actually answers ("how does this compose?", "what does this request touch?"); the same rename-for-clarity precedent was applied to `reducer` → `reduce-system-complexity`. The description still names pseudocode explicitly so the original vocabulary keeps discovering it.
- Strengthened the read-only boundary to match this repository's `debugging` and `improve-codebase-architecture` wording: producing a render never authorizes changing production code, tests, or configuration, and implementation proceeds only under `tdd`, `refactoring`, or `reduce-system-complexity`.
- Added explicit non-ownership of judgement. The upstream skill excludes verdicts; this version additionally routes each kind of finding to the skill that owns the decision — `codebase-design` for boundary quality, `structure-codebase` for placement, `improve-codebase-architecture` for ranked investment, `finding-seams` and `characterisation-tests` for untested or untestable paths.
- Added a fabrication guard to step 2: a signature recalled from training data, inferred from a name, or carried over from an older revision is a fabrication even when it happens to be correct, because the citation is what makes it checkable.
- Added a proportionality rule to step 1 — prefer the narrowest frame that answers the question asked — since an unbounded render answers nothing.
- Bound naming to the repository's `ubiquitous-language` glossary rather than "the project's own language" generally.
- Related the `[NEW]` render to this repository's workflow: it is an input to a `planning` slice, never a substitute for the failing behavior test `tdd` requires, and it is saved beside the slice plan so `[NEW]` status stays visible to later reviewers.
- Added an explicit anti-pattern catalog and a completion check, matching the shape of the other first-party skills in this repository.
