#!/usr/bin/env bash
#
# The installer has to work for anyone, anywhere: inside a checkout, from a
# stray copy of the script, or piped from curl. It still pins to an exact
# immutable revision — it just works out which one itself.
#
#   --version REF   what you asked for, always wins
#   HEAD            only when that commit is actually on the remote
#   latest release  everyone else
#
# The regression this guards: the default was the checkout's HEAD unconditionally,
# so a checkout with an unpushed commit — or no checkout at all — aborted the
# install, and did so only *after* every selected skill had been backed up.
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

RELEASE_SHA="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
mkdir -p "$TMPDIR/bin"

# git stub: the remote publishes one release tag and never lists the local HEAD,
# which is exactly what an unpushed commit looks like. Local queries stay real.
cat > "$TMPDIR/bin/git" <<STUB
#!/usr/bin/env bash
args="\$*"
case "\$args" in
  *ls-remote*--tags*)
    echo "$RELEASE_SHA	refs/tags/v4.12.1"
    exit 0 ;;
  *ls-remote*)
    echo "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb	refs/heads/main"
    exit 0 ;;
  *merge-base*) exit 1 ;;
  *fetch*)
    [[ -n "\${FETCH_MUST_FAIL:-}" ]] && { echo "fatal: remote error: upload-pack: not our ref" >&2; exit 128; }
    exit 0 ;;
  *rev-parse*|*show-ref*) exec /usr/bin/git "\$@" ;;
esac
# init / remote add / sparse-checkout / checkout: no-ops, no network.
exit 0
STUB

cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
printf '%s\n' "$*" >> "$NPX_LOG"
exit 0
STUB
chmod +x "$TMPDIR/bin/git" "$TMPDIR/bin/npx"

run_installer() {
  local dir="$1"; shift
  ( cd "$dir" && HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" NPX_LOG="$NPX_LOG" \
      "$dir/install-claude.sh" --skills-only --no-external --no-impeccable "$@" 2>&1 )
}

echo "Testing version resolution from anywhere..."
echo ""

# --- 1. A checkout whose HEAD was never pushed -------------------------------
HOME_DIR="$TMPDIR/home1"; NPX_LOG="$TMPDIR/npx1.log"
mkdir -p "$HOME_DIR/.claude/skills/tdd"; : > "$NPX_LOG"
echo "# mine" > "$HOME_DIR/.claude/skills/tdd/SKILL.md"

set +e
OUT=$(run_installer "$REPO_ROOT"); STATUS=$?
set -e

if [[ $STATUS -eq 0 ]]; then
  pass "an unpushed HEAD does not abort the install"
else
  fail "an unpushed HEAD must fall back instead of failing"
fi

if printf '%s' "$OUT" | grep -q "not on the remote"; then
  pass "the fallback is announced rather than silent"
else
  fail "the user must be told the pin changed"
fi

if grep -q "$RELEASE_SHA" "$NPX_LOG" 2>/dev/null ||
   printf '%s' "$OUT" | grep -q "$RELEASE_SHA"; then
  pass "the unpushed checkout installs the latest release"
else
  fail "the fallback must pin to the latest release commit"
fi

# --- 2. No checkout at all (a stray copy, or curl | bash) --------------------
HOME_DIR="$TMPDIR/home2"; NPX_LOG="$TMPDIR/npx2.log"
LOOSE="$TMPDIR/loose"; mkdir -p "$LOOSE" "$HOME_DIR"; : > "$NPX_LOG"
cp "$REPO_ROOT/install-claude.sh" "$LOOSE/"

set +e
OUT2=$(run_installer "$LOOSE"); STATUS2=$?
set -e

if [[ $STATUS2 -eq 0 ]]; then
  pass "a copy outside any checkout installs"
else
  fail "the installer must work outside a git checkout"
fi

if printf '%s' "$OUT2" | grep -q "$RELEASE_SHA"; then
  pass "no checkout pins to the latest release"
else
  fail "outside a checkout the pin must be the latest release"
fi

# --- 3. An explicit --version that the remote cannot serve ------------------
# The pin is the user's own choice here, so it must fail — but only before
# anything on disk has been touched.
HOME_DIR="$TMPDIR/home3"; NPX_LOG="$TMPDIR/npx3.log"
mkdir -p "$HOME_DIR/.claude/skills/tdd"; : > "$NPX_LOG"
echo "# keep me" > "$HOME_DIR/.claude/skills/tdd/SKILL.md"

set +e
OUT3=$(FETCH_MUST_FAIL=1 run_installer "$REPO_ROOT" --version "$RELEASE_SHA"); STATUS3=$?
set -e

if [[ $STATUS3 -ne 0 ]]; then
  pass "an unreachable explicit --version fails the install"
else
  fail "an unreachable explicit pin must not report success"
fi

if ! compgen -G "$HOME_DIR/.claude/skills.before-install.*" > /dev/null; then
  pass "no skills are backed up before the pin is verified"
else
  fail "an unreachable pin must not strand skills in a backup directory"
fi

if grep -q "# keep me" "$HOME_DIR/.claude/skills/tdd/SKILL.md"; then
  pass "existing skills are left untouched"
else
  fail "existing skills must survive a failed pin verification"
fi

if [[ ! -s "$NPX_LOG" ]]; then
  pass "the Skills CLI is never invoked for an unreachable pin"
else
  fail "install must abort before invoking the Skills CLI"
fi

echo ""
if [[ $FAILURES -gt 0 ]]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi
echo -e "${GREEN}All tests passed${NC}"
