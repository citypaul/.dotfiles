---
"@paulhammond/dotfiles": patch
---

Fix GitHub Actions workflow pnpm version incompatibility

The release workflow failed again after adding pnpm-lock.yaml because the
lockfile was generated with pnpm v10 but the workflow used pnpm v8, causing:

  WARN  Ignoring not compatible lockfile at pnpm-lock.yaml
  ERR_PNPM_NO_LOCKFILE  Cannot install with "frozen-lockfile"

This updates the GitHub Actions workflow to use pnpm v10 to match the lockfile.
