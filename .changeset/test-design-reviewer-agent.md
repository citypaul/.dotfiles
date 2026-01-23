---
"@paulhammond/dotfiles": minor
---

Add test-design-reviewer skill for evaluating test quality using Dave Farley's principles

New skill that scores tests on 8 properties and provides a comprehensive Farley Score:

- **test-design-reviewer** skill: Evaluates test quality against Dave Farley's testing best practices
- Scores 8 properties: Understandable, Maintainable, Repeatable, Atomic, Necessary, Granular, Fast, First (TDD)
- Calculates weighted Farley Score (1-10) with detailed breakdown
- Provides actionable recommendations prioritized by impact
- Identifies test brittleness, maintenance issues, and TDD violations
- Runs in forked context using Explore agent for isolated analysis

The skill helps developers write tests that serve as living documentation and reliable safety nets. It provides specific evidence for each score and suggests concrete improvements with code examples.

**Why a skill instead of an agent:**

Skills are Anthropic's recommended pattern for analysis frameworks that should be auto-discovered by Claude. The test-design-reviewer is loaded on-demand when reviewing tests and can fork to an isolated context for analysis, providing the same capabilities as an agent while following modern Claude Code architecture patterns.

**Usage examples:**

- Auto-discovered when asking: "Review my authentication tests"
- Manual invocation: `/test-design-reviewer path/to/tests`
- Contextual analysis: "Are these tests maintainable?"

**Attribution:** This skill is adapted from [Andrea Laforgia's claude-code-agents repository](https://github.com/andlaf-ak/claude-code-agents/blob/main/test-design-reviewer.md). Special thanks to Andrea for creating and sharing this comprehensive test design review framework.

**Documentation updates:**

- Moved test-design-reviewer from agents to skills directory
- Updated skill count from 10 to 11 across all documentation
- Updated agent count from 10 to 9 across all documentation
- Converted frontmatter to skill format with `context: fork`
- Added test-design-reviewer to skills installation in install-claude.sh
- Removed test-design-reviewer from agents installation
- Updated attribution to clarify it's now a skill
- Added to Key Sections table in main README
- Removed agent section #10 from main README
- Removed from agents/README.md

**Reference:** Based on Dave Farley's Properties of Good Tests: https://www.linkedin.com/pulse/tdd-properties-good-tests-dave-farley-iexge/
