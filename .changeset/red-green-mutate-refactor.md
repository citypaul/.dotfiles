---
"@paulhammond/dotfiles": minor
---

Reorder TDD cycle to RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR (credit: Eran Boudjnah)

**Core change:** Mutation testing now comes *before* refactoring in the TDD cycle, not after. You verify test strength before restructuring code, so you refactor with genuine confidence that your tests catch real bugs.

**Rename:** The "FIX" step (previously only in the planning skill) is renamed to "KILL MUTANTS" and promoted to a core step everywhere.

The full cycle is now: RED → GREEN → MUTATE → KILL MUTANTS → REFACTOR

**Why this order matters:** The previous RED-GREEN-REFACTOR-MUTATE ordering meant refactoring code whose test effectiveness was unverified. By mutating first, you validate your safety net before changing structure. This insight was pointed out by Eran Boudjnah on LinkedIn.

**tdd skill:**
- Core cycle updated to RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR
- MUTATE and KILL MUTANTS added as explicit phases with guidance
- Commit history examples updated to show mutation testing step
- Summary checklist includes mutation testing verification

**mutation-testing skill:**
- Integration diagram updated to show MUTATE as step 3 of the core cycle (not a separate validation step)
- Added rationale for why MUTATE comes before REFACTOR

**refactoring skill:**
- Repositioned as the final step of TDD (after mutation testing)
- Workflow updated to include MUTATE and KILL MUTANTS before refactoring

**planning skill:**
- Extended cycle reordered to CONFIRM-RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR-STOP
- Step template and quick reference updated

**plan command:**
- Step template reordered to match new cycle

**tdd-guardian agent:**
- Sacred Cycle updated to 5 steps
- Added MUTATE and KILL MUTANTS phase coaching guidance
- Response patterns updated to include mutation testing before refactoring

**refactor-scan agent:**
- Description updated: invoked after mutation testing, not after GREEN

**progress-guardian agent:**
- Workflow reference updated

**agents README:**
- All cycle references updated
- Workflow diagrams updated

**CLAUDE.md:**
- Core principle and quick reference updated

**README.md:**
- All workflow descriptions updated with new cycle and rationale

**REFERENCES.md:**
- Added Eran Boudjnah credit for the RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR reordering insight
