# TDD Integration Guide for Existing Projects

**Version**: 1.0.0
**Created**: 2025-11-17
**For**: Teams adopting TDD incrementally in existing codebases

This guide provides a comprehensive roadmap for integrating Test-Driven Development into existing projects without requiring ground-up rewrites.

## Table of Contents

1. [Overview](#overview)
2. [Assessment Phase](#assessment-phase)
3. [Three-Tier Integration Model](#three-tier-integration-model)
4. [Implementation Roadmap](#implementation-roadmap)
5. [Enforcement Mechanisms](#enforcement-mechanisms)
6. [Language-Specific Patterns](#language-specific-patterns)
7. [Common Pitfalls](#common-pitfalls)
8. [Success Stories](#success-stories)

---

## Overview

### The Challenge

Integrating TDD into an existing codebase is different from greenfield TDD. You face:
- **Legacy code** without tests
- **Technical debt** accumulated over time
- **Team habits** to gradually shift
- **Business pressure** to keep delivering features

### The Solution: Incremental Adoption

This guide presents a **Three-Tier Model** that balances ideal TDD practices with pragmatic progress:

1. **Tier 1** (New Features): Strict TDD - zero tolerance
2. **Tier 2** (Modifications): Characterization tests before changes
3. **Tier 3** (Legacy Code): Opportunistic testing when touched

### Success Criteria

After 3 months, you should see:
- ✅ All new code developed test-first
- ✅ Coverage increasing consistently
- ✅ Fewer production bugs
- ✅ Team confidence in refactoring
- ✅ Faster feature delivery (after initial learning curve)

---

## Assessment Phase

### Step 1: Initialize TDD Workflow

```bash
# In Claude Code, run:
/tdd-init
```

This will:
1. Detect your project type (TypeScript/JavaScript/Python/Go)
2. Identify test framework (Jest/Vitest/pytest/go test)
3. Count existing tests vs production code
4. Generate integration assessment report
5. Create `.tdd-state.json` for workflow tracking
6. Setup pre-commit hooks for enforcement

### Step 2: Review Assessment Report

Example output:

```markdown
## TDD Integration Assessment

### Current State
- **Project Type**: TypeScript
- **Test Framework**: Jest
- **Existing Tests**: 45 files
- **Production Files**: 230 files
- **Coverage Ratio**: 0.20 (20% of files have tests)
- **Estimated Coverage**: ~35% (based on test file analysis)

### Integration Strategy

**Phase 1** (Weeks 1-2): Strict TDD for NEW features
- Enforce RED-GREEN-REFACTOR for all new code
- Use /tdd-red, /tdd-green, /tdd-refactor workflow
- Target: 100% coverage on new code

**Phase 2** (Weeks 3-4): Characterization tests for MODIFICATIONS
- Before touching legacy code: add characterization test
- Capture current behavior (even if imperfect)
- Then modify with TDD safety net

**Phase 3** (Month 2+): Incremental coverage of LEGACY code
- Test opportunistically when touching code
- Prioritize high-risk/frequently-changed areas
- Track coverage improvement weekly

### Recommended Actions
1. Copy TDD agents to .claude/agents/
2. Copy slash commands to .claude/commands/
3. Run /tdd-red to start first TDD cycle
4. Schedule team TDD training session
```

### Step 3: Set Baseline Metrics

```bash
# Run initial coverage report
npm test -- --coverage --json > .coverage-baseline.json

# Or for Python
pytest --cov --cov-report=json > .coverage-baseline.json

# Store baseline
jq '.total.lines.pct' .coverage-baseline.json > .tdd-baseline-coverage.txt
```

---

## Three-Tier Integration Model

### Tier 1: Strict TDD (New Features)

**Scope**: All new features, components, and modules

**Enforcement**: Zero tolerance for violations

**Process**:
1. Run `/tdd-red` - Write failing test describing behavior
2. Verify test fails (critical!)
3. Run `/tdd-green` - Implement MINIMUM code to pass
4. Verify test passes
5. Run `/tdd-refactor` - Assess improvement opportunities
6. Commit

**Example**: New Feature Implementation

```typescript
// STEP 1: RED - Write failing test
// File: src/discounts/discount-calculator.test.ts

describe("Discount calculator", () => {
  it("should apply 10% discount for premium users", () => {
    const user = createMockUser({ tier: 'premium' });
    const order = createMockOrder({ subtotal: 100 });
    
    const result = applyDiscount(order, user);
    
    expect(result.discountAmount).toBe(10);
    expect(result.total).toBe(90);
  });
});

// Run test: ❌ FAILS (applyDiscount doesn't exist yet)

// STEP 2: GREEN - Minimal implementation
// File: src/discounts/discount-calculator.ts

export const applyDiscount = (order: Order, user: User): DiscountedOrder => {
  const discountAmount = user.tier === 'premium' ? order.subtotal * 0.1 : 0;
  return {
    ...order,
    discountAmount,
    total: order.subtotal - discountAmount,
  };
};

// Run test: ✅ PASSES

// STEP 3: REFACTOR - Assess (already clean in this case)
// No refactoring needed - code is clear and simple

// COMMIT
git add .
git commit -m "feat(test): add test for premium discount (RED)
feat: implement premium discount (GREEN)"
```

**Enforcement Mechanisms**:
- Pre-commit hook blocks commits in RED phase
- tdd-guardian agent validates compliance
- .tdd-state.json tracks current phase

### Tier 2: Characterization Tests (Modifications)

**Scope**: Bug fixes and enhancements to existing code

**Enforcement**: Required before any changes

**Process**:
1. Write characterization test capturing CURRENT behavior
2. Verify test passes with existing code
3. Now you have safety net - modify with TDD
4. Refactor toward better implementation

**Example**: Fixing Bug in Legacy Code

```typescript
// STEP 1: Characterization Test (Document Current Behavior)
// File: src/legacy/payment-processor.test.ts

describe("Legacy payment processor (characterization)", () => {
  it("should process payment with current behavior", () => {
    const payment = {
      amount: 100,
      card: "4111111111111111",
      cvv: "123"
    };
    
    // Capture actual current behavior (even if buggy)
    const result = legacyProcessPayment(payment);
    
    // Use snapshot to capture complex output
    expect(result).toMatchSnapshot();
  });
  
  it("should handle edge case: zero amount", () => {
    const payment = { amount: 0, card: "4111111111111111", cvv: "123" };
    const result = legacyProcessPayment(payment);
    
    // Discovered: currently allows zero payments (bug!)
    expect(result.success).toBe(true); // Current behavior
  });
});

// Run tests: ✅ PASS (documenting current behavior)

// STEP 2: Now fix the bug with TDD
describe("Payment processor validation", () => {
  it("should reject zero amount payments", () => {
    const payment = { amount: 0, card: "4111111111111111", cvv: "123" };
    
    const result = processPayment(payment);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe("Amount must be positive");
  });
});

// STEP 3: Update implementation
export const processPayment = (payment: Payment): Result<Receipt, PaymentError> => {
  if (payment.amount <= 0) {
    return { success: false, error: "Amount must be positive" };
  }
  
  // Rest of implementation...
};

// STEP 4: Update characterization test to match new behavior
```

**Why Characterization Tests Matter**:
- Prevent regressions while changing legacy code
- Document actual behavior (even if imperfect)
- Provide safety net for refactoring
- Enable confident modifications

### Tier 3: Opportunistic Testing (Untouched Legacy)

**Scope**: Legacy code not currently being modified

**Enforcement**: None (no active changes)

**Strategy**: Test when you touch it

**Timeline Example**:

| Month | Focus | Coverage Target |
|-------|-------|-----------------|
| Month 1 | New features (Tier 1) + Bug fixes (Tier 2) | 20% → 35% |
| Month 2 | Continue + Test hotspots (frequently changed) | 35% → 50% |
| Month 3 | Continue + Test critical paths | 50% → 65% |
| Month 6 | Natural evolution | 65% → 80% |

**Hotspot Identification**:

```bash
# Find files changed most often (likely to need tests)
git log --format=format: --name-only | \
  grep -v "^$" | \
  sort | \
  uniq -c | \
  sort -rn | \
  head -20

# Output:
# 47 src/payment/payment-processor.ts  ← High priority
# 32 src/order/order-validator.ts      ← High priority
# 28 src/cart/cart-calculator.ts       ← High priority
# 15 src/user/user-service.ts
# ...
```

---

## Implementation Roadmap

### Week 1: Setup & Training

**Goals**:
- ✅ Tools installed and configured
- ✅ Team trained on TDD workflow
- ✅ First TDD cycle completed

**Actions**:

```bash
# Day 1: Installation
cp -r agents/* /project/.claude/agents/
cp -r commands/* /project/.claude/commands/
cp -r docs/* /project/.claude/docs/

# Day 2: Initialization
# In Claude Code:
/tdd-init

# Day 3: Team Training
# - RED-GREEN-REFACTOR overview
# - Hands-on: Simple feature with /tdd-red, /tdd-green, /tdd-refactor
# - Review assessment report together

# Day 4-5: First Real Feature
# - Choose simple new feature
# - Pair programming with TDD
# - Complete full cycle

# End of Week: Review
# - Check .tdd-state.json metrics
# - Celebrate first TDD cycles completed
```

**Success Metrics**:
- [ ] All developers ran first TDD cycle
- [ ] .tdd-state.json shows cycles completed
- [ ] Pre-commit hooks working
- [ ] No TDD violations in week's commits

### Weeks 2-4: New Features Only

**Goals**:
- ✅ All new features use strict TDD
- ✅ Build TDD muscle memory
- ✅ Achieve 100% coverage on new code

**Actions**:

```markdown
**For Every New Feature**:
1. /tdd-red → Write failing test
2. Verify test fails ← CRITICAL
3. /tdd-green → Minimal implementation
4. /tdd-refactor → Assess quality
5. Commit with RED-GREEN-REFACTOR message
6. Repeat

**Daily Standup Questions**:
- How many TDD cycles completed yesterday?
- Any TDD violations caught?
- What did you learn about TDD?

**Weekly Review**:
- Coverage trending up? (check .tdd-metrics.jsonl)
- Any persistent violations? (address in retro)
- Adjust workflow if needed
```

**Success Metrics**:
- [ ] 20+ TDD cycles completed
- [ ] Zero violations on new code
- [ ] Coverage on new files: 100%
- [ ] Team: "TDD feels more natural"

### Weeks 3-6: Add Characterization Tests

**Goals**:
- ✅ All bug fixes have tests first
- ✅ Modifications to legacy code are tested
- ✅ Team comfortable with characterization tests

**Actions**:

```markdown
**Before Fixing Any Bug**:
1. Write test that reproduces the bug
2. Verify test fails (confirming bug exists)
3. Fix with TDD (test drives fix)
4. Add edge case tests

**Before Modifying Legacy Code**:
1. Add characterization test (current behavior)
2. Verify test passes (safety net established)
3. Now modify with TDD

**Example Workflow**:

// User reports: "Negative amounts allowed in payments"

Step 1: Write test reproducing bug
it("should reject negative payment amounts", () => {
  const payment = getMockPayment({ amount: -100 });
  const result = processPayment(payment);
  
  expect(result.success).toBe(false); // This should pass but doesn't (bug!)
});

Step 2: Run test → ❌ FAILS (bug confirmed)

Step 3: Fix implementation
export const processPayment = (payment: Payment) => {
  if (payment.amount <= 0) {
    return { success: false, error: "Invalid amount" };
  }
  // ...
};

Step 4: Run test → ✅ PASSES (bug fixed)

Step 5: Add edge cases
it("should reject zero amount", () => { ... });
it("should accept minimum valid amount", () => { ... });
```

**Success Metrics**:
- [ ] All bugs have regression tests
- [ ] No untested modifications to legacy code
- [ ] Coverage of modified areas: 80%+
- [ ] Characterization tests: 20+

### Month 2+: Continuous Improvement

**Goals**:
- ✅ TDD is default workflow
- ✅ Opportunistic legacy testing
- ✅ Coverage > 75%

**Actions**:

```markdown
**Ongoing**:
- Continue Tier 1 & 2 enforcement
- Identify high-risk legacy code
- Test opportunistically
- Celebrate improvements

**Monthly Team Review**:
- Review .tdd-metrics.jsonl trends
- Identify coverage gaps
- Set next month's target
- Share learnings

**Quarterly Refactoring Sprint**:
- Dedicate 1 week to testing legacy hotspots
- Use characterization tests heavily
- Aim for +10% coverage
```

**Success Metrics**:
- [ ] TDD cycles: 100+
- [ ] Coverage: 75%+
- [ ] Bugs: 50% reduction
- [ ] Team: "Can't imagine working without tests"

---

## Enforcement Mechanisms

### 1. Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Load TDD state
if [ ! -f ".tdd-state.json" ]; then
  echo "⚠️  TDD not initialized. Run: /tdd-init"
  exit 0
fi

PHASE=$(jq -r '.currentPhase' .tdd-state.json)

case $PHASE in
  "RED")
    echo "❌ BLOCKED: Cannot commit in RED phase"
    echo "Complete the failing test first"
    echo "Run: /tdd-green once test is failing"
    exit 1
    ;;
    
  "GREEN"|"REFACTOR")
    echo "Running tests..."
    npm test || pytest || go test ./...
    
    if [ $? -ne 0 ]; then
      echo "❌ BLOCKED: Tests failing"
      echo "Fix tests before committing"
      exit 1
    fi
    
    echo "✅ Tests passing"
    ;;
    
  "IDLE")
    echo "✅ No active TDD cycle"
    ;;
esac

exit 0
```

### 2. CI/CD Integration

```yaml
# .github/workflows/tdd-validation.yml
name: TDD Validation

on: [pull_request]

jobs:
  validate-tdd:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0  # Full history for git analysis
          
      - name: Check TDD compliance
        run: |
          # Find changed production files
          CHANGED_FILES=$(git diff --name-only origin/main...HEAD | grep -v test)
          
          # For each changed file, verify test exists
          for file in $CHANGED_FILES; do
            # Convert src/foo.ts → src/foo.test.ts
            TEST_FILE=$(echo $file | sed 's/\.\(ts\|py\|go\)$/.test.\1/')
            
            if [ ! -f "$TEST_FILE" ]; then
              echo "❌ Missing test for: $file"
              echo "Expected test file: $TEST_FILE"
              exit 1
            fi
          done
          
      - name: Verify test coverage
        run: npm test -- --coverage
        
      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          
          if (( $(echo "$COVERAGE < 75" | bc -l) )); then
            echo "❌ Coverage below threshold: $COVERAGE%"
            echo "Target: 75%"
            exit 1
          fi
          
          echo "✅ Coverage: $COVERAGE%"
```

### 3. Metrics Dashboard

Create a simple dashboard to track TDD adoption:

```typescript
// scripts/tdd-dashboard.ts

import { readFileSync } from 'fs';

// Read metrics
const metrics = readFileSync('.tdd-metrics.jsonl', 'utf-8')
  .split('\n')
  .filter(line => line)
  .map(line => JSON.parse(line));

// Read current state
const state = JSON.parse(readFileSync('.tdd-state.json', 'utf-8'));

// Generate dashboard
console.log(`
# TDD Metrics Dashboard

## Current Sprint
- **Cycles Completed**: ${state.metrics.cyclesCompleted}
- **Violations Caught**: ${state.metrics.violationsCaught}
- **Current Coverage**: ${state.metrics.coverageNow.toFixed(1)}%
- **Coverage Δ**: +${(state.metrics.coverageNow - state.metrics.coverageStart).toFixed(1)}%

## Trend (Last 4 Weeks)
${metrics.slice(-4).map((m, i) => `
Week ${i + 1}: ${m.coverage.toFixed(1)}% coverage, ${m.cycles} cycles
`).join('')}

## This Week
- **Tests Added**: ${getTestsAddedThisWeek()}
- **Production Code Added**: ${getProdCodeAddedThisWeek()} lines
- **Test-to-Code Ratio**: ${getTestToCodeRatio()}

## Top Contributors (by TDD cycles)
${getTopContributors().map((c, i) => `
${i + 1}. ${c.name}: ${c.cycles} cycles
`).join('')}
`);
```

---

## Language-Specific Patterns

### TypeScript/JavaScript

**Test Pattern**:
```typescript
describe("Feature name", () => {
  it("should behave as expected", () => {
    // Arrange
    const input = createMockInput();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toEqual(expected);
  });
});
```

**Factory Pattern**:
```typescript
const createMockInput = (overrides?: Partial<Input>): Input => {
  return {
    field1: "default",
    field2: 42,
    ...overrides,
  };
};
```

**Frameworks**: Jest, Vitest
**Coverage**: `npm test -- --coverage`

### Python

**Test Pattern**:
```python
import pytest

def test_feature_behavior():
    # Arrange
    input_data = create_mock_input()
    
    # Act
    result = function_under_test(input_data)
    
    # Assert
    assert result == expected
```

**Factory Pattern**:
```python
def create_mock_input(**overrides):
    defaults = {
        "field1": "default",
        "field2": 42,
    }
    return {**defaults, **overrides}
```

**Frameworks**: pytest, unittest
**Coverage**: `pytest --cov`

### Go

**Test Pattern**:
```go
func TestFeatureBehavior(t *testing.T) {
    // Arrange
    input := createMockInput()
    
    // Act
    result := FunctionUnderTest(input)
    
    // Assert
    if result != expected {
        t.Errorf("Expected %v, got %v", expected, result)
    }
}
```

**Factory Pattern**:
```go
func createMockInput(overrides ...func(*Input)) Input {
    input := Input{
        Field1: "default",
        Field2: 42,
    }
    
    for _, override := range overrides {
        override(&input)
    }
    
    return input
}
```

**Frameworks**: testing (built-in)
**Coverage**: `go test -cover`

---

## Common Pitfalls & Solutions

### Pitfall 1: "We don't have time for TDD"

**Myth**: TDD takes longer

**Reality**: TDD saves time by catching bugs early

```
Without TDD:
Write code (2h) → Manual test (1h) → Debug (2h) → Deploy → Bug (4h) = 9h

With TDD:
Write test (20m) → Write code (1.5h) → Refactor (20m) → Deploy = 2.5h
```

**Solution**: Track time spent debugging vs testing
- Week 1-2: TDD may feel slower (learning curve)
- Week 3+: Velocity increases, debugging decreases
- Month 2+: Significantly faster due to confidence

### Pitfall 2: "Our codebase is too big to test"

**Myth**: Must test everything before starting TDD

**Reality**: Incremental adoption works

**Solution**: Three-Tier Model
- Tier 1: New code (100% coverage)
- Tier 2: Modified code (characterization tests)
- Tier 3: Legacy (test when touched)

**Progress Example**:
- Month 1: 20% → 35% coverage
- Month 2: 35% → 50% coverage
- Month 6: 50% → 80% coverage

### Pitfall 3: "Tests are slowing us down"

**Myth**: All tests must be slow

**Reality**: Slow tests indicate architectural issues

**Solution**: Test pyramid
- Fast unit tests (<1s): 70%
- Medium integration tests (<10s): 20%
- Slow E2E tests (run in CI): 10%

```typescript
// Fast unit test (pure function)
it("calculates discount", () => {
  expect(calculateDiscount(100, 0.1)).toBe(10);
}); // <1ms

// Medium integration test (with mocks)
it("processes payment", async () => {
  mockGateway.charge.mockResolvedValue({ success: true });
  const result = await processPayment(payment);
  expect(result.success).toBe(true);
}); // <100ms

// Slow E2E test (full stack)
it("completes checkout flow", async () => {
  await browser.goto('/checkout');
  await browser.fillForm({ ... });
  await browser.clickSubmit();
  expect(await browser.getConfirmation()).toContain("Order placed");
}); // 2-5s
```

### Pitfall 4: "Tests break every time we refactor"

**Myth**: Tests should verify implementation

**Reality**: Tests should verify behavior (public API)

**Solution**: Test WHAT, not HOW

```typescript
// ❌ BAD - Testing implementation
it("should call validatePayment", () => {
  const spy = jest.spyOn(processor, 'validatePayment');
  processPayment(payment);
  expect(spy).toHaveBeenCalled(); // Brittle!
});

// ✅ GOOD - Testing behavior
it("should reject invalid payments", () => {
  const result = processPayment(invalidPayment);
  expect(result.success).toBe(false);
  expect(result.error).toBe("Invalid payment");
});
```

When refactoring, behavior tests stay green while implementation changes.

### Pitfall 5: "We keep forgetting to run /tdd-red"

**Solution**: Make it automatic

```bash
# Add to .bashrc or .zshrc
alias feature="echo 'Starting TDD cycle...' && /tdd-red"

# Or create git alias
git config --global alias.feature '!echo "Run /tdd-red in Claude Code"'
```

**Better**: Use `wip-guardian` agent for complex features
- Creates living plan (WIP.md)
- Tracks TDD cycles automatically
- Orchestrates all agents

---

## Success Stories

### Case Study 1: E-commerce Platform (TypeScript)

**Before TDD**:
- Coverage: 15%
- Production bugs: 12/month
- Deployment confidence: Low
- Refactoring fear: High

**Approach**:
- Week 1: Initialized TDD with /tdd-init
- Weeks 2-4: Strict TDD for new checkout flow
- Month 2: Characterization tests for payment bugs
- Month 3: Refactored cart with test safety net

**After 3 Months**:
- Coverage: 78%
- Production bugs: 2/month (83% reduction)
- Deployment confidence: High
- Refactoring fear: Low (tests provide safety)

**Key to Success**:
- Started with one critical feature (checkout)
- Used characterization tests for risky payment code
- Tracked metrics weekly
- Celebrated improvements in retros

### Case Study 2: API Service (Python/FastAPI)

**Challenge**: 50K LOC legacy Flask app, no tests

**Approach**:
1. **Week 1**: Setup pytest, ran /tdd-init
2. **Weeks 2-4**: All new endpoints with strict TDD (15 endpoints, 100% coverage)
3. **Month 2**: Bug fixes required tests first (caught 8 regressions)
4. **Month 3**: Refactored auth module (characterization tests first)

**Results**:
- Coverage: 18% → 65% in 3 months
- Team velocity increased (less debugging)
- Zero regression bugs in tested areas
- Migration to FastAPI successful (tests caught breaking changes)

**Key to Success**:
- New endpoints: Strict TDD
- Bug fixes: Test reproduces bug first
- Legacy refactoring: Characterization tests
- Metrics tracked in .tdd-metrics.jsonl

### Case Study 3: Mobile App (React Native/TypeScript)

**Challenge**: 2-year-old app, 30% coverage, frequent regressions

**Approach**:
- Month 1: TDD for all new features
- Month 2: React Testing Library for components
- Month 3: Characterization tests for critical flows
- Month 4: Refactored navigation with test safety

**Results**:
- Coverage: 30% → 82% in 4 months
- Release confidence: "Can deploy without fear"
- Bug fix time: 2 hours → 20 minutes average
- Feature delivery speed: +40% after initial learning

**Key to Success**:
- Used React Testing Library (tests user behavior)
- Factory functions for component props
- tdd-reference skill for quick guidance
- Team pair programming on TDD

---

## Next Steps

### Ready to Start?

1. **Initialize**:
   ```bash
   # In Claude Code
   /tdd-init
   ```

2. **Choose First Feature**:
   - Pick something small and contained
   - New functionality (not legacy modification)
   - Clear behavior to test

3. **Complete First Cycle**:
   ```bash
   /tdd-red      # Write failing test
   /tdd-green    # Implement minimum
   /tdd-refactor # Assess improvements
   git commit    # Complete cycle
   ```

4. **Track Progress**:
   ```bash
   # Check metrics
   cat .tdd-state.json | jq '.metrics'
   
   # View trend
   cat .tdd-metrics.jsonl | tail -5
   ```

5. **Expand Gradually**:
   - Week 1-2: New features
   - Week 3-4: Add characterization tests
   - Month 2+: Test opportunistically

### Resources

- **Agents**: Use `tdd-guardian`, `tdd-enforcer`, `refactor-scan`
- **Commands**: `/tdd-red`, `/tdd-green`, `/tdd-refactor`
- **Skill**: `tdd-reference` for quick guidance
- **Docs**: Read `docs/workflow.md` for deep dive

### Support

Questions? Check:
- `docs/testing.md` - Test quality principles
- `docs/workflow.md` - TDD process details
- `templates/` - Example patterns

---

**Remember**: TDD is a journey, not a destination. Progress > Perfection.

**Start small. Iterate. Improve. Celebrate wins.**

🎉 **Happy TDD Journey!** 🎉
