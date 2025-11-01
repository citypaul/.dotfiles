#!/usr/bin/env bash
#
# Install CLAUDE.md development framework to ~/.claude/
#
# Usage:
#   ./install-claude.sh                    # Install everything (CLAUDE.md + docs + agents)
#   ./install-claude.sh --claude-only      # Install only CLAUDE.md (no docs/agents)
#   ./install-claude.sh --no-agents        # Install CLAUDE.md + docs (no agents)
#   ./install-claude.sh --agents-only      # Install only agents
#   ./install-claude.sh --version v1.0.0   # Install specific version
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
INSTALL_DOCS=true
INSTALL_AGENTS=true
BASE_URL="https://raw.githubusercontent.com/citypaul/.dotfiles"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --claude-only)
      INSTALL_DOCS=false
      INSTALL_AGENTS=false
      shift
      ;;
    --no-agents)
      INSTALL_AGENTS=false
      shift
      ;;
    --agents-only)
      INSTALL_CLAUDE=false
      INSTALL_DOCS=false
      INSTALL_AGENTS=true
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
  --claude-only      Install only CLAUDE.md (no docs/agents)
  --no-agents        Install CLAUDE.md + docs (no agents)
  --agents-only      Install only agents
  --version VERSION  Install specific version (default: main)
  --help, -h         Show this help message

Examples:
  # Install everything (recommended)
  $0

  # Install specific version
  $0 --version v2.0.0

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
echo -e "${BLUE}║  CLAUDE.md Development Framework Installer       ║${NC}"
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
mkdir -p ~/.claude/docs ~/.claude/agents
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

# Install docs
if [[ "$INSTALL_DOCS" == true ]]; then
  echo -e "${BLUE}Installing documentation files...${NC}"

  docs=(
    "testing.md"
    "typescript.md"
    "code-style.md"
    "workflow.md"
    "examples.md"
    "working-with-claude.md"
  )

  for doc in "${docs[@]}"; do
    backup_file ~/.claude/docs/"$doc"
    download_file \
      "$BASE_URL/$VERSION/claude/.claude/docs/$doc" \
      ~/.claude/docs/"$doc" \
      "docs/$doc"
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
    "learn.md"
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

# Success message
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Installation complete! ✓                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Show what was installed
echo -e "${BLUE}Installed to ~/.claude/${NC}"
echo ""

if [[ "$INSTALL_CLAUDE" == true ]]; then
  echo -e "  ${GREEN}✓${NC} CLAUDE.md (main guidelines)"
fi

if [[ "$INSTALL_DOCS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} docs/ (6 detailed documentation files)"
fi

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} agents/ (4 Claude Code agents + README)"
fi

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
echo -e "  1. Verify installation:"
echo -e "     ${YELLOW}ls -la ~/.claude/${NC}"
echo ""
echo -e "  2. Test with Claude Code:"
echo -e "     Open any project and use: ${YELLOW}/memory${NC}"
echo ""
echo -e "  3. Read documentation:"
echo -e "     ${YELLOW}cat ~/.claude/CLAUDE.md${NC}"
echo ""

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  4. Learn about agents:"
  echo -e "     ${YELLOW}cat ~/.claude/agents/README.md${NC}"
  echo ""
fi

echo -e "${BLUE}For help or issues:${NC}"
echo -e "  ${YELLOW}https://github.com/citypaul/.dotfiles${NC}"
echo ""
