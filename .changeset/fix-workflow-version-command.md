---
"@paulhammond/dotfiles": patch
---

Fix GitHub Actions workflow to correctly run changesets versioning

The workflow was failing with "No commits between main and changeset-release/main"
because the version command was configured as `pnpm version` (which just prints
version info) instead of `pnpm changeset version` (which actually bumps versions).

This also simplifies the workflow to use a single changesets action call that
handles both creating the Version Packages PR and creating GitHub releases.
