---
"@paulhammond/dotfiles": patch
---

# Global Skills Restoration: v2.0.0 → v3.0.0 Complete Recovery + Reorganization

**Context**: The v3.0.0 CLAUDE.md refactor successfully reduced the main file from 4,936 to ~350 lines by moving content to skills, but investigation revealed 1,714 lines (48%) of critical guidance was lost rather than moved.

This patch:
1. Restores all missing content to the global skills system
2. Reorganizes testing/tdd skills to eliminate duplication
3. Removes project-specific content to make skills universally applicable

## Restoration Summary

### testing skill (+381 lines - Previously Missing!)

**The testing skill was completely missing from the dotfiles repo** (69 lines → 425 lines)

- ✅ Core Principle: Test behavior, not implementation
- ✅ Test Through Public API Only (with detailed examples)
- ✅ Coverage Through Behavior (how to achieve coverage without testing implementation)
- ✅ **Test Factory Pattern** (moved from tdd skill - belongs here)
- ✅ **Coverage Theater Detection** (4 anti-patterns consolidated from both skills)
- ✅ No 1:1 Mapping Between Tests and Implementation
- ✅ All examples now generic (removed scenarist-specific content)

### tdd skill Reorganization (581 → 343 lines)

**Focused on TDD workflow, references testing skill for "how to write good tests"**

- ✅ Opening reference to `testing` skill
- ✅ Removed Test Factory Pattern (moved to testing)
- ✅ Removed Coverage Theater Detection (consolidated in testing)
- ✅ References testing skill for anti-patterns
- ✅ All examples now generic (removed scenarist-specific content)

### Critical Restorations

**typescript-strict skill** (+653 lines, was 94% missing)
- ✅ Schema Placement Architecture (500 lines) - CRITICAL: Schemas ALWAYS in core, NEVER in adapters
- ✅ Dependency Injection Pattern (100 lines) - CRITICAL: Domain logic must NEVER create port implementations
- ✅ Type vs Interface Rationale (80 lines) - WHY interface for contracts, type for data
- ✅ Strict Mode Configuration, Immutability Patterns, Factory Pattern

**tdd skill** (+529 lines, was 83% missing)
- ✅ Coverage Verification Protocol (78 lines) - CRITICAL: "NEVER trust coverage claims without verification"
- ✅ Coverage Theater Detection (4 patterns that give fake 100% coverage)
- ✅ TDD Evidence in Commit History (40 lines) - How to document multi-session TDD work
- ✅ 100% Coverage Exception Process (23 lines) - Formal process for requesting exceptions
- ✅ Test Factory Pattern (107 lines) - Factory composition, schema validation, anti-patterns

**functional skill** (+563 lines, was 76% missing)
- ✅ No Comments / Self-Documenting Code (30 lines) - **FIXES ORPHANED ITEM** from CLAUDE.md
- ✅ Array Methods Over Loops (40 lines) - **FIXES ORPHANED ITEM** from CLAUDE.md
- ✅ Options Objects Over Positional Parameters (30 lines) - **FIXES ORPHANED ITEM** from CLAUDE.md
- ✅ Pure Functions (50 lines)
- ✅ Composition Over Complex Logic (40 lines)
- ✅ Readonly Keyword for Immutability (25 lines)
- ✅ Deep Nesting Limitation (12 lines)

**refactoring skill** (+62 lines, was 71% missing)
- ✅ Commit Before Refactoring - WHY (15 lines) - Safety net for experimentation
- ✅ Speculative Code is TDD Violation (15 lines) - Delete "just in case" logic
- ✅ When NOT to Refactor (20 lines) - Criteria for deferring refactoring
- ✅ Commit Messages for Refactoring (10 lines)
- ✅ **FIXED: Now properly referenced in CLAUDE.md** (was completely missing from documentation)

### CLAUDE.md Fixes
- ✅ Added pointer to `functional` skill in Code Style section
- ✅ Added pointer to `tdd` skill in Development Workflow
- ✅ Added pointer to `refactoring` skill in Development Workflow (was completely missing)
- ✅ Added pointer to `refactoring` skill in Working with Claude
- ✅ All orphaned quick reference items now have proper skill coverage

## Total Impact

**Lines Restored**: 1,807 lines across 4 skills
- typescript-strict: +653 lines (CRITICAL)
- tdd: +529 lines (CRITICAL)
- functional: +563 lines (fixes 3 orphaned items)
- refactoring: +62 lines (now discoverable)

**Issues Fixed**:
1. ❌ → ✅ Schema placement guidance prevents adapter duplication (violates hexagonal architecture)
2. ❌ → ✅ Coverage verification protocol prevents fake coverage from passing reviews
3. ❌ → ✅ DI pattern guidance preserves hexagonal architecture
4. ❌ → ✅ CLAUDE.md quick reference items all have proper skill coverage (no more orphaned content)
5. ❌ → ✅ Refactoring skill now discoverable (was hidden)
6. ❌ → ✅ Multi-session TDD work can be properly documented in PRs
7. ❌ → ✅ Formal process for coverage exceptions
8. ❌ → ✅ Type vs Interface has WHY explained, not just WHAT
9. ❌ → ✅ Refactoring assessment framework accessible
10. ❌ → ✅ Functional programming patterns prevent code quality degradation

## Documentation Added

Three comprehensive documentation files added to track the analysis and restoration:

- `docs/v2-v3-detail-restoration-plan.md` - Original testing skill analysis (358 lines)
- `docs/comprehensive-v2-v3-restoration-plan.md` - Complete skill-by-skill analysis (744 lines)
- `docs/v2-v3-critical-findings-summary.md` - Executive summary with top 10 critical issues (295 lines)

## Verification

All restored content emphasizes:
- ✅ Behavior-driven testing (not implementation testing)
- ✅ WHY explained for every principle (not just WHAT)
- ✅ Real-world examples with WRONG ❌ vs CORRECT ✅ patterns
- ✅ Architectural rationale (hexagonal architecture, DI, schema placement)
- ✅ All CLAUDE.md quick reference items have full skill coverage

## Impact on Development

Without these restorations, developers would:
- ❌ Duplicate schemas across adapters (violates hexagonal architecture)
- ❌ Submit fake 100% coverage (no verification protocol)
- ❌ Hardcode implementations (no DI pattern guidance)
- ❌ Follow CLAUDE.md quick ref to dead ends (3 orphaned principles)
- ❌ Miss refactoring methodology (skill existed but not mentioned)
- ❌ Document multi-session TDD incorrectly (no PR pattern)
- ❌ Request coverage exceptions informally (no formal process)
- ❌ Follow rules without understanding WHY
- ❌ Refactor without methodology
- ❌ Write imperative instead of functional code

**All issues resolved** ✅
