#!/usr/bin/env bash
#
# Run one of the skill quality evaluations: tdd, hexagonal, or ddd.
#
# Builds a throwaway copy of fixtures/<suite>-workspace outside the
# repository, installs its dependencies from the committed lockfile, mounts
# the live skills at .claude/skills, and commits the starting state so
# quality-hooks.js can reset the workspace between cases.
#
# Usage:
#   ./evals/skills/run-quality.sh tdd
#   ./evals/skills/run-quality.sh hexagonal --filter-providers with-skills
#   ./evals/skills/run-quality.sh ddd --repeat 3
#   SKILL_EVAL_MODEL=opus ./evals/skills/run-quality.sh tdd
#
# Results: results/<suite>-latest.json, plus one .diff per case under
# results/<suite>/.

set -euo pipefail

SUITE="${1:?usage: run-quality.sh <tdd|hexagonal|ddd> [promptfoo eval flags]}"
shift

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$REPO_ROOT/claude/.claude/skills"
FIXTURE="$SCRIPT_DIR/fixtures/$SUITE-workspace"
CONFIG="$SCRIPT_DIR/promptfooconfig.$SUITE.yaml"
RESULTS_DIR="$SCRIPT_DIR/results"

if [ ! -d "$FIXTURE" ] || [ ! -f "$CONFIG" ]; then
  echo "unknown suite '$SUITE': expected $FIXTURE and $CONFIG" >&2
  exit 1
fi

if [ ! -x "$SCRIPT_DIR/node_modules/.bin/promptfoo" ]; then
  echo "promptfoo is not installed; run 'pnpm install' in evals/skills first" >&2
  exit 1
fi

WORKSPACE="$(mktemp -d "${TMPDIR:-/tmp}/citypaul-$SUITE-evals.XXXXXX")"
cleanup() {
  rm -rf "$WORKSPACE"
}
trap cleanup EXIT

cp -R "$FIXTURE/." "$WORKSPACE/"
rm -rf "$WORKSPACE/node_modules"
mkdir -p "$WORKSPACE/.claude"
ln -s "$SKILLS_DIR" "$WORKSPACE/.claude/skills"
(cd "$WORKSPACE" && pnpm install --frozen-lockfile --silent)
(
  cd "$WORKSPACE" &&
    git init --quiet &&
    git -c user.name=eval -c user.email=eval@example.com add -A &&
    git -c user.name=eval -c user.email=eval@example.com commit --quiet -m "fixture"
)
mkdir -p "$RESULTS_DIR/$SUITE"
rm -f "$RESULTS_DIR/$SUITE"/*.diff

cd "$SCRIPT_DIR"
SKILL_EVAL_SUITE="$SUITE" \
SKILL_EVAL_WORKSPACE="$WORKSPACE" \
SKILL_EVAL_MODEL="${SKILL_EVAL_MODEL:-sonnet}" \
PROMPTFOO_DISABLE_TELEMETRY=1 \
  ./node_modules/.bin/promptfoo eval \
    -c "$CONFIG" \
    --no-cache \
    -o "$RESULTS_DIR/$SUITE-latest.json" \
    "$@" && status=0 || status=$?

echo ""
node "$SCRIPT_DIR/report-quality.mjs" "$RESULTS_DIR/$SUITE-latest.json"
exit "$status"
