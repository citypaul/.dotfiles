#!/usr/bin/env bash
#
# Guard the mutation-testing cadence across the distributed workflow docs.
# Automated mutation runs belong to one accumulated-scope PR-readiness gate,
# not to every RED-GREEN increment or commit.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAUDE_ROOT="$REPO_ROOT/claude/.claude"
FAILURES=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

fail() {
  echo -e "${RED}FAIL${NC}: $1"
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo -e "${GREEN}PASS${NC}: $1"
}

require_text() {
  local file="$1" pattern="$2" label="$3"

  if grep -Fq "$pattern" "$file"; then
    pass "$label"
  else
    fail "$label"
  fi
}

reject_text() {
  local pattern="$1" label="$2"

  if grep -FRq "$pattern" "$CLAUDE_ROOT"; then
    fail "$label"
  else
    pass "$label"
  fi
}

echo "Testing end-of-phase mutation workflow..."
echo ""

require_text \
  "$CLAUDE_ROOT/skills/tdd/SKILL.md" \
  "## End-of-Phase PR-Readiness Gate" \
  "tdd: owns a separate PR-readiness mutation gate"

require_text \
  "$CLAUDE_ROOT/skills/mutation-testing/SKILL.md" \
  "Do not run it after each test, increment, refactor, or commit" \
  "mutation-testing: stays out of the inner TDD loop"

require_text \
  "$CLAUDE_ROOT/skills/planning/SKILL.md" \
  "run mutation testing once for the accumulated scope" \
  "planning: schedules one accumulated-scope mutation run"

require_text \
  "$CLAUDE_ROOT/commands/pr.md" \
  "Run \`mutation-testing\` once for the accumulated PR scope" \
  "pr command: executes the mutation gate at PR readiness"

reject_text \
  "RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR" \
  "workflow: deprecated per-increment mutation cycle is absent"

reject_text \
  "RED-GREEN with mutation or reviewed alternate evidence" \
  "workflow: deprecated mutation-in-RED-GREEN wording is absent"

reject_text \
  "Tests are green! Now let's run mutation testing" \
  "guardian: green no longer triggers the mutation harness"

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed${NC}"
