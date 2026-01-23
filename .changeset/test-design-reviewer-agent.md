---
"@paulhammond/dotfiles": minor
---

Add test-design-reviewer agent for evaluating test quality using Dave Farley's principles

New agent that scores tests on 8 properties and provides a comprehensive Farley Score:

- **test-design-reviewer** agent: Evaluates test quality against Dave Farley's testing best practices
- Scores 8 properties: Understandable, Maintainable, Repeatable, Atomic, Necessary, Granular, Fast, First (TDD)
- Calculates weighted Farley Score (1-10) with detailed breakdown
- Provides actionable recommendations prioritized by impact
- Identifies test brittleness, maintenance issues, and TDD violations

The agent helps developers write tests that serve as living documentation and reliable safety nets. It provides specific evidence for each score and suggests concrete improvements with code examples.

**Usage examples:**

- Proactive: "I'm about to write tests for the payment module, what should I focus on?"
- Reactive: "Review my authentication tests and score them"
- Diagnostic: "Our tests keep breaking during refactors, why?"

**Attribution:** This agent is adapted from [Andrea Laforgia's claude-code-agents repository](https://github.com/andlaf-ak/claude-code-agents/blob/main/test-design-reviewer.md). Special thanks to Andrea for creating and sharing this comprehensive test design review framework.

**Documentation updates:**

- Updated agent count from 9 to 10 across all documentation
- Added test-design-reviewer to installation scripts
- Added attribution to Andrea Laforgia in Acknowledgments section
- Added comprehensive agent description in main README
- Updated agents README with detailed test-design-reviewer section

**Reference:** Based on Dave Farley's Properties of Good Tests: https://www.linkedin.com/pulse/tdd-properties-good-tests-dave-farley-iexge/
