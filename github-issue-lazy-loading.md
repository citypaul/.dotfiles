# Feature Request: Lazy Loading for @ File References in CLAUDE.md

## Summary

Add support for lazy loading of `@` file references in CLAUDE.md files, so that referenced documentation is only loaded into context when relevant rather than consuming tokens upfront in every conversation.

## Current Behavior

When using `@` file references in CLAUDE.md:

```markdown
# CLAUDE.md
Core principles go here...

For detailed testing guidelines see @~/.claude/docs/testing.md
For TypeScript guidelines see @~/.claude/docs/typescript.md
```

**All referenced files are loaded into context immediately** at conversation start, even if they're never needed for the current task. This means:
- A modular CLAUDE.md structure (recommended in docs) consumes the same tokens as a monolithic file
- Large documentation sets (2000+ lines) are loaded for every conversation
- Token budget is consumed upfront regardless of relevance

## Use Case

Many users organize their development guidelines into modular files for maintainability:

```
~/.claude/
├── CLAUDE.md (core principles - 150 lines)
└── docs/
    ├── testing.md (270 lines)
    ├── typescript.md (305 lines)
    ├── code-style.md (370 lines)
    ├── workflow.md (671 lines)
    └── examples.md (278 lines)
```

**Current token cost**: ~2,100 lines loaded for every conversation

**Desired token cost**: ~150 lines (core) + relevant sections only when needed

## Proposed Solution

### Option 1: Explicit Lazy Loading Syntax

Introduce new syntax to distinguish between always-loaded and lazy-loaded references:

```markdown
# Always loaded (current behavior)
@~/.claude/docs/core-principles.md

# Lazy loaded when topic is relevant
@lazy:~/.claude/docs/testing.md
@lazy:~/.claude/docs/typescript.md
```

Claude would automatically detect when to load lazy references based on:
- Keywords in user messages ("write a test" → load testing.md)
- File types being edited (.ts files → load typescript.md)
- Explicit invocation ("load testing guidelines")

### Option 2: Smart Auto-Loading

Claude automatically analyzes conversation context and loads referenced files only when relevant:

```markdown
# CLAUDE.md
Core principles...

## Additional Resources
- Testing: @~/.claude/docs/testing.md
- TypeScript: @~/.claude/docs/typescript.md
```

Files would load when:
1. User explicitly requests them ("show me testing guidelines")
2. Claude detects relevant keywords in conversation
3. File types match (editing .ts file → load typescript.md)

### Option 3: Slash Command Integration

Allow @ references to automatically create corresponding slash commands:

```markdown
# CLAUDE.md with auto-generated commands
Testing guidelines: @~/.claude/docs/testing.md → creates /testing command
TypeScript rules: @~/.claude/docs/typescript.md → creates /typescript command
```

Users invoke content on-demand with `/testing`, `/typescript`, etc.

## Related Issues

- #2571 - Subdirectory CLAUDE.md files not loading (intended lazy loading feature is broken)
- #1041 - @file imports failing in global ~/.claude/CLAUDE.md
- #722 - CLAUDE.md discovery documentation inconsistencies

## Benefits

1. **Reduced token consumption**: Only load relevant documentation
2. **Faster response times**: Smaller initial context window
3. **Better scalability**: Support larger documentation sets without hitting limits
4. **Maintains modularity**: Keep organizational benefits without token penalty
5. **Backward compatible**: Existing @ references continue working with immediate loading

## Workaround (Current)

The only current workaround is converting documentation to custom slash commands in `~/.claude/commands/`, which provides true lazy loading but requires:
- Manual invocation (lose automatic context)
- Frontmatter for each file
- User remembering to invoke relevant commands

This is suboptimal compared to Claude intelligently loading referenced documentation when needed.

## Expected Behavior

```
User: "Help me write a test for the payment processor"
→ Claude detects "test" keyword
→ Automatically loads @~/.claude/docs/testing.md (if using Option 1/2)
→ Or suggests: "I can load testing guidelines with /testing" (if using Option 3)
→ Applies testing principles to the task

User: "Fix this TypeScript error"
→ Claude detects .ts context + "TypeScript" keyword
→ Automatically loads @~/.claude/docs/typescript.md
→ Applies TypeScript guidelines to the fix
```

## Priority

**Medium-High** - This directly impacts:
- Token efficiency for users with comprehensive documentation
- Ability to maintain modular, well-organized guidelines
- Cost optimization (fewer tokens per conversation)
- User experience (faster responses with smaller context windows)

The current "all or nothing" loading forces users to choose between:
1. Comprehensive guidelines (high token cost)
2. Minimal guidelines (missing critical context)

Lazy loading enables both comprehensive AND efficient documentation.
