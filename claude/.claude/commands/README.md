# Claude Code Slash Commands

This directory contains custom slash commands for Claude Code that enforce development best practices as defined in the project's CLAUDE.md guidelines.

## Installation

These commands are automatically installed when you run the dotfiles installation script:

```bash
cd ~/.dotfiles
./install.sh
```

The `stow` command will symlink these files to `~/.claude/commands/`, making them available in Claude Code.

## Available Commands

### `/tdd-guardian` - TDD Compliance Enforcer

**Purpose**: Enforces strict Test-Driven Development principles.

**When to use**:
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

**Example usage**:
```
You: I just implemented a payment validation feature
Claude Code: /tdd-guardian
```

**Sample output**:
- Lists all TDD violations with file locations
- Identifies implementation-focused tests
- Suggests missing test cases
- Provides actionable recommendations

---

### `/ts-enforcer` - TypeScript Strict Mode Enforcer

**Purpose**: Validates TypeScript code against strict CLAUDE.md guidelines.

**When to use**:
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

**Example usage**:
```
You: I've added some new TypeScript code
Claude Code: /ts-enforcer
```

**Sample output**:
- Critical violations (any types, missing schemas)
- High priority issues (mutations, poor structure)
- Style improvements (naming, parameter patterns)
- Compliance score with specific fixes

---

### `/learn` - CLAUDE.md Learning Integrator

**Purpose**: Captures learnings and updates CLAUDE.md documentation.

**When to use**:
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

**Example usage**:
```
You: I just finished implementing OAuth integration and learned some important things
Claude Code: /learn
```

**Sample output**:
- Asks discovery questions about what you learned
- Reads current CLAUDE.md to check for duplicates
- Proposes formatted additions to CLAUDE.md
- Provides rationale for placement and structure

---

### `/refactor-scan` - Refactoring Opportunity Scanner

**Purpose**: Identifies valuable refactoring opportunities after tests pass.

**When to use**:
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

**Example usage**:
```
You: My tests are passing, should I refactor anything?
Claude Code: /refactor-scan
```

**Sample output**:
- Critical refactoring needed (must fix)
- High value opportunities (should fix)
- Nice to have improvements (consider)
- Correctly separated code (keep as-is)
- Specific recommendations with code examples

---

## Command Workflow Examples

### Complete TDD Cycle

```
1. You: I need to add discount calculation to orders
2. Claude Code: /tdd-guardian
   [Verifies no production code exists yet]
3. You: [Writes failing test]
4. You: [Implements minimal code to pass test]
5. Claude Code: /tdd-guardian
   [Verifies test-first compliance]
6. Claude Code: /refactor-scan
   [Suggests extracting discount constants]
7. You: [Refactors with tests still green]
8. Claude Code: /ts-enforcer
   [Validates TypeScript compliance]
9. You: [Commits changes]
10. Claude Code: /learn
    [Captures learning about discount edge cases]
```

### Code Review Workflow

```
1. You: I've finished implementing the feature
2. Claude Code: /tdd-guardian
   [Checks TDD compliance]
3. Claude Code: /ts-enforcer
   [Validates TypeScript standards]
4. Claude Code: /refactor-scan
   [Assesses code quality]
5. You: [Fixes any violations]
6. Claude Code: /learn
   [Documents key learnings]
```

### Quick Quality Check

```
You: Quick quality check on my recent changes
Claude Code: [Runs all checks in sequence]
/tdd-guardian
/ts-enforcer
/refactor-scan
```

## Integration with CLAUDE.md

These commands enforce the principles defined in CLAUDE.md:

- **TDD Guardian** → Enforces "TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE"
- **TS Enforcer** → Enforces TypeScript Guidelines and Strict Mode
- **Refactor Scan** → Implements the "assess refactoring after every green" requirement
- **Learn** → Implements "update CLAUDE.md with anything useful you wished you'd known at the start"

## Customization

To modify these commands:

1. Edit the markdown files in `~/.dotfiles/claude/.claude/commands/`
2. Changes take effect immediately (no restart needed)
3. Commit changes to your dotfiles repo
4. Use `/learn` to document any customizations

## Tips

**Use liberally**: These commands are designed to be run frequently
- `/tdd-guardian` - After every feature implementation
- `/ts-enforcer` - Before every commit
- `/refactor-scan` - After every green test
- `/learn` - After every significant learning

**Combine commands**: You can invoke multiple commands in one message:
```
Run /tdd-guardian and /ts-enforcer on my recent changes
```

**Context-aware**: Commands automatically examine recent git changes, but you can also specify files:
```
Run /ts-enforcer on src/payment/payment-processor.ts
```

## Troubleshooting

**Command not found**:
- Verify installation: `ls -la ~/.claude/commands/`
- Re-run: `cd ~/.dotfiles && ./install.sh`
- Check symlinks: `ls -la ~/.claude/commands/`

**Command not working as expected**:
- Check the markdown file syntax
- Ensure Claude Code has access to necessary tools (Grep, Read, Glob, Bash)
- Review command output for error messages

## Contributing

To add new commands:

1. Create a new `.md` file in `claude/.claude/commands/`
2. Follow the existing format (clear purpose, process, examples)
3. Test the command thoroughly
4. Document it in this README
5. Use `/learn` to capture why the command is valuable

---

**Remember**: These commands are your development workflow allies. Use them frequently to maintain code quality and capture knowledge!
