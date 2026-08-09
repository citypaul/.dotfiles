#!/usr/bin/env bash
#
# Verify the installer wires the selected external Next.js skills through
# skills.sh for the requested agent targets.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TMPDIR=$(mktemp -d)
FAILURES=0

cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

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

mkdir -p "$TMPDIR/bin" "$TMPDIR/home"
NPX_LOG="$TMPDIR/npx.log"
touch "$NPX_LOG"

cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$NPX_LOG"
STUB
chmod +x "$TMPDIR/bin/npx"

echo "Testing Next.js external skill installation..."
echo ""

export NPX_LOG

EXACT_COMMIT=$(git -C "$REPO_ROOT" rev-parse --verify HEAD)

set +e
BRANCH_OUTPUT=$(HOME="$TMPDIR/home" PATH="$TMPDIR/bin:$PATH" \
  "$REPO_ROOT/install-claude.sh" --skills-only --version develop \
    --no-external --no-impeccable 2>&1)
BRANCH_STATUS=$?
MISSING_OUTPUT=$(HOME="$TMPDIR/home" PATH="$TMPDIR/bin:$PATH" \
  "$REPO_ROOT/install-claude.sh" --version 2>&1)
MISSING_STATUS=$?
set -e

if [[ $BRANCH_STATUS -ne 0 ]] && printf '%s' "$BRANCH_OUTPUT" | grep -q 'not a full commit SHA or a tag'; then
  pass "moving branch names are rejected before installation"
else
  fail "installer must reject arbitrary branch names"
fi

if [[ $MISSING_STATUS -ne 0 ]] && printf '%s' "$MISSING_OUTPUT" | grep -q -- '--version requires a value'; then
  pass "missing --version value is rejected"
else
  fail "installer must validate the --version operand"
fi

if [[ ! -s "$NPX_LOG" ]]; then
  pass "invalid refs never invoke the skills CLI"
else
  fail "ref validation must happen before npx"
fi

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:$PATH" \
  "$REPO_ROOT/install-claude.sh" \
    --skills-only \
    --no-impeccable \
    --no-claude-code \
    --agent codex \
    --version "$EXACT_COMMIT" \
  > "$TMPDIR/output"

assert_npx_call() {
  local expected="$1"

  if grep -Fq -- "$expected" "$NPX_LOG"; then
    pass "$expected"
  else
    fail "missing npx call: $expected"
  fi
}

assert_output() {
  local expected="$1"

  if grep -Fq -- "$expected" "$TMPDIR/output"; then
    pass "output mentions $expected"
  else
    fail "output missing: $expected"
  fi
}

assert_npx_call "--yes skills@1.5.22 add vercel-labs/next-skills#b76d687cf3e026eac3b1032f610f06b47a56377c -g -a codex -s next-best-practices next-cache-components next-upgrade --copy -y"
assert_output "vercel-labs/next-skills"

if grep -Eq 'add (addyosmani/web-quality-skills|vercel-labs/next-skills|pbakaus/impeccable|https://github.com/mattpocock/skills|coreyhaines31/marketingskills|herdrdev/herdr)[^ ]* .* -s \* ' "$NPX_LOG"; then
  fail "external sources must never install an undeclared wildcard set"
else
  pass "external sources install only reviewed names"
fi

FIRST_PARTY_CALL=$(grep 'add citypaul/.dotfiles#' "$NPX_LOG" || true)
while IFS= read -r skill_file; do
  skill_name=$(basename "$(dirname "$skill_file")")
  if [[ " $FIRST_PARTY_CALL " != *" $skill_name "* ]]; then
    fail "first-party manifest missing $skill_name"
  fi
done < <(find "$REPO_ROOT/claude/.claude/skills" -mindepth 2 -maxdepth 2 -name SKILL.md -print)

if [[ "$FIRST_PARTY_CALL" == *"#"* ]] && [[ "$FIRST_PARTY_CALL" != *" -s * "* ]]; then
  pass "first-party source revision and complete name set are explicit"
else
  fail "first-party install must use a pinned source and declared names"
fi

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed${NC}"
  exit 0
fi
