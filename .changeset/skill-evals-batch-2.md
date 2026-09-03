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

**What the evals caught, and what changed** (every edit anchored, verified by an
independent refuter node on Opus, and re-measured; scores are with-skills / no-skills /
skill-forced):

- `testing` — 21/30 without the skill. With it, a touched test file's shared
  `let`/`beforeEach` was left standing, factories were a matter of taste, planted
  boundary and case-folding mutants survived, and factories used literals instead of
  the production schema. Now: touching a test file makes its whole state discipline
  yours; the factory trigger is mechanical; comparisons against constants and
  normalising calls are enumerated before the first assertion; the production schema
  is reused at the factory. Forced 30/30, with-skills 29/30.
- `mutation-testing` — 16/27 without. Crashed Stryker attempts silently consumed the
  rerun budget, no survivor was ever called equivalent, and gate discipline was
  optional. Now: a rerun budget that counts attempts, a cheap config proof before a
  whole-project run, a triage table with an equivalence pass, no break threshold
  before a recorded baseline, gitignore and scripts. 27/27 in both arms.
- `typescript-strict` — 25/31 without; the schema-at-boundary rule was already
  landing (3/3 with the skill vs 1/3 without) but a value set with an owner was
  re-spelled as a `z.enum` beside the hand-written union. Now: search for the owner,
  derive from one `as const` list. Forced 31/31, with-skills 30/31.
- `functional` — 10/21 without → forced 21/21; but with routing left to the agent the
  skill often does not load (tdd wins ordinary feature requests; with-skills 19/21),
  and when a request asked to change a shared object in place even the forced arm
  complied until the skill said otherwise. Now: the answer is still a new value and
  the reply says why; readonly contracts; loop rules at the point of writing; a
  description that names data-reshaping requests and loads alongside tdd.
- `refactoring` — 21/28 without → forced 28/28 (with-skills 25/28, one routing miss):
  the reply never stated the Critical/High/Nice/Skip assessment and look-alike
  functions were merged. Now: labelled lines plus a Decision line in every reply,
  restated at the checkpoint that owns the reply; a baseline run even when declining;
  keep semantically different look-alikes separate; the description fires on
  "collapse" and "tidy".
- `characterisation-tests` — 20/29 without → forced 29/29, with-skills 28/29: the
  oracle is observed by running the code before asserting, snapshot tests for large
  text.
- `finding-seams` — 19/28 without → forced 28/28: a `??`/`||` fallback from a
  parameter is an enabling point, never a module mock, only a hand-written fake goes
  through the seam, and the hand-back names the seam type and where its enabling
  point is.

Harness changes that came out of this batch: touched files are detected from git
status as well as the tool-call trail (tests written through a Bash heredoc count);
regrade rebuilds the exact run and honours the case's current vars; the skills mount
is a copy rather than a symlink, and the SDK sandbox allows local port binding, so
Stryker's own sandbox works inside the eval.
