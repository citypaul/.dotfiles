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
INSTALL_EXTERNAL=true
INSTALL_IMPECCABLE=true
BASE_URL="https://raw.githubusercontent.com/citypaul/.dotfiles"
WEB_QUALITY_SKILLS_URL="https://raw.githubusercontent.com/addyosmani/web-quality-skills"
IMPECCABLE_SKILLS_URL="https://raw.githubusercontent.com/pbakaus/impeccable/main/.claude/skills"
IMPECCABLE_BASE_URL="https://raw.githubusercontent.com/pbakaus/impeccable/main"

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

Usage:
  $0 [OPTIONS]

Options:
  --claude-only      Install only CLAUDE.md
  --no-agents        Install without agents
  --skills-only      Install only skills
  --agents-only      Install only agents
  --with-opencode    Also install OpenCode configuration (commands + agents)
  --opencode-only    Install only OpenCode configuration (commands + agents)
  --no-external      Skip all external community skills (web-quality-skills + impeccable)
  --no-impeccable    Skip impeccable design skills only
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
mkdir -p ~/.claude/skills/front-end-testing ~/.claude/skills/react-testing ~/.claude/skills/mutation-testing ~/.claude/skills/test-design-reviewer
mkdir -p ~/.claude/skills/ci-debugging ~/.claude/skills/hexagonal-architecture ~/.claude/skills/domain-driven-design ~/.claude/skills/twelve-factor ~/.claude/skills/api-design
mkdir -p ~/.claude/skills/finding-seams ~/.claude/skills/characterisation-tests
mkdir -p ~/.claude/skills/hexagonal-architecture/resources ~/.claude/skills/domain-driven-design/resources ~/.claude/skills/api-design/resources ~/.claude/skills/cli-design/resources
mkdir -p ~/.claude/skills/finding-seams/resources ~/.claude/skills/characterisation-tests/resources
if [[ "$INSTALL_EXTERNAL" == true ]]; then
  mkdir -p ~/.claude/skills/accessibility ~/.claude/skills/best-practices ~/.claude/skills/core-web-vitals
  mkdir -p ~/.claude/skills/performance ~/.claude/skills/seo ~/.claude/skills/web-quality-audit
fi
if [[ "$INSTALL_IMPECCABLE" == true ]]; then
  mkdir -p ~/.claude/skills/impeccable/reference ~/.claude/skills/impeccable/scripts
  mkdir -p ~/.claude/skills/adapt ~/.claude/skills/animate ~/.claude/skills/audit
  mkdir -p ~/.claude/skills/bolder ~/.claude/skills/clarify ~/.claude/skills/colorize
  mkdir -p ~/.claude/skills/critique/reference ~/.claude/skills/delight ~/.claude/skills/distill
  mkdir -p ~/.claude/skills/harden ~/.claude/skills/layout ~/.claude/skills/optimize
  mkdir -p ~/.claude/skills/overdrive ~/.claude/skills/polish ~/.claude/skills/quieter
  mkdir -p ~/.claude/skills/shape ~/.claude/skills/typeset
fi
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
    "mutation-testing/SKILL.md"
    "test-design-reviewer/SKILL.md"
    "expectations/SKILL.md"
    "planning/SKILL.md"
    "front-end-testing/SKILL.md"
    "react-testing/SKILL.md"
    "ci-debugging/SKILL.md"
    "hexagonal-architecture/SKILL.md"
    "domain-driven-design/SKILL.md"
    "twelve-factor/SKILL.md"
    "api-design/SKILL.md"
    "cli-design/SKILL.md"
    "finding-seams/SKILL.md"
    "characterisation-tests/SKILL.md"
  )

  for skill in "${skills[@]}"; do
    backup_file ~/.claude/skills/"$skill"
    download_file \
      "$BASE_URL/$VERSION/claude/.claude/skills/$skill" \
      ~/.claude/skills/"$skill" \
      "skills/$skill"
  done

  # Deep-dive resource files for skills that have them
  resources=(
    "hexagonal-architecture/resources/cqrs-lite.md"
    "hexagonal-architecture/resources/cross-cutting-concerns.md"
    "hexagonal-architecture/resources/incremental-adoption.md"
    "hexagonal-architecture/resources/testing-hex-arch.md"
    "hexagonal-architecture/resources/worked-example.md"
    "domain-driven-design/resources/aggregate-design.md"
    "domain-driven-design/resources/bounded-contexts.md"
    "domain-driven-design/resources/domain-events.md"
    "domain-driven-design/resources/domain-services.md"
    "domain-driven-design/resources/error-modeling.md"
    "domain-driven-design/resources/testing-by-layer.md"
    "api-design/resources/api-evolution.md"
    "api-design/resources/api-security.md"
    "api-design/resources/http-fundamentals.md"
    "api-design/resources/auth-security.md"
    "cli-design/resources/output-architecture.md"
    "cli-design/resources/testing-cli.md"
    "cli-design/resources/stream-contracts.md"
    "finding-seams/resources/seam-types.md"
    "finding-seams/resources/creating-seams.md"
    "finding-seams/resources/oop-patterns.md"
    "characterisation-tests/resources/writing-process.md"
    "characterisation-tests/resources/modern-tooling.md"
  )

  for resource in "${resources[@]}"; do
    backup_file ~/.claude/skills/"$resource"
    download_file \
      "$BASE_URL/$VERSION/claude/.claude/skills/$resource" \
      ~/.claude/skills/"$resource" \
      "skills/$resource"
  done

  # References file
  backup_file ~/.claude/skills/REFERENCES.md
  download_file \
    "$BASE_URL/$VERSION/claude/.claude/skills/REFERENCES.md" \
    ~/.claude/skills/REFERENCES.md \
    "skills/REFERENCES.md"

  echo ""
fi

# Install external community skills (fetched from upstream repos)
if [[ "$INSTALL_EXTERNAL" == true && "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}Installing external community skills...${NC}"
  echo -e "${YELLOW}→${NC} Source: addyosmani/web-quality-skills (MIT License)"

  external_skills=(
    "accessibility/SKILL.md"
    "best-practices/SKILL.md"
    "core-web-vitals/SKILL.md"
    "performance/SKILL.md"
    "seo/SKILL.md"
    "web-quality-audit/SKILL.md"
  )

  for skill in "${external_skills[@]}"; do
    backup_file ~/.claude/skills/"$skill"
    download_file \
      "$WEB_QUALITY_SKILLS_URL/main/skills/$skill" \
      ~/.claude/skills/"$skill" \
      "skills/$skill (web-quality-skills)"
  done

  # Download the license file to preserve attribution as required by MIT
  download_file \
    "$WEB_QUALITY_SKILLS_URL/main/LICENSE" \
    ~/.claude/skills/.web-quality-skills-LICENSE \
    "web-quality-skills LICENSE"

  echo ""
fi

# Install impeccable design skills (fetched from upstream repo)
if [[ "$INSTALL_IMPECCABLE" == true && "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}Installing impeccable design skills...${NC}"
  echo -e "${YELLOW}→${NC} Source: pbakaus/impeccable (Apache 2.0 License)"
  echo ""
  echo -e "  Impeccable is a frontend design vocabulary and quality system that"
  echo -e "  guides AI coding tools toward distinctive, high-quality interfaces."
  echo ""
  echo -e "  ${YELLOW}Getting started:${NC}"
  echo -e "    /impeccable teach   Set up design context for your project"
  echo -e "    /impeccable craft   Shape, build, and iterate on a feature"
  echo -e "    /impeccable extract Pull reusable components and tokens"
  echo ""
  echo -e "  ${YELLOW}Steering commands:${NC}"
  echo -e "    /shape     Plan UX/UI before code        /critique  Full UX review with scoring"
  echo -e "    /audit     Technical quality scoring      /polish    Final quality pass"
  echo -e "    /typeset   Fix typography                 /colorize  Add strategic color"
  echo -e "    /animate   Purposeful animations          /layout    Fix spacing and rhythm"
  echo -e "    /harden    Production-ready hardening     /clarify   Improve UX copy"
  echo -e "    /adapt     Cross-device adaptation        /bolder    Amplify safe designs"
  echo -e "    /quieter   Tone down aggressive designs   /distill   Strip to essence"
  echo -e "    /delight   Add moments of joy             /optimize  Performance improvements"
  echo -e "    /overdrive Extraordinary effects"
  echo ""
  echo -e "  ${BLUE}Learn more: https://github.com/pbakaus/impeccable${NC}"
  echo ""

  # Core skill
  backup_file ~/.claude/skills/impeccable/SKILL.md
  download_file \
    "$IMPECCABLE_SKILLS_URL/impeccable/SKILL.md" \
    ~/.claude/skills/impeccable/SKILL.md \
    "skills/impeccable/SKILL.md (impeccable core)"

  # Reference files
  impeccable_refs=(
    "impeccable/reference/typography.md"
    "impeccable/reference/color-and-contrast.md"
    "impeccable/reference/spatial-design.md"
    "impeccable/reference/motion-design.md"
    "impeccable/reference/interaction-design.md"
    "impeccable/reference/responsive-design.md"
    "impeccable/reference/ux-writing.md"
    "impeccable/reference/craft.md"
    "impeccable/reference/extract.md"
  )

  for ref in "${impeccable_refs[@]}"; do
    download_file \
      "$IMPECCABLE_SKILLS_URL/$ref" \
      ~/.claude/skills/"$ref" \
      "skills/$ref (impeccable)"
  done

  # Cleanup script
  download_file \
    "$IMPECCABLE_SKILLS_URL/impeccable/scripts/cleanup-deprecated.mjs" \
    ~/.claude/skills/impeccable/scripts/cleanup-deprecated.mjs \
    "impeccable cleanup script"

  # Steering commands
  impeccable_commands=(
    "adapt/SKILL.md"
    "animate/SKILL.md"
    "audit/SKILL.md"
    "bolder/SKILL.md"
    "clarify/SKILL.md"
    "colorize/SKILL.md"
    "critique/SKILL.md"
    "delight/SKILL.md"
    "distill/SKILL.md"
    "harden/SKILL.md"
    "layout/SKILL.md"
    "optimize/SKILL.md"
    "overdrive/SKILL.md"
    "polish/SKILL.md"
    "quieter/SKILL.md"
    "shape/SKILL.md"
    "typeset/SKILL.md"
  )

  for cmd in "${impeccable_commands[@]}"; do
    backup_file ~/.claude/skills/"$cmd"
    download_file \
      "$IMPECCABLE_SKILLS_URL/$cmd" \
      ~/.claude/skills/"$cmd" \
      "skills/$cmd (impeccable)"
  done

  # Critique reference files
  critique_refs=(
    "critique/reference/cognitive-load.md"
    "critique/reference/heuristics-scoring.md"
    "critique/reference/personas.md"
  )

  for ref in "${critique_refs[@]}"; do
    download_file \
      "$IMPECCABLE_SKILLS_URL/$ref" \
      ~/.claude/skills/"$ref" \
      "skills/$ref (impeccable)"
  done

  # Download license and notice for attribution (required by Apache 2.0)
  download_file \
    "$IMPECCABLE_BASE_URL/LICENSE" \
    ~/.claude/skills/.impeccable-LICENSE \
    "impeccable LICENSE (Apache 2.0)"

  download_file \
    "$IMPECCABLE_BASE_URL/NOTICE.md" \
    ~/.claude/skills/.impeccable-NOTICE \
    "impeccable NOTICE"

  echo ""
fi

# Install commands (v3.0: slash commands)
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
  echo -e "  ${GREEN}✓${NC} skills/ (19 auto-discovered patterns: tdd, testing, mutation-testing, test-design-reviewer, typescript-strict, functional, refactoring, expectations, planning, front-end-testing, react-testing, ci-debugging, hexagonal-architecture, domain-driven-design, twelve-factor, api-design, cli-design, finding-seams, characterisation-tests)"
  if [[ "$INSTALL_EXTERNAL" == true ]]; then
    echo -e "  ${GREEN}✓${NC} skills/ (6 web quality patterns: accessibility, best-practices, core-web-vitals, performance, seo, web-quality-audit)"
  fi
  if [[ "$INSTALL_IMPECCABLE" == true ]]; then
    echo -e "  ${GREEN}✓${NC} skills/ (18 impeccable design skills: impeccable core + 17 steering commands)"
    echo -e "         Run ${YELLOW}/impeccable teach${NC} in any project to get started"
  fi
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

if [[ "$INSTALL_OPENCODE" == false ]]; then
  echo -e "${BLUE}Using OpenCode?${NC}"
  echo ""
  echo -e "  All skills, commands, and agents also work with OpenCode."
  echo -e "  Re-run with ${YELLOW}--with-opencode${NC} to set up everything in"
  echo -e "  ~/.config/opencode/ so slash commands and agents show up."
  echo ""
fi

echo -e "${BLUE}Acknowledgments:${NC}"
echo ""
echo -e "  This project includes contributions and adapted work from:"
echo ""
echo -e "  • ${YELLOW}Addy Osmani${NC} - Web quality skills (accessibility, performance, SEO,"
echo -e "    core-web-vitals, best-practices, web-quality-audit)"
echo -e "    ${BLUE}https://github.com/addyosmani/web-quality-skills${NC} (MIT License)"
echo ""
echo -e "  • ${YELLOW}Kieran O'Hara${NC} - use-case-data-patterns agent"
echo -e "    ${BLUE}https://github.com/kieran-ohara/dotfiles${NC}"
echo ""
echo -e "  • ${YELLOW}Andrea Laforgia${NC} - test-design-reviewer skill"
echo -e "    ${BLUE}https://github.com/andlaf-ak/claude-code-agents${NC}"
echo ""
echo -e "  • ${YELLOW}Paul Bakaus${NC} - Impeccable frontend design skills (impeccable core"
echo -e "    + 17 steering commands: shape, critique, audit, polish, harden, typeset,"
echo -e "    colorize, animate, layout, clarify, adapt, bolder, quieter, distill,"
echo -e "    delight, optimize, overdrive)"
echo -e "    ${BLUE}https://github.com/pbakaus/impeccable${NC} (Apache 2.0 License)"
echo ""
echo -e "${BLUE}For help or issues:${NC}"
echo -e "  ${YELLOW}https://github.com/citypaul/.dotfiles${NC}"
echo ""
