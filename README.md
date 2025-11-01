# Development Guidelines for AI-Assisted Programming

**Comprehensive CLAUDE.md guidelines + enforcement agents for Test-Driven Development, TypeScript strict mode, and functional programming.**

[![Watch me use my CLAUDE.md file to build a real feature](https://img.youtube.com/vi/rSoeh6K5Fqo/0.jpg)](https://www.youtube.com/watch?v=rSoeh6K5Fqo)

👆 [**Watch a real coding session**](https://www.youtube.com/watch?v=rSoeh6K5Fqo) showing how CLAUDE.md guides AI pair programming in Claude Code.

---

## Table of Contents

- [What This Is](#what-this-is)
- [CLAUDE.md: The Development Framework](#-claudemd-the-development-framework)
- [Claude Code Agents: Automated Enforcement](#-claude-code-agents-automated-enforcement)
- [How to Use This in Your Projects](#-how-to-use-this-in-your-projects)
- [Documentation](#-documentation)
- [Who This Is For](#-who-this-is-for)
- [Philosophy](#-philosophy)
- [Continuous Improvement](#-continuous-improvement)
- [Personal Dotfiles](#-personal-dotfiles-the-original-purpose)
- [Contributing](#-contributing)
- [Contact](#-contact)

---

## What This Is

**This is my personal dotfiles repository.** I use it to manage my shell configurations, git aliases, and development environment setup.

It became unexpectedly popular when I shared the [CLAUDE.md file](claude/.claude/CLAUDE.md) - development guidelines I wrote for AI-assisted programming. That's likely why you're here.

This repository now serves two purposes:

1. **[CLAUDE.md](claude/.claude/CLAUDE.md)** + **[Four enforcement agents](claude/.claude/agents/)** - Development guidelines and automated quality enforcement (what most visitors want)
2. **Personal dotfiles** - My shell configs, git aliases, and tool configurations (what this repo was originally for)

**Most people are here for CLAUDE.md and the agents.** This README focuses primarily on those, with [dotfiles coverage at the end](#-personal-dotfiles-the-original-purpose).

---

## 📘 CLAUDE.md: The Development Framework

[**→ Read the full CLAUDE.md file**](claude/.claude/CLAUDE.md)

CLAUDE.md is a **living document** that defines development principles, patterns, and anti-patterns. It transforms abstract concepts into actionable decision frameworks.

### Core Philosophy

- **TDD is non-negotiable** - Every line of production code must be test-driven
- **Behavior over implementation** - Tests verify what code does, not how it does it
- **Immutability by default** - Pure functions and immutable data structures
- **Schema-first with nuance** - Runtime validation at trust boundaries, types for internal logic
- **Semantic refactoring** - Abstract based on meaning, not structure
- **Explicit documentation** - Capture learnings while context is fresh

### What Makes It Different

Unlike typical style guides, CLAUDE.md provides:

- **Decision frameworks** - Concrete questions to answer before taking action
- **Priority classifications** - Objective severity levels (Critical/High/Nice/Skip)
- **Quality gates** - Verifiable checklists before commits
- **Anti-pattern catalogs** - Side-by-side good/bad examples
- **Git verification methods** - How to audit compliance retrospectively

### Key Sections

| Section | What It Provides |
|---------|-----------------|
| **Testing Principles** | Behavior-driven testing, 100% coverage strategy, factory patterns |
| **TypeScript Guidelines** | Schema-first decision framework, type vs interface clarity, immutability patterns |
| **TDD Process** | RED-GREEN-REFACTOR cycle, quality gates, anti-patterns, git verification |
| **Refactoring** | Priority classification, semantic vs structural framework, DRY decision tree |
| **Functional Programming** | Immutability violations catalog, pure functions, composition patterns |
| **Working with Claude** | Learning capture guidance, documentation templates, quality criteria |

### Schema-First Decision Framework Example

One of the most valuable additions - a 5-question framework for when schemas ARE vs AREN'T required:

```typescript
// ✅ Schema REQUIRED - Trust boundary (API response)
const UserSchema = z.object({ id: z.string().uuid(), email: z.string().email() });
const user = UserSchema.parse(apiResponse);

// ❌ Schema OPTIONAL - Pure internal type
type Point = { readonly x: number; readonly y: number };
```

Ask yourself:
1. Does data cross a trust boundary? → Schema required
2. Does type have validation rules? → Schema required
3. Is this a shared data contract? → Schema required
4. Used in test factories? → Schema required
5. Pure internal type? → Type is fine

---

## 🤖 Claude Code Agents: Automated Enforcement

[**→ Read the agents documentation**](claude/.claude/agents/README.md)

Four specialized sub-agents that run in isolated context windows to enforce CLAUDE.md principles:

### 1. `tdd-guardian` - TDD Compliance Enforcer

**Use proactively** when planning to write code, or **reactively** to verify TDD was followed.

**What it checks:**
- ✅ Tests were written before production code
- ✅ Tests verify behavior (not implementation)
- ✅ All code paths have test coverage
- ✅ Tests use public APIs only
- ❌ Flags implementation-focused tests
- ❌ Catches missing edge case tests

**Example invocation:**
```
You: "I just implemented payment validation. Can you check TDD compliance?"
Claude Code: [Launches tdd-guardian agent]
```

**Output:**
- Lists all TDD violations with file locations
- Identifies implementation-focused tests
- Suggests missing test cases
- Provides actionable recommendations

---

### 2. `ts-enforcer` - TypeScript Strict Mode Enforcer

**Use before commits** or **when adding new types/schemas**.

**What it checks:**
- ❌ `any` types (must use `unknown` or specific types)
- ❌ Type assertions without justification
- ❌ `interface` for data structures (use `type`)
- ✅ Schema-first development (schemas before types at trust boundaries)
- ✅ Immutable data patterns
- ✅ Options objects over positional parameters

**Includes the nuanced schema-first framework:**
- Schema required: Trust boundaries, validation rules, contracts, test factories
- Schema optional: Internal types, utilities, state machines, behavior contracts

**Example invocation:**
```
You: "I've added new TypeScript code. Check for type safety violations."
Claude Code: [Launches ts-enforcer agent]
```

**Output:**
- Critical violations (any types, missing schemas at boundaries)
- High priority issues (mutations, poor structure)
- Style improvements (naming, parameter patterns)
- Compliance score with specific fixes

---

### 3. `refactor-scan` - Refactoring Opportunity Scanner

**Use after achieving green tests** (the REFACTOR step in RED-GREEN-REFACTOR).

**What it analyzes:**
- 🎯 Knowledge duplication (DRY violations)
- 🎯 Semantic vs structural similarity
- 🎯 Complex nested conditionals
- 🎯 Magic numbers and unclear names
- 🎯 Immutability violations

**What it doesn't recommend:**
- ❌ Refactoring code that's already clean
- ❌ Abstracting structurally similar but semantically different code
- ❌ Cosmetic changes without clear value

**Example invocation:**
```
You: "My tests are passing, should I refactor anything?"
Claude Code: [Launches refactor-scan agent]
```

**Output:**
- 🔴 Critical refactoring needed (must fix)
- ⚠️ High value opportunities (should fix)
- 💡 Nice to have improvements (consider)
- ✅ Correctly separated code (keep as-is)
- Specific recommendations with code examples

---

### 4. `learn` - CLAUDE.md Learning Integrator

**Use proactively** when discovering gotchas, or **reactively** after completing complex features.

**What it captures:**
- Gotchas or unexpected behavior discovered
- "Aha!" moments or breakthroughs
- Architectural decisions being made
- Patterns that worked particularly well
- Anti-patterns encountered
- Tooling or setup knowledge gained

**Example invocation:**
```
You: "I just fixed a tricky timezone bug. Let me document this gotcha."
Claude Code: [Launches learn agent]
```

**Output:**
- Asks discovery questions about what you learned
- Reads current CLAUDE.md to check for duplicates
- Proposes formatted additions to CLAUDE.md
- Provides rationale for placement and structure

---

## 🚀 How to Use This in Your Projects

### Option 1: Use CLAUDE.md Only

The simplest approach - copy CLAUDE.md to your project:

```bash
# In your project root
mkdir -p .claude
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/CLAUDE.md
```

This gives Claude (or any AI assistant) context about your development practices.

### Option 2: Use CLAUDE.md + Agents (Recommended)

For full enforcement, install both CLAUDE.md and the agents:

```bash
# In your project root
mkdir -p .claude/agents

# Download CLAUDE.md
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/CLAUDE.md

# Download all agents
curl -o .claude/agents/tdd-guardian.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/tdd-guardian.md
curl -o .claude/agents/ts-enforcer.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/ts-enforcer.md
curl -o .claude/agents/refactor-scan.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/refactor-scan.md
curl -o .claude/agents/learn.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/learn.md

# Download agents README
curl -o .claude/agents/README.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/README.md
```

### Option 3: Fork and Customize

1. Fork this repository
2. Modify CLAUDE.md to match your team's preferences
3. Customize agents to enforce your specific rules
4. Commit to your fork
5. Pull into your projects

### Typical Workflow

1. **Start feature**: Plan with Claude, let tdd-guardian guide test-first approach
2. **Write tests**: Get RED (failing test)
3. **Implement**: Get GREEN (minimal code to pass)
4. **Refactor**: Run refactor-scan to assess opportunities
5. **Review**: Run ts-enforcer and tdd-guardian before commit
6. **Document**: Use learn agent to capture insights
7. **Commit**: Follow conventional commits format

### Agent Invocation Examples

Agents can be invoked implicitly (Claude detects when to use them) or explicitly:

**Implicit:**
```
"I just implemented payment processing. Can you verify I followed TDD?"
→ Claude automatically launches tdd-guardian
```

**Explicit:**
```
"Launch the refactor-scan agent to assess code quality"
→ Claude launches refactor-scan
```

**Multiple agents:**
```
"Run TDD, TypeScript, and refactoring checks on my recent changes"
→ Claude launches tdd-guardian, ts-enforcer, and refactor-scan in parallel
```

---

## 📚 Documentation

- **[CLAUDE.md](claude/.claude/CLAUDE.md)** - Complete development guidelines
- **[Agents README](claude/.claude/agents/README.md)** - Detailed agent documentation with examples
- **[Agent Definitions](claude/.claude/agents/)** - Individual agent configuration files

---

## 🎯 Who This Is For

- **Teams adopting TDD** - Automated enforcement prevents backsliding
- **TypeScript projects** - Nuanced schema-first guidance with decision frameworks
- **AI-assisted development** - Consistent quality with Claude Code or similar tools
- **Solo developers** - Institutional knowledge that doesn't rely on memory
- **Code reviewers** - Objective quality criteria and git verification methods

---

## 💡 Philosophy

This system is based on several key insights:

1. **AI needs explicit context** - Vague principles → inconsistent results. Decision frameworks → reliable outcomes.

2. **Quality gates prevent drift** - Automated checking catches violations before they become habits.

3. **Refactoring needs priority** - Not all improvements are equal. Critical/High/Nice/Skip classification prevents over-engineering.

4. **Semantic beats structural** - Abstract based on meaning (business concepts), not appearance (code structure).

5. **Document while fresh** - Capture learnings immediately, not during retrospectives when context is lost.

6. **Explicit "no refactoring"** - Saying "code is already clean" prevents the feeling that the refactor step was skipped.

---

## 🔄 Continuous Improvement

CLAUDE.md and the agents evolve based on real usage. The `learn` agent ensures valuable insights are captured and integrated:

- Gotchas discovered → Documented in CLAUDE.md
- Patterns that work → Added to examples
- Anti-patterns encountered → Added to warnings
- Architectural decisions → Preserved with rationale

This creates a **self-improving system** where each project session makes future sessions more effective.

---

## 📦 Personal Dotfiles (The Original Purpose)

While most visitors are here for CLAUDE.md, this repository's **original purpose** is managing my personal development environment. If you're interested in dotfiles, here's what's included and how to use them.

### Git Aliases

I have an extensive collection of git aliases that speed up common workflows. These are in `git/.gitconfig`.

**Most useful aliases:**

```bash
# Pretty log with graph
git lg          # One-line log with graph
git lga         # All branches log with graph
git lgp         # Log with patch (shows changes)

# Status and diff shortcuts
git st          # git status
git di          # git diff
git dc          # git diff --cached
git ds          # git diff --stat

# Commit shortcuts
git ci          # git commit
git ca          # git commit --amend
git cane        # git commit --amend --no-edit

# Branch management
git co          # git checkout
git cob         # git checkout -b (new branch)
git br          # git branch
git brd         # git branch -d (delete branch)

# Working with remotes
git pu          # git push
git puf         # git push --force-with-lease (safer force push)
git pl          # git pull
git plo         # git pull origin

# Stash shortcuts
git sl          # git stash list
git ss          # git stash save
git sp          # git stash pop

# Undo shortcuts
git undo        # Undo last commit (keeps changes)
git unstage     # Unstage files
git uncommit    # Undo commit and unstage

# Advanced workflows
git wip         # Quick "work in progress" commit
git unwip       # Undo WIP commit
git squash      # Interactive rebase to squash commits
```

**Installation:**

```bash
# Install just the git config
cd ~/.dotfiles
stow git

# Or manually copy specific aliases you want
cat git/.gitconfig >> ~/.gitconfig
```

### Shell Configuration

My shell setup (for bash/zsh) includes:

- **Prompt customization** - Git status in prompt
- **Useful functions** - Project navigation helpers
- **PATH management** - Tool directories
- **Environment variables** - Editor, pager, etc.

**Files:**
- `bash/.bashrc` - Bash configuration
- `bash/.bash_profile` - Bash login shell
- `zsh/.zshrc` - Zsh configuration (if you use zsh)

**Installation:**

```bash
cd ~/.dotfiles
stow bash  # or stow zsh
```

### Development Tools Configuration

Configuration files for various development tools:

- **`vim/.vimrc`** - Vim editor configuration
- **`tmux/.tmux.conf`** - Terminal multiplexer settings
- **`npm/.npmrc`** - npm configuration

### Installing Everything

To install all dotfiles:

```bash
# Clone the repository
git clone https://github.com/citypaul/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles

# Run the installation script
./install.sh

# This uses GNU Stow to create symlinks for all configurations
```

### Installing Specific Dotfiles

Only want certain configurations? Install them individually:

```bash
cd ~/.dotfiles

# Install just git config
stow git

# Install just bash config
stow bash

# Install vim config
stow vim

# Install multiple at once
stow git bash vim
```

### How Stow Works

This repository uses [GNU Stow](https://www.gnu.org/software/stow/) for dotfile management:

1. Each directory (`git/`, `bash/`, etc.) represents a "package"
2. Files inside mirror your home directory structure
3. `stow git` creates symlinks from `~/.gitconfig` → `~/.dotfiles/git/.gitconfig`
4. Changes to files in `~/.dotfiles` are instantly reflected
5. Uninstall with `stow -D git`

### Browsing the Dotfiles

Feel free to browse the repository and cherry-pick what's useful:

- **[git/.gitconfig](git/.gitconfig)** - Git aliases and configuration
- **[bash/.bashrc](bash/.bashrc)** - Bash shell configuration
- **[vim/.vimrc](vim/.vimrc)** - Vim editor setup

**Note:** These are my personal preferences. Review before installing - you may want to customize them for your workflow.

---

## 🤝 Contributing

This is a personal repository that became unexpectedly popular. Contributions are welcome, especially:

- **Improvements to CLAUDE.md** - Better decision frameworks, clearer examples
- **Agent enhancements** - New checks, better error messages
- **Documentation** - Clarifications, additional examples
- **Real-world feedback** - What worked? What didn't?

Please open issues or PRs on GitHub.

---

## 📞 Contact

**Paul Hammond**

- [LinkedIn](https://www.linkedin.com/in/paul-hammond-bb5b78251/) - Feel free to connect and discuss
- [GitHub Issues](https://github.com/citypaul/.dotfiles/issues) - Questions, suggestions, feedback

---

## 📄 License

This repository is open source and available for use. The CLAUDE.md file and agents are designed to be copied and customized for your projects.

---

## ⭐ If This Helped You

If you found CLAUDE.md or the agents valuable, consider:

- Starring this repo on GitHub
- Sharing it with your team
- Contributing improvements back
- Connecting on LinkedIn to share your experience

The more people who adopt these practices, the better the AI-assisted development ecosystem becomes for everyone.
