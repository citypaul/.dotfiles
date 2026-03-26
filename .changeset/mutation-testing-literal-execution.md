---
"@paulhammond/dotfiles": minor
---

Mutation testing skill now instructs literal code mutation and test execution, not just analysis

**mutation-testing skill:**
- Replaced analytical "Generate Mental Mutants" process with literal mutate-run-revert cycles
- AI actually changes production code, runs the test suite, evaluates results, and reverts
- Produces a structured mutation testing report (killed/survived/score)
- Added nuance for surviving mutants: fix critical ones immediately, ask the human when value is unclear

**planning skill:**
- Added CONFIRM gate: human must approve acceptance criteria before each step begins
- Expanded cycle to RED-GREEN-REFACTOR-MUTATE-FIX with explicit "kill surviving mutants" step
- Human reviews mutation testing report and approves before every commit
- Step template now requires specific, observable acceptance criteria per step
- Clarified test level guidance: prefer unit tests (vitest) for logic, browser tests (vitest browser mode) for UI, Playwright only for end-to-end flows
- Now references `tdd` skill for workflow alongside `testing` skill for factory patterns
