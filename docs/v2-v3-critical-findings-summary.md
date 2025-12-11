# v2.0.0 → v3.0.0 Critical Findings Summary

## The Bottom Line

**1,714 lines of critical guidance missing from v3.0.0 skills (48% of intended content)**

The v3.0.0 refactor successfully reduced CLAUDE.md from 4,936 to ~350 lines, but **the detailed guidance was lost rather than moved to skills**.

---

## Top 10 Critical Issues (Ranked by Impact)

### 1. Schema Placement Architecture - MISSING (500 lines)

**Skill:** typescript-strict
**Impact:** CRITICAL - Developers will duplicate schemas across adapters, violating hexagonal architecture

**What's missing:**

- "CRITICAL RULE": Schemas ALWAYS belong in core, NEVER in adapters
- Real gotcha case study (schema duplicated across 3 adapter files)
- Decision framework (3 questions)
- Red flags list (5 items)
- Complete working examples

**Why this matters:** Without this, developers will leak domain logic into adapters, creating multiple sources of truth.

---

### 2. Coverage Verification Protocol - MISSING (78 lines)

**Skill:** tdd (should also be in planning)
**Impact:** CRITICAL - Fake coverage will pass reviews

**What's missing:**

- "NEVER trust coverage claims without verification"
- Step-by-step verification process
- Command: `cd packages/core && pnpm test:coverage`
- Coverage theater detection (4 patterns)
- Example violation with metrics

**Why this matters:** Without verification protocol, developers can submit PRs with fake 100% coverage (tests that don't actually test behavior).

---

### 3. Dependency Injection Pattern - MISSING (100 lines)

**Skill:** typescript-strict
**Impact:** CRITICAL - Hexagonal architecture will be violated

**What's missing:**

- Domain logic must NEVER create port implementations internally
- ScenarioManager example (WRONG vs CORRECT)
- 5 benefits explanation
- Why this breaks hexagonal architecture

**Why this matters:** Without DI, the entire hexagonal architecture collapses - implementations become hardcoded.

---

### 4. Orphaned Content - 3 Principles in CLAUDE.md Quick Ref but NOT in Skills

**Skill:** functional
**Impact:** HIGH - Quick reference is incorrect

**What's orphaned:**

1. "No comments - code should be self-documenting" - NOT in functional skill
2. "Prefer options objects over positional parameters" - NOT in functional skill
3. "Use array methods over loops" - NOT in functional skill

**Why this matters:** Users follow CLAUDE.md quick ref, but there's no skill to load for details.

---

### 5. refactoring Skill - NEVER MENTIONED in CLAUDE.md

**Skill:** refactoring (exists with 58 lines but orphaned)
**Impact:** HIGH - Users don't know refactoring methodology exists

**What's missing:**

- No pointer in Development Workflow section
- No pointer in Working with Claude section
- 58 lines of methodology hidden

**Why this matters:** CLAUDE.md says "Assess improvement opportunities" but doesn't point to skill that teaches HOW.

---

### 6. TDD Evidence in Commit History - MISSING (40 lines)

**Skill:** tdd
**Impact:** HIGH - Developers don't know how to document multi-session TDD work

**What's missing:**

- Default expectation for RED → GREEN → REFACTOR progression
- 3 documented exception cases
- PR documentation pattern with example
- "Exception is for EVIDENCE presentation, not TDD practice"

**Why this matters:** Multi-session work won't show linear TDD in commits, and developers won't know how to document it.

---

### 7. 100% Coverage Exception Process - MISSING (23 lines)

**Skill:** tdd
**Impact:** HIGH - No formal process for coverage exceptions

**What's missing:**

- Default rule: 100% coverage required
- 3-step request process
- Where to document (README + CLAUDE.md)
- Current exceptions list
- Explicit approval requirement

**Why this matters:** Developers might request exceptions informally, creating inconsistent standards.

---

### 8. Type vs Interface Rationale - MISSING (80 lines)

**Skill:** typescript-strict
**Impact:** HIGH - Developers won't understand WHY

**What's missing:**

- WHY `interface` for behavior contracts (not just rule)
- WHY `type` for data structures
- Architectural connection to hexagonal architecture
- Ports section explaining contracts
- Types section explaining data structures

**Why this matters:** Developers need to understand WHY, not just follow rules blindly.

---

### 9. Refactoring Assessment Framework - MISSING (150 lines)

**Skill:** refactoring
**Impact:** HIGH - No methodology for "assess improvement opportunities"

**What's missing:**

- Speculative code is TDD violation
- Real-world examples (3 cases with rationale)
- Assessment framework (when to refactor vs defer)
- When NOT to refactor criteria
- Commit before refactoring guidance

**Why this matters:** CLAUDE.md says "assess improvements" but there's no framework to assess.

---

### 10. Functional Programming Patterns - MISSING (227 lines total)

**Skill:** functional
**Impact:** MEDIUM-HIGH - Code quality will degrade

**What's missing:**

- No comments / self-documenting code (30 lines)
- Array methods vs loops (40 lines)
- Options objects pattern (30 lines)
- Composition over complex logic (40 lines)
- Pure functions guidance (50 lines)
- Readonly keyword patterns (25 lines)
- Deep nesting limitation (12 lines)

**Why this matters:** These are core functional programming principles that enable maintainable code.

---

## By-the-Numbers Summary

| Metric                  | Value                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Total Missing Lines** | 1,714 lines (48% of intended v3.0.0 content)                                                                                 |
| **CRITICAL Missing**    | 778 lines (Schema 500 + Coverage 78 + DI 100 + Orphaned 100)                                                                 |
| **HIGH Missing**        | 596 lines (TDD evidence 40 + Type rationale 80 + Refactoring 150 + Functional 227 + Coverage exception 23 + Skill pointer 5) |
| **MEDIUM Missing**      | 340 lines (Process details, examples, documentation)                                                                         |

---

## Impact on Developers

Without these restorations, developers will:

1. ❌ **Duplicate schemas across adapters** (violates hexagonal architecture)
2. ❌ **Submit fake 100% coverage** (no verification protocol)
3. ❌ **Hardcode implementations** (no DI pattern guidance)
4. ❌ **Follow CLAUDE.md quick ref to dead ends** (3 orphaned principles)
5. ❌ **Miss refactoring methodology** (skill exists but not mentioned)
6. ❌ **Document multi-session TDD incorrectly** (no PR pattern)
7. ❌ **Request coverage exceptions informally** (no formal process)
8. ❌ **Follow rules without understanding WHY** (no rationale for type vs interface)
9. ❌ **Refactor without methodology** (no assessment framework)
10. ❌ **Write imperative instead of functional code** (missing FP patterns)

---

## Recommended Immediate Actions

### This Week (CRITICAL)

1. **Restore schema placement to typescript-strict skill** (500 lines)
   - This prevents the most serious architectural violation

2. **Restore coverage verification to tdd skill** (78 lines)
   - This prevents fake coverage from passing reviews

3. **Restore dependency injection to typescript-strict skill** (100 lines)
   - This preserves hexagonal architecture

4. **Fix orphaned content in functional skill** (100 lines)
   - This makes CLAUDE.md quick ref accurate

**Week 1 Total:** 778 lines of CRITICAL content

### Next Week (HIGH Priority)

5. **Add refactoring skill pointer to CLAUDE.md** (5 lines)
6. **Restore TDD evidence to tdd skill** (40 lines)
7. **Restore Type vs Interface rationale** (80 lines)
8. **Restore refactoring assessment framework** (150 lines)
9. **Restore 100% coverage exception process** (23 lines)

**Week 2 Total:** 298 lines of HIGH priority content

---

## Files Needing Updates

### CRITICAL (Week 1)

- `~/.claude/skills/typescript-strict/SKILL.md` - Add 600 lines (schema + DI)
- `~/.claude/skills/tdd/SKILL.md` - Add 78 lines (coverage verification)
- `~/.claude/skills/functional/SKILL.md` - Add 100 lines (orphaned content)

### HIGH (Week 2)

- `~/.claude/CLAUDE.md` - Fix 5 lines (add refactoring pointer)
- `~/.claude/skills/tdd/SKILL.md` - Add 63 lines more (TDD evidence + exception)
- `~/.claude/skills/typescript-strict/SKILL.md` - Add 80 lines (rationale)
- `~/.claude/skills/refactoring/SKILL.md` - Add 150 lines (assessment)

---

## Success Verification

After restoration, verify:

1. ✅ All CLAUDE.md quick ref items point to skills with full coverage
2. ✅ All skills are mentioned in CLAUDE.md when relevant
3. ✅ Coverage verification protocol prevents fake coverage
4. ✅ Schema placement guidance prevents adapter duplication
5. ✅ DI pattern guidance preserves hexagonal architecture
6. ✅ Refactoring methodology is accessible
7. ✅ TDD evidence documentation is clear
8. ✅ Every principle has WHY explained, not just WHAT

---

## Questions for Stakeholders

1. **Priority agreement:** Do you agree with CRITICAL vs HIGH vs MEDIUM prioritization?
2. **Timing:** Can we commit 1 week to CRITICAL restorations immediately?
3. **Testing:** How should we verify restored skills work correctly?
4. **Audit:** Should we create a formal audit trail of what was lost and restored?

---

## Appendix: Content Distribution

**v2.0.0 Global Content:** 2,560 lines (excluding project-specific)
**v3.0.0 Current:** 1,436 lines (CLAUDE.md 109 + skills 1,327)
**v3.0.0 Target:** 3,150 lines (CLAUDE.md 109 + skills 3,041)
**Currently Missing:** 1,714 lines (48% of target)

**By Skill:**

| Skill             | Target | Current | Missing | % Missing                                 |
| ----------------- | ------ | ------- | ------- | ----------------------------------------- |
| typescript-strict | 900    | 49      | 851     | 94%                                       |
| tdd               | 320    | 53      | 267     | 83%                                       |
| functional        | 300    | 73      | 227     | 76%                                       |
| refactoring       | 200    | 58      | 142     | 71%                                       |
| testing           | 600    | 451     | 149     | 25% ✅                                    |
| expectations      | 150    | 75      | 75      | 50%                                       |
| planning          | 230    | 327     | -97     | Expanded ✅ (but lost 100 lines coverage) |
