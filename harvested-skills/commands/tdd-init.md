---
description: Initialize TDD workflow in existing project - setup tracking and assessment
category: tdd/initialization
tags: [tdd, setup, initialization, existing-projects]
version: 1.0.0
created: 2025-11-17
---

Initializing TDD workflow for this project...

**Step 1**: Detect project type

[Scan for package.json, pyproject.toml, go.mod, etc.]

**Step 2**: Detect test framework

[Check for jest, vitest, pytest, go test, etc.]

**Step 3**: Assess current state

```bash
# Count existing tests
TEST_FILES=$(find . -type f \( -name "*.test.*" -o -name "*_test.*" -o -name "test_*" \))
TEST_COUNT=$(echo "$TEST_FILES" | wc -l)

# Count production files
PROD_FILES=$(find . -type f \( -name "*.ts" -o -name "*.py" -o -name "*.go" \) | grep -v test)
PROD_COUNT=$(echo "$PROD_FILES" | wc -l)

# Calculate coverage ratio
RATIO=$(echo "scale=2; $TEST_COUNT / $PROD_COUNT" | bc)
```

**Step 4**: Generate integration strategy

```markdown
## TDD Integration Report

### Project Details
- **Type**: [typescript/javascript/python/go]
- **Test Framework**: [jest/pytest/go-test]
- **Existing Tests**: [count]
- **Production Files**: [count]
- **Coverage Ratio**: [ratio]

### Integration Strategy

**Phase 1** (Immediate): Strict TDD for new features
- All new code: RED-GREEN-REFACTOR
- State tracking: .tdd-state.json
- Pre-commit hooks: Enforce workflow

**Phase 2** (Week 2): Characterization tests for modifications
- Before touching legacy code: Add characterization test
- Document current behavior
- Then modify with test safety net

**Phase 3** (Month 2+): Incremental coverage improvement
- Set monthly coverage targets
- Test opportunistically when touching code
- Track metrics: .tdd-metrics.jsonl

### Next Steps

1. Create state file: `.tdd-state.json`
2. Setup pre-commit hook: `.git/hooks/pre-commit`
3. Start first feature with `/tdd-red`

Ready to begin TDD workflow?
```

**Step 5**: Create state file

```bash
cat > .tdd-state.json <<EOF
{
  "currentPhase": "IDLE",
  "projectType": "[detected-type]",
  "testFramework": "[detected-framework]",
  "initialized": "$(date -I)",
  "metrics": {
    "cyclesCompleted": 0,
    "coverageStart": "[initial-ratio]"
  }
}
EOF
```

**Step 6**: Setup pre-commit hook

```bash
cat > .git/hooks/pre-commit <<'EOF'
#!/bin/bash
# TDD Workflow Enforcement

if [ -f ".tdd-state.json" ]; then
  PHASE=$(jq -r '.currentPhase' .tdd-state.json)

  if [ "$PHASE" == "RED" ]; then
    echo "❌ Cannot commit in RED phase - test must pass first"
    exit 1
  fi

  # Run tests before commit
  npm test || pytest || go test ./...
  if [ $? -ne 0 ]; then
    echo "❌ Tests failing - cannot commit"
    exit 1
  fi
fi
EOF

chmod +x .git/hooks/pre-commit
```

**TDD workflow ready!** Start your first cycle with `/tdd-red`
