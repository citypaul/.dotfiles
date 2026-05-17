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

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:$PATH" \
  "$REPO_ROOT/install-claude.sh" \
    --skills-only \
    --no-impeccable \
    --no-claude-code \
    --agent codex \
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

assert_npx_call "--yes skills add vercel-labs/next-skills -g -a codex -s * -y"
assert_output "vercel-labs/next-skills"

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed${NC}"
  exit 0
fi
