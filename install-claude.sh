#!/usr/bin/env bash
#
# Install CLAUDE.md development framework to ~/.claude/
#
# Skills are installed via the skills.sh CLI (npx skills), which supports
# Claude Code, Cursor, Codex, Copilot, OpenCode, Gemini CLI, and 40+ other
# agents. CLAUDE.md, slash commands, and agents are Claude-Code-specific
# artifacts and are still downloaded directly from this repo.
#
# Usage:
#   ./install-claude.sh                    # Install everything (CLAUDE.md + skills + commands + agents)
#   ./install-claude.sh --claude-only      # Install only CLAUDE.md
#   ./install-claude.sh --no-agents        # Install without agents
#   ./install-claude.sh --skills-only      # Install only skills
#   ./install-claude.sh --version v3.0.0   # Install specific version (for CLAUDE.md/commands/agents)
#   ./install-claude.sh --with-opencode    # Also install OpenCode configuration
#
# One-liner installation:
#   curl -fsSL https://raw.githubusercontent.com/citypaul/.dotfiles/main/install-claude.sh | bash
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default settings
VERSION="${VERSION:-main}"
INSTALL_CLAUDE=true
INSTALL_SKILLS=true
INSTALL_COMMANDS=true
INSTALL_AGENTS=true
INSTALL_OPENCODE=false
INSTALL_EXTERNAL=true
INSTALL_IMPECCABLE=true
BASE_URL="https://raw.githubusercontent.com/citypaul/.dotfiles"

# Skill sources on skills.sh (https://skills.sh)
OWN_SKILLS_REPO="citypaul/.dotfiles"
WEB_QUALITY_SKILLS_REPO="addyosmani/web-quality-skills"
IMPECCABLE_SKILLS_REPO="pbakaus/impeccable"
MATTPOCOCK_SKILLS_REPO="https://github.com/mattpocock/skills"
GRILL_ME_SKILL="grill-me"

# Agents to target when installing skills via `npx skills add`.
# Built up from --agent/--with-opencode flags; default is claude-code only.
SKILL_AGENTS=(claude-code)
INCLUDE_CLAUDE_CODE=true

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --claude-only)
      INSTALL_SKILLS=false
      INSTALL_COMMANDS=false
      INSTALL_AGENTS=false
      shift
      ;;
    --no-agents)
      INSTALL_AGENTS=false
      shift
      ;;
    --skills-only)
      INSTALL_CLAUDE=false
      INSTALL_COMMANDS=false
      INSTALL_AGENTS=false
      INSTALL_SKILLS=true
      shift
      ;;
    --agents-only)
      INSTALL_CLAUDE=false
      INSTALL_SKILLS=false
      INSTALL_COMMANDS=false
      INSTALL_AGENTS=true
      shift
      ;;
    --agent)
      if [[ -z "${2:-}" || "$2" == --* ]]; then
        echo -e "${RED}Error: --agent requires a value (e.g. codex, cursor, copilot)${NC}"
        exit 1
      fi
      SKILL_AGENTS+=("$2")
      shift 2
      ;;
    --no-claude-code)
      INCLUDE_CLAUDE_CODE=false
      shift
      ;;
    --with-opencode)
      INSTALL_OPENCODE=true
      SKILL_AGENTS+=(opencode)
      shift
      ;;
    --opencode-only)
      INSTALL_CLAUDE=false
      INSTALL_SKILLS=false
      INSTALL_COMMANDS=false
      INSTALL_AGENTS=false
      INSTALL_OPENCODE=true
      shift
      ;;
    --no-external)
      INSTALL_EXTERNAL=false
      INSTALL_IMPECCABLE=false
      shift
      ;;
    --no-impeccable)
      INSTALL_IMPECCABLE=false
      shift
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --help|-h)
      cat << EOF
Install CLAUDE.md development framework to ~/.claude/

Skills install via skills.sh (multi-agent); other artifacts (CLAUDE.md,
commands, agents) download directly from this repo.

Usage:
  $0 [OPTIONS]

Options:
  --claude-only        Install only CLAUDE.md
  --no-agents          Install without agents
  --skills-only        Install only skills (via skills.sh)
  --agents-only        Install only agents
  --agent NAME         Also install skills for agent NAME (repeatable:
                       --agent codex --agent cursor). Default target is
                       claude-code. See skills.sh for the full agent list.
  --no-claude-code     Skip the default claude-code target for skills
                       (use with --agent to target other agents only)
  --with-opencode      Shorthand for --agent opencode + install OpenCode config
  --opencode-only      Install only OpenCode configuration (no skills/agents/commands)
  --no-external        Skip all external community skills (web-quality-skills + impeccable + grill-me)
  --no-impeccable      Skip impeccable design skills only
  --version VERSION    Version for CLAUDE.md/commands/agents (default: main). Skills always latest.
  --help, -h           Show this help message

Default external skill sources:
  addyosmani/web-quality-skills
  pbakaus/impeccable
  mattpocock/skills --skill grill-me

Examples:
  # Install everything (recommended)
  $0

  # Install skills for Claude Code + Codex + Cursor
  $0 --skills-only --agent codex --agent cursor

  # Install only skills for Codex (no Claude Code)
  $0 --skills-only --no-claude-code --agent codex

  # One-liner installation
  curl -fsSL https://raw.githubusercontent.com/citypaul/.dotfiles/main/install-claude.sh | bash

EOF
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      echo "Run '$0 --help' for usage information"
      exit 1
      ;;
  esac
done

# Honour --no-claude-code by stripping claude-code from the target list
if [[ "$INCLUDE_CLAUDE_CODE" == false ]]; then
  _filtered=()
  for agent in "${SKILL_AGENTS[@]}"; do
    [[ "$agent" == "claude-code" ]] && continue
    _filtered+=("$agent")
  done
  SKILL_AGENTS=("${_filtered[@]}")
fi

# De-duplicate agent list while preserving order
if [[ ${#SKILL_AGENTS[@]} -gt 0 ]]; then
  SKILL_AGENTS=($(printf "%s\n" "${SKILL_AGENTS[@]}" | awk '!seen[$0]++'))
fi

# Validate: if we're installing skills, we need at least one agent to target
if [[ "$INSTALL_SKILLS" == true && ${#SKILL_AGENTS[@]} -eq 0 ]]; then
  echo -e "${RED}Error: no agents selected for skill install${NC}"
  echo -e "${YELLOW}Pass --agent <name> or drop --no-claude-code${NC}"
  exit 1
fi

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CLAUDE.md Development Framework Installer         ║${NC}"
printf "${BLUE}║  Version: %-40s║${NC}\n" "$VERSION"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check for npx if we'll need it
if [[ "$INSTALL_SKILLS" == true ]]; then
  if ! command -v npx >/dev/null 2>&1; then
    echo -e "${RED}Error: npx is required to install skills via skills.sh${NC}"
    echo -e "${YELLOW}Install Node.js (https://nodejs.org) or rerun with --claude-only / --agents-only${NC}"
    exit 1
  fi
fi

# Function to download a file
download_file() {
  local url="$1"
  local dest="$2"
  local description="$3"

  echo -e "${YELLOW}→${NC} Downloading $description..."

  if curl -fsSL "$url" -o "$dest"; then
    echo -e "${GREEN}✓${NC} $description installed"
    return 0
  else
    echo -e "${RED}✗${NC} Failed to download $description"
    return 1
  fi
}

# Function to backup existing file
backup_file() {
  local file="$1"

  if [[ -f "$file" ]]; then
    local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}→${NC} Backing up existing file to $backup"
    mv "$file" "$backup"
  fi
}

# Migrate skill directories left behind by the pre-skills.sh curl-based
# installer. Those were written as regular directories at ~/.claude/skills/<name>;
# the skills CLI will then manage them in-place as Claude-Code-specific installs
# instead of routing them through the universal ~/.agents/skills/ cache, which
# is where Codex (and other "universal" agents) read from. Moving them aside
# lets the CLI install each source into the universal path on this run, so the
# Claude-side entries become symlinks and the same skills become visible to
# Codex/OpenCode/etc.
#
# The files are moved, not deleted — everything ends up under
# ~/.claude/skills.pre-skills-sh.<timestamp>/ and can be restored manually.
migrate_legacy_skill_dirs() {
  local skills_dir=~/.claude/skills
  [[ -d "$skills_dir" ]] || return 0

  local stale=()
  local entry name
  for entry in "$skills_dir"/*/; do
    [[ -d "$entry" ]] || continue
    name="$(basename "$entry")"
    [[ -L "$skills_dir/$name" ]] && continue
    stale+=("$name")
  done

  if [[ ${#stale[@]} -eq 0 ]]; then
    return 0
  fi

  local backup="$skills_dir.pre-skills-sh.$(date +%Y%m%d_%H%M%S)"
  echo -e "${YELLOW}→${NC} Found ${#stale[@]} pre-skills.sh skill director$([[ ${#stale[@]} -eq 1 ]] && echo "y" || echo "ies") at ~/.claude/skills/"
  echo -e "${YELLOW}→${NC} Moving to $backup so the skills CLI can route them through the universal path"
  mkdir -p "$backup"
  for name in "${stale[@]}"; do
    mv "$skills_dir/$name" "$backup/"
    echo -e "   • $name"
  done
  echo ""
}

# Install skills from a skills.sh source for the selected agents
install_skills_from() {
  local source="$1"
  local label="$2"
  local skill="${3:-*}"

  echo -e "${YELLOW}→${NC} Installing $label from $source for: ${SKILL_AGENTS[*]}"

  # Build -a flags from the SKILL_AGENTS array
  local agent_args=()
  for agent in "${SKILL_AGENTS[@]}"; do
    agent_args+=(-a "$agent")
  done

  # -g: install globally (per-agent paths managed by the skills CLI)
  # -s '*': install all skills from the source, or a named skill when provided
  # -y: skip prompts
  if npx --yes skills add "$source" -g "${agent_args[@]}" -s "$skill" -y; then
    echo -e "${GREEN}✓${NC} $label installed"
  else
    echo -e "${RED}✗${NC} Failed to install $label from $source"
    return 1
  fi
}

# Verify skills landed in the universal cache — the path Codex and other
# "universal agents" read from. Regular (non-symlink) directories under
# ~/.claude/skills/ after install mean something routed through the
# Claude-Code-specific path and won't be visible to non-Claude agents.
verify_skills_installed() {
  local skills_dir=~/.claude/skills
  [[ -d "$skills_dir" ]] || return 0

  local stale=() entry name
  for entry in "$skills_dir"/*/; do
    [[ -d "$entry" ]] || continue
    name="$(basename "$entry")"
    [[ -L "$skills_dir/$name" ]] && continue
    stale+=("$name")
  done

  if [[ ${#stale[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠${NC}  ${#stale[@]} skill(s) ended up as regular directories under ~/.claude/skills/"
    echo -e "    These won't be visible to non-Claude agents (Codex, etc.):"
    for name in "${stale[@]}"; do
      echo -e "      • $name"
    done
    echo -e "    Re-run ${YELLOW}$0 --skills-only${NC} to migrate them, or remove via ${YELLOW}npx skills remove -g -s <name>${NC}."
  fi
}

# Create directories for non-skills artifacts
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p ~/.claude/agents ~/.claude/commands
echo -e "${GREEN}✓${NC} Directories created"
echo ""

# Install CLAUDE.md
if [[ "$INSTALL_CLAUDE" == true ]]; then
  echo -e "${BLUE}Installing CLAUDE.md...${NC}"
  backup_file ~/.claude/CLAUDE.md
  download_file \
    "$BASE_URL/$VERSION/claude/.claude/CLAUDE.md" \
    ~/.claude/CLAUDE.md \
    "CLAUDE.md"
  echo ""
fi

# Install skills via skills.sh CLI (multi-agent)
if [[ "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}Installing skills via skills.sh...${NC}"
  echo -e "${YELLOW}→${NC} Target agents: ${SKILL_AGENTS[*]}"
  echo -e "${YELLOW}→${NC} (Pass --agent <name> to target more — see skills.sh for the full list)"
  echo ""

  migrate_legacy_skill_dirs

  install_skills_from "$OWN_SKILLS_REPO" "own skills (citypaul/.dotfiles)"

  if [[ "$INSTALL_EXTERNAL" == true ]]; then
    install_skills_from "$WEB_QUALITY_SKILLS_REPO" "web quality skills (addyosmani/web-quality-skills)"
    install_skills_from "$MATTPOCOCK_SKILLS_REPO" "grill-me skill (mattpocock/skills)" "$GRILL_ME_SKILL"
  fi

  if [[ "$INSTALL_IMPECCABLE" == true ]]; then
    install_skills_from "$IMPECCABLE_SKILLS_REPO" "impeccable design skills (pbakaus/impeccable)"
  fi

  echo ""
  verify_skills_installed
  echo ""
fi

# Install commands (slash commands)
if [[ "$INSTALL_COMMANDS" == true ]]; then
  echo -e "${BLUE}Installing commands (slash commands)...${NC}"

  commands=(
    "setup.md"
    "pr.md"
    "plan.md"
    "continue.md"
    "generate-pr-review.md"
  )

  for cmd in "${commands[@]}"; do
    backup_file ~/.claude/commands/"$cmd"
    download_file \
      "$BASE_URL/$VERSION/claude/.claude/commands/$cmd" \
      ~/.claude/commands/"$cmd" \
      "commands/$cmd"
  done
  echo ""
fi

# Install agents
if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "${BLUE}Installing Claude Code agents...${NC}"

  agents=(
    "tdd-guardian.md"
    "ts-enforcer.md"
    "refactor-scan.md"
    "docs-guardian.md"
    "adr.md"
    "learn.md"
    "pr-reviewer.md"
    "use-case-data-patterns.md"
    "progress-guardian.md"
    "twelve-factor-audit.md"
    "README.md"
  )

  for agent in "${agents[@]}"; do
    backup_file ~/.claude/agents/"$agent"
    download_file \
      "$BASE_URL/$VERSION/claude/.claude/agents/$agent" \
      ~/.claude/agents/"$agent" \
      "agents/$agent"
  done
  echo ""
fi

# Install OpenCode configuration
if [[ "$INSTALL_OPENCODE" == true ]]; then
  echo -e "${BLUE}Installing OpenCode configuration...${NC}"
  mkdir -p ~/.config/opencode
  backup_file ~/.config/opencode/opencode.json
  download_file \
    "$BASE_URL/$VERSION/opencode/.config/opencode/opencode.json" \
    ~/.config/opencode/opencode.json \
    "opencode.json"

  # Copy commands for OpenCode, stripping Claude Code-specific frontmatter
  # OpenCode uses ~/.config/opencode/command/ (singular) for slash commands
  # The 'allowed-tools' field is Claude Code-specific and not valid in OpenCode
  if [[ -d ~/.claude/commands ]]; then
    echo -e "${BLUE}Copying commands for OpenCode...${NC}"
    mkdir -p ~/.config/opencode/command
    for cmd in ~/.claude/commands/*.md; do
      if [[ -f "$cmd" ]]; then
        sed '/^allowed-tools:/d' "$cmd" > ~/.config/opencode/command/"$(basename "$cmd")"
        echo -e "${GREEN}✓${NC} command/$(basename "$cmd")"
      fi
    done
  fi

  # Copy agents for OpenCode, stripping Claude Code-specific frontmatter
  # OpenCode uses ~/.config/opencode/agent/ (singular) for agents
  # The 'tools' field expects an object in OpenCode but is a string in Claude Code
  # The 'color' field expects hex (#RRGGBB) in OpenCode but is a named color in Claude Code
  if [[ -d ~/.claude/agents ]]; then
    echo -e "${BLUE}Copying agents for OpenCode...${NC}"
    mkdir -p ~/.config/opencode/agent
    for agent in ~/.claude/agents/*.md; do
      if [[ -f "$agent" ]]; then
        sed '/^tools:/d; /^color:/d' "$agent" > ~/.config/opencode/agent/"$(basename "$agent")"
        echo -e "${GREEN}✓${NC} agent/$(basename "$agent")"
      fi
    done
  fi

  echo ""
fi

# Success message
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Installation complete! ✓                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Show what was installed
echo -e "${BLUE}Installed to ~/.claude/${NC}"
echo ""

if [[ "$INSTALL_CLAUDE" == true ]]; then
  echo -e "  ${GREEN}✓${NC} CLAUDE.md (lean core principles)"
fi

if [[ "$INSTALL_SKILLS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} skills (installed via skills.sh for: ${SKILL_AGENTS[*]})"
  echo -e "     • citypaul/.dotfiles — auto-discovered patterns (tdd, testing, typescript-strict, ...)"
  if [[ "$INSTALL_EXTERNAL" == true ]]; then
    echo -e "     • addyosmani/web-quality-skills — accessibility, performance, SEO, ..."
    echo -e "     • mattpocock/skills/grill-me — relentless plan and design interviewing"
  fi
  if [[ "$INSTALL_IMPECCABLE" == true ]]; then
    echo -e "     • pbakaus/impeccable — design vocabulary + steering commands"
  fi
  echo -e "     Run ${YELLOW}npx skills list -g${NC} to see paths for each agent."
fi

if [[ "$INSTALL_COMMANDS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} commands/ (5 slash commands: /setup, /pr, /plan, /continue, /generate-pr-review)"
fi

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} agents/ (10 Claude Code agents + README)"
fi

if [[ "$INSTALL_OPENCODE" == true ]]; then
  echo -e ""
  echo -e "${BLUE}Installed to ~/.config/opencode/${NC}"
  echo -e "  ${GREEN}✓${NC} opencode.json (OpenCode rules configuration)"
  echo -e "  ${GREEN}✓${NC} command/ (slash commands from ~/.claude/commands/)"
  echo -e "  ${GREEN}✓${NC} agent/ (agents from ~/.claude/agents/)"
  if [[ "$INSTALL_SKILLS" == true ]]; then
    echo -e "  ${GREEN}✓${NC} skills also installed into OpenCode via skills.sh"
  fi
fi

echo ""
echo -e "${BLUE}Architecture:${NC}"
echo ""
echo -e "  ${YELLOW}CLAUDE.md${NC}  → Core principles (~100 lines, always loaded)"
echo -e "  ${YELLOW}skills/${NC}    → Detailed patterns (loaded on-demand). Managed by ${YELLOW}npx skills${NC}"
echo -e "  ${YELLOW}commands/${NC}  → Slash commands (manually invoked)"
echo -e "  ${YELLOW}agents/${NC}    → Complex multi-step workflows"
echo ""
echo -e "${BLUE}Managing skills:${NC}"
echo ""
echo -e "  ${YELLOW}npx skills list -g${NC}              List installed skills"
echo -e "  ${YELLOW}npx skills update -g${NC}            Update skills to latest"
echo -e "  ${YELLOW}npx skills find <query>${NC}         Search skills.sh for more skills"
echo -e "  ${YELLOW}npx skills remove -g <name>${NC}     Uninstall a skill"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "  1. Verify installation:"
echo -e "     ${YELLOW}ls -la ~/.claude/${NC}"
echo ""
echo -e "  2. Test with Claude Code:"
echo -e "     Open any project and use: ${YELLOW}/memory${NC}"
echo ""
echo -e "  3. Try the /pr command:"
echo -e "     ${YELLOW}/pr${NC}"
echo ""

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  4. Learn about agents:"
  echo -e "     ${YELLOW}cat ~/.claude/agents/README.md${NC}"
  echo ""
fi

if [[ "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}Want to target more agents?${NC}"
  echo ""
  echo -e "  Skills via skills.sh work with 40+ agents (Codex, Cursor, Copilot, Gemini CLI, ...)."
  echo -e "  Re-run with ${YELLOW}--agent <name>${NC} (repeatable) to add more:"
  echo -e "     ${YELLOW}$0 --skills-only --agent codex --agent cursor${NC}"
  echo ""
fi

if [[ "$INSTALL_IMPECCABLE" == true && "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║  Impeccable Design Skills - Quick Start Guide      ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "  Impeccable is a frontend design vocabulary that guides AI coding"
  echo -e "  tools toward distinctive, high-quality interfaces."
  echo ""
  echo -e "  ${YELLOW}Getting started:${NC}"
  echo -e "    ${GREEN}/impeccable teach${NC}   Set up design context for your project"
  echo -e "    ${GREEN}/impeccable craft${NC}   Shape, build, and iterate on a feature"
  echo -e "    ${GREEN}/impeccable extract${NC} Pull reusable components and tokens"
  echo ""
  echo -e "  ${YELLOW}Steering commands:${NC}"
  echo -e "    /shape /critique /audit /polish /typeset /colorize /animate"
  echo -e "    /layout /harden /clarify /adapt /bolder /quieter /distill"
  echo -e "    /delight /optimize /overdrive"
  echo ""
  echo -e "  ${BLUE}Full documentation: https://impeccable.style/skills/${NC}"
  echo ""
fi

echo -e "${BLUE}Acknowledgments:${NC}"
echo ""
echo -e "  Skills ecosystem: ${YELLOW}skills.sh${NC} (${BLUE}https://skills.sh${NC})"
echo ""
echo -e "  • ${YELLOW}Addy Osmani${NC} — web quality skills"
echo -e "    ${BLUE}https://github.com/addyosmani/web-quality-skills${NC} (MIT)"
echo ""
echo -e "  • ${YELLOW}Paul Bakaus${NC} — impeccable frontend design skills"
echo -e "    ${BLUE}https://impeccable.style/skills/${NC} (Apache 2.0)"
echo ""
echo -e "  • ${YELLOW}Matt Pocock${NC} — grill-me planning interview skill"
echo -e "    ${BLUE}https://skills.sh/mattpocock/skills/grill-me${NC}"
echo ""
echo -e "  • ${YELLOW}Kieran O'Hara${NC} — use-case-data-patterns agent"
echo -e "    ${BLUE}https://github.com/kieran-ohara/dotfiles${NC}"
echo ""
echo -e "  • ${YELLOW}Andrea Laforgia${NC} — test-design-reviewer skill"
echo -e "    ${BLUE}https://github.com/andlaf-ak/claude-code-agents${NC}"
echo ""
echo -e "${BLUE}For help or issues:${NC}"
echo -e "  ${YELLOW}https://github.com/citypaul/.dotfiles${NC}"
echo ""
