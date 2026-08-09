# Formatting: Structural Rules

Adapted from Adam Bulmer's pinned Mintuz writing bundle, with heuristics that
defer to the repository's style guide. See `source-notes.md` and
`../LICENSE`.

## Titles and headings

- Follow the repository's title style; make the subject and benefit
  visible. Use exactly one h1 unless the target format says otherwise.
- h2 for sections and h3 for subsections by default. Deeper nesting is
  a prompt to check whether splitting would improve navigation, not an automatic defect.
- Headings summarize the section's payoff, not its topic ("Gates run
  in CI" beats "CI integration").

## Table of contents

- Add one when it materially improves navigation; keep it a map rather
  than an exhaustive index.
- Verify anchors against the target renderer's real slug algorithm
  (GitHub: lowercase, strip punctuation, EACH space becomes a hyphen —
  adjacent spaces produce doubled hyphens). Machine-check, don't
  eyeball.

## Paragraphs and lists

- Lead with the point and split paragraphs when they carry more than one idea.
- Bullets for unordered ideas; numbers only when order carries
  information — a numbered list claims sequence.
- Consistent item phrasing and end punctuation; long inline
  enumerations become lists or tables.
- Reading width ~65 characters for running prose.

## Emphasis

- Bold for the load-bearing phrase a skimmer must not miss — sparingly:
  when everything is bold, nothing is.
- Italics for light emphasis only. Never emphasis as decoration.

## Code and examples

- Every code block runnable as shown (or explicitly marked as a
  fragment); include expected output where the reader needs to confirm
  they're on track.
- Exact strings for commands, paths, config — copy-paste is the
  primary read mode for both humans and agents.
- Wide content (tables, code, diagrams) must not force page-level
  horizontal scroll.

## Intros and outros

- Intro: 1–2 short paragraphs stating goal and payoff; tutorials open
  with "you will have X working".
- Outro: takeaways plus the clear next action — every ending is a
  signpost.
