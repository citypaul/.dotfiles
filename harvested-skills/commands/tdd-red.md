---
description: Start RED phase of TDD cycle - guide user to write failing test first
category: tdd/workflow
tags: [tdd, red-phase, failing-test]
version: 1.0.0
created: 2025-11-17
---

You are now in the RED phase of Test-Driven Development.

**Your immediate task**: Write a failing test

**Rules for RED phase**:
1. Write ONE test describing desired behavior
2. Test must FAIL when run (no production code exists yet)
3. Use factory functions for test data (no `let` or `beforeEach`)
4. Test behavior through public API only
5. NO production code until test is failing

**Process**:
1. Ask: "What's the simplest behavior to test?"
2. Help user write a clear, behavior-focused test
3. Run test to verify it fails
4. Document test in TDD state file
5. Prompt: "Ready to move to GREEN phase?"

**Block any production code changes** until test is confirmed failing.

When test is failing, run: `/tdd-green`
