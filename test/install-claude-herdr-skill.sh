#!/usr/bin/env bash
#
# Verify the installer pulls the herdr skill from herdrdev/herdr for every
# target agent, and that --no-external opts out of it along with the other
# community sources.
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
GIT_LOG="$TMPDIR/git.log"
touch "$NPX_LOG" "$GIT_LOG"
export NPX_LOG GIT_LOG

# Record every skills.sh invocation instead of hitting the network
cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
printf 'npx %s\n' "$*" >> "$NPX_LOG"
STUB

cat > "$TMPDIR/bin/curl" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB

cat > "$TMPDIR/bin/claude" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB

cat > "$TMPDIR/bin/codex" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB

# Record pinned-source fetches instead of hitting the network, while local
# read-only queries (version resolution) still reach the real git.
cat > "$TMPDIR/bin/git" <<'STUB'
#!/usr/bin/env bash
# The installer resolves the latest release from the remote when it cannot use
# a checkout HEAD, so the stub has to publish one tag.
case "$*" in
  *ls-remote*--tags*)
    printf '%s\n' "$*" >> "$GIT_LOG"
    echo "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	refs/tags/v4.12.1"
    exit 0 ;;
esac
for arg in "$@"; do
  case "$arg" in
    rev-parse|show-ref) exec /usr/bin/git "$@" ;;
  esac
done
printf '%s
' "$*" >> "$GIT_LOG"
exit 0
STUB

chmod +x "$TMPDIR/bin/npx" "$TMPDIR/bin/curl" "$TMPDIR/bin/claude" "$TMPDIR/bin/codex" "$TMPDIR/bin/git"

echo "Testing herdr skill installation..."
echo ""

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --no-agents > "$TMPDIR/output"

if grep -Eq -- "skills@1.5.22 add [^ ]*skills-src-herdrdev-herdr[^ ]* -g -a claude-code -s herdr --copy -y" "$NPX_LOG" &&
   grep -q "fetch --quiet --depth 1 origin 1777e9bba32b953ed1ad203b4a16d01105539000" "$GIT_LOG"; then
  pass "installs the herdr skill for claude-code from a local pinned fetch"
else
  fail "missing herdr skill install for claude-code"
fi

echo ""
echo "Testing the herdr skill targets every requested agent..."
echo ""

: > "$NPX_LOG"

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --no-agents --agent codex > "$TMPDIR/output-codex"

if grep -Eq -- "skills@1.5.22 add [^ ]*skills-src-herdrdev-herdr[^ ]* -g -a claude-code -a codex -s herdr --copy -y" "$NPX_LOG"; then
  pass "installs the herdr skill for claude-code and codex"
else
  fail "herdr skill did not target both agents"
fi

echo ""
echo "Testing --no-external skips the herdr skill..."
echo ""

: > "$NPX_LOG"

HOME="$TMPDIR/home" \
PATH="$TMPDIR/bin:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --no-agents --no-external > "$TMPDIR/output-no-external"

if grep -Eq -- "herdr" "$NPX_LOG"; then
  fail "--no-external still installed the herdr skill"
else
  pass "--no-external makes no herdr skill install call"
fi

echo ""
echo "Testing the help text advertises the herdr source..."
echo ""

if "$REPO_ROOT/install-claude.sh" --help | grep -Fq -- "herdrdev/herdr#1777e9b --skill herdr"; then
  pass "help lists herdrdev/herdr as a default external source"
else
  fail "help does not mention the herdr skill source"
fi

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed${NC}"
  exit 0
fi
