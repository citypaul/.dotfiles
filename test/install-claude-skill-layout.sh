#!/usr/bin/env bash
#
# Verify repeat installs back up selected existing skills, then let the pinned
# CLI replace them without touching unrelated content.
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

HOME_DIR="$TMPDIR/home"
SKILLS_DIR="$HOME_DIR/.claude/skills"
AGENTS_DIR="$HOME_DIR/.agents"

mkdir -p "$TMPDIR/bin" "$SKILLS_DIR" "$AGENTS_DIR/skills/linked-skill"

# Stub npx so no real install happens. If requested, it simulates copy mode
# replacing one selected skill directory.
cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
touch "$NPX_MARKER"
if [[ -n "${NPX_ARGS:-}" ]]; then
  printf '%s\n' "$@" >> "$NPX_ARGS"
fi
if [[ -d "$SIMULATED_DESTINATION" ]]; then
  mv "$SIMULATED_DESTINATION" "${SIMULATED_DESTINATION}.overwritten"
  mkdir -p "$SIMULATED_DESTINATION"
  echo "# installed" > "$SIMULATED_DESTINATION/SKILL.md"
fi
exit 0
STUB
chmod +x "$TMPDIR/bin/npx"

# Stub git so pinned-source fetches never hit the network; local read-only
# queries (version resolution) still reach the real git.
cat > "$TMPDIR/bin/git" <<'STUB'
#!/usr/bin/env bash
# The installer resolves the latest release from the remote when it cannot use
# a checkout HEAD, so the stub has to publish one tag. Everything else stays a
# no-op; local read-only queries reach the real git.
case "$*" in
  *ls-remote*--tags*)
    echo "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa	refs/tags/v4.12.1"
    exit 0 ;;
esac
for arg in "$@"; do
  case "$arg" in
    rev-parse|show-ref) exec /usr/bin/git "$@" ;;
  esac
done
exit 0
STUB
chmod +x "$TMPDIR/bin/git"

# 1. Old-CLI layout: a symlink into the universal ~/.agents/skills cache.
echo "# linked" > "$AGENTS_DIR/skills/linked-skill/SKILL.md"
ln -s "../../.agents/skills/linked-skill" "$SKILLS_DIR/linked-skill"

# 2. New-CLI layout: a regular directory tracked in the skills lock file.
mkdir -p "$SKILLS_DIR/managed-skill/agents"
echo "# managed" > "$SKILLS_DIR/managed-skill/SKILL.md"
cat > "$SKILLS_DIR/managed-skill/agents/openai.yaml" <<'YAML'
interface:
  display_name: "Managed Skill"
YAML
cat > "$AGENTS_DIR/.skill-lock.json" <<'LOCK'
{
  "version": 3,
  "skills": {
    "managed-skill": {
      "source": "citypaul/.dotfiles",
      "sourceType": "github",
      "skillPath": "claude/.claude/skills/managed-skill/SKILL.md",
      "installedAt": "2026-07-01T00:00:00.000Z"
    }
  },
  "dismissed": []
}
LOCK

# 3. User-created skill colliding with a selected first-party skill: a regular
# directory NOT in the lock file.
mkdir -p "$SKILLS_DIR/tdd"
echo "# custom tdd" > "$SKILLS_DIR/tdd/SKILL.md"

echo "Testing installer skill-layout handling..."
echo ""

set +e
OUTPUT=$(HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" \
  NPX_MARKER="$TMPDIR/npx-called" SIMULATED_DESTINATION="$SKILLS_DIR/tdd" \
  "$REPO_ROOT/install-claude.sh" --skills-only --no-external --no-impeccable 2>&1)
STATUS=$?
set -e

if [[ $STATUS -eq 0 ]]; then
  pass "repeat install replaces a selected Claude skill"
else
  fail "existing selected Claude skill should not block installation"
fi

if [[ -e "$TMPDIR/npx-called" ]]; then
  pass "skills CLI is invoked after backup"
else
  fail "skills CLI should run after backing up existing selected skills"
fi

# The previous content remains recoverable.
if compgen -G "$HOME_DIR/.claude/skills.before-install.*/tdd/SKILL.md" > /dev/null &&
   grep -q '# custom tdd' "$HOME_DIR"/.claude/skills.before-install.*/tdd/SKILL.md; then
  pass "replaced Claude skill is backed up"
else
  fail "installer must back up a selected Claude skill before replacement"
fi

if grep -q '# installed' "$SKILLS_DIR/tdd/SKILL.md"; then
  pass "selected Claude skill is refreshed"
else
  fail "selected Claude skill should be replaced after backup"
fi

# An unrelated lock-managed skill stays put.
if [[ -d "$SKILLS_DIR/managed-skill" && -f "$SKILLS_DIR/managed-skill/SKILL.md" ]]; then
  pass "stale or ambiguous lock-managed directory is left in place"
else
  fail "lock-managed skill directory must not be treated as legacy and moved"
fi

# Nested companion files stay with the managed skill bundle. In particular,
# Codex reads product metadata from agents/openai.yaml.
if grep -q 'display_name: "Managed Skill"' "$SKILLS_DIR/managed-skill/agents/openai.yaml"; then
  pass "lock-managed skill keeps nested agents/openai.yaml metadata"
else
  fail "installer must preserve the complete managed skill bundle"
fi

# The old-CLI symlink stays put.
if [[ -L "$SKILLS_DIR/linked-skill" ]]; then
  pass "symlinked skill is left in place"
else
  fail "symlinked skill must be left untouched"
fi

if ! printf '%s' "$OUTPUT" | grep -q "managed-skill"; then
  pass "unselected lock-managed skill is ignored"
else
  fail "installer should not inspect unrelated skill names"
fi

# Universal agents use the canonical ~/.agents/skills target. A Codex-only
# install refreshes selected names there without being blocked by Claude.
mkdir -p "$AGENTS_DIR/skills/tdd"
echo "# custom codex tdd" > "$AGENTS_DIR/skills/tdd/SKILL.md"

set +e
CODEX_OUTPUT=$(HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" \
  NPX_MARKER="$TMPDIR/npx-called-codex" SIMULATED_DESTINATION="$AGENTS_DIR/skills/tdd" \
  "$REPO_ROOT/install-claude.sh" --skills-only --no-claude-code --agent codex --no-external --no-impeccable 2>&1)
CODEX_STATUS=$?
set -e

if [[ $CODEX_STATUS -eq 0 ]] && [[ -e "$TMPDIR/npx-called-codex" ]] &&
   printf '%s' "$CODEX_OUTPUT" | grep -q 'Backing up'; then
  pass "Codex-only repeat install refreshes the canonical target"
else
  fail "existing Codex skill should not block installation"
fi

if compgen -G "$AGENTS_DIR/skills.before-install.*/tdd/SKILL.md" > /dev/null &&
   grep -q '# custom codex tdd' "$AGENTS_DIR"/skills.before-install.*/tdd/SKILL.md &&
   grep -q '# installed' "$AGENTS_DIR/skills/tdd/SKILL.md"; then
  pass "Codex skill is backed up and refreshed"
else
  fail "Codex replacement must remain recoverable"
fi

# Two per-agent clients with the same registry layout key still resolve to
# different global targets. Explicit --copy makes those the only destinations,
# so unrelated canonical Codex content must not block the install.
set +e
PAIR_OUTPUT=$(HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" \
  NPX_MARKER="$TMPDIR/npx-called-pair" NPX_ARGS="$TMPDIR/npx-args-pair" \
  SIMULATED_DESTINATION="$HOME_DIR/.qoder/skills/tdd" \
  "$REPO_ROOT/install-claude.sh" --skills-only --no-claude-code \
    --agent qoder --agent qoder-cn --no-external --no-impeccable 2>&1)
PAIR_STATUS=$?
set -e

if [[ $PAIR_STATUS -eq 0 ]] && [[ -e "$TMPDIR/npx-called-pair" ]]; then
  pass "explicit copy mode does not block per-agent targets on unrelated canonical content"
else
  fail "per-agent copy targets should not be coupled to ~/.agents/skills"
fi

if grep -Fxq -- '--copy' "$TMPDIR/npx-args-pair"; then
  pass "installer pins copy mode instead of relying on CLI layout heuristics"
else
  fail "skills CLI invocation must include --copy"
fi

if grep -q '# installed' "$AGENTS_DIR/skills/tdd/SKILL.md" &&
   printf '%s' "$PAIR_OUTPUT" | grep -q 'installed'; then
  pass "unselected canonical skill content remains untouched"
else
  fail "explicit copy mode must not mutate the unselected canonical store"
fi

echo ""
if [[ $FAILURES -gt 0 ]]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed${NC}"
