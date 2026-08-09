# Source Notes

The workflow synthesizes, rather than copies, these sources:

- Google SRE, [Effective Troubleshooting](https://sre.google/sre-book/effective-troubleshooting/):
  preserve evidence, reproduce, localize, compare, and prioritize stopping harm
  during major incidents.
- Git, [`git bisect`](https://git-scm.com/docs/git-bisect): use binary search when
  history provides a reliable good/bad predicate.
- Addy Osmani,
  [`debugging-and-error-recovery` at `f493377`](https://github.com/addyosmani/agent-skills/blob/f49337711b7a932b4b338c1d4ad73384df8fd87d/skills/debugging-and-error-recovery/SKILL.md)
  (MIT): evidence-first diagnosis and recovery concerns.
- Jesse Vincent / Superpowers,
  [`systematic-debugging` at `44c9b2d`](https://github.com/obra/superpowers/tree/44c9b2d6e889982ac18c27d05a19fefe335194e1/skills/systematic-debugging)
  (MIT): explicit hypotheses and root-cause discipline.

This skill deliberately rejects fixed attempt counts, package-manager-specific
commands, environment dumps, unsupported success percentages, and a blanket
ban on reversible mitigation before root-cause analysis.
