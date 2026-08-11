#!/usr/bin/env bash
#
# Guard the canonical TDD watch policy and keep mirrored skills thin.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_ROOT="$REPO_ROOT/claude/.claude/skills"
TDD_SKILL="$SKILLS_ROOT/tdd/SKILL.md"
VITEST_REFERENCE="$SKILLS_ROOT/tdd/resources/vitest-watch-feedback.md"
FAILURES=0
TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tdd-watch-policy.XXXXXX")"

cleanup() {
  rm -rf "$TMP_DIR"
}

trap cleanup EXIT HUP INT TERM

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

  if grep -Fq -- "$pattern" "$file"; then
    pass "$label"
  else
    fail "$label"
  fi
}

require_regex() {
  local file="$1" pattern="$2" label="$3"

  if grep -Eiq -- "$pattern" "$file"; then
    pass "$label"
  else
    fail "$label"
  fi
}

reject_regex() {
  local file="$1" pattern="$2" label="$3"

  if grep -Eiq -- "$pattern" "$file"; then
    fail "$label"
  else
    pass "$label"
  fi
}

reject_skills_text() {
  local pattern="$1" label="$2"

  if grep -FRq -- "$pattern" "$SKILLS_ROOT"; then
    fail "$label"
  else
    pass "$label"
  fi
}

line_number() {
  local file="$1" pattern="$2"

  grep -n -m 1 -F -- "$pattern" "$file" | cut -d: -f1
}

require_before() {
  local file="$1" first="$2" second="$3" label="$4"
  local first_line second_line

  first_line="$(line_number "$file" "$first")"
  second_line="$(line_number "$file" "$second")"

  if [ -n "$first_line" ] && [ -n "$second_line" ] && [ "$first_line" -lt "$second_line" ]; then
    pass "$label"
  else
    fail "$label"
  fi
}

has_forbidden_vitest_claim() {
  local file="$1"

  grep -Eiv -- '(does not|do not|never|not limited to)' "$file" |
    grep -Eiq -- \
      '(--changed[^.]{0,160}(continuously|on every save|after every save)[^.]{0,160}(recomput|re-evaluat)|(continuously|on every save|after every save)[^.]{0,160}(recomput|re-evaluat)[^.]{0,160}(VCS|Git|--changed)|later (watch )?reruns[^.]{0,120}(only|limited to)[^.]{0,120}tests? (that )?(ran|executed) initially)'
}

assert_forbidden_claim_rejected() {
  local sentence="$1" label="$2"
  local fixture="$TMP_DIR/contradiction-$FAILURES.md"

  printf '%s\n' "$sentence" > "$fixture"
  if has_forbidden_vitest_claim "$fixture"; then
    pass "$label"
  else
    fail "$label"
  fi
}

is_vitest_watch_segment() {
  local segment="$1"
  local arguments

  if ! printf '%s\n' "$segment" | grep -Eq -- '(^|[[:space:]])vitest([[:space:]]|$)'; then
    return 1
  fi

  arguments="${segment#*vitest}"

  if printf '%s\n' "$arguments" | grep -Eq -- '(^|[[:space:]])watch([[:space:]]|$)|(^|[[:space:]])--watch(=true)?([[:space:]]|$)|(^|[[:space:]])-w(=true)?([[:space:]]|$)'; then
    return 0
  fi

  if printf '%s\n' "$arguments" | grep -Eq -- '(^|[[:space:]])(run|list|--run|--merge-reports|--help|-h|--version)([[:space:]]|$)|(^|[[:space:]])(--watch=false|-w=false)([[:space:]]|$)'; then
    return 1
  fi

  return 0
}

is_potential_vitest_watch_command() {
  local command="$1"
  local normalized segment

  normalized="${command//&&/$'\n'}"
  normalized="${normalized//||/$'\n'}"
  normalized="${normalized//;/$'\n'}"

  while IFS= read -r segment; do
    if is_vitest_watch_segment "$segment"; then
      return 0
    fi
  done <<< "$normalized"

  return 1
}

require_watch_form_detected() {
  local command="$1"

  if is_potential_vitest_watch_command "$command"; then
    pass "watch detector: rejects '$command' in finite automation"
  else
    fail "watch detector: rejects '$command' in finite automation"
  fi
}

require_finite_form_allowed() {
  local command="$1"

  if is_potential_vitest_watch_command "$command"; then
    fail "watch detector: allows terminating '$command'"
  else
    pass "watch detector: allows terminating '$command'"
  fi
}

echo "Testing canonical TDD watch workflow..."
echo ""

require_text \
  "$TDD_SKILL" \
  "Repository-owned commands take precedence over generic examples" \
  "tdd: repository-owned commands take precedence"

require_regex \
  "$TDD_SKILL" \
  '(Vitest|it) does not continuously recompute VCS impact after every save' \
  "tdd: changed watch is not described as continuous VCS selection"

require_text \
  "$TDD_SKILL" \
  "Later reruns are therefore not limited to tests that executed initially" \
  "tdd: retained graph is not confused with initial execution"

require_text \
  "$VITEST_REFERENCE" \
  "complete relevant development tier once" \
  "vitest reference: graph-complete repository watch is valid"

require_text \
  "$VITEST_REFERENCE" \
  "starts clean, reports no affected test files, then reruns the importing test after an implementation edit" \
  "vitest reference: records verified 4.1.10 clean-start behavior"

require_text \
  "$TDD_SKILL" \
  'stop it with `Ctrl+C`' \
  "tdd: watcher stop lifecycle is explicit"

require_text \
  "$TDD_SKILL" \
  "terminate the entire watcher process group" \
  "tdd: timeout cleanup covers the watcher process group"

require_text \
  "$TDD_SKILL" \
  'including bare `vitest` in an interactive TTY, `vitest watch`, `vitest --watch`, `vitest --watch=true`, `vitest -w`, and `vitest -w=true`' \
  "tdd: common hanging watch forms are recognized"

require_text \
  "$TDD_SKILL" \
  "Never invoke a watch command from CI, Git hooks, finite lint/test/build/verification scripts" \
  "tdd: finite automation cannot invoke watch mode"

require_text \
  "$TDD_SKILL" \
  "The sole exception is an isolated live-proof harness whose subject is the watcher itself" \
  "tdd: bounded live-proof harness is the sole finite exception"

require_text \
  "$TDD_SKILL" \
  'Finite Vitest commands must force termination with `vitest run`, `--run`, or `--watch=false`' \
  "tdd: finite Vitest forms are explicit"

require_text \
  "$TDD_SKILL" \
  '`vitest run --watch` and `vitest watch --watch=false` are not finite' \
  "tdd: positive watch intent wins over mixed finite markers"

require_text \
  "$TDD_SKILL" \
  "neither CI nor Vitest's agent detection disables it" \
  "tdd: bare Vitest auto-watch conditions include agent detection"

require_text \
  "$TDD_SKILL" \
  "Never rely on environment auto-detection to make a finite command terminate" \
  "tdd: finite commands do not rely on auto-detection"

require_text \
  "$VITEST_REFERENCE" \
  "Do not add custom filesystem listeners or call Vitest rerun APIs" \
  "vitest reference: native new-test discovery remains authoritative"

require_text \
  "$VITEST_REFERENCE" \
  "Assertions inspect output emitted after the implementation rerun, not a stale waiting marker" \
  "vitest reference: live proof rejects stale output"

require_text \
  "$VITEST_REFERENCE" \
  "Normal completion, spawn failure, early child exit, and forced timeout leave no watcher process or temporary directory behind" \
  "vitest reference: live proof checks all cleanup paths"

require_text \
  "$VITEST_REFERENCE" \
  "exact repository-owned command and real test configuration" \
  "vitest reference: proof exercises the real repository command and config"

require_text \
  "$VITEST_REFERENCE" \
  "while a graph-independent control test does not rerun" \
  "vitest reference: proof checks an unrelated negative control"

require_text \
  "$VITEST_REFERENCE" \
  "imports an implementation, and reruns when that implementation changes" \
  "vitest reference: newly discovered tests retain implementation edges"

require_text \
  "$VITEST_REFERENCE" \
  "including a headless agent filesystem" \
  "vitest reference: exact-command evidence may justify bounded polling"

require_text \
  "$TDD_SKILL" \
  "if it requires a proven watcher before the first edit, start it once now" \
  "tdd: repository start timing overrides the generic after-RED example"

require_regex \
  "$VITEST_REFERENCE" \
  'matching test created after startup is discovered and executed' \
  "vitest reference: live proof creates a test after startup"

require_regex \
  "$VITEST_REFERENCE" \
  'Changing an imported implementation reruns every affected test' \
  "vitest reference: live proof covers every affected implementation test"

require_regex \
  "$VITEST_REFERENCE" \
  'excluded from the development tier remain excluded' \
  "vitest reference: live proof preserves tier exclusions"

require_regex \
  "$VITEST_REFERENCE" \
  'changes execution tier is not incorrectly retained' \
  "vitest reference: live proof checks tier transitions"

require_regex \
  "$VITEST_REFERENCE" \
  'zero tests and `--passWithNoTests` are rejected as test evidence' \
  "vitest reference: live proof rejects empty success"

require_regex \
  "$VITEST_REFERENCE" \
  'committed clean VCS state.*initial zero-affected result as setup only.*edit an existing graph-visible implementation.*every importing test reruns' \
  "vitest reference: clean-start diff-selected claim has a dedicated proof"

require_text \
  "$VITEST_REFERENCE" \
  "restarting alone does not create the missing edge" \
  "vitest reference: non-graph dependencies require mapping or a wider tier"

require_text \
  "$VITEST_REFERENCE" \
  "type-only relationships, repository guards that scan files without importing them, browser-mode execution, and Docker-backed tiers" \
  "vitest reference: repository-specific blind spots remain explicit"

require_text \
  "$TDD_SKILL" \
  "This global guidance must never weaken a repository rule that invalidates evidence" \
  "tdd: stricter repository mutation policy wins"

require_text \
  "$REPO_ROOT/claude/.claude/skills/review/references/pr-readiness.md" \
  "The target repository's stricter mutation-evidence invalidation rule takes precedence" \
  "pr-readiness: stricter repository mutation policy wins at the decision point"

require_text \
  "$REPO_ROOT/claude/.claude/skills/review/references/pr-readiness.md" \
  "Run the repository-defined complete non-watch test gate against the final tree" \
  "pr-readiness: complete non-watch final-tree gate is mandatory"

require_before \
  "$TDD_SKILL" \
  "### Vitest Seed Semantics" \
  "### Watcher Lifecycle and Automation Safety" \
  "tdd: seed semantics precede lifecycle policy"

require_before \
  "$TDD_SKILL" \
  "### Watcher Lifecycle and Automation Safety" \
  "### Monorepos" \
  "tdd: lifecycle policy precedes monorepo boundaries"

if has_forbidden_vitest_claim "$TDD_SKILL" || has_forbidden_vitest_claim "$VITEST_REFERENCE"; then
  fail "canonical policy: no contradictory Vitest graph claim"
else
  pass "canonical policy: no contradictory Vitest graph claim"
fi

assert_forbidden_claim_rejected \
  "vitest --changed --watch continuously recomputes VCS impact after every save." \
  "policy checker: catches continuous VCS recomputation claim"

assert_forbidden_claim_rejected \
  "Later watch reruns are limited to tests that executed initially." \
  "policy checker: catches executed-tests-only graph claim"

for command in \
  "vitest" \
  "vitest --coverage" \
  "vitest watch" \
  "vitest --watch" \
  "vitest --watch=true" \
  "vitest -w" \
  "vitest -w=true" \
  "vitest run --watch" \
  "vitest run -w" \
  "vitest watch --watch=false" \
  "vitest --config vitest.config.ts --watch" \
  "vitest run && vitest" \
  "echo ready; vitest --config vitest.config.ts --watch" \
  "pnpm exec vitest --changed origin/main --watch"; do
  require_watch_form_detected "$command"
done

for command in \
  "vitest run" \
  "vitest --run" \
  "vitest --watch=false" \
  "vitest -w=false" \
  "vitest run --watch=false" \
  "vitest --config vitest.config.ts run" \
  "vitest --config vitest.config.ts list" \
  "vitest --merge-reports .vitest-reports --coverage" \
  "vitest run && vitest list" \
  "pnpm exec vitest run --coverage"; do
  require_finite_form_allowed "$command"
done

for skill in testing front-end-testing react-testing planning refactoring characterisation-tests; do
  require_text \
    "$SKILLS_ROOT/$skill/SKILL.md" \
    'the `tdd` skill' \
    "$skill: references canonical tdd policy"
done

reject_skills_text \
  "Initial affected-test run establishes the source graph" \
  "skills: old unconditional source-graph guarantee is absent"

reject_skills_text \
  "initial runner-selected affected run establishes the test-to-implementation graph" \
  "skills: old unconditional browser graph guarantee is absent"

reject_skills_text \
  "initial affected run establishes the module graph and subsequent implementation edits rerun related tests" \
  "skills: old unconditional implementation-rerun guarantee is absent"

reject_skills_text \
  "diff-seeded" \
  "skills: stale diff-seeded terminology is absent"

reject_regex \
  "$TDD_SKILL" \
  'runtime module graph populated by tests that have actually run' \
  "tdd: executed-tests-only graph explanation is absent"

for skill in testing front-end-testing react-testing planning refactoring characterisation-tests; do
  reject_regex \
    "$SKILLS_ROOT/$skill/SKILL.md" \
    'continuously recompute|clean-start regression|retained Vite module graph' \
    "$skill: canonical Vitest internals are not duplicated"
done

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed${NC}"
