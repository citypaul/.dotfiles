# Contributing to CLAUDE.md Development Framework

Thank you for your interest in contributing! This guide will help you understand our development workflow and versioning process.

## Development Workflow

### 1. Fork and Clone

```bash
# Fork the repository on GitHub, then:
git clone https://github.com/YOUR_USERNAME/.dotfiles.git
cd .dotfiles
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 3. Make Your Changes

- **CLAUDE.md changes**: Edit `claude/.claude/CLAUDE.md` or files in `claude/.claude/docs/`
- **Agent changes**: Edit files in `claude/.claude/agents/`
- **Install script**: Edit `install-claude.sh`
- **Documentation**: Update README.md, MIGRATION.md, etc.

### 4. Create a Changeset

**After making your changes**, create a changeset to document what changed:

```bash
# Install dependencies first (if not already done)
pnpm install

# Create a changeset
pnpm changeset
```

You'll be prompted for:
1. **Change type** (major, minor, or patch)
2. **Summary** of the change

#### Choosing the Right Version Bump

- **major** (v2.0.0 → v3.0.0): Breaking changes
  - File structure changes
  - Import path changes
  - Removed features
  - Changes that break existing setups

- **minor** (v2.0.0 → v2.1.0): New features (backwards compatible)
  - New documentation sections
  - New agents
  - New install options
  - New features that don't break existing setups

- **patch** (v2.0.0 → v2.0.1): Bug fixes
  - Typo fixes
  - Clarifications
  - Small improvements
  - Documentation fixes

#### Example Changeset

Running `pnpm changeset` creates a file like `.changeset/fuzzy-pandas-dance.md`:

```markdown
---
"@intinig/claude.md": minor
---

Add new refactoring assessment agent

Added refactor-scan agent that helps developers assess whether refactoring
would add value and provides guidance on semantic vs structural similarity.
```

### 5. Commit Your Changes

```bash
git add .
git commit -m "feat: add refactoring assessment agent"
git push origin feature/your-feature-name
```

**Important**: Commit the changeset file (`.changeset/*.md`) with your changes!

### 6. Create a Pull Request

- Go to GitHub and create a PR from your branch to `main`
- Describe your changes
- Reference any related issues

---

## Release Process

### Automated Releases (via GitHub Actions)

Once your PR is merged to `main`:

1. **GitHub Action runs automatically**
   - Detects changesets in the merge
   - Creates or updates a "Version Packages" PR

2. **Maintainer reviews "Version Packages" PR**
   - Reviews version bump (major/minor/patch)
   - Reviews CHANGELOG.md updates
   - Merges when ready

3. **On merge, GitHub Action**:
   - Bumps version in package.json
   - Updates CHANGELOG.md
   - Creates git tag (e.g., `v2.1.0`)
   - Creates GitHub Release

### Manual Releases (for maintainers)

If needed, releases can be done manually:

```bash
# 1. Ensure all changesets are committed
git status

# 2. Bump versions and update CHANGELOG
pnpm changeset version

# 3. Review and commit changes
git add .
git commit -m "chore: version packages"

# 4. Create and push tag
git tag v2.1.0
git push origin main --tags

# 5. Create GitHub Release manually
```

---

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(agents): add refactor-scan agent
fix(install): handle existing files correctly
docs(readme): update installation instructions
chore(deps): update changesets to v2.27.1
```

---

## Testing Your Changes

### Test the Install Script Locally

```bash
# Test with different options
./install-claude.sh --help
./install-claude.sh --claude-only
./install-claude.sh --no-agents

# Test version pinning
./install-claude.sh --version v1.0.0
```

### Test CLAUDE.md Imports

After installing, test with Claude Code:
1. Open a project
2. Run `/memory` command
3. Verify imports load correctly

### Test Agents

Test agents by invoking them in Claude Code:
```
"Launch the tdd-guardian agent to verify TDD compliance"
```

---

## Style Guidelines

### CLAUDE.md Content

- **Clear structure**: Use consistent heading levels
- **Core principle first**: Start sections with core principle
- **Quick reference**: Provide scannable bullet points
- **Detailed docs**: Link to detailed documentation files
- **Examples**: Include both good and bad examples
- **Why, not just what**: Explain reasoning behind practices

### Code Examples

```typescript
// ❌ BAD - Show what NOT to do
const badExample = () => { ... };

// ✅ GOOD - Show the correct way
const goodExample = () => { ... };
```

### Writing Style

- **Be specific**: "Use 2-space indentation" not "Format code properly"
- **Be actionable**: Provide clear steps
- **Be concise**: Respect the reader's time
- **Be principled**: Explain the "why" behind practices

---

## Project Structure

```
.
├── claude/
│   └── .claude/
│       ├── CLAUDE.md          # Main file (156 lines)
│       ├── docs/              # Detailed documentation
│       │   ├── testing.md
│       │   ├── typescript.md
│       │   ├── code-style.md
│       │   ├── workflow.md
│       │   ├── examples.md
│       │   └── working-with-claude.md
│       └── agents/            # Claude Code agents
│           ├── tdd-guardian.md
│           ├── ts-enforcer.md
│           ├── refactor-scan.md
│           └── learn.md
├── install-claude.sh          # Installation script
├── package.json               # Version tracking
├── CHANGELOG.md              # Auto-generated by changesets
├── MIGRATION.md              # Version upgrade guides
└── .changeset/               # Changeset files
    ├── config.json
    └── README.md
```

---

## Questions or Issues?

- **Questions**: Open a [Discussion](https://github.com/intinig/claude.md/discussions)
- **Bugs**: Open an [Issue](https://github.com/intinig/claude.md/issues)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
