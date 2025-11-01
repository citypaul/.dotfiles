---
"@paulhammond/dotfiles": patch
---

Add node_modules to .gitignore

The changesets action accidentally committed node_modules/ directory in PR #21.
This adds node_modules/ to .gitignore to prevent this from happening.
