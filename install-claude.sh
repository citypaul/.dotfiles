#!/usr/bin/env bash
#
# Install CLAUDE.md development framework to ~/.claude/
#
# Usage:
#   ./install-claude.sh                    # Install everything (CLAUDE.md + skills + commands + agents)
#   ./install-claude.sh --claude-only      # Install only CLAUDE.md
#   ./install-claude.sh --no-agents        # Install without agents
#   ./install-claude.sh --skills-only      # Install only skills
#   ./install-claude.sh --version v3.0.0   # Install specific version
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
BASE_URL="https://raw.githubusercontent.com/citypaul/.dotfiles"

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
    --with-opencode)
      INSTALL_OPENCODE=true
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
    --version)
      VERSION="$2"
      shift 2
      ;;
    --help|-h)
      cat << EOF
Install CLAUDE.md development framework to ~/.claude/

Usage:
  $0 [OPTIONS]

Options:
  --claude-only      Install only CLAUDE.md
  --no-agents        Install without agents
  --skills-only      Install only skills
  --agents-only      Install only agents
  --with-opencode    Also install OpenCode configuration
  --opencode-only    Install only OpenCode configuration
  --version VERSION  Install specific version (default: main)
  --help, -h         Show this help message

Examples:
  # Install everything (recommended)
  $0

  # Install specific version
  $0 --version v3.0.0

  # Install without agents
  $0 --no-agents

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

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CLAUDE.md Development Framework Installer         ║${NC}"
printf "${BLUE}║  Version: %-40s║${NC}\n" "$VERSION"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

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

# Create directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p ~/.claude/agents ~/.claude/skills ~/.claude/commands
mkdir -p ~/.claude/skills/tdd ~/.claude/skills/typescript-strict ~/.claude/skills/functional
mkdir -p ~/.claude/skills/refactoring ~/.claude/skills/testing ~/.claude/skills/expectations ~/.claude/skills/planning
mkdir -p ~/.claude/skills/front-end-testing ~/.claude/skills/react-testing
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

# Install skills (v3.0: auto-discovered patterns)
if [[ "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}Installing skills (auto-discovered patterns)...${NC}"

  skills=(
    "tdd/SKILL.md"
    "typescript-strict/SKILL.md"
    "functional/SKILL.md"
    "refactoring/SKILL.md"
    "testing/SKILL.md"
    "expectations/SKILL.md"
    "planning/SKILL.md"
    "front-end-testing/SKILL.md"
    "react-testing/SKILL.md"
  )

  for skill in "${skills[@]}"; do
    backup_file ~/.claude/skills/"$skill"
    download_file \
      "$BASE_URL/$VERSION/claude/.claude/skills/$skill" \
      ~/.claude/skills/"$skill" \
      "skills/$skill"
  done
  echo ""
fi

# Install commands (v3.0: slash commands)
if [[ "$INSTALL_COMMANDS" == true ]]; then
  echo -e "${BLUE}Installing commands (slash commands)...${NC}"

  commands=(
    "pr.md"
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
    "use-case-data-patterns.md"
    "progress-guardian.md"
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
  echo -e "  ${GREEN}✓${NC} skills/ (9 auto-discovered patterns: tdd, testing, typescript-strict, functional, refactoring, expectations, planning, front-end-testing, react-testing)"
fi

if [[ "$INSTALL_COMMANDS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} commands/ (1 slash command: /pr)"
fi

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} agents/ (8 Claude Code agents + README)"
fi

if [[ "$INSTALL_OPENCODE" == true ]]; then
  echo -e ""
  echo -e "${BLUE}Installed to ~/.config/opencode/${NC}"
  echo -e "  ${GREEN}✓${NC} opencode.json (OpenCode rules configuration)"
fi

echo ""
echo -e "${BLUE}Architecture (v3.0):${NC}"
echo ""
echo -e "  ${YELLOW}CLAUDE.md${NC}  → Core principles (~100 lines, always loaded)"
echo -e "  ${YELLOW}skills/${NC}    → Detailed patterns (loaded on-demand when relevant)"
echo -e "  ${YELLOW}commands/${NC}  → Slash commands (manually invoked)"
echo -e "  ${YELLOW}agents/${NC}    → Complex multi-step workflows"
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

echo -e "${BLUE}For help or issues:${NC}"
echo -e "  ${YELLOW}https://github.com/citypaul/.dotfiles${NC}"
echo ""
