# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management.

## When to Create a Changeset

Create a changeset whenever you make changes that users should know about:
- New features
- Breaking changes
- Bug fixes
- Documentation updates that change behavior

## How to Create a Changeset

```bash
# Run the changeset CLI
pnpm changeset

# You'll be prompted to:
# 1. Select the type of change (major, minor, patch)
# 2. Write a summary of the change
```

This creates a markdown file in `.changeset/` describing your change.

## Changeset Types

- **major**: Breaking changes (v2.0.0 → v3.0.0)
  - File structure changes
  - Import path changes
  - Removed features

- **minor**: New features (v2.0.0 → v2.1.0)
  - New documentation sections
  - New agents
  - New install options

- **patch**: Bug fixes (v2.0.0 → v2.0.1)
  - Typo fixes
  - Clarifications
  - Small improvements

## Release Process

### Automated (via GitHub Actions)

When changesets are merged to `main`:
1. GitHub Action runs automatically
2. Creates/updates a "Version Packages" PR
3. When that PR is merged:
   - Versions are bumped
   - CHANGELOG.md is updated
   - Git tag is created
   - GitHub Release is published

### Manual

```bash
# 1. Bump versions and update CHANGELOG
pnpm version

# 2. Commit the version bump
git add .
git commit -m "chore: version packages"

# 3. Create git tag (GitHub Action handles this automatically)
git tag v2.1.0
git push --tags
```

## Example Changeset

```markdown
---
"@paulhammond/dotfiles": minor
---

Add new TypeScript enforcement agent

Added ts-enforcer agent that proactively guides TypeScript best practices
and validates schema-first development.
```

## For This Project

Since this is not published to npm (`"private": true`), changesets are used solely for:
- Semantic versioning
- Changelog generation
- Git tag creation
- GitHub release automation

The `changeset publish` command won't push to npm registry.
