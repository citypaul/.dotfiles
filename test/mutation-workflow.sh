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

  if grep -FRq "$pattern" "$CLAUDE_ROOT" || grep -Fq "$pattern" "$REPO_ROOT/README.md"; then
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
  "The target repository's stricter mutation-evidence invalidation rule takes precedence" \
  "pr command: target repository mutation invalidation takes precedence"

require_text \
  "$CLAUDE_ROOT/commands/pr.md" \
  "If a result is current under the applicable target-repository rule, do not rerun it" \
  "pr command: reuses only mutation evidence current under the applicable rule"

require_text \
  "$CLAUDE_ROOT/commands/pr.md" \
  "scoped to the accumulated branch diff per that skill's **Run and Triage** guidance" \
  "pr command: follows the mutation skill's diff-first scope"

require_text \
  "$CLAUDE_ROOT/commands/pr.md" \
  "survivor-fix commits already exercised by the gate's final branch-diff rerun" \
  "pr command: keeps exercised survivor fixes inside one gate"

require_text \
  "$CLAUDE_ROOT/CLAUDE.md" \
  "one PR-sized, independently mergeable slice" \
  "global workflow: defines the cadence boundary"

require_text \
  "$CLAUDE_ROOT/agents/refactor-scan.md" \
  "Do not run the mutation harness before or after every refactor" \
  "refactor-scan: defers mutation execution"

require_text \
  "$CLAUDE_ROOT/agents/progress-guardian.md" \
  "PRE-PR MUTATION or alternate evidence" \
  "progress: exposes the final gate"

require_text \
  "$CLAUDE_ROOT/skills/refactoring/SKILL.md" \
  "the baseline's strength is not yet mutation-harness-verified" \
  "refactoring: records deferred baseline risk"

require_text \
  "$CLAUDE_ROOT/skills/testing/SKILL.md" \
  "defer the automated mutation harness" \
  "testing: defers mutation execution"

require_text \
  "$CLAUDE_ROOT/skills/characterisation-tests/SKILL.md" \
  "defer the harness until the accumulated change reaches its chosen verification point" \
  "characterisation: defers automated mutation validation"

require_text \
  "$CLAUDE_ROOT/skills/characterisation-tests/resources/writing-process.md" \
  "run it once for the accumulated change at the repository's chosen verification point" \
  "characterisation writing process: defers the automated harness"

require_text \
  "$CLAUDE_ROOT/skills/characterisation-tests/resources/modern-tooling.md" \
  "run it once for the accumulated change at the chosen verification point" \
  "characterisation tooling: defers the automated harness"

require_text \
  "$CLAUDE_ROOT/skills/reduce-system-complexity/SKILL.md" \
  "defer the automated \`mutation-testing\` harness" \
  "complexity reduction: defers mutation execution"

require_text \
  "$CLAUDE_ROOT/commands/plan.md" \
  "PRE-PR MUTATION" \
  "plan command: includes the final gate"

require_text \
  "$CLAUDE_ROOT/commands/generate-pr-review.md" \
  "For production-code paths, once the current review boundary is otherwise PR-ready" \
  "review generation: scopes the PR-readiness mutation gate to production code"

require_text \
  "$CLAUDE_ROOT/skills/codebase-design/references/deepening.md" \
  "PR-readiness mutation or alternate-evidence gate" \
  "deepening: migration retirement waits for the final gate"

require_text \
  "$CLAUDE_ROOT/skills/structure-codebase/references/enforcement-and-migration.md" \
  "Do not run the automated mutation harness after each migration step" \
  "structure migration: keeps mutation out of each step"

require_text \
  "$REPO_ROOT/README.md" \
  "At PR readiness" \
  "repository workflow: points mutation testing at PR readiness"

require_text \
  "$CLAUDE_ROOT/agents/README.md" \
  "At end-of-phase PR readiness" \
  "agent routing: defers mutation to PR readiness"

reject_text \
  "RED-GREEN-MUTATE-KILL MUTANTS-REFACTOR" \
  "workflow: deprecated per-increment mutation cycle is absent"

reject_text \
  "RED-GREEN with mutation or reviewed alternate evidence" \
  "workflow: deprecated mutation-in-RED-GREEN wording is absent"

reject_text \
  "Tests are green! Now let's run mutation testing" \
  "guardian: green no longer triggers the mutation harness"

reject_text \
  "RED → GREEN → MUTATE OR ALTERNATE EVIDENCE → KILL MUTANTS WHEN APPLICABLE → REFACTOR WHEN APPLICABLE" \
  "workflow: deprecated arrow-form mutation cycle is absent"

reject_text \
  "RED → GREEN → MUTATE/KILL MUTANTS" \
  "workflow: deprecated compact arrow-form mutation cycle is absent"

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed${NC}"
