#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

"$SCRIPT_DIR/opencode-compat.sh"
"$SCRIPT_DIR/skills-frontmatter.sh"
"$SCRIPT_DIR/skill-evals-routing.sh"
"$SCRIPT_DIR/skill-evals-quality.sh"
"$SCRIPT_DIR/architecture-guidance.sh"
bash "$SCRIPT_DIR/cli-guidance.sh"
"$SCRIPT_DIR/mutation-workflow.sh"
"$SCRIPT_DIR/tdd-watch-workflow.sh"
"$SCRIPT_DIR/delegation-landing-workflow.sh"
"$SCRIPT_DIR/delegate-command.sh"
"$SCRIPT_DIR/install-claude-next-skills.sh"
"$SCRIPT_DIR/install-claude-skill-layout.sh"
"$SCRIPT_DIR/install-claude-unpushed-version.sh"
"$SCRIPT_DIR/install-claude-ponytail.sh"
"$SCRIPT_DIR/install-claude-herdr-skill.sh"
"$SCRIPT_DIR/install-claude-fork-overrides.sh"
"$SCRIPT_DIR/install-rich-overlay.sh"
