---
"@citypaul/dotfiles": patch
---

Raise the Skills CLI download cap so large pinned sources install

The Skills CLI refuses source downloads larger than 10MB, and several pinned
community skill sources (impeccable, herdr, next-skills) ship archives above
that, failing the install. The installer now sets
`SKILLS_DOWNLOAD_MAX_BYTES=104857600` (100MB) for its Skills CLI invocations,
while an explicit caller-provided cap still wins.
