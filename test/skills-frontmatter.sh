#!/usr/bin/env bash
#
# Test that every skill's SKILL.md frontmatter parses the way the skills.sh
# installer (`npx skills add`) parses it.
#
# The installer reads the YAML frontmatter with a strict parser and silently
# drops any skill whose frontmatter fails to parse — the skill simply never
# lands in ~/.agents/skills/. The classic trap is an inline ": " (colon +
# space) inside an UNQUOTED `name:`/`description:` value: YAML reads that as a
# nested mapping and throws, so the whole skill disappears with no error.
# (This is exactly what hid the `double-check` skill.) A bare " #" in an
# unquoted value is the same kind of trap — it starts a comment.
#
# This guard fails loudly in CI instead of letting a skill vanish at install
# time.
#
# Usage:
#   ./test/skills-frontmatter.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/claude/.claude/skills"
FAILURES=0

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

# Check a single `key: value` frontmatter line for YAML plain-scalar hazards.
# Quoted values (starting with " or ') are left to the parser; only unquoted
# plain scalars are at risk.
check_scalar() {
  local skill="$1" key="$2" value="$3"

  # Trim leading whitespace from the value
  value="${value#"${value%%[![:space:]]*}"}"

  case "$value" in
    '"'*|"'"*)
      # Quoted scalar — the YAML parser handles escaping; nothing to flag.
      return 0
      ;;
  esac

  if printf '%s' "$value" | grep -q ': '; then
    fail "$skill: unquoted '$key' contains \": \" (breaks YAML — quote it or use an em dash)"
    return 1
  fi

  if printf '%s' "$value" | grep -q ' #'; then
    fail "$skill: unquoted '$key' contains \" #\" (YAML reads it as a comment — quote it)"
    return 1
  fi

  return 0
}

echo "Testing skill frontmatter parses for the skills.sh installer..."
echo ""

shopt -s nullglob
for skill_md in "$SKILLS_DIR"/*/SKILL.md; do
  skill="$(basename "$(dirname "$skill_md")")"

  # Frontmatter must open on line 1 and have a closing ---
  if ! head -1 "$skill_md" | grep -q '^---$'; then
    fail "$skill: SKILL.md does not start with '---' frontmatter"
    continue
  fi

  # Extract the frontmatter block (between the first two --- fences)
  frontmatter="$(awk 'NR==1{next} /^---$/{exit} {print}' "$skill_md")"

  name_line="$(printf '%s\n' "$frontmatter" | grep -m1 '^name:' || true)"
  desc_line="$(printf '%s\n' "$frontmatter" | grep -m1 '^description:' || true)"

  if [ -z "$name_line" ]; then
    fail "$skill: frontmatter missing 'name:'"
  fi
  if [ -z "$desc_line" ]; then
    fail "$skill: frontmatter missing 'description:'"
  fi

  ok=true
  [ -n "$name_line" ] && { check_scalar "$skill" "name" "${name_line#name:}" || ok=false; }
  [ -n "$desc_line" ] && { check_scalar "$skill" "description" "${desc_line#description:}" || ok=false; }

  if [ "$ok" = true ] && [ -n "$name_line" ] && [ -n "$desc_line" ]; then
    pass "$skill: frontmatter safe for skills.sh installer"
  fi
done

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed${NC}"
  exit 0
fi
