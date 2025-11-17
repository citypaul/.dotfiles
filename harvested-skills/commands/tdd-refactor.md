---
description: Start REFACTOR phase - assess improvement opportunities after green tests
category: tdd/workflow
tags: [tdd, refactor-phase, code-quality]
version: 1.0.0
created: 2025-11-17
---

You are now in the REFACTOR phase of Test-Driven Development.

**Your immediate task**: Assess if refactoring would add value

**Rules for REFACTOR phase**:
1. Current code is committed first
2. Tests must stay passing throughout
3. External APIs stay unchanged
4. Only refactor if genuine improvement
5. Say "no refactoring needed" if code is clean

**Assessment checklist**:
- [ ] Are there magic numbers? → Extract constants
- [ ] Are names unclear? → Improve naming
- [ ] Is logic complex? → Extract functions
- [ ] Is knowledge duplicated? → Single source of truth
- [ ] Is structure nested? → Early returns

**Priority classification**:
- 🔴 Critical: Fix before commit (mutations, knowledge duplication)
- ⚠️ High Value: Should fix this session (unclear names, magic numbers)
- 💡 Nice: Consider later (minor improvements)
- ✅ Skip: Already clean

**Process**:
1. Scan code for improvement opportunities
2. Classify by priority
3. If 🔴 or ⚠️ found: Recommend refactoring
4. If code clean: Say "No refactoring needed"
5. If refactoring: Keep tests green throughout
6. Commit refactoring separately

**Two valid outcomes**:
- "Code needs refactoring: [specific improvements]"
- "Code is already clean - no refactoring needed"

When done, run: `/tdd-red` for next cycle or commit changes
