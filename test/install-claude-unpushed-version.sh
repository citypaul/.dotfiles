#!/usr/bin/env bash
#
# The first-party pin defaults to the current checkout's HEAD. When that commit
# has never been pushed, the remote rejects it ("upload-pack: not our ref").
#
# Two things must hold:
#   1. Nothing is mutated first. The installer used to back up every selected
#      skill *before* fetching, so an unpushed HEAD stranded the user's whole
#      skills directory in a backup while the install aborted.
#   2. The error must name the actual cause. A bare git error sends the reader
#      hunting for a network or permissions problem rather than an unpushed
#      commit.
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

fail() { echo -e "${RED}FAIL${NC}: $1"; FAILURES=$((FAILURES + 1)); }
pass() { echo -e "${GREEN}PASS${NC}: $1"; }

HOME_DIR="$TMPDIR/home"
mkdir -p "$TMPDIR/bin" "$HOME_DIR/.claude/skills/tdd" "$HOME_DIR/.agents/skills/tdd"
echo "# existing" > "$HOME_DIR/.claude/skills/tdd/SKILL.md"
echo "# existing" > "$HOME_DIR/.agents/skills/tdd/SKILL.md"

# git: real for local queries, but any fetch of the pinned commit fails the way
# GitHub fails an unpushed SHA.
cat > "$TMPDIR/bin/git" <<'STUB'
#!/usr/bin/env bash
for arg in "$@"; do
  if [[ "$arg" == "fetch" ]]; then
    echo "fatal: remote error: upload-pack: not our ref" >&2
    exit 128
  fi
done
case "$1" in
  -C) sub="$3" ;;
  *)  sub="$1" ;;
esac
case "$sub" in
  rev-parse|show-ref|ls-remote|branch) exec /usr/bin/git "$@" ;;
esac
exit 0
STUB

# npx must never run: the install should abort before reaching the Skills CLI.
cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
touch "$NPX_MARKER"
exit 0
STUB
chmod +x "$TMPDIR/bin/git" "$TMPDIR/bin/npx"

echo "Testing unpushed pinned-revision handling..."
echo ""

set +e
OUTPUT=$(HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" NPX_MARKER="$TMPDIR/npx-called" \
  "$REPO_ROOT/install-claude.sh" --skills-only --no-external --no-impeccable 2>&1)
STATUS=$?
set -e

if [[ $STATUS -ne 0 ]]; then
  pass "an unfetchable first-party pin fails the install"
else
  fail "install must not report success when the pinned revision is unreachable"
fi

# 1. Nothing mutated.
if ! compgen -G "$HOME_DIR/.claude/skills.before-install.*" > /dev/null &&
   ! compgen -G "$HOME_DIR/.agents/skills.before-install.*" > /dev/null; then
  pass "no skills are backed up before the pin is verified"
else
  fail "an unreachable pin must not strand skills in a backup directory"
fi

if [[ -f "$HOME_DIR/.claude/skills/tdd/SKILL.md" ]]; then
  pass "existing skills are left in place"
else
  fail "existing skills must survive a failed pin verification"
fi

if [[ ! -e "$TMPDIR/npx-called" ]]; then
  pass "the Skills CLI is never invoked for an unreachable pin"
else
  fail "install must abort before invoking the Skills CLI"
fi

# 2. The error names the cause.
if printf '%s' "$OUTPUT" | grep -qi "not been pushed\|not pushed"; then
  pass "the error explains that the commit is not on the remote"
else
  fail "the error must name the unpushed commit as the cause"
fi

if printf '%s' "$OUTPUT" | grep -q -- "--version"; then
  pass "the error points at the --version remedy"
else
  fail "the error must tell the reader how to recover"
fi

echo ""
if [[ $FAILURES -gt 0 ]]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi
echo -e "${GREEN}All tests passed${NC}"
