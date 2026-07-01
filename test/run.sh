#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

"$SCRIPT_DIR/opencode-compat.sh"
"$SCRIPT_DIR/skills-frontmatter.sh"
"$SCRIPT_DIR/install-claude-next-skills.sh"
"$SCRIPT_DIR/install-claude-skill-layout.sh"
