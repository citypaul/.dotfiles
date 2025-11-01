# Claude Code Development Agents

This directory contains custom sub-agents for Claude Code that enforce development best practices as defined in the project's CLAUDE.md guidelines.

## What are Sub-Agents?

Sub-agents are specialized workers that run in their own isolated context windows, separate from your main conversation with Claude. Unlike slash commands that inject prompts into your main thread, sub-agents:

- Operate independently with their own context
- Have access to specific tools (Read, Edit, Grep, Bash, etc.)
- Can perform complex analysis without cluttering your main conversation
- Return distilled results and recommendations

## Installation

These agents are automatically installed when you run the dotfiles installation script:

```bash
cd ~/.dotfiles
./install.sh
```

The `stow` command will symlink these files to `~/.claude/agents/`, making them available in Claude Code.

## Available Agents

### `tdd-guardian` - TDD Compliance Enforcer

**Purpose**: Enforces strict Test-Driven Development principles.

**When to invoke**:
- After writing code to verify TDD compliance
- Before committing to catch test-first violations
- When reviewing code to ensure behavior-driven testing
- To validate 100% behavior coverage

**What it checks**:
- ✅ Tests were written before production code
- ✅ Tests verify behavior (not implementation)
- ✅ All code paths have test coverage
- ✅ Tests use public APIs only
- ❌ Flags implementation-focused tests
- ❌ Catches missing edge case tests

**How to invoke**:
```
You: I just implemented a payment validation feature. Can you check TDD compliance?
Claude Code: [Launches tdd-guardian agent]
```

Or explicitly:
```
You: Launch the tdd-guardian agent to check my recent changes
```

**Sample output**:
- Lists all TDD violations with file locations
- Identifies implementation-focused tests
- Suggests missing test cases
- Provides actionable recommendations

---

### `ts-enforcer` - TypeScript Strict Mode Enforcer

**Purpose**: Validates TypeScript code against strict CLAUDE.md guidelines.

**When to invoke**:
- Before committing TypeScript changes
- After adding new types or schemas
- To catch type safety violations
- When refactoring to ensure immutability

**What it checks**:
- ❌ `any` types (must use `unknown` or specific types)
- ❌ Type assertions without justification
- ❌ `interface` keyword (must use `type`)
- ✅ Schema-first development (Zod schemas before types)
- ✅ Immutable data patterns
- ✅ Options objects over positional parameters
- ✅ Proper naming conventions

**How to invoke**:
```
You: I've added some new TypeScript code. Can you check for type safety violations?
Claude Code: [Launches ts-enforcer agent]
```

Or explicitly:
```
You: Launch the ts-enforcer agent on my recent TypeScript changes
```

**Sample output**:
- Critical violations (any types, missing schemas)
- High priority issues (mutations, poor structure)
- Style improvements (naming, parameter patterns)
- Compliance score with specific fixes

---

### `learn` - CLAUDE.md Learning Integrator

**Purpose**: Captures learnings and updates CLAUDE.md documentation.

**When to invoke**:
- After completing a complex feature
- After fixing a tricky bug
- When you discover a gotcha or edge case
- After learning something about the architecture

**What it does**:
- Prompts for valuable learnings from your work
- Suggests appropriate CLAUDE.md sections for updates
- Formats content to match existing style
- Prevents duplication of existing knowledge
- Generates well-structured documentation

**How to invoke**:
```
You: I just finished implementing OAuth integration and learned some important things. Can you help me document them?
Claude Code: [Launches learn agent]
```

Or explicitly:
```
You: Launch the learn agent to capture my learnings from this session
```

**Sample output**:
- Asks discovery questions about what you learned
- Reads current CLAUDE.md to check for duplicates
- Proposes formatted additions to CLAUDE.md
- Provides rationale for placement and structure

---

### `refactor-scan` - Refactoring Opportunity Scanner

**Purpose**: Identifies valuable refactoring opportunities after tests pass.

**When to invoke**:
- After achieving green tests (Red-Green-**Refactor**)
- Before committing to assess code quality
- When you suspect duplication or complexity
- To validate clean code principles

**What it analyzes**:
- 🎯 Knowledge duplication (DRY violations)
- 🎯 Semantic vs structural similarity
- 🎯 Complex nested conditionals
- 🎯 Magic numbers and unclear names
- 🎯 Immutability violations
- 🎯 Opportunities for pure function extraction

**What it doesn't recommend**:
- ❌ Refactoring code that's already clean
- ❌ Abstracting structurally similar but semantically different code
- ❌ Cosmetic changes without clear value

**How to invoke**:
```
You: My tests are passing, should I refactor anything?
Claude Code: [Launches refactor-scan agent]
```

Or explicitly:
```
You: Launch the refactor-scan agent to assess my code quality
```

**Sample output**:
- Critical refactoring needed (must fix)
- High value opportunities (should fix)
- Nice to have improvements (consider)
- Correctly separated code (keep as-is)
- Specific recommendations with code examples

---

## Agent Workflow Examples

### Complete TDD Cycle

```
1. You: I need to add discount calculation to orders
2. You: Can you verify I haven't written production code yet?
   Claude Code: [Launches tdd-guardian agent]
   [Verifies no production code exists yet]
3. You: [Writes failing test]
4. You: [Implements minimal code to pass test]
5. You: Check if my implementation follows TDD principles
   Claude Code: [Launches tdd-guardian agent]
   [Verifies test-first compliance]
6. You: Should I refactor anything?
   Claude Code: [Launches refactor-scan agent]
   [Suggests extracting discount constants]
7. You: [Refactors with tests still green]
8. You: Validate TypeScript compliance
   Claude Code: [Launches ts-enforcer agent]
   [Validates TypeScript compliance]
9. You: [Commits changes]
10. You: Help me document what I learned
    Claude Code: [Launches learn agent]
    [Captures learning about discount edge cases]
```

### Code Review Workflow

```
1. You: I've finished implementing the feature. Can you do a full review?
2. Claude Code: [Launches tdd-guardian agent]
   [Checks TDD compliance]
3. Claude Code: [Launches ts-enforcer agent]
   [Validates TypeScript standards]
4. Claude Code: [Launches refactor-scan agent]
   [Assesses code quality]
5. You: [Fixes any violations]
6. Claude Code: [Launches learn agent]
   [Documents key learnings]
```

### Quick Quality Check

```
You: Run all quality checks on my recent changes
Claude Code: [Launches agents in parallel]
- tdd-guardian
- ts-enforcer
- refactor-scan
```

## Integration with CLAUDE.md

These agents enforce the principles defined in CLAUDE.md:

- **TDD Guardian** → Enforces "TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE"
- **TS Enforcer** → Enforces TypeScript Guidelines and Strict Mode
- **Refactor Scan** → Implements the "assess refactoring after every green" requirement
- **Learn** → Implements "update CLAUDE.md with anything useful you wished you'd known at the start"

## Customization

To modify these agents:

1. Edit the markdown files in `~/.dotfiles/claude/.claude/agents/`
2. Changes take effect immediately (no restart needed)
3. Commit changes to your dotfiles repo
4. Use the `learn` agent to document any customizations

## Tips

**Use liberally**: These agents are designed to be invoked frequently
- `tdd-guardian` - After every feature implementation
- `ts-enforcer` - Before every commit
- `refactor-scan` - After every green test
- `learn` - After every significant learning

**Invoke multiple agents**: You can request multiple agents in one message:
```
You: Run TDD, TypeScript, and refactoring checks on my recent changes
Claude Code: [Launches tdd-guardian, ts-enforcer, and refactor-scan agents in parallel]
```

**Context-aware**: Agents automatically examine recent git changes, but you can also specify files:
```
You: Run TypeScript enforcement on src/payment/payment-processor.ts
```

## Troubleshooting

**Agent not found**:
- Verify installation: `ls -la ~/.claude/agents/`
- Re-run: `cd ~/.dotfiles && ./install.sh`
- Check symlinks: `ls -la ~/.claude/agents/`

**Agent not working as expected**:
- Check the markdown file has valid YAML frontmatter
- Verify the `name` and `description` fields are present
- Ensure the `tools` field lists valid tools (Read, Edit, Grep, Glob, Bash)
- Review agent output for error messages
- Use `/agents` command in Claude Code to see available agents

**Agent invocation tips**:
- Agents can be invoked implicitly: "Can you check my TDD compliance?"
- Or explicitly: "Launch the tdd-guardian agent"
- Claude will automatically select appropriate agents based on your request

## Contributing

To add new agents:

1. Create a new `.md` file in `claude/.claude/agents/`
2. Add YAML frontmatter with `name`, `description`, and optional `tools`/`model`
3. Write the agent's system prompt in markdown below the frontmatter
4. Test the agent thoroughly
5. Document it in this README
6. Use the `learn` agent to capture why the agent is valuable

Example agent structure:
```markdown
---
name: my-agent
description: When and why this agent should be invoked
tools: Read, Grep, Bash
model: sonnet
---

# Agent Name

You are [agent description]...
```

---

**Remember**: These agents are your development workflow allies. Invoke them frequently to maintain code quality and capture knowledge!
