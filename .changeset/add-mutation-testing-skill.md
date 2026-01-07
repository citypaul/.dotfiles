---
"@paulhammond/dotfiles": minor
---

Add mutation testing skill for verifying test effectiveness

New skill that provides systematic guidance for mutation testing analysis:

- Comprehensive mutation operator reference (arithmetic, conditional, logical, boolean, etc.)
- Weak vs strong test pattern examples for each operator
- Systematic branch analysis process (4-step workflow)
- Equivalent mutant identification and handling
- Test strengthening patterns (boundary values, branch coverage, avoiding identity values)
- Integration with TDD workflow (verify after GREEN phase)
- Optional Stryker integration guide
- Quick reference for operators most likely to have surviving mutants

Key insight: Code coverage measures execution; mutation testing measures detection. A test suite with 100% coverage can still miss 40% of potential bugs if tests don't make proper assertions.
