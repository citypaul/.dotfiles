# Versioning & Distribution Strategy Analysis

**Status**: Deep analysis of how to version and distribute CLAUDE.md, agents, and dotfiles to open source consumers.

---

## The Fundamental Question

**We're not packaging code - we're distributing configuration and documentation. How do we version that?**

---

## What Are We Actually Distributing?

### Product 1: CLAUDE.md Guidelines
- **Type**: Markdown documentation / Claude Code configuration
- **Size**: Currently 1,818 lines (will be ~300 after split)
- **Consumers**: Developers using Claude Code or similar AI assistants
- **Update frequency**: Medium (improvements, new patterns, clarifications)
- **Breaking changes**: Possible (structure changes, philosophy shifts)

### Product 2: Claude Code Agents
- **Type**: Markdown files with YAML frontmatter
- **Size**: 4 agents, ~400-650 lines each
- **Consumers**: Claude Code users who want automated enforcement
- **Update frequency**: Medium (new checks, enhanced detection)
- **Breaking changes**: Possible (agent API changes, removal of agents)

### Product 3: Personal Dotfiles
- **Type**: Shell configs, git aliases, vim settings
- **Size**: Various configuration files
- **Consumers**: Niche audience interested in dotfiles
- **Update frequency**: Low (personal preferences)
- **Breaking changes**: Unlikely (personal configs don't need semver)

**Key insight**: We have **3 separate products with different versioning needs**.

---

## Current Consumption Methods

Based on our README:

```bash
# Method 1: Manual download - CLAUDE.md only
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/intinig/claude.md/main/claude/.claude/CLAUDE.md

# Method 2: Manual download - Full package (6 separate curl commands)
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/...
curl -o .claude/agents/tdd-guardian.md https://raw.githubusercontent.com/...
curl -o .claude/agents/ts-enforcer.md https://raw.githubusercontent.com/...
# ... repeat 3 more times

# Method 3: Fork and customize
# Users fork the repo, modify to taste, pull into their projects

# Method 4: Clone and stow (for dotfiles)
git clone https://github.com/intinig/claude.md.git ~/.dotfiles
cd ~/.dotfiles
./install.sh
```

### Problems with Current Approach

❌ **No versioning** - Users always get `main` branch (latest)
❌ **No changelog** - Can't see what changed between updates
❌ **Breaking changes** - Could break users unexpectedly
❌ **No way to pin** - Can't lock to a known-good version
❌ **Painful updates** - Multiple curl commands, easy to miss files
❌ **No migration guides** - When structure changes (like the split), users are lost

---

## What Makes a Breaking Change?

### For CLAUDE.md (Semantic Versioning)

**PATCH (v1.0.1)**
- ✅ Fixing typos
- ✅ Adding examples to existing sections
- ✅ Clarifying existing rules without changing them
- ✅ Formatting improvements

**MINOR (v1.1.0)**
- ⚠️ Adding new major section
- ⚠️ Adding new patterns/anti-patterns
- ⚠️ Expanding decision frameworks
- ⚠️ Adding new quality gates
- ⚠️ Non-breaking recommendations (e.g., "Consider X" → "Consider X or Y")

**MAJOR (v2.0.0)**
- 💥 Removing sections
- 💥 Changing file structure (e.g., splitting into imports)
- 💥 Reversing philosophy (e.g., "TDD mandatory" → "TDD optional")
- 💥 Changing core recommendations (e.g., "Use type" → "Use interface")
- 💥 Removing decision frameworks

### For Agents

**PATCH (v1.0.1)**
- ✅ Bug fixes in detection logic
- ✅ Improved error messages
- ✅ Documentation improvements

**MINOR (v1.1.0)**
- ⚠️ New agent added
- ⚠️ New checks added to existing agent
- ⚠️ Enhanced detection capabilities

**MAJOR (v2.0.0)**
- 💥 Removing an agent
- 💥 Changing agent YAML frontmatter format
- 💥 Changing how agents are invoked
- 💥 Requiring new dependencies

---

## Distribution Strategies Evaluated

### Option A: Git Tags + GitHub Releases (Simple)

**How it works:**
```bash
# Manual tagging
git tag v1.0.0
git push --tags

# Users download from tag
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/intinig/claude.md/v1.0.0/claude/.claude/CLAUDE.md
```

**Pros:**
✅ Simple, no build tools required
✅ Direct file access (no packaging)
✅ GitHub releases provide changelog UI
✅ Users can pin to specific versions

**Cons:**
❌ Manual changelog writing
❌ Easy to forget version bumps
❌ No automated semver checking
❌ Still requires multiple curl commands

**Verdict:** ⭐⭐⭐ Good foundation, but manual work is error-prone

---

### Option B: Changesets + GitHub Releases (Automated)

**How it works:**
```bash
# Developer flow
npm install -g @changesets/cli
npx changeset init

# When making a change
npx changeset
# Select: major/minor/patch
# Write summary

# Changesets bot creates PR with version bump + changelog
# Merge PR → GitHub Action creates release
```

**File structure:**
```json
// package.json (minimal)
{
  "name": "@paulhammond/claude-guidelines",
  "version": "1.0.0",
  "private": true
}

// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "linked": [],
  "access": "public",
  "baseBranch": "main"
}
```

**Pros:**
✅ Automated semver
✅ Automated changelog generation
✅ Forces thinking about breaking changes
✅ Great for collaboration
✅ Industry standard
✅ GitHub Action integration

**Cons:**
⚠️ Requires package.json (feels weird for config files)
⚠️ Still requires multiple curl commands for users
⚠️ Adds complexity to contribution flow

**Verdict:** ⭐⭐⭐⭐ Best for versioning, even if not publishing to npm

---

### Option C: npm Package (Over-engineered?)

**How it works:**
```bash
# Publish to npm
npm publish

# Users install
npx @paulhammond/claude-guidelines init
# → Downloads CLAUDE.md + agents to .claude/
```

**File structure:**
```
package/
├── package.json
├── bin/
│   └── init.js (CLI script)
├── templates/
│   ├── CLAUDE.md
│   ├── docs/
│   └── agents/
└── README.md
```

**Pros:**
✅ Familiar to JavaScript developers
✅ Easy installation (`npx` one-liner)
✅ Version management built-in
✅ Can include update checker
✅ Can customize during installation

**Cons:**
❌ Requires npm/node
❌ Weird to package config files
❌ Overkill for markdown files
❌ Excludes non-JS developers
❌ Build step complexity

**Verdict:** ⭐⭐ Too much complexity for the problem

---

### Option D: Shell Script Installer

**How it works:**
```bash
# One-liner installation
curl -fsSL https://install.claude.guide | bash

# Or with options
curl -fsSL https://install.claude.guide | bash -s -- --version=v2.0.0 --full
```

**Script capabilities:**
```bash
#!/bin/bash
# install-claude.sh

VERSION="${1:-latest}"
PACKAGES="${2:-guidelines,agents}"
INSTALL_DIR="${3:-.claude}"

# Fetch latest release if not specified
if [ "$VERSION" = "latest" ]; then
  VERSION=$(curl -s https://api.github.com/repos/intinig/claude.md/releases/latest | jq -r .tag_name)
fi

# Download files from release
BASE_URL="https://github.com/intinig/claude.md/releases/download/$VERSION"

if [[ $PACKAGES == *"guidelines"* ]]; then
  mkdir -p "$INSTALL_DIR/docs"
  curl -fsSL "$BASE_URL/CLAUDE.md" -o "$INSTALL_DIR/CLAUDE.md"
  # Download docs/ directory
  for doc in testing typescript code-style workflow examples working-with-claude; do
    curl -fsSL "$BASE_URL/docs/${doc}.md" -o "$INSTALL_DIR/docs/${doc}.md"
  done
fi

if [[ $PACKAGES == *"agents"* ]]; then
  mkdir -p "$INSTALL_DIR/agents"
  for agent in tdd-guardian ts-enforcer refactor-scan learn; do
    curl -fsSL "$BASE_URL/agents/${agent}.md" -o "$INSTALL_DIR/agents/${agent}.md"
  done
fi

echo "✅ Claude guidelines $VERSION installed to $INSTALL_DIR/"
```

**Pros:**
✅ No npm required
✅ Single command installation
✅ Version pinning supported
✅ Selective installation (guidelines only, or + agents)
✅ Familiar to dotfiles users
✅ Cross-platform (works on Mac, Linux, WSL)

**Cons:**
⚠️ Security concerns (curl | bash)
⚠️ Requires curl, jq
⚠️ Need to host script somewhere
⚠️ Still needs versioning system (can use Changesets)

**Verdict:** ⭐⭐⭐⭐ Great UX, pairs well with Changesets

---

### Option E: GitHub Template Repository

**How it works:**
- Make this repo a template
- Users click "Use this template"
- Get their own copy with full git history

**Pros:**
✅ Easy to start
✅ Full customization
✅ Users own their copy
✅ No installation needed

**Cons:**
❌ Hard to pull updates
❌ No version tracking
❌ Fork divergence over time
❌ Doesn't solve the versioning problem

**Verdict:** ⭐⭐ Complimentary, not a replacement

---

## Recommended Strategy: Hybrid Approach

**Combine Changesets (versioning) + Shell Installer (distribution)**

### Phase 1: Implement Versioning (Now)

**1. Add minimal package.json**
```json
{
  "name": "@paulhammond/claude-guidelines",
  "version": "0.0.0",
  "private": true,
  "description": "Development guidelines for AI-assisted programming",
  "repository": "github:intinig/claude.md",
  "author": "Paul Hammond",
  "license": "MIT"
}
```

**2. Initialize Changesets**
```bash
npm install -D @changesets/cli
npx changeset init
```

**3. Configure Changesets**
```json
// .changeset/config.json
{
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**4. Create GitHub Action**
```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Dependencies
        run: npm install

      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          version: npm run version
          publish: npm run release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

**5. Add scripts to package.json**
```json
{
  "scripts": {
    "version": "changeset version",
    "release": "node scripts/create-release.js"
  }
}
```

**6. Create release script**
```javascript
// scripts/create-release.js
const { execSync } = require('child_process');
const fs = require('fs');

const version = require('../package.json').version;

// Create GitHub release
execSync(`gh release create v${version} --generate-notes --title "v${version}"`, {
  stdio: 'inherit'
});

// Upload CLAUDE.md as release asset
execSync(`gh release upload v${version} claude/.claude/CLAUDE.md`, {
  stdio: 'inherit'
});

// Upload agents
const agents = ['tdd-guardian', 'ts-enforcer', 'refactor-scan', 'learn'];
agents.forEach(agent => {
  execSync(`gh release upload v${version} claude/.claude/agents/${agent}.md`, {
    stdio: 'inherit'
  });
});

// Upload docs directory as tarball
execSync(`tar -czf docs.tar.gz -C claude/.claude docs/`, { stdio: 'inherit' });
execSync(`gh release upload v${version} docs.tar.gz`, { stdio: 'inherit' });

console.log(`✅ Released v${version}`);
```

### Phase 2: Shell Installer (Later)

**Create `install-claude.sh` hosted at root:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
REPO="intinig/claude.md"
VERSION="${1:-latest}"
INSTALL_DIR="${CLAUDE_INSTALL_DIR:-.claude}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() { echo -e "${GREEN}ℹ${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }

# Check dependencies
command -v curl >/dev/null 2>&1 || { log_error "curl is required but not installed. Aborting."; exit 1; }

# Determine version
if [ "$VERSION" = "latest" ]; then
  log_info "Fetching latest release..."
  VERSION=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name":' | sed -E 's/.*"([^"]+)".*/\1/')
fi

log_info "Installing Claude guidelines $VERSION..."

# Create directory
mkdir -p "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR/docs"
mkdir -p "$INSTALL_DIR/agents"

# Base URL for release
BASE_URL="https://github.com/$REPO/releases/download/$VERSION"

# Download CLAUDE.md
log_info "Downloading CLAUDE.md..."
curl -fsSL "$BASE_URL/CLAUDE.md" -o "$INSTALL_DIR/CLAUDE.md" || {
  log_error "Failed to download CLAUDE.md"
  exit 1
}

# Download docs
log_info "Downloading documentation files..."
for doc in testing typescript code-style workflow examples working-with-claude; do
  curl -fsSL "$BASE_URL/docs/${doc}.md" -o "$INSTALL_DIR/docs/${doc}.md" 2>/dev/null || {
    log_warn "Could not download docs/${doc}.md (may not exist in this version)"
  }
done

# Download agents
log_info "Downloading agents..."
for agent in tdd-guardian ts-enforcer refactor-scan learn; do
  curl -fsSL "$BASE_URL/agents/${agent}.md" -o "$INSTALL_DIR/agents/${agent}.md" || {
    log_warn "Could not download agents/${agent}.md"
  }
done

log_success "Claude guidelines $VERSION installed to $INSTALL_DIR/"
log_info "Files installed:"
log_info "  - CLAUDE.md"
log_info "  - docs/*.md (6 files)"
log_info "  - agents/*.md (4 files)"
```

**Usage:**
```bash
# Latest version
curl -fsSL https://raw.githubusercontent.com/intinig/claude.md/main/install-claude.sh | bash

# Specific version
curl -fsSL https://raw.githubusercontent.com/intinig/claude.md/main/install-claude.sh | bash -s v2.0.0

# Custom directory
CLAUDE_INSTALL_DIR=.config/claude curl -fsSL https://raw.githubusercontent.com/.../install-claude.sh | bash
```

### Phase 3: Update README (After versioning works)

Add versioning section:

```markdown
## Installation

### Option 1: Quick Install (Recommended)

Install the latest version:

```bash
curl -fsSL https://raw.githubusercontent.com/intinig/claude.md/main/install-claude.sh | bash
```

Install a specific version:

```bash
curl -fsSL https://raw.githubusercontent.com/intinig/claude.md/main/install-claude.sh | bash -s v2.0.0
```

### Option 2: Manual Installation

Download specific version from [releases](https://github.com/intinig/claude.md/releases):

```bash
VERSION=v2.0.0

# Download CLAUDE.md
curl -o .claude/CLAUDE.md \
  https://github.com/intinig/claude.md/releases/download/$VERSION/CLAUDE.md

# Download agents
mkdir -p .claude/agents
for agent in tdd-guardian ts-enforcer refactor-scan learn; do
  curl -o .claude/agents/${agent}.md \
    https://github.com/intinig/claude.md/releases/download/$VERSION/agents/${agent}.md
done
```

### Option 3: Always Latest (Not Recommended for Production)

```bash
# Gets latest from main branch (no version pinning)
curl -o .claude/CLAUDE.md \
  https://raw.githubusercontent.com/intinig/claude.md/main/claude/.claude/CLAUDE.md
```

## Versioning

This project follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (v2.0.0): Breaking changes (file structure, removed sections, philosophy changes)
- **MINOR** (v1.1.0): New features (new sections, patterns, agents)
- **PATCH** (v1.0.1): Bug fixes, typos, clarifications

See [CHANGELOG.md](CHANGELOG.md) for release history.

### Upgrading

Check the [releases page](https://github.com/intinig/claude.md/releases) for:
- 📝 Changelog
- ⚠️ Breaking changes
- 📖 Migration guides
```

---

## Monorepo Consideration

Should we split into separate versioned packages?

```
packages/
├── claude-guidelines/  (CLAUDE.md + docs/)
├── claude-agents/      (agents/)
└── dotfiles/           (git, bash, vim, etc.)
```

**Each with their own package.json:**

```json
// packages/claude-guidelines/package.json
{
  "name": "@paulhammond/claude-guidelines",
  "version": "2.0.0"
}

// packages/claude-agents/package.json
{
  "name": "@paulhammond/claude-agents",
  "version": "1.5.0"
}
```

**Pros:**
✅ Independent versioning
✅ Users can install just what they need
✅ Breaking changes in one don't affect the other
✅ Clearer dependency management

**Cons:**
❌ More complexity
❌ Changesets monorepo configuration
❌ Multiple releases
❌ Need to coordinate versions

**Verdict:** ⭐⭐⭐ Nice to have, but not for v1.0. Start simple with single package, split later if needed.

---

## Implementation Timeline

### Milestone 1: Split CLAUDE.md (In Progress)
- ✅ Research import syntax
- ✅ Create split plan
- ⏳ Extract content to docs/
- ⏳ Update main CLAUDE.md with imports
- ⏳ Test with `/memory` command

### Milestone 2: Implement Versioning (Next)
- [ ] Add package.json
- [ ] Initialize Changesets
- [ ] Create GitHub Action
- [ ] Create release script
- [ ] Tag v1.0.0 (pre-split structure)

### Milestone 3: Release v2.0.0 (After split)
- [ ] Merge split CLAUDE.md PR
- [ ] Create changeset (major version)
- [ ] Merge version PR (Changesets bot)
- [ ] Verify v2.0.0 release created
- [ ] Update README with versioned downloads

### Milestone 4: Shell Installer (Future)
- [ ] Create install-claude.sh
- [ ] Test on Mac, Linux, WSL
- [ ] Add to README
- [ ] Consider custom domain (install.claude.guide)

---

## Decision

**Recommendation: Implement Changesets + GitHub Releases now, Shell installer later**

### Why This Approach?

1. **Right tool for the job**: Changesets is designed for versioning, even for non-npm packages
2. **Automation**: Reduces human error in changelog writing and semver
3. **Collaboration**: Makes contributing easier (changeset bot guides contributors)
4. **Professional**: Industry standard approach, inspires confidence
5. **Flexible**: Can add shell installer later without changing versioning
6. **Gradual adoption**: Users can use manual curl or installer script

### Why NOT npm package?

1. **Wrong abstraction**: We're not distributing code, we're distributing config
2. **Excludes users**: Not everyone has node/npm
3. **Over-engineered**: Build step for markdown files is overkill
4. **Maintenance**: More surface area for bugs and issues

### Next Steps

1. ✅ Finish SPLIT-CLAUDE-MD-PLAN implementation
2. ✅ Tag current state as v1.0.0 (before split)
3. ✅ Merge split PR with changeset (major bump)
4. ✅ Release v2.0.0 (split structure)
5. ⏳ Create shell installer (optional, future enhancement)

---

## Questions to Resolve

- ❓ Should we create a changelog for changes before v1.0.0? (Probably not, start fresh)
- ❓ Do we version dotfiles separately? (No, they're personal, not for open source consumers)
- ❓ Should README version links point to latest or encourage pinning? (Encourage pinning)
- ❓ Do we need a website/landing page? (Nice to have, but GitHub README is fine for now)

---

## References

- [Changesets Documentation](https://github.com/changesets/changesets)
- [Versioning Apps with Changesets](https://github.com/changesets/changesets/blob/main/docs/versioning-apps.md)
- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
