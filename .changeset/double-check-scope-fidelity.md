---
"@citypaul/dotfiles": minor
---

Make scope-fidelity checks a mandatory part of the double-check skill, and
wire it to acceptance-review at the pre-PR phase

Motivated by real reviews where an agent took clear requirements and silently
removed features that were not asked for, added things that were not asked
for, and even deleted the tests that were keeping those features in place —
while the remaining code still looked correct.

Every double-check review must now compare the finished work against the
original scope and affirmatively report three outcomes in every round:

- **Unrequested additions** — features, behaviors, endpoints, options,
  dependencies, or configuration present in the work but absent from the scope.
- **Unrequested removals** — required or pre-existing features, behaviors,
  error handling, or guarantees now missing or weakened without the scope
  asking for it.
- **Removed or weakened tests** — the reviewer diffs test files directly,
  enumerates every deleted, skipped, or loosened test, and judges each against
  the original scope; a test removed to let an unrequested behavior change
  pass silently is a blocker.

Behavior-preserving refactoring is explicitly not scope drift: refactoring
touched code is expected as part of finished work, judged on justification and
behavior preservation rather than on whether it was requested, and the
reviewer also flags valuable refactoring opportunities the work missed (per
the `refactoring` and `reduce-system-complexity` skills where installed). A
claimed refactor that changes observable behavior is judged under the
addition/removal checks instead.

Double-check is now phase-aware about the vendored `acceptance-review` skill:
when the work under review is finished implementation approaching a PR and an
authoritative requirements artifact exists, it also runs `acceptance-review`
against that artifact as part of the same gate, reporting the two verdicts
separately; for earlier-phase work (plans, designs, mid-cycle code) a general
second opinion alone applies. Scope fidelity and acceptance-review are
explicitly complementary — one proves the contract's criteria are satisfied,
the other catches work outside the contract.

The verifier brief gains an "Original scope" section (the authoritative
requirements, verbatim or by exact reference) and a mandatory scope-fidelity
check section; responses must include three explicit scope-fidelity outcome
lines, and `VERDICT: no-issues` is invalid without a clean result on all
three. New anti-patterns cover reviewing only changed-code correctness while
ignoring scope drift, and accepting a test deletion because the covered code
was also deleted without checking the deletion itself was in scope.
