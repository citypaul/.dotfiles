#!/usr/bin/env bash
#
# Verify the installer registers the ponytail marketplace and installs the
# plugin for both Claude Code and Codex, and skips gracefully when a CLI
# is missing.
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
CLI_LOG="$TMPDIR/cli.log"
touch "$CLI_LOG"
export CLI_LOG

# Stub every external command the full install path shells out to
cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB

cat > "$TMPDIR/bin/curl" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB

cat > "$TMPDIR/bin/claude" <<'STUB'
#!/usr/bin/env bash
printf 'claude %s\n' "$*" >> "$CLI_LOG"
STUB

cat > "$TMPDIR/bin/codex" <<'STUB'
#!/usr/bin/env bash
printf 'codex %s\n' "$*" >> "$CLI_LOG"
STUB

chmod +x "$TMPDIR/bin/npx" "$TMPDIR/bin/curl" "$TMPDIR/bin/claude" "$TMPDIR/bin/codex"

echo "Testing ponytail plugin installation..."
echo ""

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --no-agents > "$TMPDIR/output"

assert_cli_call() {
  local expected="$1"

  if grep -Fq -- "$expected" "$CLI_LOG"; then
    pass "$expected"
  else
    fail "missing CLI call: $expected"
  fi
}

assert_cli_call "claude plugin marketplace add DietrichGebert/ponytail"
assert_cli_call "claude plugin install ponytail@ponytail"
assert_cli_call "codex plugin marketplace add DietrichGebert/ponytail"
assert_cli_call "codex plugin add ponytail@ponytail"

if grep -Fq -- "ponytail installed for claude" "$TMPDIR/output" \
  && grep -Fq -- "ponytail installed for codex" "$TMPDIR/output"; then
  pass "output reports ponytail installed for both CLIs"
else
  fail "output missing ponytail success messages"
fi

echo ""
echo "Testing missing codex CLI is skipped without failing..."
echo ""

rm "$TMPDIR/bin/codex"

if HOME="$TMPDIR/home" \
  PATH="$TMPDIR/bin:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --no-agents > "$TMPDIR/output-no-codex"; then
  pass "installer exits 0 when codex CLI is missing"
else
  fail "installer failed when codex CLI is missing"
fi

if grep -Fq -- "skipping ponytail for codex" "$TMPDIR/output-no-codex"; then
  pass "output mentions skipping ponytail for codex"
else
  fail "output missing codex skip message"
fi

echo ""
echo "Testing --no-ponytail skips the plugin entirely..."
echo ""

: > "$CLI_LOG"

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --no-agents --no-ponytail > "$TMPDIR/output-no-ponytail"

if grep -Fq -- "ponytail" "$CLI_LOG"; then
  fail "--no-ponytail still invoked plugin commands"
else
  pass "--no-ponytail makes no plugin CLI calls"
fi

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed${NC}"
  exit 0
fi
