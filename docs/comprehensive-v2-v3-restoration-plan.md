# Comprehensive v2.0.0 → v3.0.0 Detail Restoration Plan

## Executive Summary

The v3.0.0 refactor successfully reduced CLAUDE.md from 4,936 lines to ~350 lines (93% reduction) by moving detailed guidance into skills. However, **significant content was lost rather than moved**, totaling approximately **2,800+ lines of critical guidance** across all skills.

### Overall Status

| Component                   | v2.0.0       | v3.0.0 Target | v3.0.0 Actual | Gap             | Status                           |
| --------------------------- | ------------ | ------------- | ------------- | --------------- | -------------------------------- |
| **CLAUDE.md**               | 4,936 lines  | 350 lines     | 350 lines     | 0               | ✅ Complete                      |
| **testing skill**           | ~600 lines   | ~600 lines    | 451 lines     | 149 lines       | ⚠️ Mostly restored               |
| **tdd skill**               | ~320 lines   | ~320 lines    | 53 lines      | 267 lines       | ❌ 83% missing                   |
| **typescript-strict skill** | ~900 lines   | ~900 lines    | 49 lines      | 851 lines       | ❌ 94% missing                   |
| **functional skill**        | ~300 lines   | ~300 lines    | 73 lines      | 227 lines       | ❌ 76% missing                   |
| **refactoring skill**       | ~200 lines   | ~200 lines    | 58 lines      | 142 lines       | ❌ 71% missing                   |
| **planning skill**          | ~90 lines    | ~330 lines    | 327 lines     | -237 lines      | ✅ Expanded (but lost 100 lines) |
| **expectations skill**      | ~150 lines   | ~150 lines    | 75 lines      | 75 lines        | ⚠️ 50% missing                   |
| **TOTAL**                   | ~3,560 lines | ~3,150 lines  | 1,436 lines   | **1,714 lines** | ❌ **48% missing**               |

### Critical Findings

1. **Coverage Verification** - Lost from both planning and testing skills (78 lines)
2. **Schema Placement Architecture** - Lost from typescript-strict skill (500 lines) - CRITICAL
3. **Dependency Injection Pattern** - Lost from typescript-strict skill (100 lines) - CRITICAL
4. **TDD Evidence in Commit History** - Lost from tdd skill (40 lines)
5. **Refactoring Assessment Framework** - Mostly lost from refactoring skill (150 lines)
6. **Orphaned Content** - 3 principles in CLAUDE.md quick ref but not in skills
7. **Missing Skill Pointer** - refactoring skill never mentioned in CLAUDE.md

---

## Detailed Analysis by Skill

### 1. TDD Skill - 83% Missing (267 of 320 lines)

**Current:** 53 lines
**Target:** 320 lines
**Gap:** 267 lines (83% missing)

#### Missing Content:

##### A. TDD Evidence in Commit History (40 lines) - CRITICAL

- Default expectation for RED → GREEN → REFACTOR progression
- 3 documented exception cases (Multi-Session Work, Context Continuation, Refactoring Commits)
- How to document exceptions in PRs with example
- "Exception is for EVIDENCE presentation, not TDD practice"

##### B. Coverage Verification Protocol (78 lines) - CRITICAL

- Step-by-step verification process
- Command: `cd packages/core && pnpm test:coverage`
- Four metrics to verify (Lines, Statements, Branches, Functions)
- Visual example of coverage violation
- Red flags to catch incomplete coverage claims
- Behavior-first approach to coverage gaps
- "NEVER trust coverage claims without verification"

##### C. 100% Coverage Exception Process (23 lines)

- Default rule: 100% required
- 3-step process for requesting exceptions
- Where to document (README + CLAUDE.md)
- Current exceptions list
- Explicit approval requirement

##### D. Development Workflow Steps (7 lines)

- 6-step numbered workflow for adding features
- Explicit guidance on running tests in watch mode
- Integration with commit workflow

##### E. Commit Message Standards (8 lines)

- Conventional commits format
- Examples: feat/fix/refactor/test/docs

##### F. PR Requirements Checklist (4 lines)

- Tests must pass
- Linting and type checks must pass
- Coverage verification required
- Single feature or fix focus
- Behavior description (not implementation)

##### G. Test Factory Pattern Examples (from testing context)

- Concrete factory function examples
- Currently just references testing skill

**Restoration Priority: CRITICAL**

---

### 2. TypeScript-Strict Skill - 94% Missing (851 of 900 lines)

**Current:** 49 lines
**Target:** 900 lines
**Gap:** 851 lines (94% missing)

#### Missing Content:

##### A. Schema Placement Architecture (500 lines) - CRITICAL

- **"CRITICAL RULE"**: Schemas ALWAYS belong in core, NEVER in adapters
- Detailed decision framework (3-question checklist)
- Real "Gotcha" case study documenting actual schema duplication bug
- Red flags list to catch schema anti-patterns (5 items)
- Schema-first development pattern with complete code examples
- Location guidance (packages/core/src/schemas/)
- Why this matters: domain validation rules vs framework code

**Example from v2.0.0:**

```markdown
#### Gotcha: Schema Duplication Across Adapters

[Real case study: scenarioRequestSchema duplicated in 3 adapter files]

**Why This Was Wrong:**

- ❌ Schema defines domain validation → belongs in CORE, not adapters
- ❌ Duplication creates multiple sources of truth
- ❌ Changes require updating 3 files instead of 1
- ❌ Violates hexagonal architecture (domain logic leaking)
- ❌ Breaks DRY principle at the knowledge level
```

##### B. Dependency Injection Pattern (100 lines) - CRITICAL

- **"CRITICAL"** flagged section
- Domain logic must NEVER create port implementations internally
- Detailed example showing ScenarioManager's correct DI pattern
- Explanation of why this matters (5 benefits listed)
- Clear contrast between WRONG and CORRECT approaches

**Example from v2.0.0:**

```typescript
// ❌ WRONG - Creating implementation internally
export const createScenarioManager = ({ store }) => {
  const scenarioRegistry = new Map(); // ❌ Hardcoded!
};

// ✅ CORRECT - Injecting both ports
export const createScenarioManager = ({ registry, store }) => {
  // Implementation properly injects dependencies
};
```

##### C. Type vs Interface Rationale (80 lines)

- **WHY** `interface` is required for behavior contracts (not just rule)
- **WHY** `type` is required for data structures
- Architectural reasoning tying to hexagonal architecture principles
- Ports section explaining behavior contracts
- Types section explaining data structures
- Connection to hexagonal architecture

##### D. Strict Mode Configuration (40 lines)

- Complete `tsconfig.json` configuration block with 7 settings
- Explanation of each setting's purpose
- Note that rules apply to test code as well as production code
- No `@ts-ignore` without explicit comments explaining why

##### E. Immutability Patterns (30 lines)

- `readonly` keyword emphasis throughout
- `ScenaristResult<T, E>` result type pattern
- Explicit statement: "No data mutation in functions"
- `ReadonlyArray<T>` vs `T[]` guidance

##### F. Factory Pattern (20 lines)

- "Use factory functions (not classes)"
- Code example of proper factory pattern
- Benefits: composition, functional style, DI

##### G. Location Guidance (40 lines)

- Explicit file locations for each artifact type
- Ports → `packages/core/src/ports/`
- Types → `packages/core/src/types/`
- Schemas → `packages/core/src/schemas/`

##### H. Functional Programming Principles (100 lines)

- Pure functions wherever possible
- No data mutation principle
- Composition over complex logic
- Array methods over loops
- Early returns instead of nested if/else
- No comments (code self-documents)
- Options objects over positional parameters

**Restoration Priority: CRITICAL**

---

### 3. Functional Skill - 76% Missing (227 of 300 lines)

**Current:** 73 lines
**Target:** 300 lines
**Gap:** 227 lines (76% missing)

#### Missing Content:

##### A. No Comments / Self-Documenting Code (30 lines) - ORPHANED

- Code should be clear through naming and structure
- Comments indicate unclear code
- Exception: JSDoc for public APIs when generating documentation
- Examples of self-documenting vs commented code

**Status:** Mentioned in CLAUDE.md quick ref but NOT in functional skill

##### B. Array Methods vs Loops (40 lines) - ORPHANED

- When to use `map()` vs `for` loops
- When to use `filter()` vs conditional loops
- When to use `reduce()` vs imperative accumulation
- Benefits of functional array methods
- Examples of each pattern

**Status:** Mentioned in CLAUDE.md quick ref but NOT in functional skill

##### C. Options Objects Over Positional Parameters (30 lines) - ORPHANED

- Default to options objects for function parameters
- Benefits: readability, no ordering dependencies, extensibility
- Example with CreatePaymentOptions

**Status:** Mentioned in CLAUDE.md quick ref but NOT in functional skill

##### D. Composition Over Complex Logic (40 lines)

- How to compose functions (examples)
- When to use composition vs conditionals
- Benefits of composition for maintainability
- Composing immutable transformations

**Current skill:** Only has "Composition over inheritance" in core principles

##### E. Pure Functions Guidance (50 lines)

- What makes a function pure (no side effects, deterministic)
- When it's acceptable to break purity
- Benefits of pure functions (testability, composition, predictability)
- How pure functions work with immutability
- Examples of pure vs impure functions

**Current skill:** Only has "Pure functions wherever possible" in core principles

##### F. Readonly Keyword for Data Structures (25 lines)

- Using `readonly` on object properties
- Using `ReadonlyArray<T>` vs `T[]`
- Using `readonly` to signal immutability intent
- Nested immutable objects with `readonly`
- Examples from v2.0.0 type definitions

##### G. Deep Nesting Limitation (15 lines)

- Guideline: Max 2 levels of function nesting
- How to flatten nested functions
- When to extract to separate functions
- Example of too-deep nesting vs flat structure

**Current skill:** Only shows early returns principle

**Restoration Priority: HIGH** (3 items orphaned from CLAUDE.md quick ref)

---

### 4. Refactoring Skill - 71% Missing (142 of 200 lines)

**Current:** 58 lines
**Target:** 200 lines
**Gap:** 142 lines (71% missing)

#### Missing Content:

##### A. Speculative Code is TDD Violation (40 lines)

- Key lesson: If code isn't driven by a failing test, don't write it
- User feedback example about poor test coverage
- Action taken: Analyze every uncovered line, delete speculative code
- Philosophy and consequences of "just in case" code

##### B. Refactoring Assessment Framework (30 lines)

- Port location consistency (ResponseSelector example)
- Architecture considerations for decisions
- Knowledge duplication vs structural similarity
- When interfaces belong in ports vs implementations in domain

##### C. TDD Evidence in Commit History - Refactoring Context (20 lines)

- Refactoring commits as exception case
- Multiple small refactors combined into single commit
- All tests remained green throughout
- Evidence: Commit message notes "refactor only, no behavior change"
- PR documentation when refactoring doesn't show linear TDD

##### D. Commit Before Refactoring - Explicit Guidance (15 lines)

- Commit working code BEFORE refactoring (emphasized)
- Explanation of WHY (safety net, can revert if breaks)
- Green test baseline is essential safety net

##### E. Real-World Refactoring Examples (50 lines)

- Schema organization refactoring (move schemas from adapters to core)
- Port location refactoring (ResponseSelector domain → ports)
- Dependency injection refactoring (add sequenceTracker parameter)
- Each with: What triggered, HOW assessed, WHY valuable, EVIDENCE

##### F. When NOT to Refactor (20 lines)

- Explicit "don't refactor" criteria
- Code that works correctly (no bug fixes needed)
- Speculative refactoring without failing test
- Refactoring that changes behavior (that's a feature)
- Premature optimization

##### G. Commit Message Guidance (10 lines)

- Commit messages should describe WHAT was refactored
- Messages should hint at WHY (extract, simplify, organize)
- Refactoring commits should NOT be mixed with feature commits
- Example: `refactor: extract scenario validation logic`

**Restoration Priority: HIGH** (skill not even mentioned in CLAUDE.md)

---

### 5. Planning Skill - Expanded but Lost Coverage Content

**Current:** 327 lines (EXPANDED from v2.0.0's 90 lines)
**Lost:** 100 lines from v2.0.0
**Net:** +237 lines but missing critical verification content

#### New Content (EXCELLENT):

- Three-document model (PLAN.md, WIP.md, LEARNINGS.md)
- Known-good increments definition
- Step size heuristics
- Commit discipline workflow
- Structured document templates
- Learnings capture system
- End-of-feature process
- Workflow anti-patterns

#### Lost Content from v2.0.0:

##### A. Coverage Verification - CRITICAL (60 lines) - DUPLICATE LOSS

- Same 78-line section missing from tdd skill
- Verification command: `pnpm exec vitest run --coverage`
- 4 red flags to watch for
- Detailed example of coverage failure
- Metric explanations (Lines, Statements, Branches, Functions)

##### B. 100% Coverage Exception Process (25 lines) - DUPLICATE LOSS

- Same 23-line section missing from tdd skill
- Default rule: 100% required
- 3-step exception request process
- Explicit approval requirement

##### C. Pull Request Requirements (15 lines)

- All tests must pass
- Linting and type checks pass
- Coverage verification required
- Focused on single feature/fix
- Behavior descriptions (not implementation)

**Restoration Priority: CRITICAL** (coverage verification is duplicated loss)

---

### 6. Expectations Skill - 50% Missing (75 of 150 lines)

**Current:** 75 lines
**Target:** 150 lines
**Gap:** 75 lines (50% missing)

#### Missing Content:

##### A. Real Code Examples from v2.0.0 (30 lines)

- Config belongs in adapters (not domain) example
- Declarative vs imperative deep dive
- Detailed gotcha case studies with code

##### B. Anti-Pattern Examples with Code (20 lines)

- Creating implementation internally (DI violation)
- Mixing imperative and functional styles
- Complex conditionals that should be composed

##### C. Example CLAUDE.md Entries from Project History (15 lines)

- What actual learnings look like when documented
- Format examples from real work
- How learnings merge into permanent locations

##### D. When CLAUDE.md Becomes Permanent (10 lines)

- Action: Update CLAUDE.md when introducing meaningful changes
- Not just captured in LEARNINGS.md but actively merged

**Restoration Priority: MEDIUM**

---

### 7. CLAUDE.md v3.0.0 - Pointer and Accuracy Issues

#### Issue 1: Orphaned Content (3 items)

Three principles appear in CLAUDE.md quick reference but lack coverage in target skills:

1. **"No comments - code should be self-documenting"**
   - Location in CLAUDE.md: Code Style section
   - Should be in: functional skill
   - Current status: NOT mentioned in functional/SKILL.md

2. **"Prefer options objects over positional parameters"**
   - Location in CLAUDE.md: Code Style section
   - Should be in: functional skill
   - Current status: NOT mentioned in functional/SKILL.md

3. **"Use array methods (`map`, `filter`, `reduce`) over loops"**
   - Location in CLAUDE.md: Code Style section
   - Should be in: functional skill
   - Current status: NOT mentioned in functional/SKILL.md

#### Issue 2: Missing Skill Pointer (refactoring Skill)

The refactoring skill exists (58 lines) but is NEVER MENTIONED in CLAUDE.md quick reference.

**Where it should be mentioned:**

In Development Workflow section:

```markdown
**Quick reference:**

- REFACTOR: Assess improvement opportunities (only refactor if adds value)
  ⚠️ MISSING: "For detailed guidance on refactoring, load the `refactoring` skill"
```

In Working with Claude section:

```markdown
- Assess refactoring after every green (but only if adds value)
  ⚠️ MISSING: Pointer to refactoring skill
```

#### Issue 3: Incomplete Skill Implementations

- **typescript-strict skill**: Missing decision frameworks for schema placement
- **functional skill**: Missing 3 documented patterns from CLAUDE.md

#### Issue 4: Pointer Clarity

Development Workflow section under-references skills:

- Does NOT point to `tdd` skill for RED-GREEN-REFACTOR details
- Does NOT point to `refactoring` skill for "Assess improvements"
- Only points to `planning` skill for "significant work"

**Better wording:**

```markdown
For everyday work, load the `tdd` and `refactoring` skills.
For significant work, load the `planning` skill for three-document model.
```

---

## Quantitative Summary

### Total Missing Content by Priority

| Priority     | Lines Missing   | Affected Skills                  | Impact                                      |
| ------------ | --------------- | -------------------------------- | ------------------------------------------- |
| **CRITICAL** | 778 lines       | tdd, typescript-strict, planning | Architecture violations, fake coverage risk |
| **HIGH**     | 596 lines       | functional, refactoring          | Code quality degradation, orphaned content  |
| **MEDIUM**   | 340 lines       | expectations, CLAUDE.md pointers | Documentation gaps, skill navigation issues |
| **TOTAL**    | **1,714 lines** | 7 skills + CLAUDE.md             | **48% of intended v3.0.0 content missing**  |

### Missing Content Breakdown by Category

| Category                   | Lines Missing | Examples                                                                  |
| -------------------------- | ------------- | ------------------------------------------------------------------------- |
| **Architecture & Design**  | 680 lines     | Schema placement (500), DI pattern (100), Type vs Interface (80)          |
| **Testing & Verification** | 256 lines     | Coverage verification (78x2), Exception process (23x2), TDD evidence (40) |
| **Code Patterns**          | 347 lines     | Functional patterns (227), Refactoring examples (120)                     |
| **Process & Workflow**     | 271 lines     | Commit messages (8), PR requirements (15), Real examples (248)            |
| **Documentation**          | 160 lines     | Expectations examples (75), CLAUDE.md pointers (85)                       |

---

## Restoration Action Plan

### Phase 1: CRITICAL Restorations (Do First)

#### 1.1 Restore Schema Placement to typescript-strict skill (500 lines)

- Add "CRITICAL RULE" section with decision framework
- Add gotcha case study (schema duplication across adapters)
- Add red flags list (5 items)
- Add schema-first development pattern with examples
- Add location guidance

#### 1.2 Restore Dependency Injection to typescript-strict skill (100 lines)

- Add "CRITICAL" flagged section
- Add ScenarioManager example (WRONG vs CORRECT)
- Add 5 benefits explanation
- Add port injection pattern

#### 1.3 Restore Coverage Verification to tdd skill (78 lines)

- Add verification process (3 steps)
- Add coverage metrics checklist (4 metrics)
- Add example violation table
- Add red flags to watch for
- Add "NEVER trust coverage claims" emphasis
- Add behavior-first approach

#### 1.4 Restore 100% Coverage Exception Process to tdd skill (23 lines)

- Add default rule
- Add 3-step request process
- Add documentation locations
- Add current exceptions list

#### 1.5 Fix CLAUDE.md Orphaned Content (Add to functional skill) (100 lines)

- Add "No Comments / Self-Documenting Code" section
- Add "Array Methods vs Loops" section
- Add "Options Objects Over Positional Parameters" section

**Phase 1 Total:** 801 lines across 3 skills + CLAUDE.md fixes

### Phase 2: HIGH Priority Restorations

#### 2.1 Restore TDD Evidence to tdd skill (40 lines)

- Add commit history expectations section
- Add 3 exception cases with explanations
- Add PR documentation pattern with example

#### 2.2 Restore Type vs Interface Rationale to typescript-strict (80 lines)

- Add WHY for interface (behavior contracts)
- Add WHY for type (data structures)
- Add architectural connection to hexagonal architecture

#### 2.3 Restore Refactoring Assessment to refactoring skill (150 lines)

- Add speculative code is TDD violation
- Add real-world examples (3 cases)
- Add assessment framework
- Add when NOT to refactor criteria

#### 2.4 Add refactoring Skill Pointer to CLAUDE.md (5 lines)

- Update Development Workflow section
- Update Working with Claude section

#### 2.5 Restore Functional Patterns to functional skill (127 lines)

- Add composition over complex logic (40 lines)
- Add pure functions guidance (50 lines)
- Add readonly keyword patterns (25 lines)
- Add deep nesting limitation (12 lines)

**Phase 2 Total:** 402 lines across 3 skills + CLAUDE.md

### Phase 3: MEDIUM Priority Restorations

#### 3.1 Restore Strict Mode Config to typescript-strict (40 lines)

- Add complete tsconfig.json configuration block
- Add explanation of each setting

#### 3.2 Restore Immutability Patterns to typescript-strict (30 lines)

- Add readonly keyword emphasis
- Add ScenaristResult<T, E> pattern
- Add "No data mutation" explicit statement

#### 3.3 Restore Factory Pattern to typescript-strict (20 lines)

- Add "Use factory functions (not classes)"
- Add code example

#### 3.4 Restore Location Guidance to typescript-strict (40 lines)

- Add file locations for each artifact type

#### 3.5 Restore Process Details to Various Skills (211 lines)

- Development workflow steps (7 lines) → tdd skill
- Commit message standards (8 lines) → tdd skill
- PR requirements (15 lines) → planning skill
- Commit before refactoring (15 lines) → refactoring skill
- When NOT to refactor (20 lines) → refactoring skill
- Commit message for refactoring (10 lines) → refactoring skill
- Real code examples (75 lines) → expectations skill
- Anti-pattern examples (20 lines) → expectations skill
- Example CLAUDE.md entries (15 lines) → expectations skill
- CLAUDE.md update action (10 lines) → expectations skill
- Pointer clarity fixes (16 lines) → CLAUDE.md

**Phase 3 Total:** 341 lines across 5 skills + CLAUDE.md

### Phase 4: Documentation and Verification

#### 4.1 Create Verification Checklist

- Verify all v2.0.0 sections have destinations in v3.0.0
- Verify all CLAUDE.md quick ref items point to skills
- Verify no orphaned content
- Verify no duplicate content across skills

#### 4.2 Create Skill Navigation Index

- Add to CLAUDE.md: "Which skill covers which topic?"
- Quick reference table mapping principles to skills

#### 4.3 Update Architecture Documentation

- Document v3.0.0 skill system architecture
- Explain load-on-demand approach
- Document skill dependencies

---

## Implementation Prioritization

### Week 1: CRITICAL (Must Fix Immediately)

- Day 1-2: Schema placement + DI pattern → typescript-strict skill (600 lines)
- Day 3: Coverage verification + Exception process → tdd skill (101 lines)
- Day 4: Orphaned content → functional skill (100 lines)
- Day 5: Testing and verification

**Week 1 Deliverable:** 801 lines of CRITICAL content restored

### Week 2: HIGH (Important)

- Day 1: TDD evidence + Type rationale (120 lines)
- Day 2-3: Refactoring assessment + examples (150 lines)
- Day 4: Functional patterns (127 lines)
- Day 5: CLAUDE.md pointer fixes + testing

**Week 2 Deliverable:** 402 lines of HIGH priority content restored

### Week 3: MEDIUM (Nice to Have)

- Day 1-2: TypeScript config, patterns, factories (90 lines)
- Day 3-4: Process details across skills (211 lines)
- Day 5: Documentation and verification

**Week 3 Deliverable:** 341 lines of MEDIUM priority content restored

**Total Restoration:** 1,544 lines over 3 weeks (90% of missing content)

---

## Success Criteria

1. **No Detail Lost** - Every point from v2.0.0 is present in v3.0.0 (either CLAUDE.md or skills)
2. **No Orphaned Content** - Every CLAUDE.md quick ref item points to a skill with full coverage
3. **All Skills Mentioned** - Every skill is referenced in CLAUDE.md when relevant
4. **Complete Examples** - Every principle has WRONG ❌ vs CORRECT ✅ code examples
5. **ADR Integration** - References to ADRs with inline context (don't force reading ADRs)
6. **Easy to Navigate** - Clear pointers from CLAUDE.md to skills for detailed guidance

---

## Files to Update

### Skills (Outside Repository)

- `~/.claude/skills/tdd/SKILL.md` - 267 lines to add
- `~/.claude/skills/typescript-strict/SKILL.md` - 851 lines to add
- `~/.claude/skills/functional/SKILL.md` - 227 lines to add
- `~/.claude/skills/refactoring/SKILL.md` - 142 lines to add
- `~/.claude/skills/planning/SKILL.md` - 100 lines to add (coverage content)
- `~/.claude/skills/expectations/SKILL.md` - 75 lines to add
- `~/.claude/skills/testing/SKILL.md` - Already restored (451 lines)

### CLAUDE.md (In Repository)

- `/Users/paulhammond/.claude/CLAUDE.md` - Fix orphaned content pointers, add refactoring skill references
- `/Users/paulhammond/personal/scenarist/CLAUDE.md` - Project-specific, no changes needed

### Documentation (In Repository)

- `docs/v2-v3-detail-restoration-plan.md` - This comprehensive plan document
- Create verification checklist document
- Create skill navigation index

---

## Next Steps

1. **Review this comprehensive plan** with stakeholders
2. **Prioritize phases** based on immediate needs
3. **Begin Phase 1 (CRITICAL)** restorations
4. **Test each restoration** by asking Claude Code to perform tasks using the restored skills
5. **Verify completeness** using the verification checklist
6. **Document success** and create audit trail

---

## Appendix: v2.0.0 Content Distribution

For reference, here's where v2.0.0's 4,936 lines were distributed:

| Section                | Lines  | v3.0.0 Destination      | Status                                |
| ---------------------- | ------ | ----------------------- | ------------------------------------- |
| Testing Principles     | ~600   | testing skill           | ✅ Mostly restored (451/600)          |
| TDD Workflow           | ~320   | tdd skill               | ❌ 83% missing (53/320)               |
| TypeScript Guidelines  | ~900   | typescript-strict skill | ❌ 94% missing (49/900)               |
| Functional Programming | ~300   | functional skill        | ❌ 76% missing (73/300)               |
| Refactoring            | ~200   | refactoring skill       | ❌ 71% missing (58/200)               |
| Planning/Workflow      | ~90    | planning skill          | ✅ Expanded (327 lines) but lost 100  |
| Expectations           | ~150   | expectations skill      | ⚠️ 50% missing (75/150)               |
| Project-Specific       | ~2,376 | Project CLAUDE.md       | ✅ Preserved (not relevant to global) |

**Total v2.0.0 Global Content:** 2,560 lines
**Total v3.0.0 Global Content:** 1,436 lines
**Missing:** 1,124 lines (44% of global content)

**Note:** This doesn't include project-specific content (ADRs, package structure, etc.) which correctly moved to project CLAUDE.md.
