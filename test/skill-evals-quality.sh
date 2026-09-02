#!/usr/bin/env bash
#
# Offline guard for the promptfoo quality suites in evals/skills.
#
# The suites spend tokens and are not run in CI. This test keeps their wiring
# honest without a network: every promptfooconfig.<suite>.yaml must have its
# fixture, its cases file and its grader module; every grader the config or a
# case names must be exported by that module; every hidden acceptance test a
# case names must exist; and COVERAGE.md must list every skill that has a
# suite.
#
# Usage:
#   ./test/skill-evals-quality.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EVAL_DIR="$REPO_ROOT/evals/skills"
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

echo "Testing the quality eval suites are wired correctly..."
echo ""

shopt -s nullglob
for config in "$EVAL_DIR"/promptfooconfig.*.yaml; do
  suite="$(basename "$config" .yaml)"
  suite="${suite#promptfooconfig.}"

  if [ -d "$EVAL_DIR/fixtures/$suite-workspace" ]; then
    pass "$suite: fixture exists"
  else
    fail "$suite: missing fixtures/$suite-workspace"
  fi

  cases="$EVAL_DIR/tests/$suite-quality.yaml"
  if [ -f "$cases" ]; then
    pass "$suite: cases file exists"
  else
    fail "$suite: missing tests/$suite-quality.yaml"
    continue
  fi

  if ! grep -q "file://tests/$suite-quality.yaml" "$config"; then
    fail "$suite: config does not point at tests/$suite-quality.yaml"
  fi

  # Every grader named as file://<module>.js:<fn> must be exported by <module>.
  grep -ohE "file://[a-z-]+\.js:[A-Za-z]+" "$config" "$cases" | sort -u | while read -r ref; do
    module="${ref#file://}"
    module="${module%%:*}"
    fn="${ref##*:}"
    if [ ! -f "$EVAL_DIR/$module" ]; then
      echo -e "${RED}FAIL${NC}: $suite: grader module $module not found"
      exit 1
    fi
    if ! node -e "const m=require('$EVAL_DIR/$module'); if (typeof m['$fn'] !== 'function') process.exit(1)"; then
      echo -e "${RED}FAIL${NC}: $suite: $module does not export $fn"
      exit 1
    fi
  done || fail "$suite: grader references broken (see above)"
  pass "$suite: every grader reference resolves"

  # Every hidden acceptance test a case names must exist.
  grep -oE "acceptance: [A-Za-z0-9._-]+" "$cases" | awk '{print $2}' | sort -u | while read -r name; do
    if [ ! -f "$EVAL_DIR/tests/$suite/acceptance/$name" ]; then
      echo -e "${RED}FAIL${NC}: $suite: hidden test tests/$suite/acceptance/$name not found"
      exit 1
    fi
  done || fail "$suite: hidden test references broken (see above)"
  pass "$suite: every hidden acceptance test exists"

  if grep -qE "^\| [a-z-]+ \| [AB—] \| " "$EVAL_DIR/COVERAGE.md" && grep -qE "\| $suite |\| hexagonal-architecture |\| domain-driven-design " "$EVAL_DIR/COVERAGE.md"; then
    pass "$suite: tracked in COVERAGE.md"
  else
    fail "$suite: not tracked in COVERAGE.md"
  fi
done

echo ""
if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES failure(s)${NC}"
  exit 1
fi
echo -e "${GREEN}All quality-suite wiring checks passed${NC}"
