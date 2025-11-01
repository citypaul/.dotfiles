---
"@paulhammond/dotfiles": patch
---

Add missing pnpm-lock.yaml file to fix GitHub Actions workflow

The release workflow was failing because the Node.js setup action expected
a pnpm lockfile when using pnpm cache, but we hadn't run pnpm install yet
to generate the lockfile.

This patch adds the pnpm-lock.yaml file to the repository.
