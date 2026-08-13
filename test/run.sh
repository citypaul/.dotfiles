#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

"$SCRIPT_DIR/opencode-compat.sh"
"$SCRIPT_DIR/skills-frontmatter.sh"
"$SCRIPT_DIR/architecture-guidance.sh"
bash "$SCRIPT_DIR/cli-guidance.sh"
"$SCRIPT_DIR/mutation-workflow.sh"
"$SCRIPT_DIR/tdd-watch-workflow.sh"
"$SCRIPT_DIR/install-claude-next-skills.sh"
"$SCRIPT_DIR/install-claude-skill-layout.sh"
"$SCRIPT_DIR/install-claude-unpushed-version.sh"
"$SCRIPT_DIR/install-claude-ponytail.sh"
"$SCRIPT_DIR/install-claude-herdr-skill.sh"
