---
"@paulhammond/dotfiles": patch
---

Clarify that a vertical slice maps to a PR, not a single commit

The planning skill previously equated slice = commit, which contradicted the
reality that TDD increments within a slice naturally produce multiple commits.
Updated to clarify that a slice is the smallest independently mergeable PR,
and that multiple TDD commits within a slice are expected.
