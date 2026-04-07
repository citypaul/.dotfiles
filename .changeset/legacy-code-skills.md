---
"@paulhammond/dotfiles": minor
---

Add finding-seams and characterisation-tests skills

Two new skills extracted from Michael Feathers' Working Effectively with Legacy Code (2004), adapted for TypeScript/JavaScript. These fill a gap in the existing skill set -- the current workflow (tdd, testing, mutation-testing, refactoring) assumes code is already testable. These two skills address the prerequisite step: making untestable legacy code testable and documenting its existing behavior before changing it.

**finding-seams** -- identify substitution points (seams) that make legacy or tightly-coupled code testable without editing at the call site:
- SKILL.md: core concept, seam types quick reference, how to find seams, progression from quick-fix to proper design
- resources/seam-types.md: module, object, function parameter, and configuration seams with TypeScript examples
- resources/creating-seams.md: six techniques for introducing seams (extract and override, parameterize method/constructor, extract interface, wrap static calls, module indirection)

**characterisation-tests** -- document actual behavior of existing code before making changes:
- SKILL.md: core concept, the 5-step algorithm, heuristics, handling bugs, temporary nature of characterisation tests
- resources/writing-process.md: worked example with targeted testing, sensing variables, pinch points
- resources/modern-tooling.md: Vitest snapshots, combination testing, non-determinism handling, approval testing, coverage-guided characterisation
