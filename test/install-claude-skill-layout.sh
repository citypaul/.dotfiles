#!/usr/bin/env bash
#
# Verify the installer refuses to invoke the pinned installer while any target
# it may replace already contains skills. The v3 lock has no per-destination
# ownership, so neither an absent nor a present name proves a target disposable.
#
# skills@1.5.22 recursively replaces same-named destinations. The wrapper passes
# --copy explicitly, so the preflight must cover every selected resolved target
# and must not block on an unrelated canonical directory.
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

# Stub npx so no real install happens. If invoked, it simulates copy mode
# replacing the colliding directory; a correct preflight never calls it.
cat > "$TMPDIR/bin/npx" <<'STUB'
#!/usr/bin/env bash
touch "$NPX_MARKER"
if [[ -n "${NPX_ARGS:-}" ]]; then
  printf '%s\n' "$@" >> "$NPX_ARGS"
fi
if [[ -d "$SIMULATED_DESTINATION" ]]; then
  mv "$SIMULATED_DESTINATION" "${SIMULATED_DESTINATION}.overwritten"
fi
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

if [[ $STATUS -ne 0 ]]; then
  pass "installer refuses an existing Claude skill target"
else
  fail "installer must stop before a colliding unmanaged skill can be replaced"
fi

if [[ ! -e "$TMPDIR/npx-called" ]]; then
  pass "skills CLI is not invoked before the ownership conflict is resolved"
else
  fail "preflight must run before npx"
fi

# The custom directory stays untouched.
if [[ -f "$SKILLS_DIR/tdd/SKILL.md" ]] && grep -q '# custom tdd' "$SKILLS_DIR/tdd/SKILL.md"; then
  pass "colliding unmanaged skill directory is left untouched"
else
  fail "installer must preserve the colliding unmanaged skill"
fi

if printf '%s' "$OUTPUT" | grep -q "tdd"; then
  pass "installer identifies the Claude collision"
else
  fail "installer should report the unmanaged directory before stopping"
fi

# A lock entry does not bypass the destination preflight.
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

if printf '%s' "$OUTPUT" | grep -q "managed-skill"; then
  pass "lock name is not treated as destination ownership evidence"
else
  fail "preflight should list every existing destination entry"
fi

# Universal agents use the canonical ~/.agents/skills target. A Codex-only
# install must protect it without being blocked by an unrelated Claude target.
mkdir -p "$AGENTS_DIR/skills/tdd"
echo "# custom codex tdd" > "$AGENTS_DIR/skills/tdd/SKILL.md"

set +e
CODEX_OUTPUT=$(HOME="$HOME_DIR" PATH="$TMPDIR/bin:$PATH" \
  NPX_MARKER="$TMPDIR/npx-called-codex" SIMULATED_DESTINATION="$AGENTS_DIR/skills/tdd" \
  "$REPO_ROOT/install-claude.sh" --skills-only --no-claude-code --agent codex --no-external --no-impeccable 2>&1)
CODEX_STATUS=$?
set -e

if [[ $CODEX_STATUS -ne 0 ]] && [[ ! -e "$TMPDIR/npx-called-codex" ]]; then
  pass "Codex-only install is stopped before the canonical target can be replaced"
else
  fail "Codex canonical preflight must run before npx"
fi

if grep -q '# custom codex tdd' "$AGENTS_DIR/skills/tdd/SKILL.md" &&
   printf '%s' "$CODEX_OUTPUT" | grep -q "tdd"; then
  pass "Codex collision is reported and preserved"
else
  fail "Codex collision must remain recoverable"
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

if grep -q '# custom codex tdd' "$AGENTS_DIR/skills/tdd/SKILL.md" &&
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
