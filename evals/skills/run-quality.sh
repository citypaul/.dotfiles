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
#   SKILL_EVAL_BASELINE_REF=origin/main ./evals/skills/run-quality.sh tdd
#
# With SKILL_EVAL_BASELINE_REF set, a second workspace is built with the skills
# as they are at that git ref and a fourth provider, `skills-at-<ref>`, runs
# every case against it — promptfoo's side-by-side skill-version comparison,
# in one eval, for the viewer and for PR review.
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

prepare_workspace() {
  local dir="$1" skills="$2"
  cp -R "$FIXTURE/." "$dir/"
  rm -rf "$dir/node_modules"
  mkdir -p "$dir/.claude"
  ln -s "$skills" "$dir/.claude/skills"
  (cd "$dir" && pnpm install --frozen-lockfile --silent)
  printf '\n.pnpm-store/\n' >> "$dir/.gitignore"
  (
    cd "$dir" &&
      git init --quiet &&
      git -c user.name=eval -c user.email=eval@example.com add -A &&
      git -c user.name=eval -c user.email=eval@example.com commit --quiet -m "fixture"
  )
}

prepare_workspace "$WORKSPACE" "$SKILLS_DIR"
mkdir -p "$RESULTS_DIR/$SUITE"
rm -f "$RESULTS_DIR/$SUITE"/*.diff

BASELINE_WORKSPACE=""
if [ -n "${SKILL_EVAL_BASELINE_REF:-}" ]; then
  BASELINE_REF="$SKILL_EVAL_BASELINE_REF"
  BASELINE_SKILLS="$(mktemp -d "${TMPDIR:-/tmp}/citypaul-$SUITE-baseline-skills.XXXXXX")"
  BASELINE_WORKSPACE="$(mktemp -d "${TMPDIR:-/tmp}/citypaul-$SUITE-baseline.XXXXXX")"
  trap 'rm -rf "$WORKSPACE" "$BASELINE_SKILLS" "$BASELINE_WORKSPACE"' EXIT
  git -C "$REPO_ROOT" archive "$BASELINE_REF" claude/.claude/skills | tar -x -C "$BASELINE_SKILLS"
  prepare_workspace "$BASELINE_WORKSPACE" "$BASELINE_SKILLS/claude/.claude/skills"
  BASELINE_LABEL="skills-at-$(git -C "$REPO_ROOT" rev-parse --short "$BASELINE_REF")"
  BASELINE_CONFIG="$RESULTS_DIR/$SUITE.with-baseline.yaml"
  python3 - "$CONFIG" "$BASELINE_CONFIG" "$BASELINE_LABEL" <<'PY'
import sys
src, dst, label = sys.argv[1:4]
text = open(src).read()
provider = f"""  - id: anthropic:claude-agent-sdk
    label: {label}
    config:
      <<: *agent
      setting_sources: ['project']
      skills: 'all'
      working_dir: '{{{{env.SKILL_EVAL_BASELINE_WORKSPACE}}}}'

"""
marker = "extensions:\n"
assert marker in text, "config has no extensions block"
text = text.replace(marker, provider + marker, 1)
text = text.replace("file://", "file://../", ).replace("file://../../", "file://../")
open(dst, "w").write(text)
PY
  CONFIG="$BASELINE_CONFIG"
  echo "baseline provider: $BASELINE_LABEL"
fi

cd "$SCRIPT_DIR"
SKILL_EVAL_SUITE="$SUITE" \
SKILL_EVAL_WORKSPACE="$WORKSPACE" \
SKILL_EVAL_CURRENT_WORKSPACE="$WORKSPACE" \
SKILL_EVAL_BASELINE_WORKSPACE="$BASELINE_WORKSPACE" \
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
