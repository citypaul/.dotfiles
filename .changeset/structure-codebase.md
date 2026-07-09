---
"@citypaul/dotfiles": major
---

Replace the screaming-architecture-based folder guidance with the new `structure-codebase` skill. It selects proportional frontend, feature-, context-, endpoint-, workflow-, framework-, or visible-hexagonal structures; defines package/import enforcement and safe migrations; and reconciles the DDD and hexagonal skills with the new physical-boundary model.

This is a breaking skill rename and architecture-policy replacement. `folder-structure` remains as a deprecated explicit-invocation redirect, but it is no longer standalone: single-skill installations must add the canonical `structure-codebase` sibling as documented in `MIGRATION.md`.
