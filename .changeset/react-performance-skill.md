---
"@citypaul/dotfiles": minor
---

Add the react-performance skill and pin Vercel's React rule catalogues

Installs `vercel-react-best-practices` (72 impact-ordered React/Next.js
performance rules) and `vercel-composition-patterns` (compound components,
boolean-prop proliferation, React 19 API changes) from
`vercel-labs/agent-skills` at reviewed commit `b8caa26`. Installed from upstream
rather than vendored: Vercel maintains the rule set, and the repository
publishes no `LICENSE` file to vendor under — each skill declares `license: MIT`
in its own frontmatter only.

Adds a first-party `react-performance` skill that owns the *method* while those
catalogues own the *rules*, because a prioritized rule list is a search order,
not a diagnosis:

- **Baseline, attribute, one rule per diff, re-measure.** A change that does not
  move the number is reverted rather than kept as good practice — unmeasured
  optimization is mechanism without benefit.
- **Routing across the overlap.** Names which of `vercel-react-best-practices`,
  `vercel-composition-patterns`, `next-best-practices`, `next-cache-components`,
  `core-web-vitals`, `performance`, `react-testing` and `xstate` owns a given
  question, and resolves disagreement toward the more specific source.
- **Where house rules win.** Behavior tests never change to accommodate a
  performance change; immutability holds until a measurement says otherwise and
  then only locally inside a proven hot path; no `any` or unjustified assertion
  bought for speed; memoization is earned rather than reflexive; removing
  mechanism beats adding a cache; a re-render storm caused by flow logic
  scattered across effects is an `xstate` problem, not a memoization one.

`CLAUDE.md` carries the measure-first rule directly, so it applies without
loading the skill. Registered in the installer, README catalogue and decision
table, `panel-review` lenses, and `skills/REFERENCES.md`.
