---
"@citypaul/dotfiles": minor
---

Skill evals batch 2: quality suites for seven skills, and the fixes they drove

Batch 2 of the programme tracked in `evals/skills/COVERAGE.md`. Each of `testing`,
`typescript-strict`, `functional`, `refactoring`, `mutation-testing`,
`characterisation-tests` and `finding-seams` now has a promptfoo quality suite built to
the `AUTHORING.md` bar: a fixture that declares the practice but shows none of it,
product-shaped requests that never name the practice, deterministic graders that quote
the rule they enforce, hidden acceptance tests, and a proof against a hand-written
reference implementation and a deliberate rule break before the first agent run. The
suites were authored by one graph node per skill and refuted by an independent
verifier, with a repair round.

Highlights of what the graders check:

- `testing` — fresh state per test, factories with overrides, the real production
  schema reused, behaviour through the public interface, no mocks of the package's own
  modules, no reflex 1:1 test-file mirroring, and that the tests catch planted mutants.
- `typescript-strict` — a schema parses the untrusted input before use and the type is
  derived from it, no `any`, no assertions outside brand factories, one owner per
  contract, exhaustive variant switches.
- `functional` — inputs are never written to (reachability from the parameter, plus a
  frozen-input hidden test), array methods over loops, early returns, options objects.
- `refactoring` — a passing baseline is run before the first edit, behaviour including
  the fixture's quirk is preserved, the two look-alike functions stay separate, no
  commit is made, and the reply states a Critical/High/Nice/Skip assessment — including
  "nothing worth doing" when that is the honest answer.
- `mutation-testing` — Stryker is configured with the vitest runner and actually run,
  the reply reports killed/survived/score, and survivors drop below the fixture's
  recorded baseline.
- `characterisation-tests` — no production file is touched, the agent's tests pass
  against the unmodified module, and the quirk is pinned rather than "fixed".
- `finding-seams` — an explicit seam with a default that preserves both call sites, no
  `vi.mock` of the module under test, fakes injected through the seam, the seam type
  named in the reply.

Results and skill edits: see below (filled in as the batch completes).
