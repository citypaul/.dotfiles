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

1. **[CLAUDE.md](claude/.claude/CLAUDE.md)** + **[Skills](claude/.claude/skills/)** + **[Eight enforcement agents](claude/.claude/agents/)** - Development guidelines, auto-discovered patterns, and automated quality enforcement (what most visitors want)
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

| Section | What It Provides | Detailed Patterns |
|---------|-----------------|-------------------|
| **Testing Principles** | Behavior-driven testing, 100% coverage strategy, factory patterns | [→ skills/testing](claude/.claude/skills/testing/SKILL.md) |
| **TypeScript Guidelines** | Schema-first decision framework, type vs interface clarity, immutability patterns | [→ skills/typescript-strict](claude/.claude/skills/typescript-strict/SKILL.md) |
| **TDD Process** | RED-GREEN-REFACTOR cycle, quality gates, anti-patterns | [→ skills/tdd](claude/.claude/skills/tdd/SKILL.md) |
| **Refactoring** | Priority classification, semantic vs structural framework, DRY decision tree | [→ skills/refactoring](claude/.claude/skills/refactoring/SKILL.md) |
| **Functional Programming** | Immutability violations catalog, pure functions, composition patterns | [→ skills/functional](claude/.claude/skills/functional/SKILL.md) |
| **Working with Claude** | Learning capture guidance, documentation templates, quality criteria | [→ docs/working-with-claude.md](claude/.claude/docs/working-with-claude.md) |

---

## 📖 Skills & Documentation Guide

**v3.0 Architecture:** Skills are auto-discovered patterns loaded on-demand when relevant. This reduces always-loaded context from ~3000+ lines to ~120 lines.

### Quick Navigation by Problem

**"I'm struggling with..."** → **Go here:**

| Problem | Skill/Doc | Key Insight |
|---------|-----------|-------------|
| Tests that break when I refactor | [skills/testing](claude/.claude/skills/testing/SKILL.md) | Test behavior through public APIs, not implementation |
| Don't know when to use schemas vs types | [skills/typescript-strict](claude/.claude/skills/typescript-strict/SKILL.md) | 5-question decision framework |
| Code that "looks the same" - should I abstract it? | [skills/refactoring](claude/.claude/skills/refactoring/SKILL.md) | Semantic vs structural abstraction guide |
| Refactoring everything vs nothing | [skills/refactoring](claude/.claude/skills/refactoring/SKILL.md) | Priority classification (Critical/High/Nice/Skip) |
| Understanding what "DRY" really means | [skills/refactoring](claude/.claude/skills/refactoring/SKILL.md) | DRY = knowledge, not code structure |
| Accidental mutations breaking things | [skills/functional](claude/.claude/skills/functional/SKILL.md) | Complete immutability violations catalog |
| Writing code before tests | [skills/tdd](claude/.claude/skills/tdd/SKILL.md) | TDD quality gates + git verification |
| Losing context on complex features | [docs/working-with-claude.md](claude/.claude/docs/working-with-claude.md) | Learning capture framework (7 criteria) |

### How Skills Work

Skills are **auto-discovered** by Claude when relevant:
- Writing TypeScript? → `typescript-strict` skill loads automatically
- Running tests? → `testing` skill provides factory patterns
- After GREEN tests? → `refactoring` skill assesses opportunities

**No manual invocation needed** - Claude detects when skills apply.

---

### 🧪 Testing Principles → [testing.md](claude/.claude/docs/testing.md)

**Problem it solves:** Tests that break on every refactor, unclear what to test, low coverage despite many tests

**What's inside:**
- Behavior-driven testing principles with anti-patterns
- Factory function patterns for test data (no `let`/`beforeEach`)
- Achieving 100% coverage through business behavior (not implementation)
- React component testing strategies
- Validating test data with schemas

**Concrete example from the docs:**

```typescript
// ❌ BAD - Implementation-focused test (breaks on refactor)
it("should call validateAmount", () => {
  const spy = jest.spyOn(validator, 'validateAmount');
  processPayment(payment);
  expect(spy).toHaveBeenCalled(); // Will break if we rename or restructure
});

// ✅ GOOD - Behavior-focused test (refactor-safe)
it("should reject payments with negative amounts", () => {
  const payment = getMockPayment({ amount: -100 });
  const result = processPayment(payment);
  expect(result.success).toBe(false);
  expect(result.error.message).toBe("Invalid amount");
});
```

**Why this matters:** The first test will fail if you refactor `validateAmount` into a different structure. The second test only cares about behavior - refactor all you want, as long as negative amounts are rejected.

**Key insight:** A separate `payment-validator.ts` file gets 100% coverage without dedicated tests - it's fully tested through `payment-processor` behavior tests. No 1:1 file mapping needed.

---

### 🔷 TypeScript Guidelines → [typescript.md](claude/.claude/docs/typescript.md)

**Problem it solves:** Overusing schemas everywhere, or not using them when needed; confusion about `type` vs `interface`

**What's inside:**
- Strict mode requirements and tsconfig setup
- **Type vs interface distinction** (data vs behavior contracts)
- **5-question decision framework**: When schemas ARE vs AREN'T required
- Schema-first development with Zod
- Schema usage in tests (import from shared locations, never redefine)
- Branded types for type safety

**The 5-question framework from the docs:**

Ask these in order:
1. **Does data cross a trust boundary?** (external → internal) → ✅ Schema required
2. **Does type have validation rules?** (format, constraints) → ✅ Schema required
3. **Is this a shared data contract?** (between systems) → ✅ Schema required
4. **Used in test factories?** → ✅ Schema required (for validation)
5. **Pure internal type?** (utility, state, behavior) → ❌ Type is fine

**Concrete example from the docs:**

```typescript
// ❌ Schema NOT needed - pure internal type
type Point = { readonly x: number; readonly y: number };
type CartTotal = { subtotal: number; tax: number; total: number };

// ✅ Schema REQUIRED - API response (trust boundary + validation)
const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]),
});
const user = UserSchema.parse(apiResponse);
```

**Key insight:** Not all types need schemas. Use schemas at trust boundaries and for validation. For internal types and utilities, plain TypeScript types are sufficient.

**Critical rule:** Tests must import real schemas from shared locations, never redefine them. This prevents type drift between tests and production.

---

### 🔄 Development Workflow (TDD + Refactoring) → [workflow.md](claude/.claude/docs/workflow.md)

**Problem it solves:** Writing code before tests, refactoring too much/too little, not knowing when to abstract

**What's inside:**
- **TDD process with quality gates** (what to verify before each commit)
- **RED-GREEN-REFACTOR** cycle with complete examples
- **Refactoring priority classification** (Critical/High/Nice/Skip)
- **Semantic vs structural abstraction** (the most important refactoring rule)
- **Understanding DRY** - knowledge vs code duplication
- **4-question decision framework** for abstraction
- Git verification methods (audit TDD compliance retrospectively)
- Commit guidelines and PR standards

**The refactoring priority system from the docs:**

🔴 **Critical (Fix Now):** Immutability violations, semantic knowledge duplication, deep nesting (>3 levels)

⚠️ **High Value (Fix This Session):** Unclear names, magic numbers, long functions (>30 lines)

💡 **Nice to Have:** Minor improvements

✅ **Skip:** Code that's already clean, structural similarity without semantic relationship

**The semantic vs structural rule (THE BIG ONE):**

```typescript
// ❌ DO NOT ABSTRACT - Structural similarity, DIFFERENT semantics
const validatePaymentAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000; // Fraud rules
};

const validateTransferAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 10000; // Account type rules
};
// They'll evolve independently - abstracting couples unrelated business rules

// ✅ SAFE TO ABSTRACT - Same semantic meaning
const formatUserDisplayName = (first: string, last: string) => `${first} ${last}`.trim();
const formatCustomerDisplayName = (first: string, last: string) => `${first} ${last}`.trim();
const formatEmployeeDisplayName = (first: string, last: string) => `${first} ${last}`.trim();
// All represent "how we display person names" - same business concept

const formatPersonDisplayName = (first: string, last: string) => `${first} ${last}`.trim();
```

**Key insight:** "Duplicate code is far cheaper than the wrong abstraction." Only abstract code that shares the same **semantic meaning**, not just similar structure.

**DRY revelation:** DRY means "Don't Repeat Knowledge" not "Don't Repeat Code Structure". The shipping threshold example in the docs shows this perfectly.

---

### 🎨 Code Style (Functional Programming) → [code-style.md](claude/.claude/docs/code-style.md)

**Problem it solves:** Accidental mutations, nested conditionals, unclear code, when to use FP abstractions

**What's inside:**
- **Complete immutability violations catalog** (arrays, objects, nested structures)
- Functional programming patterns and when to use heavy FP abstractions
- Code structure principles (max 2 levels nesting)
- Self-documenting code patterns (no comments)
- Naming conventions (functions, types, constants, files)
- **Options objects pattern** (vs positional parameters)

**The immutability catalog from the docs:**

```typescript
// ❌ WRONG - Array mutations
items.push(newItem);        // → [...items, newItem]
items.pop();                // → items.slice(0, -1)
items[0] = updatedItem;     // → items.map((item, i) => i === 0 ? updatedItem : item)
items.sort();               // → [...items].sort()

// ❌ WRONG - Object mutations
user.name = "New Name";     // → { ...user, name: "New Name" }
delete user.email;          // → const { email, ...rest } = user; rest

// ❌ WRONG - Nested mutations
cart.items[0].quantity = 5; // → { ...cart, items: cart.items.map((item, i) => i === 0 ? { ...item, quantity: 5 } : item) }
```

**Options objects pattern:**

```typescript
// Avoid: Unclear at call site
const payment = createPayment(100, "GBP", "card_123", "cust_456", undefined, { orderId: "789" });

// Good: Self-documenting
const payment = createPayment({
  amount: 100,
  currency: "GBP",
  cardId: "card_123",
  customerId: "cust_456",
  metadata: { orderId: "789" },
});
```

**Key insight:** Immutability eliminates entire classes of bugs. The catalog provides the immutable alternative for every common mutation pattern.

---

### 🤝 Working with Claude → [working-with-claude.md](claude/.claude/docs/working-with-claude.md)

**Problem it solves:** Losing context after complex features, forgetting gotchas, unclear expectations

**What's inside:**
- Complete expectations checklist for Claude
- **Learning documentation framework** (7 criteria for what to document)
- Types of learnings to capture (gotchas, patterns, anti-patterns, decisions, edge cases)
- Documentation format templates
- "What do I wish I'd known at the start?" prompts

**The 7 criteria for documenting learnings:**

Document if ANY of these are true:
- ✅ Would save future developers >30 minutes
- ✅ Prevents a class of bugs or errors
- ✅ Reveals non-obvious behavior or constraints
- ✅ Captures architectural rationale or trade-offs
- ✅ Documents domain-specific knowledge
- ✅ Identifies effective patterns or anti-patterns
- ✅ Clarifies tool setup or configuration gotchas

**Documentation template from the docs:**

```markdown
#### Gotcha: [Descriptive Title]

**Context**: When this occurs
**Issue**: What goes wrong
**Solution**: How to handle it

```typescript
// ✅ CORRECT
const example = "correct approach";

// ❌ WRONG
const wrong = "incorrect approach";
```
```

**Key insight:** Capture learnings while context is fresh, not during retrospectives when details are lost. Ask "What do I wish I'd known at the start?" after every significant change.

---

### 📝 Example Patterns → [examples.md](claude/.claude/docs/examples.md)

**Problem it solves:** Need quick reference for common patterns and anti-patterns

**What's inside:**
- Error handling patterns (Result types, early returns)
- Testing behavior through public APIs (complete examples)
- Common anti-patterns to avoid (mutations, nested conditionals, large functions)
- Side-by-side good/bad comparisons

**Quick reference for copy-paste patterns** when you need them.

---

## 🎯 Why These Docs Are Different

Unlike typical style guides, these docs provide:

1. **Decision frameworks** - Concrete questions to answer before taking action (not vague principles)
2. **Priority classifications** - Objective severity levels to prevent over/under-engineering
3. **Anti-pattern catalogs** - Side-by-side good/bad examples showing exactly what to avoid
4. **Git verification methods** - How to audit compliance after the fact
5. **Quality gates** - Verifiable checklists before commits
6. **Problem-oriented** - Organized by the problems you face, not abstract concepts

**Most valuable insight across all docs:** Abstract based on **semantic meaning** (what code represents), not **structural similarity** (what code looks like). This single principle prevents most bad abstractions.

---

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

Seven specialized sub-agents that run in isolated context windows to enforce CLAUDE.md principles and manage development workflow:

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

### 4. `docs-guardian` - Documentation Quality Guardian

**Use proactively** when creating documentation or **reactively** to review and improve existing docs.

**What it ensures:**
- ✅ Value-first approach (why before how)
- ✅ Scannable structure (visual hierarchy, clear headings)
- ✅ Progressive disclosure (quick start before deep dive)
- ✅ Problem-oriented navigation (organized by user problems)
- ✅ Concrete examples showing value (not just descriptions)
- ✅ Cross-references and multiple entry points
- ✅ Actionable next steps in every section

**What it checks:**
- ❌ Wall of text without visual breaks
- ❌ Feature lists without value demonstrations
- ❌ Installation-first (before showing what it does)
- ❌ Missing navigation aids
- ❌ Broken links or outdated information

**Example invocation:**
```
You: "I need to write a README for this feature."
Claude Code: [Launches docs-guardian agent]

You: "Can you review the documentation I just wrote?"
Claude Code: [Launches docs-guardian agent]
```

**Output:**
- Assessment against 7 pillars of world-class documentation
- Critical issues (must fix) vs nice-to-haves
- Specific improvement recommendations with examples
- Proposed restructuring for better discoverability
- Templates for common documentation types (README, guides, API docs)

---

### 5. `learn` - CLAUDE.md Learning Integrator

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

### 6. `wip-guardian` - Work In Progress Guardian

**Use proactively** when starting significant multi-step work, or **reactively** to update progress and handle blockers.

**What it manages:**
- Creates and maintains living `WIP.md` plan document
- Tracks current progress, next steps, and blockers
- Enforces small PRs, incremental work, tests always passing
- Orchestrates all other agents at appropriate times
- Updates plan as learning occurs
- **Deletes `WIP.md` when work completes** (ephemeral, not permanent)

**Example invocation:**
```
You: "I need to implement OAuth with JWT tokens and refresh logic"
Claude Code: [Launches wip-guardian agent to create living plan]

You: "Tests are passing now"
Claude Code: [Launches wip-guardian to update progress and identify next step]
```

**Output:**
- Living `WIP.md` document with current state and plan
- Agent checkpoint tracking (which agents to invoke when)
- Session logs for context across work sessions
- Blocker tracking and workarounds
- Completion verification and WIP deletion

**Key distinction:** Creates TEMPORARY short-term memory (deleted when done), NOT permanent docs.

---

### 7. `adr` - Architecture Decision Records

**Use proactively** when making significant architectural decisions, or **reactively** to document decisions already made.

**What it documents:**
- Significant architectural choices with trade-offs
- Technology/library selections with long-term impact
- Pattern decisions affecting multiple modules
- Performance vs maintainability trade-offs
- Security architecture decisions

**When to use:**
- ✅ Evaluated multiple alternatives with trade-offs
- ✅ One-way door decisions (hard to reverse)
- ✅ Foundational choices affecting future architecture
- ❌ Trivial implementation choices
- ❌ Temporary workarounds
- ❌ Standard patterns already in CLAUDE.md

**Example invocation:**
```
You: "Should we use BullMQ or AWS SQS for our job queue?"
Claude Code: [Launches adr agent to help evaluate and document]

You: "I decided to use PostgreSQL over MongoDB"
Claude Code: [Launches adr agent to document the rationale]
```

**Output:**
- Structured ADR in `docs/adr/` with context and alternatives
- Honest assessment of pros/cons and trade-offs
- Clear rationale for decision
- Consequences (positive, negative, neutral)
- Updated ADR index

**Key distinction:** Documents WHY architecture chosen (permanent), vs learn agent's HOW to work with it (gotchas, patterns).

---

## 🚀 How to Use This in Your Projects

**Quick navigation by situation:**

| Your Situation | Recommended Option |
|----------------|-------------------|
| "I want this on all my personal projects" | [Option 1: Global Install](#option-1-install-to-claude-global-personal-config--recommended) |
| "I'm setting this up for my team" | [Option 2: Project-specific install](#option-2-use-claudemd--agents-recommended-for-projects) |
| "I just want to try the guidelines first" | [Option 3: CLAUDE.md only](#option-3-use-claudemd-only-minimal) |
| "I need to customize for my team's standards" | [Option 4: Fork and customize](#option-4-fork-and-customize-advanced) |

---

### How the Workflow Works (Regardless of Installation Method)

Once installed (via any option below), here's the typical development flow:

1. **Start feature**: Plan with Claude, let tdd-guardian guide test-first approach
2. **Write tests**: Get RED (failing test)
3. **Implement**: Get GREEN (minimal code to pass)
4. **Refactor**: Run refactor-scan to assess opportunities
5. **Review**: Run ts-enforcer and tdd-guardian before commit
6. **Document**: Use learn agent to capture insights, docs-guardian for user-facing docs
7. **Commit**: Follow conventional commits format

**Agent invocation examples:**

Agents can be invoked implicitly (Claude detects when to use them) or explicitly:

- **Implicit**: "I just implemented payment processing. Can you verify I followed TDD?" → Claude automatically launches tdd-guardian
- **Explicit**: "Launch the refactor-scan agent to assess code quality" → Claude launches refactor-scan
- **Multiple agents**: "Run TDD, TypeScript, and refactoring checks on my recent changes" → Claude launches all three in parallel

**Now choose your installation method:**

---

### Option 1: Install to ~/.claude/ (Global Personal Config) ⭐ RECOMMENDED

**Best for:** Individual developers who want consistent practices across all projects

**Why choose this:**
- ✅ One-time setup applies everywhere automatically
- ✅ No per-project configuration needed
- ✅ Works with Claude Code immediately
- ✅ Modular structure loads details on-demand
- ✅ Easy updates via git pull

**One-liner installation:**
```bash
curl -fsSL https://raw.githubusercontent.com/citypaul/.dotfiles/main/install-claude.sh | bash
```

**Or download and run:**
```bash
curl -fsSL https://raw.githubusercontent.com/citypaul/.dotfiles/main/install-claude.sh -o install-claude.sh
chmod +x install-claude.sh
./install-claude.sh
```

**Install options:**
```bash
./install-claude.sh                    # Install everything (CLAUDE.md + skills + commands + agents)
./install-claude.sh --claude-only      # Install only CLAUDE.md
./install-claude.sh --skills-only      # Install only skills
./install-claude.sh --no-agents        # Install without agents
./install-claude.sh --version v2.0.0   # Install v2.0.0 (modular docs)
./install-claude.sh --version v1.0.0   # Install v1.0.0 (single file)
```

**What gets installed (v3.0.0+):**
- ✅ `~/.claude/CLAUDE.md` (~120 lines - lean core principles)
- ✅ `~/.claude/skills/` (5 auto-discovered patterns: tdd, typescript-strict, functional, refactoring, testing)
- ✅ `~/.claude/commands/` (1 slash command: /pr)
- ✅ `~/.claude/docs/` (2 reference files: examples, working-with-claude)
- ✅ `~/.claude/agents/` (8 automated enforcement agents)

---

### Option 2: Use CLAUDE.md + Agents (Recommended for Projects)

**Best for:** Team projects where you want full control and project-specific configuration

**Why choose this:**
- ✅ Full enforcement in a specific project
- ✅ Team can collaborate on customizations
- ✅ Version control with your project
- ✅ Works without global installation

For full enforcement in a specific project, install both CLAUDE.md and the agents:

```bash
# In your project root
mkdir -p .claude/agents

# Download CLAUDE.md
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/CLAUDE.md

# Download all agents
curl -o .claude/agents/tdd-guardian.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/tdd-guardian.md
curl -o .claude/agents/ts-enforcer.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/ts-enforcer.md
curl -o .claude/agents/refactor-scan.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/refactor-scan.md
curl -o .claude/agents/docs-guardian.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/docs-guardian.md
curl -o .claude/agents/learn.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/learn.md
curl -o .claude/agents/wip-guardian.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/wip-guardian.md
curl -o .claude/agents/adr.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/adr.md

# Download agents README
curl -o .claude/agents/README.md https://raw.githubusercontent.com/citypaul/.dotfiles/main/claude/.claude/agents/README.md
```

---

### Option 3: Use CLAUDE.md Only - Single File (v1.0.0)

**Best for:** Quick evaluation or when you want everything in one standalone file

**Why choose this:**
- ✅ Single command, one file (1,818 lines)
- ✅ All content included - examples, anti-patterns, decision frameworks
- ✅ Works standalone (no broken imports)
- ✅ No agent overhead
- ⚠️ **Tradeoff:** Larger file vs v2.0.0's modular structure (156 lines + separate docs)
- ⚠️ **Tradeoff:** Uses v1.0.0 structure (content identical to v2.0.0, just organized differently)

**Important:** This downloads the v1.0.0 monolithic version because the v2.0.0+ modular version has imports (`@~/.claude/docs/...`) that only work from `~/.claude/` location. If you just download the v2.0.0 main file, the imports won't resolve and you'll miss all the detailed examples.

Download the complete single-file version:

```bash
# In your project root
mkdir -p .claude
curl -o .claude/CLAUDE.md https://raw.githubusercontent.com/citypaul/.dotfiles/v1.0.0/claude/.claude/CLAUDE.md
```

This gives you the complete guidelines (1,818 lines) in a single standalone file.

---

### Option 4: Fork and Customize (Advanced)

**Best for:** Teams with specific standards who need full customization control

**Why choose this:**
- ✅ Complete control over guidelines and enforcement
- ✅ Customize for your team's specific tech stack
- ✅ Modify agent behavior to match your workflow
- ✅ Maintain team-specific patterns and anti-patterns

**How to customize:**

1. Fork this repository
2. Modify CLAUDE.md to match your team's preferences
3. Customize agents to enforce your specific rules
4. Commit to your fork
5. Pull into your projects

---

### Version Note: v1.0.0 vs v2.0.0 vs v3.0.0+

**Current version (v3.0.0+):** Skills-based architecture with lean CLAUDE.md (~120 lines) + 5 auto-discovered skills + 1 slash command

**Previous version (v2.0.0):** Modular structure with main file (156 lines) + 6 detailed docs loaded via @imports (~3000+ lines total)

**Legacy version (v1.0.0):** Single monolithic file (1,818 lines, all-in-one)

| Version | Architecture | Context Size | Best For |
|---------|--------------|--------------|----------|
| **v3.0.0+** | Skills (auto-discovered) | ~120 lines always | Context-efficient, Claude Code skills |
| **v2.0.0** | @docs/ imports | ~3000 lines always | Full docs always loaded |
| **v1.0.0** | Single file | ~1800 lines always | Standalone, no dependencies |

- **v3.0.0+ (current):** https://github.com/citypaul/.dotfiles/tree/main/claude/.claude
- **v2.0.0 modular docs:** https://github.com/citypaul/.dotfiles/tree/v2.0.0/claude/.claude
- **v1.0.0 single file:** https://github.com/citypaul/.dotfiles/blob/v1.0.0/claude/.claude/CLAUDE.md

The installation script installs v3.0.0+ by default. Use `--version v2.0.0` or `--version v1.0.0` for older versions.

---

## 📚 Documentation

- **[CLAUDE.md](claude/.claude/CLAUDE.md)** - Core development principles (~120 lines)
- **[Skills](claude/.claude/skills/)** - Auto-discovered patterns (5 skills)
- **[Commands](claude/.claude/commands/)** - Slash commands (/pr)
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

### Claude Code Settings

The `claude/.claude/settings.json` file contains my personal Claude Code configuration including:

- [claude-powerline](https://github.com/Owloops/claude-powerline) - vim-style statusline with usage tracking and git integration
- [Official Anthropic plugins](https://github.com/anthropics/claude-code/tree/main/plugins) - feature-dev, frontend-design, hookify, learning-output-style, plugin-dev, security-guidance

### Installing Everything

**⚠️ Important:** This installs ALL personal dotfiles (git, shell, vim, etc.) **NOT just CLAUDE.md**

**⚠️ Requires:** [GNU Stow](https://www.gnu.org/software/stow/) must be installed first

For CLAUDE.md only (no stow needed), see [Option 3](#option-3-install-to-claude-global-personal-config) above.

To install all dotfiles including my personal configurations:

```bash
# Install GNU Stow first (if not already installed)
# macOS: brew install stow
# Ubuntu/Debian: sudo apt-get install stow
# Fedora: sudo dnf install stow

# Clone the repository
git clone https://github.com/citypaul/.dotfiles.git ~/.dotfiles
cd ~/.dotfiles

# Run the installation script
./install.sh

# This uses GNU Stow to create symlinks for all configurations
```

This will install:
- ✅ CLAUDE.md + 5 skills + 8 agents (development guidelines)
- ✅ Commands (/pr slash command)
- ✅ Claude Code settings.json (plugins, hooks, statusline)
- ✅ Git aliases and configuration
- ✅ Shell configuration (bash/zsh)
- ✅ Vim, tmux, npm configs
- ✅ All personal preferences

### Installing Specific Dotfiles

**⚠️ Requires:** GNU Stow (see installation commands above)

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

## 🙏 Acknowledgments

Special thanks to contributors who have shared their work:

- **[Kieran O'Hara](https://github.com/kieran-ohara)** - The `use-case-data-patterns` agent is adapted from [Kieran's dotfiles](https://github.com/kieran-ohara/dotfiles/blob/main/config/claude/agents/analyse-use-case-to-data-patterns.md). Thank you for creating and sharing this excellent agent specification.

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
