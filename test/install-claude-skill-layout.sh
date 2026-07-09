#!/usr/bin/env bash
#
# Verify the installer distinguishes skills-CLI-managed skill directories from
# genuine pre-skills.sh leftovers.
#
# Since skills CLI ~1.5, `npx skills add` COPIES each skill into
# ~/.claude/skills/<name> as a regular directory (tracked in
# ~/.agents/.skill-lock.json) instead of symlinking through the universal
# ~/.agents/skills/ cache. "Regular directory" therefore no longer means
# "legacy pre-skills.sh install". Without lock-file awareness the installer:
#   - moves every CLI-managed skill aside as "legacy" on each run, and
#   - warns after install that every skill "won't be visible to non-Claude
#     agents", telling the user to re-run --skills-only (which moves them
#     aside again) — an endless move-and-reinstall cycle that loses skills
#     if an install step fails after the move.
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

# Stub npx so no real install happens; the test exercises only the
# installer's own pre/post handling of ~/.claude/skills.
cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
exit 0
STUB
chmod +x "$TMPDIR/bin/npx"

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

# 3. Genuine pre-skills.sh leftover: a regular directory NOT in the lock file.
mkdir -p "$SKILLS_DIR/legacy-skill"
echo "# legacy" > "$SKILLS_DIR/legacy-skill/SKILL.md"

echo "Testing installer skill-layout handling..."
echo ""

OUTPUT=$(HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" \
  "$REPO_ROOT/install-claude.sh" --skills-only --no-external --no-impeccable 2>&1)

# The genuine leftover is migrated aside.
if [[ ! -e "$SKILLS_DIR/legacy-skill" ]] && compgen -G "$HOME_DIR/.claude/skills.pre-skills-sh."'*'"/legacy-skill" > /dev/null; then
  pass "unmanaged regular directory is migrated aside as pre-skills.sh legacy"
else
  fail "unmanaged regular directory should be moved to a .pre-skills-sh backup"
fi

# The CLI-managed copy stays put.
if [[ -d "$SKILLS_DIR/managed-skill" && -f "$SKILLS_DIR/managed-skill/SKILL.md" ]]; then
  pass "lock-managed skill directory is left in place"
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

# No post-install warning about the lock-managed copy.
if printf '%s' "$OUTPUT" | grep -q "managed-skill"; then
  fail "installer output should not flag the lock-managed skill (got a mention of managed-skill)"
else
  pass "no spurious 'won't be visible to non-Claude agents' warning for lock-managed skill"
fi

echo ""
if [[ $FAILURES -gt 0 ]]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed${NC}"
