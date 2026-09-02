#!/usr/bin/env bash
#
# Offline guard for the promptfoo skill-routing suite in evals/skills.
#
# The suite itself spends tokens and is not run in CI. This test keeps its
# cases honest without a network: every skill a case expects (skill-used) or
# forbids (not-skill-used) must exist in claude/.claude/skills, so a skill
# rename or removal cannot silently turn a routing case into a no-op, and the
# runner must stay executable.
#
# Usage:
#   ./test/skill-evals-routing.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/claude/.claude/skills"
EVAL_DIR="$REPO_ROOT/evals/skills"
ROUTING="$EVAL_DIR/tests/routing.yaml"
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

echo "Testing the skill-routing eval suite references real skills..."
echo ""

if [ ! -f "$ROUTING" ]; then
  fail "missing $ROUTING"
  exit 1
fi

if [ -x "$EVAL_DIR/run.sh" ]; then
  pass "evals/skills/run.sh is executable"
else
  fail "evals/skills/run.sh is not executable"
fi

referenced="$(grep -oE 'type: (not-)?skill-used, value: [a-z0-9-]+' "$ROUTING" | awk '{print $NF}' | sort -u)"

if [ -z "$referenced" ]; then
  fail "no skill-used / not-skill-used assertions found in routing.yaml"
fi

for skill in $referenced; do
  if [ -f "$SKILLS_DIR/$skill/SKILL.md" ]; then
    pass "routing case references existing skill: $skill"
  else
    fail "routing case references unknown skill: $skill (no $SKILLS_DIR/$skill/SKILL.md)"
  fi
done

expected="$(grep -oE 'type: skill-used, value: [a-z0-9-]+' "$ROUTING" | awk '{print $NF}' | sort -u | wc -l | tr -d ' ')"
echo ""
echo "Routing suite expects $expected distinct skills to fire."

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES failure(s)${NC}"
  exit 1
fi
echo -e "${GREEN}All skill-eval routing checks passed${NC}"
