# Formatting: Structural Rules

Adapted from mintuz/skills "Developer Writing Playbook" (credited in
REFERENCES), extended with house rules.

## Titles and headings

- Title case for the title; 5–8 words; the benefit visible ("X for
  Faster Y"). Exactly one h1.
- h2 for sections, h3 for subsections; avoid deeper nesting — if you
  need h4, the section wants splitting.
- Headings summarize the section's payoff, not its topic ("Gates run
  in CI" beats "CI integration").

## Table of contents

- Add one when a doc exceeds ~4 sections; one level deep with at most
  a few key sub-entries — a map, not an index.
- Verify anchors against the target renderer's real slug algorithm
  (GitHub: lowercase, strip punctuation, EACH space becomes a hyphen —
  adjacent spaces produce doubled hyphens). Machine-check, don't
  eyeball.

## Paragraphs and lists

- 3–5 sentences per paragraph; lead with the point.
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
