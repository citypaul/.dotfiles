# TDD & Development Best Practices - Harvested Skills Collection

**Source**: [citypaul/.dotfiles](https://github.com/citypaul/.dotfiles)
**Harvested**: 2025-11-17
**Version**: 1.0.0

A comprehensive collection of Test-Driven Development tools, agents, and guidelines harvested from Paul Hammond's excellent dotfiles repository and enhanced with tools specifically designed for integrating TDD into existing projects.

## 📦 What's Included

This collection contains **7 harvested agents**, **1 new TDD enforcement agent**, **1 TDD reference skill**, **4 slash commands**, **1 TypeScript library**, **7 documentation files**, and **4 code templates** - everything you need to implement strict TDD practices in any project.

### 🤖 Agents (8 total)

#### Harvested from citypaul/.dotfiles

1. **tdd-guardian** [`agents/tdd-guardian.md`]
   - **Category**: testing/tdd
   - **Purpose**: Proactive TDD coaching and reactive compliance verification
   - **When to use**: During any coding session to ensure TDD compliance
   - **Tags**: tdd, testing, red-green-refactor, behavior-testing

2. **ts-enforcer** [`agents/ts-enforcer.md`]
   - **Category**: code-quality/typescript
   - **Purpose**: TypeScript strict mode enforcement and schema-first development
   - **When to use**: When writing TypeScript code or reviewing for type safety
   - **Tags**: typescript, type-safety, schema-first, zod, immutability

3. **learn** [`agents/learn.md`]
   - **Category**: documentation/knowledge-capture
   - **Purpose**: Capture learnings and gotchas into CLAUDE.md while context is fresh
   - **When to use**: After discoveries, complex bugs, or feature completion
   - **Tags**: learning, documentation, gotchas, knowledge-management

4. **refactor-scan** [`agents/refactor-scan.md`]
   - **Category**: code-quality/refactoring
   - **Purpose**: Assess refactoring opportunities (TDD's third step)
   - **When to use**: After tests pass (GREEN phase) or when reviewing code quality
   - **Tags**: refactoring, code-quality, semantic-analysis, dry-principle

5. **docs-guardian** [`agents/docs-guardian.md`]
   - **Category**: documentation/architecture
   - **Purpose**: Create world-class documentation following 7-pillar framework
   - **When to use**: When creating/updating README, API docs, or guides
   - **Tags**: documentation, readme, api-docs, guides

6. **adr** [`agents/adr.md`]
   - **Category**: documentation/architecture
   - **Purpose**: Document Architecture Decision Records for significant choices
   - **When to use**: When making architectural decisions with trade-offs
   - **Tags**: adr, architecture, decision-records, documentation

7. **wip-guardian** [`agents/wip-guardian.md`]
   - **Category**: workflow/project-management
   - **Purpose**: Maintain living WIP.md for complex multi-step features
   - **When to use**: Starting significant work requiring multiple PRs/days
   - **Tags**: wip, planning, orchestration, progress-tracking

#### New Tools (Created for This Collection)

8. **tdd-enforcer** [`agents/tdd-enforcer.md`] ⭐ NEW
   - **Category**: testing/tdd
   - **Purpose**: TDD enforcement for EXISTING PROJECTS with state tracking
   - **When to use**: Integrating TDD into legacy codebases incrementally
   - **Tags**: tdd, existing-projects, legacy-code, characterization-tests, workflow-state
   - **Features**:
     - Workflow state tracking across sessions (.tdd-state.json)
     - Multi-language support (TypeScript, JavaScript, Python, Go)
     - Characterization test patterns for legacy code
     - Git history validation
     - Incremental adoption strategy

### 🎯 Skills (1 total)

1. **tdd-reference** [`skills/tdd-reference.md`] ⭐ NEW
   - **Category**: testing/tdd
   - **Purpose**: On-demand TDD guideline access without context bloat
   - **When to use**: Quick reference during TDD cycles
   - **Tags**: tdd, guidelines, reference, on-demand
   - **Features**:
     - Indexed guideline sections
     - Quick reference cards for RED/GREEN/REFACTOR
     - Targeted retrieval (80% value, 20% context)

### ⚡ Slash Commands (4 total) ⭐ NEW

1. **tdd-init** [`commands/tdd-init.md`]
   - Initialize TDD workflow in existing project
   - Detects project type and test framework
   - Creates .tdd-state.json and pre-commit hooks
   - Generates integration assessment

2. **tdd-red** [`commands/tdd-red.md`]
   - Start RED phase (write failing test)
   - Blocks production code until test fails
   - Guides behavior-focused test creation

3. **tdd-green** [`commands/tdd-green.md`]
   - Start GREEN phase (minimal implementation)
   - Ensures test was failing first
   - Challenges over-implementation

4. **tdd-refactor** [`commands/tdd-refactor.md`]
   - Start REFACTOR phase (assess improvements)
   - Priority classification (Critical/High/Nice/Skip)
   - Validates tests stay green throughout

### 📚 Documentation (7 files)

1. **CLAUDE.md** [`docs/CLAUDE.md`]
   - Core development philosophy and quick reference
   - Modular structure with deep-dive doc references

2. **testing.md** [`docs/testing.md`]
   - Behavior-driven testing principles
   - Test data patterns and factory functions
   - 100% coverage through business behavior

3. **typescript.md** [`docs/typescript.md`]
   - Strict mode requirements
   - Schema-first development with Zod
   - Type vs interface distinction

4. **code-style.md** [`docs/code-style.md`]
   - Functional programming patterns
   - Immutability violations catalog
   - No comments philosophy

5. **workflow.md** [`docs/workflow.md`]
   - RED-GREEN-REFACTOR cycle details
   - Refactoring priority classification
   - Semantic vs structural abstraction

6. **working-with-claude.md** [`docs/working-with-claude.md`]
   - Expectations and communication guidelines
   - Learning documentation framework

7. **examples.md** [`docs/examples.md`]
   - Error handling patterns (Result types)
   - Testing behavior through public APIs
   - Common anti-patterns to avoid

### 🔧 Libraries (1 file) ⭐ NEW

1. **tdd-tracker.ts** [`lib/tdd-tracker.ts`]
   - TypeScript library for TDD workflow state management
   - Phase transition enforcement
   - Metrics tracking and reporting
   - Multi-language test execution

### 📋 Templates (4 files) ⭐ NEW

1. **zod-schema.ts** [`templates/zod-schema.ts`]
   - Schema-first development pattern
   - Type inference from schemas
   - Runtime boundary validation

2. **test-factory.ts** [`templates/test-factory.ts`]
   - Factory functions with Partial<T> overrides
   - Schema validation in test data
   - Nested object composition

3. **result-type.ts** [`templates/result-type.ts`]
   - Type-safe error handling
   - Discriminated unions
   - Chainable operations

4. **behavioral-test.ts** [`templates/behavioral-test.ts`]
   - Behavior-driven test examples
   - Public API testing patterns
   - React component testing

## 🚀 Quick Start

### For New Projects

```bash
# 1. Copy agents to your .claude directory
cp -r agents/* /path/to/your/project/.claude/agents/

# 2. Copy slash commands
cp -r commands/* /path/to/your/project/.claude/commands/

# 3. Copy documentation
cp -r docs/* /path/to/your/project/.claude/docs/

# 4. Initialize TDD workflow
# (In Claude Code) Run: /tdd-init
```

### For Existing Projects

```bash
# 1. Start with TDD enforcer for incremental adoption
cp agents/tdd-enforcer.md /path/to/your/project/.claude/agents/

# 2. Add slash commands for workflow
cp commands/tdd-*.md /path/to/your/project/.claude/commands/

# 3. Initialize with assessment
# (In Claude Code) Run: /tdd-init

# 4. Begin with strict TDD for new features only
# (In Claude Code) Run: /tdd-red
```

## 📖 Usage Patterns

### Complete TDD Cycle

```
1. /tdd-red     → Write failing test (RED phase)
2. /tdd-green   → Implement minimal code (GREEN phase)
3. /tdd-refactor → Assess improvements (REFACTOR phase)
4. Commit       → Complete cycle
5. Repeat       → Next feature
```

### Agent Orchestration (Complex Feature)

```
1. wip-guardian    → Create WIP.md plan
2. tdd-guardian    → Verify TDD compliance
3. ts-enforcer     → Check TypeScript quality
4. refactor-scan   → Assess refactoring
5. learn           → Capture insights
6. docs-guardian   → Update permanent docs
7. adr             → Document decisions (if significant)
```

## 🎯 Integration Strategies

### Three-Tier Model for Existing Projects

**Tier 1: Strict TDD (New Features)**
- Zero tolerance for TDD violations
- Full RED-GREEN-REFACTOR cycle
- 100% test coverage requirement

**Tier 2: Characterization Tests (Modifications)**
- Add tests capturing current behavior before changes
- Then modify with TDD
- Gradually improve test quality

**Tier 3: Opportunistic (Legacy Code)**
- Test when touching code
- Incremental coverage improvement
- Track metrics over time

### Enforcement Levels

**Critical (Block Commit)**
- Production code without failing test
- Tests failing in GREEN/REFACTOR phase
- Immutability violations

**High Priority (Should Fix)**
- Implementation-focused tests
- Missing edge case coverage
- Type safety violations

**Nice to Have (Consider)**
- Code style improvements
- Minor refactoring opportunities

## 📊 Metrics & Tracking

The TDD enforcer tracks:
- **TDD cycles completed**: Count of RED-GREEN-REFACTOR cycles
- **Violations caught**: Times workflow rules were enforced
- **Coverage improvement**: Test coverage delta
- **Average cycle time**: Time per TDD cycle
- **Refactoring rate**: % of cycles that included refactoring

Stored in:
- `.tdd-state.json` - Current workflow state
- `.tdd-metrics.jsonl` - Historical metrics
- `.tdd-violations.jsonl` - Violation log

## 🏗️ Directory Structure

```
harvested-skills/
├── README.md                    ← You are here
├── INTEGRATION-GUIDE.md         ← Comprehensive integration guide
├── agents/                      ← 8 agent files
│   ├── tdd-guardian.md          (harvested)
│   ├── ts-enforcer.md           (harvested)
│   ├── learn.md                 (harvested)
│   ├── refactor-scan.md         (harvested)
│   ├── docs-guardian.md         (harvested)
│   ├── adr.md                   (harvested)
│   ├── wip-guardian.md          (harvested)
│   └── tdd-enforcer.md          ⭐ NEW
├── skills/                      ← 1 skill file
│   └── tdd-reference.md         ⭐ NEW
├── commands/                    ← 4 slash commands
│   ├── tdd-init.md              ⭐ NEW
│   ├── tdd-red.md               ⭐ NEW
│   ├── tdd-green.md             ⭐ NEW
│   └── tdd-refactor.md          ⭐ NEW
├── lib/                         ← 1 TypeScript library
│   └── tdd-tracker.ts           ⭐ NEW
├── docs/                        ← 7 documentation files
│   ├── CLAUDE.md                (harvested)
│   ├── testing.md               (harvested)
│   ├── typescript.md            (harvested)
│   ├── code-style.md            (harvested)
│   ├── workflow.md              (harvested)
│   ├── working-with-claude.md   (harvested)
│   └── examples.md              (harvested)
└── templates/                   ← 4 code templates
    ├── zod-schema.ts            ⭐ NEW
    ├── test-factory.ts          ⭐ NEW
    ├── result-type.ts           ⭐ NEW
    └── behavioral-test.ts       ⭐ NEW
```

## 🎓 Key Principles

### TDD (Non-Negotiable)
- **RED**: Write failing test first (NO production code)
- **GREEN**: Write MINIMUM code to pass
- **REFACTOR**: Assess improvements (only if adds value)

### Test Quality
- Test **WHAT** the code should do (behavior)
- NOT **HOW** it does it (implementation)
- Test through public API only
- 100% coverage through business behavior

### TypeScript
- Strict mode always
- Schema-first at trust boundaries
- No `any` types - ever
- Immutable data structures

### Refactoring
- Semantic meaning > Structural similarity
- DRY = Don't repeat **knowledge**, not code
- Commit before refactoring
- External APIs stay unchanged

## 🔗 Related Resources

- **Source**: [citypaul/.dotfiles](https://github.com/citypaul/.dotfiles)
- **npm package**: [@paulhammond/dotfiles](https://www.npmjs.com/package/@paulhammond/dotfiles)
- **Claude Code Docs**: [docs.claude.com/claude-code](https://docs.claude.com/en/docs/claude-code)

## 📝 Attribution

This collection combines:
- **7 agents** harvested from Paul Hammond's excellent [.dotfiles repository](https://github.com/citypaul/.dotfiles)
- **7 documentation files** providing comprehensive TDD and TypeScript guidelines
- **5 NEW tools** (1 agent, 1 skill, 4 commands, 1 library) specifically designed for existing project integration
- **4 NEW templates** demonstrating key patterns

All original content © Paul Hammond. New tools created 2025-11-17 for this collection.

## 🚀 Next Steps

1. **Review** the [INTEGRATION-GUIDE.md](./INTEGRATION-GUIDE.md) for detailed implementation strategies
2. **Copy** agents and commands to your project's `.claude/` directory
3. **Initialize** TDD workflow with `/tdd-init`
4. **Start** your first TDD cycle with `/tdd-red`
5. **Track** progress with `.tdd-state.json` metrics

## 💡 Tips

- **Start small**: Begin with `/tdd-init` and one new feature
- **Use commands**: Slash commands guide you through each phase
- **Check state**: `.tdd-state.json` shows current TDD phase
- **Track metrics**: `.tdd-metrics.jsonl` shows improvement over time
- **Reference on-demand**: Use `tdd-reference` skill for quick guidance
- **Enforce gradually**: Start with new code, add characterization tests for legacy

---

**Remember**: TDD is a journey, not a destination. Progress > Perfection.

**Happy coding! 🎉**
