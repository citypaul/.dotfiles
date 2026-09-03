#!/usr/bin/env bash
#
# Install CLAUDE.md development framework to ~/.claude/
#
# Skills are installed via the skills.sh CLI, which supports
# Claude Code, Cursor, Codex, Copilot, OpenCode, Gemini CLI, and 40+ other
# agents. CLAUDE.md, slash commands, and agents are Claude-Code-specific
# artifacts and are still downloaded directly from this repo.
#
# Usage:
#   ./install-claude.sh                    # Install everything (CLAUDE.md + skills + commands + agents)
#   ./install-claude.sh --claude-only      # Install only CLAUDE.md
#   ./install-claude.sh --no-agents        # Install without agents
#   ./install-claude.sh --skills-only      # Install only skills
#   ./install-claude.sh --version <ref>    # Use an exact reviewed release/commit
#   ./install-claude.sh --with-opencode    # Also install OpenCode configuration
#
# Run this script from an inspected checkout. When --version is omitted, the
# checkout's exact HEAD commit is used. A standalone copy must receive an exact
# reviewed release tag or commit with --version; moving refs are rejected.

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default settings
VERSION="${VERSION:-}"
INSTALL_CLAUDE=true
INSTALL_SKILLS=true
INSTALL_COMMANDS=true
INSTALL_AGENTS=true
INSTALL_OPENCODE=false
INSTALL_EXTERNAL=true
INSTALL_IMPECCABLE=true
INSTALL_PONYTAIL=true
BASE_URL="https://raw.githubusercontent.com/citypaul/.dotfiles"
SKILLS_CLI_VERSION="1.5.22" # https://github.com/vercel-labs/skills/tree/v1.5.22

# Reviewed immutable source revisions. Every source is pinned to a commit and
# every selected name is declared before mutation. The Skills CLI cannot fetch
# a commit pin itself (`git clone --branch` only accepts branch or tag names,
# and its archive downloader enforces small size caps), so each commit pin is
# fetched locally with a shallow pinned `git fetch` and handed to the CLI as a
# local path (see fetch_pinned_source). A subpath entry limits the fetch to
# one directory for repos far larger than their skills.
OWN_SKILLS_REPO_BASE="citypaul/.dotfiles"
WEB_QUALITY_SKILLS_REPO="addyosmani/web-quality-skills#95d6e255afe1596b557d7a8498517884438f5b3a"
NEXT_SKILLS_REPO="vercel/next.js#ae1e53a11f5379e715096b829178f4df92d35044"
NEXT_SKILLS_SUBPATH="skills"
# React performance and composition rule catalogues. Pinned separately from the
# Next.js skills because they live in a different Vercel repository with its own
# release cadence. The first-party `react-performance` skill owns the method
# and routes into these; they own the rules.
VERCEL_REACT_SKILLS_REPO="vercel-labs/agent-skills#b8caa260a420a73042e35521de4b5c8baf6446cc"
VERCEL_REACT_SKILLS_SUBPATH="skills"
# The reviewed upstream skill still names the old v4 beta dist-tag. The
# installer rewrites only that tag to the current RC after fetching this pin;
# the installed package's AGENTS.md remains the API source of truth.
EFFECT_SKILLS_REPO="Effect-TS/skills#28822c9e19998876a6b0e0d97877442012ed4391"
EFFECT_SKILLS_SUBPATH="skills"
IMPECCABLE_SKILLS_REPO="pbakaus/impeccable#5d10bc842cbccd2ae7d3a88296d87d3be0b125b3"
MATTPOCOCK_SKILLS_REPO="https://github.com/mattpocock/skills#84fdeffd12f2ee307994d1eb6feb48173b6e0502"
MARKETING_SKILLS_REPO="coreyhaines31/marketingskills#7868cb9251fad80a73d26e488a5ad5f6c4a9f335"
HERDR_SKILLS_REPO="herdrdev/herdr#1777e9bba32b953ed1ad203b4a16d01105539000"
# Anthropic's own skill-authoring skill: drafting, evals, benchmarking, and
# description-trigger optimisation. Apache 2.0 (LICENSE.txt ships in the skill).
ANTHROPIC_SKILLS_REPO="anthropics/skills#f17010c9bb483898c1d9c9f42dde2b3a98889434"
ANTHROPIC_SKILLS_SUBPATH="skills"

FIRST_PARTY_SKILLS=(
  acceptance-review api-design bff-design bff-entry-points
  characterisation-tests ci-debugging cli-design codebase-design debugging
  diagrams domain-driven-design double-check evaluate-existing-solutions
  event-sourcing expectations find-gaps find-skills finding-seams
  folder-structure front-end-testing functional graph-engineering
  hexagonal-architecture
  improve-codebase-architecture mutation-testing observability panel-review planning
  production-parity-skill-builder react-performance react-testing
  reduce-system-complexity refactoring render-code-shape
  secure-oauth-oidc specification stack-pull-requests
  story-splitting storyboard structure-codebase tdd teach-me technical-writing
  test-design-reviewer testing twelve-factor typescript-strict
  ubiquitous-language wtf xstate
)
WEB_QUALITY_SKILLS=(
  accessibility best-practices core-web-vitals performance seo web-quality-audit
)
# vercel-labs/next-skills was retired: next-best-practices and next-upgrade
# now ship inside Next.js itself (bundled docs + generated AGENTS.md), and
# next-cache-components split into the two workflow skills below, which live
# in the vercel/next.js repo under skills/.
NEXT_SKILLS=(next-cache-components-optimizer next-cache-components-adoption)
VERCEL_REACT_SKILLS=(vercel-react-best-practices vercel-composition-patterns)
EFFECT_SKILLS=(effect-ts)
IMPECCABLE_SKILLS=(
  adapt animate audit bolder clarify colorize critique delight distill
  impeccable layout optimize overdrive polish quieter shape typeset
)
# grill-me and writing-for-agents both exist at the pinned MATTPOCOCK revision,
# so adding the writing skill needs no new audit of the grill-me pin.
MATTPOCOCK_SKILLS=(grill-me writing-for-agents)
SEO_AUDIT_SKILLS=(seo-audit)
ANTHROPIC_SKILLS=(skill-creator)
HERDR_SKILLS=(herdr)
COMMAND_FILES=(setup.md plan.md continue.md)
AGENT_FILES=(
  tdd-guardian.md ts-enforcer.md refactor-scan.md docs-guardian.md adr.md
  learn.md use-case-data-patterns.md progress-guardian.md
  twelve-factor-audit.md
)
CLAUDE_AGENT_FILES=("${AGENT_FILES[@]}" README.md)

# Agents to target when installing skills via the pinned Skills CLI.
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
      INSTALL_PONYTAIL=false
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
      INSTALL_PONYTAIL=false
      shift
      ;;
    --agents-only)
      INSTALL_CLAUDE=false
      INSTALL_SKILLS=false
      INSTALL_COMMANDS=false
      INSTALL_AGENTS=true
      INSTALL_PONYTAIL=false
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
      INSTALL_PONYTAIL=false
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
    --no-ponytail)
      INSTALL_PONYTAIL=false
      shift
      ;;
    --version)
      if [[ $# -lt 2 || "$2" == --* ]]; then
        echo -e "${RED}Error: --version requires a value${NC}"
        exit 1
      fi
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
  --opencode-only      Install only OpenCode config plus projected agents/commands (no Claude artifacts or skills)
  --no-external        Skip all external community skills (web-quality-skills + Next.js skills + agent-skills + Effect + impeccable + grill-me + writing-for-agents + seo-audit + skill-creator + herdr)
  --no-impeccable      Skip impeccable design skills only
  --no-ponytail        Skip the ponytail plugin (Claude Code + Codex)
  --version REF        Exact reviewed release tag or commit for first-party artifacts.
                       Defaults to this checkout's HEAD when that commit is on the
                       remote, otherwise the latest release. Moving refs are rejected.
  --help, -h           Show this help message

Default external skill sources are pinned to reviewed commits; the installer
selects only the declared names from each source:
  addyosmani/web-quality-skills#95d6e25
  vercel/next.js#ae1e53a --skill next-cache-components-optimizer + next-cache-components-adoption
  vercel-labs/agent-skills#b8caa26 --skill vercel-react-best-practices --skill vercel-composition-patterns
  Effect-TS/skills#28822c9 --skill effect-ts (adapted to effect@rc)
  pbakaus/impeccable#5d10bc8
  mattpocock/skills#84fdeff --skill grill-me --skill writing-for-agents
  coreyhaines31/marketingskills#7868cb9 --skill seo-audit
  anthropics/skills#f17010c --skill skill-creator
  herdrdev/herdr#1777e9b --skill herdr

Examples:
  # Install everything (recommended)
  $0

  # Install skills for Claude Code + Codex + Cursor
  $0 --skills-only --agent codex --agent cursor

  # Install only skills for Codex (no Claude Code)
  $0 --skills-only --no-claude-code --agent codex

  # From an inspected checkout; pins all first-party downloads to exact HEAD
  $0 --version "\$(git rev-parse HEAD)"

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

# The installer must work for anyone, anywhere: inside a checkout, from a
# stray copy of this file, or piped straight from a download. It pins to an exact
# immutable revision either way — it just works out which one on its own.
#
#   --version REF   what you asked for, always wins
#   HEAD            only when run inside a checkout OF THIS REPOSITORY and that
#                   commit is on the remote, so a contributor installs exactly
#                   what they inspected
#   latest release  everyone else
#
# A piped install leaves BASH_SOURCE unset, and `dirname ""` resolves to `.` —
# the directory the user happens to be standing in. Inferring a checkout from
# that once pinned an install to an unrelated private repository's HEAD, so the
# script's own location only counts when it is a real file inside a real
# checkout of this repository.
script_dir=""
if [[ -n "${BASH_SOURCE[0]:-}" && -f "${BASH_SOURCE[0]}" ]]; then
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

# True only for a git checkout of this repository. Any other repo — including
# whatever directory a piped install was launched from — is not a version source.
own_checkout() {
  [[ -n "$script_dir" ]] || return 1
  command -v git >/dev/null 2>&1 || return 1
  git -C "$script_dir" rev-parse --git-dir >/dev/null 2>&1 || return 1
  git -C "$script_dir" remote -v 2>/dev/null | grep -qF "$OWN_SKILLS_REPO_BASE"
}

# Newest published release tag, resolved straight from the remote so it works
# with no checkout at all. Prints the tag's commit; empty if none can be read.
resolve_latest_release() {
  command -v git >/dev/null 2>&1 || return 1
  git ls-remote --tags --refs "https://github.com/$OWN_SKILLS_REPO_BASE.git" 'v*' 2>/dev/null |
    sed 's#^\([0-9a-f]*\)[[:space:]]*refs/tags/#\1 #' |
    sort -k2 -V |
    tail -1 |
    cut -d' ' -f1
}

# Resolve a tag name to its commit on the remote, so `--version v4.12.1` works
# without a checkout.
resolve_remote_tag() {
  command -v git >/dev/null 2>&1 || return 1
  git ls-remote --tags --refs "https://github.com/$OWN_SKILLS_REPO_BASE.git" \
    "refs/tags/$1" 2>/dev/null | cut -f1
}

# Is this commit actually on this repository's remote? An unpushed local commit
# is not, and neither is a commit belonging to some other repository entirely.
remote_has_commit() {
  local sha="$1"
  git ls-remote "https://github.com/$OWN_SKILLS_REPO_BASE.git" 2>/dev/null |
    grep -q "^$sha[[:space:]]" && return 0
  # Not at a ref tip, but a checkout of THIS repository can prove reachability.
  own_checkout || return 1
  git -C "$script_dir" merge-base --is-ancestor "$sha" \
    "$(git -C "$script_dir" rev-parse --verify "refs/remotes/origin/main" 2>/dev/null || echo "$sha")" \
    2>/dev/null
}

if [[ -n "$VERSION" ]]; then
  if [[ "$VERSION" =~ ^[0-9a-f]{40}$ ]]; then
    : # already immutable
  elif own_checkout &&
       git -C "$script_dir" show-ref --verify --quiet "refs/tags/$VERSION"; then
    VERSION="$(git -C "$script_dir" rev-parse --verify "refs/tags/${VERSION}^{commit}")"
  elif tag_sha="$(resolve_remote_tag "$VERSION")" && [[ -n "$tag_sha" ]]; then
    VERSION="$tag_sha"
  else
    echo -e "${RED}Error: '$VERSION' is not a full commit SHA or a tag in this repository${NC}"
    exit 1
  fi
else
  head_sha=""
  if own_checkout; then
    head_sha="$(git -C "$script_dir" rev-parse --verify HEAD 2>/dev/null || true)"
  fi

  if [[ -n "$head_sha" ]] && remote_has_commit "$head_sha"; then
    VERSION="$head_sha"
  else
    VERSION="$(resolve_latest_release || true)"
    if [[ -n "$head_sha" && -n "$VERSION" ]]; then
      echo -e "${YELLOW}→${NC} This checkout's HEAD (${head_sha:0:7}) is not on the remote — probably not pushed yet."
      echo -e "${YELLOW}→${NC} Installing the latest release (${VERSION:0:7}) instead. Pass --version to override."
      echo ""
    fi
  fi

  if [[ -z "$VERSION" ]]; then
    echo -e "${RED}Error: could not reach https://github.com/$OWN_SKILLS_REPO_BASE to find the latest release${NC}"
    echo "Check your network, or pass --version <tag-or-commit> explicitly."
    exit 1
  fi
fi

OWN_SKILLS_REPO="$OWN_SKILLS_REPO_BASE#$VERSION"

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
  _deduped=()
  for agent in "${SKILL_AGENTS[@]}"; do
    _seen=false
    for existing in "${_deduped[@]}"; do
      if [[ "$existing" == "$agent" ]]; then
        _seen=true
        break
      fi
    done
    [[ "$_seen" == true ]] && continue
    _deduped+=("$agent")
  done
  SKILL_AGENTS=("${_deduped[@]}")
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
  local download_tmp

  echo -e "${YELLOW}→${NC} Downloading $description..."
  mkdir -p "$(dirname "$dest")"
  download_tmp="$(mktemp "${dest}.download.XXXXXXXX")"

  if curl -fsSL "$url" -o "$download_tmp"; then
    backup_file "$dest"
    mv "$download_tmp" "$dest"
    echo -e "${GREEN}✓${NC} $description installed"
    return 0
  else
    rm -f "$download_tmp"
    echo -e "${RED}✗${NC} Failed to download $description"
    return 1
  fi
}

# Function to backup existing file
backup_file() {
  local file="$1"

  if [[ -e "$file" || -L "$file" ]]; then
    local backup
    backup="$(mktemp "${file}.backup.XXXXXXXX")"
    echo -e "${YELLOW}→${NC} Backing up existing file to $backup"
    mv "$file" "$backup"
  fi
}

# Download one owned Claude artifact, transform it for OpenCode in temporary
# files, then back up and replace only its declared destination.
download_filtered_file() {
  local url="$1"
  local dest="$2"
  local description="$3"
  local filter="$4"
  local source_tmp
  local filtered_tmp

  source_tmp="$(mktemp)"
  mkdir -p "$(dirname "$dest")"
  filtered_tmp="$(mktemp "${dest}.download.XXXXXXXX")"
  echo -e "${YELLOW}→${NC} Downloading $description..."

  if ! curl -fsSL "$url" -o "$source_tmp"; then
    rm -f "$source_tmp" "$filtered_tmp"
    echo -e "${RED}✗${NC} Failed to download $description"
    return 1
  fi

  if ! sed "$filter" "$source_tmp" > "$filtered_tmp"; then
    rm -f "$source_tmp" "$filtered_tmp"
    echo -e "${RED}✗${NC} Failed to transform $description"
    return 1
  fi

  backup_file "$dest"
  mv "$filtered_tmp" "$dest"
  rm -f "$source_tmp"
  echo -e "${GREEN}✓${NC} $description installed"
}

# Global destination map from the pinned skills@1.5.22 agent registry. This
# installer passes --copy explicitly, so only the resolved selected destinations
# can be replaced.
global_skills_dir_for_agent() {
  local agent="$1"
  local config_home="${XDG_CONFIG_HOME:-$HOME/.config}"

  case "$agent" in
    amp|antigravity|antigravity-cli|cline|codex|cursor|dexto|firebender|gemini-cli|github-copilot|kimi-code-cli|loaf|opencode|replit|universal|warp|zed)
      echo "$HOME/.agents/skills" ;;
    claude-code) echo "${CLAUDE_CONFIG_DIR:-$HOME/.claude}/skills" ;;
    aider-desk) echo "$HOME/.aider-desk/skills" ;;
    astrbot) echo "$HOME/.astrbot/data/skills" ;;
    autohand-code) echo "${AUTOHAND_HOME:-$HOME/.autohand}/skills" ;;
    augment) echo "$HOME/.augment/skills" ;;
    bob) echo "$HOME/.bob/skills" ;;
    openclaw)
      if [[ -d "$HOME/.openclaw" ]]; then echo "$HOME/.openclaw/skills"
      elif [[ -d "$HOME/.clawdbot" ]]; then echo "$HOME/.clawdbot/skills"
      elif [[ -d "$HOME/.moltbot" ]]; then echo "$HOME/.moltbot/skills"
      else echo "$HOME/.openclaw/skills"; fi ;;
    codearts-agent) echo "$HOME/.codeartsdoer/skills" ;;
    codebuddy) echo "$HOME/.codebuddy/skills" ;;
    codemaker) echo "$HOME/.codemaker/skills" ;;
    codestudio) echo "$HOME/.codestudio/skills" ;;
    command-code) echo "$HOME/.commandcode/skills" ;;
    continue) echo "$HOME/.continue/skills" ;;
    cortex) echo "$HOME/.snowflake/cortex/skills" ;;
    crush) echo "$HOME/.config/crush/skills" ;;
    deepagents) echo "$HOME/.deepagents/agent/skills" ;;
    devin) echo "$config_home/devin/skills" ;;
    droid) echo "$HOME/.factory/skills" ;;
    forgecode) echo "$HOME/.forge/skills" ;;
    goose) echo "$config_home/goose/skills" ;;
    grok) echo "${GROK_HOME:-$HOME/.grok}/skills" ;;
    hermes-agent) echo "${HERMES_HOME:-$HOME/.hermes}/skills" ;;
    inference-sh) echo "$HOME/.inferencesh/skills" ;;
    jazz) echo "$HOME/.jazz/skills" ;;
    junie) echo "$HOME/.junie/skills" ;;
    iflow-cli) echo "$HOME/.iflow/skills" ;;
    kilo) echo "$HOME/.kilocode/skills" ;;
    kimchi) echo "$config_home/kimchi/harness/skills" ;;
    kiro-cli) echo "$HOME/.kiro/skills" ;;
    kode) echo "$HOME/.kode/skills" ;;
    lingma) echo "$HOME/.lingma/skills" ;;
    mcpjam) echo "$HOME/.mcpjam/skills" ;;
    minimax-code) echo "$HOME/.minimax/skills" ;;
    mistral-vibe) echo "${VIBE_HOME:-$HOME/.vibe}/skills" ;;
    moxby) echo "$HOME/.moxby/skills" ;;
    mux) echo "$HOME/.mux/skills" ;;
    openhands) echo "$HOME/.openhands/skills" ;;
    ona) echo "$HOME/.ona/skills" ;;
    pi) echo "$HOME/.pi/agent/skills" ;;
    qoder) echo "$HOME/.qoder/skills" ;;
    qoder-cn) echo "$HOME/.qoder-cn/skills" ;;
    qwen-code) echo "$HOME/.qwen/skills" ;;
    reasonix) echo "$HOME/.reasonix/skills" ;;
    rovodev) echo "$HOME/.rovodev/skills" ;;
    roo) echo "$HOME/.roo/skills" ;;
    tabnine-cli) echo "$HOME/.tabnine/agent/skills" ;;
    terramind) echo "$HOME/.terramind/skills" ;;
    tinycloud) echo "$HOME/.tinycloud/skills" ;;
    trae) echo "$HOME/.trae/skills" ;;
    trae-cn) echo "$HOME/.trae-cn/skills" ;;
    windsurf) echo "$HOME/.codeium/windsurf/skills" ;;
    zcode) echo "$HOME/.zcode/skills" ;;
    zencoder|zenflow) echo "$HOME/.zencoder/skills" ;;
    neovate) echo "$HOME/.neovate/skills" ;;
    pochi) echo "$HOME/.pochi/skills" ;;
    adal) echo "$HOME/.adal/skills" ;;
    eve|promptscript|*) return 1 ;;
  esac
}

backup_selected_skills() {
  local skills=("$@") agent dir skill backup
  local checked_dirs=()

  for agent in "${SKILL_AGENTS[@]}"; do
    if ! dir="$(global_skills_dir_for_agent "$agent")"; then
      echo -e "${RED}✗${NC} Cannot safely resolve the pinned CLI destination for agent: $agent"
      return 1
    fi
    [[ " ${checked_dirs[*]} " == *" $dir "* ]] || checked_dirs+=("$dir")
  done

  for dir in "${checked_dirs[@]}"; do
    local existing=()
    for skill in "${skills[@]}"; do
      [[ -e "$dir/$skill" || -L "$dir/$skill" ]] && existing+=("$skill")
    done
    [[ ${#existing[@]} -gt 0 ]] || continue

    backup="$(mktemp -d "$dir.before-install.XXXXXXXX")"
    echo -e "${YELLOW}→${NC} Backing up ${#existing[@]} existing selected skill(s) from $dir to $backup"
    for skill in "${existing[@]}"; do
      cp -a "$dir/$skill" "$backup/"
    done
  done
}

# Optional (community) skill sources that failed to install. Collected so a
# single bad upstream source warns at the end instead of aborting setup.
FAILED_SKILL_SOURCES=()

validate_unique_skill_names() {
  local names=("$@") seen=() name prior
  for name in "${names[@]}"; do
    for prior in "${seen[@]}"; do
      if [[ "$name" == "$prior" ]]; then
        echo -e "${RED}✗${NC} Duplicate skill name in reviewed install manifest: $name"
        return 1
      fi
    done
    seen+=("$name")
  done
}

# The pinned Skills CLI cannot fetch a commit pin on its own: it clones
# `repo#<ref>` sources with `git clone --branch <ref>`, and git only accepts
# branch or tag names there, so a commit-SHA pin always dies with "Remote
# branch <sha> not found in upstream origin". Rather than downloading a whole
# repository archive to work around that, fetch exactly the pinned commit
# (and, when a subpath is declared, only that directory's files) with a
# shallow sparse `git fetch`, then hand the CLI the local path — local
# sources need no cloning and no download-size overrides. Branch/tag refs
# and non-GitHub URLs pass through to the CLI untouched.
SKILL_FETCH_DIRS=()

cleanup_skill_fetch_dirs() {
  local dir
  for dir in "${SKILL_FETCH_DIRS[@]}"; do
    rm -rf "$dir"
  done
}
trap cleanup_skill_fetch_dirs EXIT

SKILL_FETCH_KEYS=()
SKILL_FETCH_PATHS=()

fetch_pinned_source() {
  local source="$1"
  local subpath="$2"
  local repo="${source%%#*}"
  local ref="${source##*#}"
  local key="$source|$subpath"
  local i

  # Reuse an earlier fetch of the same pinned source (the preflight below
  # fetches the first-party pin before anything is mutated).
  for ((i = 0; i < ${#SKILL_FETCH_KEYS[@]}; i++)); do
    if [[ "${SKILL_FETCH_KEYS[$i]}" == "$key" ]]; then
      echo "${SKILL_FETCH_PATHS[$i]}"
      return 0
    fi
  done

  if [[ "$source" != *"#"* ]] || ! [[ "$ref" =~ ^[0-9a-f]{40}$ ]]; then
    echo "$source"
    return 0
  fi

  case "$repo" in
    https://github.com/*) repo="${repo#https://github.com/}" ;;
    *://*|git@*)
      echo "$source"
      return 0
      ;;
  esac
  repo="${repo%.git}"

  local dest
  dest="$(mktemp -d "${TMPDIR:-/tmp}/skills-src-${repo//\//-}.XXXXXX")" || return 1
  SKILL_FETCH_DIRS+=("$dest")

  git -C "$dest" init --quiet &&
    git -C "$dest" remote add origin "https://github.com/$repo.git" &&
    { [[ -z "$subpath" ]] ||
      git -C "$dest" sparse-checkout set --no-cone "$subpath"; } &&
    git -C "$dest" fetch --quiet --depth 1 \
      ${subpath:+--filter=blob:none} origin "$ref" &&
    git -C "$dest" checkout --quiet FETCH_HEAD || return 1

  SKILL_FETCH_KEYS+=("$key")
  SKILL_FETCH_PATHS+=("$dest${subpath:+/$subpath}")
  echo "$dest${subpath:+/$subpath}"
}

# Fetch the first-party pin before anything is mutated. The pin defaults to the
# current checkout's HEAD, which is unreachable from the remote whenever that
# commit has not been pushed — and the failure used to surface only after every
# selected skill had already been moved into a backup directory.
verify_own_skills_source() {
  if fetch_pinned_source "$OWN_SKILLS_REPO" "" >/dev/null; then
    return 0
  fi

  echo -e "${RED}✗${NC} Cannot reach pinned revision $VERSION in $OWN_SKILLS_REPO_BASE"
  echo ""
  echo "That revision is not on the remote. If you passed --version, check the tag"
  echo "or commit and try again, or omit it to install the latest release. If you"
  echo "did not, the network or the repository may be unreachable."
  echo ""
  echo -e "${GREEN}Nothing was changed.${NC} Your installed skills are untouched."
  return 1
}

adapt_effect_skill_to_v4_rc() {
  local skill_file="$1/effect-ts/SKILL.md"
  local patched_file="${skill_file}.rc"

  if [[ ! -f "$skill_file" ]] || ! grep -Fq 'effect@beta' "$skill_file"; then
    echo -e "${RED}✗${NC} Cannot adapt the reviewed Effect skill to the v4 RC dist-tag"
    return 1
  fi

  if ! sed 's/effect@beta/effect@rc/g' "$skill_file" > "$patched_file" ||
     ! mv "$patched_file" "$skill_file"; then
    rm -f "$patched_file"
    return 1
  fi
}

# Install skills from a skills.sh source for the selected agents. A non-empty
# subpath narrows the pinned fetch to the one directory holding the skills.
install_skills_from() {
  local source="$1"
  local label="$2"
  local subpath="$3"
  shift 3
  local skills=("$@")
  local install_source

  if [[ ${#skills[@]} -eq 0 ]]; then
    echo -e "${RED}✗${NC} No reviewed skill names declared for $source"
    return 1
  fi

  echo -e "${YELLOW}→${NC} Installing $label from $source for: ${SKILL_AGENTS[*]}"

  if ! install_source="$(fetch_pinned_source "$source" "$subpath")"; then
    echo -e "${RED}✗${NC} Failed to fetch pinned revision for $label from $source"
    return 1
  fi

  if [[ "$source" == "$EFFECT_SKILLS_REPO" ]] &&
     ! adapt_effect_skill_to_v4_rc "$install_source"; then
    return 1
  fi

  # Build -a flags from the SKILL_AGENTS array
  local agent_args=()
  for agent in "${SKILL_AGENTS[@]}"; do
    agent_args+=(-a "$agent")
  done

  # -g: install globally (per-agent paths managed by the skills CLI)
  # -s: install only the reviewed names declared above
  # -y: skip prompts
  if npx --yes "skills@$SKILLS_CLI_VERSION" add "$install_source" -g "${agent_args[@]}" -s "${skills[@]}" --copy -y; then
    echo -e "${GREEN}✓${NC} $label installed"
  else
    echo -e "${RED}✗${NC} Failed to install $label from $source"
    return 1
  fi
}

# Install an optional community skill source. Unlike the user's own skills,
# these come from third-party repos that can break independently (e.g. a repo
# restructured without a SKILL.md). A failure here records the source and
# continues so the remaining sources and the rest of setup still run. The
# `if !` guard also suppresses `set -e` for the call.
install_optional_skills_from() {
  if ! install_skills_from "$@"; then
    FAILED_SKILL_SOURCES+=("$1")
  fi
}

# Install the ponytail plugin (https://ponytail.dev) for an agent CLI.
# Registers the marketplace then installs the plugin; a missing CLI is
# skipped and a failed install warns rather than aborting the rest of setup.
PONYTAIL_MARKETPLACE="DietrichGebert/ponytail"
PONYTAIL_PLUGIN="ponytail@ponytail"

install_ponytail_for() {
  local cli="$1"
  local install_subcommand="$2"

  if ! command -v "$cli" >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠${NC}  $cli CLI not found — skipping ponytail for $cli"
    return 0
  fi

  # Re-adding an already-registered marketplace can fail; the install below
  # is the step that matters.
  "$cli" plugin marketplace add "$PONYTAIL_MARKETPLACE" >/dev/null 2>&1 || true

  if "$cli" plugin "$install_subcommand" "$PONYTAIL_PLUGIN" >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} ponytail installed for $cli"
  else
    echo -e "${RED}✗${NC} Failed to install ponytail for $cli — install manually: $cli plugin $install_subcommand $PONYTAIL_PLUGIN"
  fi
}

# Create only the selected Claude artifact roots. Skills and OpenCode-only
# modes must not create unrelated ~/.claude directories.
if [[ "$INSTALL_AGENTS" == true || "$INSTALL_COMMANDS" == true ]]; then
  echo -e "${BLUE}Creating directories...${NC}"
  [[ "$INSTALL_AGENTS" == true ]] && mkdir -p ~/.claude/agents
  [[ "$INSTALL_COMMANDS" == true ]] && mkdir -p ~/.claude/commands
  echo -e "${GREEN}✓${NC} Directories created"
  echo ""
fi

# Install CLAUDE.md
if [[ "$INSTALL_CLAUDE" == true ]]; then
  echo -e "${BLUE}Installing CLAUDE.md...${NC}"
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
  echo -e "${YELLOW}→${NC} Skills CLI, source revisions, and selected names are pinned. Re-audit before changing any pin. Use --no-external for first-party skills only."
  echo ""

  install_manifest=("${FIRST_PARTY_SKILLS[@]}")
  if [[ "$INSTALL_EXTERNAL" == true ]]; then
    install_manifest+=("${WEB_QUALITY_SKILLS[@]}" "${NEXT_SKILLS[@]}" "${VERCEL_REACT_SKILLS[@]}" "${EFFECT_SKILLS[@]}" "${MATTPOCOCK_SKILLS[@]}" "${SEO_AUDIT_SKILLS[@]}" "${ANTHROPIC_SKILLS[@]}" "${HERDR_SKILLS[@]}")
  fi
  if [[ "$INSTALL_IMPECCABLE" == true ]]; then
    install_manifest+=("${IMPECCABLE_SKILLS[@]}")
  fi

  if ! validate_unique_skill_names "${install_manifest[@]}"; then
    exit 1
  fi

  if ! verify_own_skills_source; then
    exit 1
  fi

  backup_selected_skills "${install_manifest[@]}"

  install_skills_from "$OWN_SKILLS_REPO" "own skills (citypaul/.dotfiles)" "" "${FIRST_PARTY_SKILLS[@]}"

  if [[ "$INSTALL_EXTERNAL" == true ]]; then
    install_optional_skills_from "$WEB_QUALITY_SKILLS_REPO" "web quality skills (addyosmani/web-quality-skills)" "" "${WEB_QUALITY_SKILLS[@]}"
    install_optional_skills_from "$NEXT_SKILLS_REPO" "Next.js skills (vercel/next.js)" "$NEXT_SKILLS_SUBPATH" "${NEXT_SKILLS[@]}"
    install_optional_skills_from "$VERCEL_REACT_SKILLS_REPO" "React skills (vercel-labs/agent-skills)" "$VERCEL_REACT_SKILLS_SUBPATH" "${VERCEL_REACT_SKILLS[@]}"
    install_optional_skills_from "$EFFECT_SKILLS_REPO" "Effect v4 RC TypeScript skill (Effect-TS/skills)" "$EFFECT_SKILLS_SUBPATH" "${EFFECT_SKILLS[@]}"
    install_optional_skills_from "$MATTPOCOCK_SKILLS_REPO" "grill-me + writing-for-agents skills (mattpocock/skills)" "" "${MATTPOCOCK_SKILLS[@]}"
    install_optional_skills_from "$MARKETING_SKILLS_REPO" "seo-audit skill (coreyhaines31/marketingskills)" "" "${SEO_AUDIT_SKILLS[@]}"
    install_optional_skills_from "$ANTHROPIC_SKILLS_REPO" "skill-creator skill (anthropics/skills)" "$ANTHROPIC_SKILLS_SUBPATH" "${ANTHROPIC_SKILLS[@]}"
    # Lets an agent drive the terminal multiplexer it is running inside —
    # split a pane, run a command in it, read the output back, and wait on a
    # sibling agent without stealing focus. Installed for every target agent
    # because each one benefits from it independently.
    install_optional_skills_from "$HERDR_SKILLS_REPO" "herdr skill (herdrdev/herdr)" "" "${HERDR_SKILLS[@]}"
  fi

  if [[ "$INSTALL_IMPECCABLE" == true ]]; then
    install_optional_skills_from "$IMPECCABLE_SKILLS_REPO" "impeccable design skills (pbakaus/impeccable)" "" "${IMPECCABLE_SKILLS[@]}"
  fi

  echo ""
  if [[ ${#FAILED_SKILL_SOURCES[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠${NC}  ${#FAILED_SKILL_SOURCES[@]} optional skill source(s) were skipped after failing to install:"
    for src in "${FAILED_SKILL_SOURCES[@]}"; do
      echo -e "      • $src"
    done
    echo -e "    These are third-party community sources; setup continued without them."
    echo -e "    Review the failed source on skills.sh, then rerun; existing selected skills were backed up before replacement."
  fi
  echo ""
fi

# Install the ponytail plugin for Claude Code and Codex
if [[ "$INSTALL_PONYTAIL" == true ]]; then
  echo -e "${BLUE}Installing ponytail plugin (https://ponytail.dev)...${NC}"
  install_ponytail_for claude install
  install_ponytail_for codex add
  echo ""
fi

# Install commands (slash commands)
if [[ "$INSTALL_COMMANDS" == true ]]; then
  echo -e "${BLUE}Installing commands (slash commands)...${NC}"

  for cmd in "${COMMAND_FILES[@]}"; do
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

  for agent in "${CLAUDE_AGENT_FILES[@]}"; do
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
  download_file \
    "$BASE_URL/$VERSION/opencode/.config/opencode/opencode.json" \
    ~/.config/opencode/opencode.json \
    "opencode.json"

  # Project only the declared command manifest from the pinned source,
  # stripping Claude Code-specific frontmatter. Never enumerate a user's
  # ~/.claude directory as installation input.
  # OpenCode uses ~/.config/opencode/command/ (singular) for slash commands
  # The 'allowed-tools' field is Claude Code-specific and not valid in OpenCode
  echo -e "${BLUE}Installing commands for OpenCode...${NC}"
  mkdir -p ~/.config/opencode/command
  for cmd in "${COMMAND_FILES[@]}"; do
    download_filtered_file \
      "$BASE_URL/$VERSION/claude/.claude/commands/$cmd" \
      ~/.config/opencode/command/"$cmd" \
      "command/$cmd" \
      '/^allowed-tools:/d'
  done

  # Project only real agent files (not README.md) from the pinned source.
  # OpenCode uses ~/.config/opencode/agent/ (singular) for agents
  # The 'tools' field expects an object in OpenCode but is a string in Claude Code
  # The 'color' field expects hex (#RRGGBB) in OpenCode but is a named color in Claude Code
  echo -e "${BLUE}Installing agents for OpenCode...${NC}"
  mkdir -p ~/.config/opencode/agent
  for agent in "${AGENT_FILES[@]}"; do
    download_filtered_file \
      "$BASE_URL/$VERSION/claude/.claude/agents/$agent" \
      ~/.config/opencode/agent/"$agent" \
      "agent/$agent" \
      '/^tools:/d; /^color:/d'
  done

  echo ""
fi

# Success message
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Installation complete! ✓                         ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Show what was installed
echo -e "${BLUE}Installed components:${NC}"
echo ""

if [[ "$INSTALL_CLAUDE" == true ]]; then
  echo -e "  ${GREEN}✓${NC} CLAUDE.md (lean core principles)"
fi

if [[ "$INSTALL_SKILLS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} skills (installed via skills.sh for: ${SKILL_AGENTS[*]})"
  echo -e "     • citypaul/.dotfiles — auto-discovered patterns (tdd, testing, typescript-strict, ...)"
  if [[ "$INSTALL_EXTERNAL" == true ]]; then
    echo -e "     • addyosmani/web-quality-skills — accessibility, performance, SEO, ..."
    echo -e "     • vercel/next.js — Cache Components optimizer + adoption workflow skills"
    echo -e "     • vercel-labs/agent-skills — React performance rules + composition patterns"
    echo -e "     • Effect-TS/skills — version-matched Effect v4 RC setup guidance"
    echo -e "     • mattpocock/skills — relentless plan interviewing + writing for agents"
    echo -e "     • anthropics/skills/skill-creator — authoring, evaluating, and tuning skills"
    echo -e "     • coreyhaines31/marketingskills/seo-audit — SEO audit workflow"
  fi
  if [[ "$INSTALL_IMPECCABLE" == true ]]; then
    echo -e "     • pbakaus/impeccable — design vocabulary + steering commands"
  fi
  echo -e "     Run ${YELLOW}npx skills@$SKILLS_CLI_VERSION list -g${NC} to see paths for each agent."
fi

if [[ "$INSTALL_PONYTAIL" == true ]]; then
  echo -e "  ${GREEN}✓${NC} ponytail plugin (https://ponytail.dev) for Claude Code + Codex, where the CLIs are installed"
fi

if [[ "$INSTALL_COMMANDS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} commands/ (3 slash commands: /setup, /plan, /continue)"
fi

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  ${GREEN}✓${NC} agents/ (9 Claude Code agents + README)"
fi

if [[ "$INSTALL_OPENCODE" == true ]]; then
  echo -e ""
  echo -e "${BLUE}Installed to ~/.config/opencode/${NC}"
  echo -e "  ${GREEN}✓${NC} opencode.json (OpenCode rules configuration)"
  echo -e "  ${GREEN}✓${NC} command/ (declared commands from the pinned source)"
  echo -e "  ${GREEN}✓${NC} agent/ (declared agents from the pinned source)"
  if [[ "$INSTALL_SKILLS" == true ]]; then
    echo -e "  ${GREEN}✓${NC} skills also installed into OpenCode via skills.sh"
  fi
fi

echo ""
echo -e "${BLUE}Architecture:${NC}"
echo ""
echo -e "  ${YELLOW}CLAUDE.md${NC}  → Core principles (~100 lines, always loaded)"
echo -e "  ${YELLOW}skills/${NC}    → Detailed patterns (loaded on-demand). Installed with pinned ${YELLOW}skills@$SKILLS_CLI_VERSION${NC}"
echo -e "  ${YELLOW}commands/${NC}  → Slash commands (manually invoked)"
echo -e "  ${YELLOW}agents/${NC}    → Complex multi-step workflows"
echo ""
echo -e "${BLUE}Inspecting skills:${NC}"
echo ""
echo -e "  ${YELLOW}npx skills@$SKILLS_CLI_VERSION list -g${NC}              List installed skills"
echo -e "  ${YELLOW}npx skills@$SKILLS_CLI_VERSION find <query>${NC}         Search skills.sh for more skills"
echo -e "  Mutating update/remove commands bypass this installer's automatic backups; back up and verify exact targets first."
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo ""
if [[ "$INSTALL_CLAUDE" == true || "$INSTALL_COMMANDS" == true || "$INSTALL_AGENTS" == true ]]; then
  echo -e "  Verify Claude Code artifacts: ${YELLOW}ls -la ~/.claude/${NC}"
  [[ "$INSTALL_SKILLS" == true ]] && echo -e "  Try a multi-lens PR review: ${YELLOW}/panel-review${NC}"
  echo ""
elif [[ "$INSTALL_OPENCODE" == true ]]; then
  echo -e "  Verify OpenCode artifacts: ${YELLOW}ls -la ~/.config/opencode/${NC}"
  echo ""
fi

if [[ "$INSTALL_AGENTS" == true ]]; then
  echo -e "  Learn about agents:"
  echo -e "     ${YELLOW}cat ~/.claude/agents/README.md${NC}"
  echo ""
fi

if [[ "$INSTALL_SKILLS" == true ]]; then
  echo -e "${BLUE}Want to target more agents?${NC}"
  echo ""
  echo -e "  Skills via skills.sh work with 40+ agents (Codex, Cursor, Copilot, Gemini CLI, ...)."
  echo -e "  Re-run with ${YELLOW}--agent <name>${NC} (repeatable) to add more:"
  echo -e "     ${YELLOW}$0 --skills-only --no-claude-code --agent codex --agent cursor${NC}"
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
echo -e "  • ${YELLOW}Vercel${NC} — Next.js skills"
echo -e "    ${BLUE}https://github.com/vercel/next.js/tree/canary/skills${NC}"
echo ""
echo -e "  • ${YELLOW}Vercel Labs${NC} — React performance and composition skills"
echo -e "    ${BLUE}https://skills.sh/vercel-labs/agent-skills${NC}"
echo ""
echo -e "  • ${YELLOW}Effect${NC} — Effect v4 RC TypeScript setup skill"
echo -e "    ${BLUE}https://skills.sh/effect-ts/skills/effect-ts${NC} (no repository licence published)"
echo ""
echo -e "  • ${YELLOW}Paul Bakaus${NC} — impeccable frontend design skills"
echo -e "    ${BLUE}https://impeccable.style/skills/${NC} (Apache 2.0)"
echo ""
echo -e "  • ${YELLOW}Matt Pocock${NC} — grill-me planning interview + writing-for-agents skills"
echo -e "    ${BLUE}https://skills.sh/mattpocock/skills${NC} (MIT)"
echo ""
echo -e "  • ${YELLOW}Anthropic${NC} — skill-creator authoring and evaluation skill"
echo -e "    ${BLUE}https://github.com/anthropics/skills${NC} (Apache 2.0)"
echo ""
echo -e "  • ${YELLOW}Corey Haines${NC} — seo-audit marketing skill"
echo -e "    ${BLUE}https://skills.sh/coreyhaines31/marketingskills/seo-audit${NC} (MIT)"
echo ""
echo -e "  • ${YELLOW}Kieran O'Hara${NC} — use-case-data-patterns agent"
echo -e "    ${BLUE}https://github.com/kieran-ohara/dotfiles${NC}"
echo ""
echo -e "  • ${YELLOW}Andrea Laforgia${NC} — historical test-design-reviewer source; current skill is a clean rewrite and the old source declared no public redistribution license"
echo -e "    ${BLUE}https://github.com/andrealaforgia/claude-code-agents/blob/278e367057bbe4a57255870e0a30b9d0a6eabc59/test-design-reviewer.md${NC}"
echo ""
echo -e "${BLUE}For help or issues:${NC}"
echo -e "  ${YELLOW}https://github.com/citypaul/.dotfiles${NC}"
echo ""
