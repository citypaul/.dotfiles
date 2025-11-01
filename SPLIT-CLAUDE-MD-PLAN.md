# Plan: Split CLAUDE.md Into Modular Structure

**Goal**: Reduce CLAUDE.md file size from 1,818 lines to ~300 lines while preserving all detailed examples by leveraging Claude Code's import feature.

**Status**: Research complete, ready for implementation

---

## Research Findings

### Claude Code Import Syntax

Claude Code **officially supports importing other files** using the `@path/to/file.md` syntax. This was specifically designed to solve the problem of large CLAUDE.md files.

**Documentation source**: https://docs.claude.com/en/docs/claude-code/memory

**Key Features:**
- **Syntax**: `@path/to/file.md` or `@~/.claude/docs/filename.md`
- **Absolute paths**: Support home directory (`@~/.claude/my-file.md`) - **REQUIRED for dotfiles**
- **Relative paths**: Behavior from `~/.claude/` is undocumented - use absolute paths for safety
- **Recursion**: Up to 5 levels of nested imports
- **Protection**: Imports inside markdown code blocks are ignored (prevents false positives)
- **Verification**: Use `/memory` command to see what files are loaded
- **Max depth**: 5 hops of recursive imports

**IMPORTANT for dotfiles installation:**
When CLAUDE.md is installed to `~/.claude/` via dotfiles, **always use absolute paths** like `@~/.claude/docs/testing.md` instead of relative paths like `@docs/testing.md`. The official documentation explicitly shows `@~/.claude/...` syntax but doesn't document how relative paths resolve from `~/.claude/CLAUDE.md`.

**Example Usage:**
```markdown
# In project CLAUDE.md (can use relative paths)
See @README for project overview.
For testing guidelines, see @docs/testing.md

# In ~/.claude/CLAUDE.md (must use absolute paths)
For testing guidelines, see @~/.claude/docs/testing.md

# Individual Preferences (always use absolute paths)
@~/.claude/my-project-instructions.md
```

### Best Practices from Documentation

1. **Be specific**: "Use 2-space indentation" is better than "Format code properly"
2. **Use structure to organize**: Format as bullet points, group under descriptive headings
3. **Review periodically**: Update as project evolves
4. **Modularize**: Rather than keeping everything in a single file, reference additional files using `@path/to/import` syntax

---

## Current State

**File**: `claude/.claude/CLAUDE.md`
**Size**: 1,818 lines
**Sections**:
- Core Philosophy
- Quick Reference
- Testing Principles
- TypeScript Guidelines
- Code Style
- Development Workflow
- Working with Claude
- Example Patterns
- Common Patterns to Avoid
- Resources and References
- Summary

**Problem**: File is too large, consuming excessive context on every Claude Code session.

**User Feedback**: "One criticism my main claude.md file does receive is that it's quite large."

---

## Proposed Structure

Split into a main file (~300 lines) + detailed documentation files:

```
claude/.claude/
├── CLAUDE.md (main file ~300 lines)
│   ├── Core Philosophy (kept inline - non-negotiable)
│   ├── Quick Reference (kept inline - most-used)
│   ├── Brief section summaries
│   └── Import statements to detailed docs
│
└── docs/
    ├── testing.md          (~400 lines)
    │   ├── Behavior-Driven Testing
    │   ├── Testing Tools
    │   ├── Test Organization
    │   ├── Test Data Pattern (with full examples)
    │   └── Achieving 100% Coverage
    │
    ├── typescript.md       (~350 lines)
    │   ├── Strict Mode Requirements
    │   ├── Type Definitions
    │   ├── Schema-First Decision Framework
    │   ├── When Schemas Are Required vs Optional
    │   └── Schema Usage in Tests
    │
    ├── code-style.md       (~250 lines)
    │   ├── Functional Programming
    │   ├── Immutability Violations to Avoid
    │   ├── Code Structure
    │   ├── Naming Conventions
    │   ├── No Comments in Code
    │   └── Prefer Options Objects
    │
    ├── workflow.md         (~400 lines)
    │   ├── TDD Process (RED-GREEN-REFACTOR)
    │   ├── TDD Quality Gates
    │   ├── Anti-Patterns in Tests
    │   ├── Verifying TDD Compliance
    │   ├── TDD Example Workflow
    │   ├── Refactoring (The Critical Third Step)
    │   ├── Refactoring Priority Classification
    │   ├── Refactoring Guidelines
    │   ├── Understanding DRY
    │   ├── Semantic vs Structural Decision Framework
    │   ├── Commit Guidelines
    │   └── Pull Request Standards
    │
    ├── examples.md         (~300 lines)
    │   ├── Error Handling
    │   ├── Testing Behavior
    │   ├── React Component Testing
    │   ├── Common Patterns to Avoid
    │   └── All code examples from various sections
    │
    └── working-with-claude.md (~150 lines)
        ├── Expectations
        ├── Code Changes
        ├── Communication
        └── Learning Documentation Guidance
```

---

## Main CLAUDE.md Structure (New)

The new main file will use this pattern for each section:

```markdown
## [Section Name]

**Core principle**: [Key takeaway in 1-2 sentences]

**Quick reference**:
- [Most important point 1]
- [Most important point 2]
- [Most important point 3]

For comprehensive [topic] guidance including:
- [Detailed topic 1]
- [Detailed topic 2]
- [Detailed topic 3]

See @~/.claude/docs/[section-file].md
```

### Example: Testing Section

```markdown
## Testing Principles

**Core principle**: Test behavior, not implementation. 100% coverage through business behavior.

**Quick reference**:
- Write tests first (TDD non-negotiable)
- Test through public API exclusively
- Use factory functions for test data (no `let`/`beforeEach`)
- Tests must document expected business behavior

For comprehensive testing guidelines including:
- Behavior-driven testing principles and anti-patterns
- Test data patterns and factory functions with full examples
- Achieving 100% coverage through business behavior
- React component testing strategies
- Testing tools (Jest, Vitest, React Testing Library)

See @~/.claude/docs/testing.md
```

---

## Benefits

### For Users
✅ **Faster initial load** - Main file is ~300 lines instead of 1,818
✅ **Scannable overview** - Quick reference covers 90% of daily needs
✅ **On-demand details** - Claude loads full documentation when working on specific topics
✅ **Easier navigation** - Jump directly to relevant detailed documentation
✅ **Better mobile viewing** - Shorter main file is easier to read on GitHub mobile

### For Maintenance
✅ **Focused editing** - Update TypeScript rules without scrolling through testing examples
✅ **Logical organization** - Related content grouped in dedicated files
✅ **Easier contributions** - Contributors can focus on specific areas
✅ **Version control clarity** - Git diffs show which topic area changed
✅ **Reduced merge conflicts** - Changes to different topics won't conflict

### For Claude Code
✅ **Reduced context usage** - Only loads relevant details when needed
✅ **Better focus** - Doesn't need to process TDD examples when working on TypeScript issues
✅ **Hierarchical loading** - Main file always loaded, details loaded contextually
✅ **Works with dotfiles** - Files installed via Stow to `~/.dotfiles/claude/.claude/`

---

## Implementation Plan

### Phase 1: Extract Content (Preserve Everything)

**1. Create `docs/testing.md`**
- Extract "Testing Principles" section
- Include all subsections, examples, and code blocks
- Ensure nothing is lost or summarized

**2. Create `docs/typescript.md`**
- Extract "TypeScript Guidelines" section
- Include schema-first framework, decision trees, all examples
- Preserve type vs interface clarification

**3. Create `docs/code-style.md`**
- Extract "Code Style" section
- Include functional programming, immutability patterns
- Preserve all good/bad example pairs

**4. Create `docs/workflow.md`**
- Extract "Development Workflow" section
- Include TDD process, refactoring guidelines
- Preserve all decision frameworks and checklists

**5. Create `docs/examples.md`**
- Extract "Example Patterns" and "Common Patterns to Avoid"
- Consolidate all code examples
- Cross-reference from other docs

**6. Create `docs/working-with-claude.md`**
- Extract "Working with Claude" section
- Include expectations, learning documentation guidance
- Preserve all templates and formats

### Phase 2: Update Main CLAUDE.md

**7. Update main CLAUDE.md**
- Keep "Core Philosophy" inline (non-negotiable principles)
- Keep "Quick Reference" inline (most-used checklist)
- Replace detailed sections with:
  - Core principle statement
  - Quick reference bullets
  - "For comprehensive details, see @docs/[file].md"
- Keep "Resources and References" and "Summary" inline

**8. Add table of contents**
```markdown
## Table of Contents

- [Core Philosophy](#core-philosophy)
- [Quick Reference](#quick-reference)
- [Testing Principles](#testing-principles) → @docs/testing.md
- [TypeScript Guidelines](#typescript-guidelines) → @docs/typescript.md
- [Code Style](#code-style) → @docs/code-style.md
- [Development Workflow](#development-workflow) → @docs/workflow.md
- [Example Patterns](#example-patterns) → @docs/examples.md
- [Working with Claude](#working-with-claude) → @docs/working-with-claude.md
```

### Phase 3: Verification

**9. Test with Claude Code**
- Run `/memory` command to verify all files are loaded
- Confirm imports work correctly
- Check that relative paths resolve

**10. Verify Nothing Lost**
- Compare line counts: sum of all docs should equal original
- Grep for unique content to ensure it's preserved
- Review each section to confirm completeness

**11. Update Documentation**
- Update main README.md to mention modular structure
- Update agents README to reference docs/ directory if needed
- Document the import pattern for contributors

### Phase 4: Commit and Deploy

**12. Commit changes**
```bash
git add claude/.claude/CLAUDE.md claude/.claude/docs/
git commit -m "refactor: split CLAUDE.md into modular structure

Split 1,818-line CLAUDE.md into:
- Main file (~300 lines) with core principles and quick reference
- docs/testing.md (~400 lines) - comprehensive testing guidance
- docs/typescript.md (~350 lines) - TypeScript and schema-first
- docs/code-style.md (~250 lines) - functional programming patterns
- docs/workflow.md (~400 lines) - TDD and refactoring processes
- docs/examples.md (~300 lines) - all code examples
- docs/working-with-claude.md (~150 lines) - expectations and learning

Uses Claude Code's @import syntax for on-demand loading.
Reduces initial context usage while preserving all detail.

Total content preserved: 1,818 lines → 2,050 lines (accounting for file headers)
Main file reduced: 1,818 lines → ~300 lines"
```

**13. Create Pull Request**
- Title: "Modularize CLAUDE.md using imports"
- Description: Link to this plan
- Tag for review

---

## Validation Criteria

Before merging, verify:

- [ ] `/memory` command shows all docs loaded correctly
- [ ] Main CLAUDE.md is <400 lines
- [ ] No content removed (only reorganized)
- [ ] All imports use correct relative paths
- [ ] Each detailed doc has clear section headers
- [ ] Cross-references between docs work correctly
- [ ] Dotfiles installation (via Stow) still works
- [ ] GitHub renders all markdown correctly
- [ ] No broken links in any file

---

## Rollback Plan

If imports don't work as expected:

1. Revert commit: `git revert HEAD`
2. Alternative: Merge all docs back into single file
3. Document issues encountered for Claude Code team
4. Wait for import feature improvements

---

## Future Enhancements

Once modular structure is validated:

1. **Add project-specific overrides**: `@~/.claude/my-overrides.md`
2. **Team-specific docs**: `@docs/team/coding-standards.md`
3. **Domain-specific patterns**: `@docs/domains/payments.md`
4. **Tool-specific guides**: `@docs/tools/jest.md`
5. **Language-specific additions**: `@docs/languages/python.md` (if needed)

---

## Notes

- **Do not summarize content**: All examples and detail must be preserved
- **Import statements are declarative**: Just `@docs/file.md`, not prose
- **Keep core principles inline**: Philosophy section must always be immediately visible
- **Test frequently**: Use `/memory` command during development
- **Document as you go**: Update this plan if structure changes

---

## Questions for Resolution

None currently - ready to proceed with implementation.

---

## References

- [Claude Code Memory Documentation](https://docs.claude.com/en/docs/claude-code/memory)
- [GitHub Issue #990: Import syntax discussion](https://github.com/anthropics/claude-code/issues/990)
- [GitHub Issue #2950: Imports or CLAUDE.local.md?](https://github.com/anthropics/claude-code/issues/2950)
- [Threads Post: Import feature announcement](https://www.threads.com/@boris_cherny/post/DJet1HLpz6Y)
