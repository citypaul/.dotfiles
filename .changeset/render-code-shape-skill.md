---
"@citypaul/dotfiles": minor
---

Add the render-code-shape skill for cited, read-only renders of how code composes

Renders the *shape* of code — entry points, the frame edge, module boundaries,
the types crossing them, signatures, and an annotated call graph per wiring —
while collapsing everything below the waterline to one line of intent. Only
bodies are pseudo: every name, type, and path is read from source and cited by
file and line, or marked `[NEW]`. That citation discipline is what separates the
render from a remembered summary.

Use it to understand an unfamiliar path, trace what a request actually touches,
or pseudocode a change before building it. A `[NEW]` render is an input to a
`planning` slice and the shape an implementation can be checked against — never
a substitute for the failing behavior test `tdd` requires.

Read-only by construction: producing a render never authorizes changing
production code, tests, or configuration, and it states facts rather than
verdicts. Findings route to the skill that owns the decision — `codebase-design`
for boundary quality, `structure-codebase` for placement,
`improve-codebase-architecture` for ranked investment, `finding-seams` and
`characterisation-tests` for untested or untestable paths.

An attributed adaptation of Adam Bulmer's MIT-licensed `pseudocode` skill at
pinned commit `976d4a0c`. Retains the waterline metaphor, the cite-or-mark-`[NEW]`
rule, the five-step workflow, the wiring concept, the four path-termination
conditions, the above/below cut table, and the annotated call-graph format.
Renamed for trigger accuracy — "pseudocode" reads as throwaway sketching and
under-fires on "how does this compose?" — following the same precedent as
`reducer` → `reduce-system-complexity`, with the original vocabulary kept in the
description so it still discovers the skill. Adds a fabrication guard against
recalled or inferred signatures, a narrowest-frame proportionality rule,
glossary binding via `ubiquitous-language`, an anti-pattern catalog, and a
completion check. The upstream MIT notice and full provenance are preserved in
`LICENSE` and `references/source-notes.md`.
