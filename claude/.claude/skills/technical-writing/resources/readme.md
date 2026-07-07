# READMEs: The Cognitive Funnel

## Order sections broad-to-narrow (art-of-readme, noffle)

Name → one-liner → usage → API → installation → license. The widest
end carries the broadest, most pertinent details; depth increases only
for readers interested enough to keep going. The first screen must let
a stranger answer "is this the thing I need?" in seconds — and the
one-liner should state the DIFFERENTIATOR, not the category.

## Short vs long — the resolved tension

- noffle: "as short as it can be without being any shorter" — detailed
  documentation gets its own pages; the README routes.
- makeareadme.com: "too long is better than too short."
- Resolution: makeareadme is right while the README IS the docs
  (small/solo projects); once a docs site exists, noffle wins — the
  README's job becomes routing, not teaching.

## What celebrated READMEs share (awesome-readme curation)

- A one-line differentiator, then an immediate demo — screenshot/GIF
  for end-user tools, a code block for libraries (the visual matters
  far more for tools than libraries).
- Copy-paste-complete install.
- Links out to real docs rather than inlining them.
- Judicious badges ("what real value does this badge provide?") and
  never images for critical information — hosts rot, and agents read
  text.

## A machine-checkable structure, if wanted (standard-readme)

Title → short description (<120 chars, matching the package
description) → ToC (required over 100 lines) → Background → Install
(required) → Usage (required) → API → Maintainers → Contributing
(required) → License (required, last). Low real-world adoption
relative to fame — treat as a checklist, not a compliance target.

## README-driven development (Preston-Werner)

Write the README before the code: "a perfect implementation of the
wrong specification is worthless." It forces interface design while
excitement is fresh and gives collaborators a spec to build against.
Known failure mode: READMEs describing aspirations that never shipped
— pair RDD with executable examples and docs CI (see docs-quality) so
what the README promises is continuously verified.
