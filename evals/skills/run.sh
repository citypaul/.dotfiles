#!/usr/bin/env bash
#
# Run the promptfoo skill-routing evaluation against the skills in
# claude/.claude/skills.
#
# The Claude Agent SDK discovers skills from `<working_dir>/.claude/skills`, so
# this script assembles a throwaway workspace OUTSIDE the repository: the
# fixture project plus a symlink to the live skills directory. Building it
# inside the repository would make Claude Code discover every skill a second
# time as a nested project skill for anyone working in this checkout.
#
# Usage:
#   ./evals/skills/run.sh                 # full routing suite
#   ./evals/skills/run.sh --repeat 3      # any extra promptfoo eval flags
#   SKILL_EVAL_MODEL=opus ./evals/skills/run.sh
#
# Authentication: uses your local Claude Code login by default. Set
# ANTHROPIC_API_KEY to bill an API key instead.
#
# Results are written to evals/skills/results/latest.json (gitignored) and can
# be browsed with `pnpm exec promptfoo view` from evals/skills.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$REPO_ROOT/claude/.claude/skills"
WORKSPACE="$(mktemp -d "${TMPDIR:-/tmp}/citypaul-skill-evals.XXXXXX")"
RESULTS_DIR="$SCRIPT_DIR/results"

cleanup() {
  rm -rf "$WORKSPACE"
}
trap cleanup EXIT

cp -R "$SCRIPT_DIR/fixtures/workspace/." "$WORKSPACE/"
mkdir -p "$WORKSPACE/.claude"
ln -s "$SKILLS_DIR" "$WORKSPACE/.claude/skills"
mkdir -p "$RESULTS_DIR"

if [ ! -x "$SCRIPT_DIR/node_modules/.bin/promptfoo" ]; then
  echo "promptfoo is not installed; run 'pnpm install' in evals/skills first" >&2
  exit 1
fi

cd "$SCRIPT_DIR"
SKILL_EVAL_WORKSPACE="$WORKSPACE" \
SKILL_EVAL_MODEL="${SKILL_EVAL_MODEL:-sonnet}" \
PROMPTFOO_DISABLE_TELEMETRY=1 \
  ./node_modules/.bin/promptfoo eval \
    -c promptfooconfig.yaml \
    --no-cache \
    -o "$RESULTS_DIR/latest.json" \
    "$@" && status=0 || status=$?

echo ""
node "$SCRIPT_DIR/report.mjs" "$RESULTS_DIR/latest.json"
exit "$status"
