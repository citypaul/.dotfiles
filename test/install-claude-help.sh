#!/usr/bin/env bash
#
# Test that install-claude.sh documents externally installed skill bundles.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
INSTALL_SCRIPT="$REPO_ROOT/install-claude.sh"

help_output="$($INSTALL_SCRIPT --help)"

if [[ "$help_output" != *"grill-me"* ]]; then
  echo "FAIL: install help does not mention grill-me as an external skill"
  exit 1
fi

if [[ "$help_output" != *"mattpocock/skills"* ]]; then
  echo "FAIL: install help does not mention mattpocock/skills"
  exit 1
fi

echo "PASS: install help documents grill-me external skill"
