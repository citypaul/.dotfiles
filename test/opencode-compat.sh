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
OPENCODE_CONFIG="$REPO_ROOT/opencode/.config/opencode/opencode.json"
INSTALL_SCRIPT="$REPO_ROOT/install.sh"
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

echo "Testing OpenCode dotfile configuration..."
echo ""

if [ -f "$OPENCODE_CONFIG" ]; then
  pass "opencode.json: config file exists"
else
  fail "opencode.json: config file missing"
fi

if grep -qE '"lsp"[[:space:]]*:[[:space:]]*true' "$OPENCODE_CONFIG"; then
  pass "opencode.json: enables built-in LSP servers (including TypeScript)"
else
  fail "opencode.json: missing '\"lsp\": true' to enable TypeScript LSP"
fi

if grep -qE '~/.claude/(skills/\*/SKILL\.md|agents/\*\.md)' "$OPENCODE_CONFIG"; then
  fail "opencode.json: must not inject every skill or agent as global instructions"
else
  pass "opencode.json: leaves skills and agents to native on-demand discovery"
fi

if grep -qE '^stow .* opencode( |$)' "$INSTALL_SCRIPT"; then
  pass "install.sh: stows opencode dotfiles"
else
  fail "install.sh: missing opencode from stow package list"
fi

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

echo "Testing OpenCode-only installer ownership..."
echo ""

BIN_DIR="$TMPDIR/bin"
CLEAN_HOME="$TMPDIR/clean-home"
OWNERSHIP_HOME="$TMPDIR/ownership-home"
EXACT_COMMIT=$(git -C "$REPO_ROOT" rev-parse --verify HEAD)
mkdir -p "$BIN_DIR" "$CLEAN_HOME" "$OWNERSHIP_HOME"

cat > "$BIN_DIR/curl" <<'STUB'
#!/usr/bin/env bash
url=""
dest=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -o) dest="$2"; shift 2 ;;
    http*) url="$1"; shift ;;
    *) shift ;;
  esac
done

case "$url" in
  */opencode.json)
    printf '%s\n' '{ "lsp": true }' > "$dest"
    ;;
  */commands/*)
    printf '%s\n' '---' 'description: Test command' 'allowed-tools: Bash' '---' 'command body' > "$dest"
    ;;
  */agents/*)
    printf '%s\n' '---' 'name: test-agent' 'description: Test agent' 'tools: Read, Bash' 'color: blue' '---' 'agent body' > "$dest"
    ;;
  *)
    exit 1
    ;;
esac
STUB
chmod +x "$BIN_DIR/curl"

HOME="$CLEAN_HOME" PATH="$BIN_DIR:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --opencode-only --version "$EXACT_COMMIT" \
  > "$TMPDIR/opencode-clean-output"

if [[ ! -e "$CLEAN_HOME/.claude" ]]; then
  pass "opencode-only does not create unrelated Claude directories"
else
  fail "opencode-only must not create ~/.claude roots"
fi

mkdir -p \
  "$OWNERSHIP_HOME/.claude/commands" \
  "$OWNERSHIP_HOME/.claude/agents" \
  "$OWNERSHIP_HOME/.config/opencode/command" \
  "$OWNERSHIP_HOME/.config/opencode/agent"
printf '%s\n' 'unmanaged command' > "$OWNERSHIP_HOME/.claude/commands/unmanaged.md"
printf '%s\n' 'unmanaged agent' > "$OWNERSHIP_HOME/.claude/agents/unmanaged.md"
printf '%s\n' 'custom OpenCode command' > "$OWNERSHIP_HOME/.config/opencode/command/plan.md"
printf '%s\n' 'custom OpenCode agent' > "$OWNERSHIP_HOME/.config/opencode/agent/tdd-guardian.md"
BROKEN_TARGET="$OWNERSHIP_HOME/missing-command-target"
ln -s "$BROKEN_TARGET" "$OWNERSHIP_HOME/.config/opencode/command/continue.md"

HOME="$OWNERSHIP_HOME" PATH="$BIN_DIR:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --opencode-only --version "$EXACT_COMMIT" \
  > "$TMPDIR/opencode-ownership-output"

# A second immediate replacement must allocate another backup instead of
# overwriting the first one, even inside the same wall-clock second.
HOME="$OWNERSHIP_HOME" PATH="$BIN_DIR:/usr/bin:/bin" \
  "$REPO_ROOT/install-claude.sh" --opencode-only --version "$EXACT_COMMIT" \
  >> "$TMPDIR/opencode-ownership-output"

if [[ ! -e "$OWNERSHIP_HOME/.config/opencode/command/unmanaged.md" ]] &&
   [[ ! -e "$OWNERSHIP_HOME/.config/opencode/agent/unmanaged.md" ]]; then
  pass "OpenCode projection ignores unmanaged Claude files"
else
  fail "OpenCode projection must use only the declared manifest"
fi

command_backup_count=0
agent_backup_count=0
command_custom_preserved=false
agent_custom_preserved=false
for backup in "$OWNERSHIP_HOME/.config/opencode/command/plan.md.backup."*; do
  [[ -f "$backup" ]] || continue
  command_backup_count=$((command_backup_count + 1))
  grep -q 'custom OpenCode command' "$backup" && command_custom_preserved=true
done
for backup in "$OWNERSHIP_HOME/.config/opencode/agent/tdd-guardian.md.backup."*; do
  [[ -f "$backup" ]] || continue
  agent_backup_count=$((agent_backup_count + 1))
  grep -q 'custom OpenCode agent' "$backup" && agent_custom_preserved=true
done
if [[ "$command_backup_count" -ge 2 ]] && [[ "$agent_backup_count" -ge 2 ]] &&
   [[ "$command_custom_preserved" == true ]] && [[ "$agent_custom_preserved" == true ]]; then
  pass "OpenCode destination collisions receive unique lossless backups"
else
  fail "OpenCode projection must preserve every replacement in a unique backup"
fi

broken_link_preserved=false
for backup in "$OWNERSHIP_HOME/.config/opencode/command/continue.md.backup."*; do
  [[ -L "$backup" ]] && broken_link_preserved=true
done
if [[ "$broken_link_preserved" == true ]] && [[ ! -e "$BROKEN_TARGET" ]] &&
   [[ -f "$OWNERSHIP_HOME/.config/opencode/command/continue.md" ]]; then
  pass "OpenCode replacement preserves dangling symlinks without following them"
else
  fail "OpenCode replacement must back up dangling symlinks without writing through them"
fi

if ! grep -q '^allowed-tools:' "$OWNERSHIP_HOME/.config/opencode/command/plan.md" &&
   ! grep -Eq '^(tools|color):' "$OWNERSHIP_HOME/.config/opencode/agent/tdd-guardian.md"; then
  pass "OpenCode projection transforms only declared source files"
else
  fail "OpenCode projected frontmatter is incompatible"
fi

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
else
  echo -e "${GREEN}All tests passed${NC}"
  exit 0
fi
