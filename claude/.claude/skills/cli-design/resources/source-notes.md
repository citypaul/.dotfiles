# Source Notes

## Upstream source

- Work: [*Command Line Interface Guidelines*](https://clig.dev/)
- Authors: Aanand Prasad, Ben Firshman, Carl Tashian, and Eva Parish
- Source repository: [`cli-guidelines/cli-guidelines`](https://github.com/cli-guidelines/cli-guidelines)
- License: [Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/)

## Revision record

Local commit `3cfe8878ae475792a804f71f41abbe4eac9b8dfa` first added this
skill as a synthesis of clig.dev and seven other named sources. Commit
`891d693fe8f030f72b73b193b782be7b5a3166b2` later records a broader
clig.dev adaptation. Neither commit records the upstream revision inspected
at the time, so the original source revision is unknown.

For a reproducible audit, the upstream guide was inspected on 2026-08-09 at
commit [`697d6a29fc8c93d3981a755c0c7683507ad39c3e`](https://github.com/cli-guidelines/cli-guidelines/tree/697d6a29fc8c93d3981a755c0c7683507ad39c3e):

- [Pinned guide source](https://github.com/cli-guidelines/cli-guidelines/blob/697d6a29fc8c93d3981a755c0c7683507ad39c3e/content/_index.md)
- [Pinned upstream license](https://github.com/cli-guidelines/cli-guidelines/blob/697d6a29fc8c93d3981a755c0c7683507ad39c3e/LICENSE)

This SHA is an immutable audit baseline, not a claim about the unknown
revision used for either local adaptation commit.

## Retained and adapted material

The local bundle retains clig.dev's human-first but composable philosophy,
stdout-data/stderr-messaging split, plain and JSON output guidance, TTY and
color detection, prompt bypass and stdin-TTY rules, flag and argument
conventions, configuration precedence, help and error design, state-change
transparency, paging, recoverability, crash-only operation, additive
evolution, distribution, and telemetry-consent guidance. It also retains one
short attributed quotation in `SKILL.md`.

## Local changes

- Reorganized the guide into an agent skill with a compact core and
  TypeScript resources.
- Added typed result and JSON-envelope examples, NDJSON decoding, semantic
  exit-code guidance, logger boundaries, subprocess test patterns, and worked
  composability examples from the separately credited sources in
  `../../REFERENCES.md`.
- Chose stricter local stream contracts: primary data goes to stdout while
  errors and diagnostics go to stderr; prompts require TTY-backed input and
  prompt output; writes honor backpressure and broken pipes independently.
- Added Node.js lifecycle examples and corrected runtime, locking, cleanup,
  decoder-validation, and documented `FORCE_COLOR` value/precedence edge cases
  during local review.
- Treats tool libraries as candidates to evaluate against the current
  repository rather than permanent recommendations.

## License scope

The complete local `cli-design` directory is distributed under CC BY-SA 4.0
as stated in `../LICENSE`. The repository-root MIT license expressly defers to
nested license files, so it does not relicense or misrepresent this adapted
bundle.
