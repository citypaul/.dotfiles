#!/usr/bin/env bash
#
# Test that agent and command files are valid for OpenCode after frontmatter transformation.
#
# Verifies the same sed transforms used in install-claude.sh produce files
# without Claude Code-specific fields that crash OpenCode on startup.
#
# Usage:
#   ./test/opencode-compat.sh
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$REPO_ROOT/claude/.claude/agents"
COMMANDS_DIR="$REPO_ROOT/claude/.claude/commands"
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

echo "Testing OpenCode compatibility of agent files..."
echo ""

# Transform agents using the same sed command as install-claude.sh
for agent in "$AGENTS_DIR"/*.md; do
  [ -f "$agent" ] || continue
  name=$(basename "$agent")
  [ "$name" = "README.md" ] && continue
  sed '/^tools:/d; /^color:/d' "$agent" > "$TMPDIR/$name"

  # Check no 'tools:' line with a string value remains
  if grep -qE '^tools:' "$TMPDIR/$name"; then
    fail "$name still contains 'tools:' field after transform"
  else
    pass "$name: no 'tools:' string field"
  fi

  # Check no 'color:' line with a named color remains
  if grep -qE '^color:' "$TMPDIR/$name"; then
    fail "$name still contains 'color:' field after transform"
  else
    pass "$name: no 'color:' named color field"
  fi

  # Check frontmatter is still valid (has opening and closing ---)
  if head -1 "$TMPDIR/$name" | grep -q '^---$' && sed -n '2,$ p' "$TMPDIR/$name" | grep -q '^---$'; then
    pass "$name: frontmatter structure intact"
  else
    fail "$name: frontmatter structure broken after transform"
  fi
done

echo ""
echo "Testing OpenCode compatibility of command files..."
echo ""

# Transform commands using the same sed command as install-claude.sh
for cmd in "$COMMANDS_DIR"/*.md; do
  [ -f "$cmd" ] || continue
  name=$(basename "$cmd")
  sed '/^allowed-tools:/d' "$cmd" > "$TMPDIR/$name"

  # Check no 'allowed-tools:' line remains
  if grep -qE '^allowed-tools:' "$TMPDIR/$name"; then
    fail "$name still contains 'allowed-tools:' field after transform"
  else
    pass "$name: no 'allowed-tools:' field"
  fi

  # Check frontmatter is still valid
  if head -1 "$TMPDIR/$name" | grep -q '^---$' && sed -n '2,$ p' "$TMPDIR/$name" | grep -q '^---$'; then
    pass "$name: frontmatter structure intact"
  else
    fail "$name: frontmatter structure broken after transform"
  fi
done

echo ""

# Also verify the source files haven't accidentally lost the fields Claude Code needs
echo "Verifying Claude Code source files still have required fields..."
echo ""

for agent in "$AGENTS_DIR"/*.md; do
  [ -f "$agent" ] || continue
  name=$(basename "$agent")
  [ "$name" = "README.md" ] && continue

  if grep -qE '^name:' "$agent"; then
    pass "$name: has 'name:' field for Claude Code"
  else
    fail "$name: missing 'name:' field (required by Claude Code)"
  fi

  if grep -qE '^description:' "$agent"; then
    pass "$name: has 'description:' field"
  else
    fail "$name: missing 'description:' field"
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
