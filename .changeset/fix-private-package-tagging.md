---
"@paulhammond/dotfiles": patch
---

Fix automated tagging and releases for private packages

The workflow wasn't creating git tags or GitHub releases automatically because
`pnpm changeset tag` only works for packages published to npm. Since this
package has `"private": true` (GitHub releases only, no npm), we need to
manually create tags and releases.

This adds a new workflow step that:
- Reads the version from package.json after changesets bumps it
- Creates and pushes a git tag (v2.0.x format)
- Creates a GitHub Release from that tag

Future releases (v2.0.2+) will now be fully automated when the Version
Packages PR is merged.
