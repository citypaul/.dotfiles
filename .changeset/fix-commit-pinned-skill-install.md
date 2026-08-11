---
"@citypaul/dotfiles": patch
---

Fix skill installation failing with "Remote branch <sha> not found in upstream
origin". The pinned Skills CLI clones `repo#<ref>` sources with
`git clone --branch`, which only accepts branch or tag names, so every
commit-pinned source added by the install hardening could never clone. The
installer now rewrites commit pins to GitHub commit-archive tarball URLs,
which the CLI downloads and installs without cloning while keeping the same
immutable revision.
