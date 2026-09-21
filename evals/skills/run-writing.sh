#!/usr/bin/env bash
# Nine writing requests, three independent runs each. Uses the existing Codex login.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
EVAL_DIR="$(mktemp -d "${TMPDIR:-/tmp}/writing-routing.XXXXXX")"
trap 'rm -rf "$EVAL_DIR"' EXIT
# Match the canonical paths reported by Codex on macOS (/var -> /private/var).
EVAL_DIR="$(cd "$EVAL_DIR" && pwd -P)"
PROMPTFOO_BIN="${PROMPTFOO_BIN:-$SCRIPT_DIR/node_modules/.bin/promptfoo}"
[[ -x "$PROMPTFOO_BIN" ]] || { echo 'Run pnpm install in evals/skills first.' >&2; exit 1; }

cp -R "$SCRIPT_DIR/fixtures/workspace" "$EVAL_DIR/workspace"
mkdir -p "$EVAL_DIR/workspace/.agents/skills" "$EVAL_DIR/codex-home"
cp -R "$REPO_ROOT/claude/.claude/skills/technical-writing" "$EVAL_DIR/workspace/.agents/skills/"
# Reuse login without importing personal Codex settings or model overrides.
AUTH_FILE="${CODEX_HOME:-$HOME/.codex}/auth.json"
[[ -f "$AUTH_FILE" ]] || { echo 'A file-backed Codex login is required.' >&2; exit 1; }
ln -s "$AUTH_FILE" "$EVAL_DIR/codex-home/auth.json"
printf 'cli_auth_credentials_store = "file"\n' > "$EVAL_DIR/codex-home/config.toml"
# Exclude user-level skills so assertions measure the copies under evaluation.
python3 - "$EVAL_DIR/codex-home/config.toml" <<'PYCONFIG'
import json, pathlib, sys
with open(sys.argv[1], 'a') as config:
    for skill in (pathlib.Path.home() / '.agents/skills').glob('*/SKILL.md'):
        config.write('\n[[skills.config]]\npath = ' + json.dumps(str(skill)) + '\nenabled = false\n')
PYCONFIG

for name in clarity simple-english; do
  case "$name" in
    clarity) variable=CLARITY_SKILLS_REPO; subpath=. ;;
    simple-english) variable=SIMPLE_ENGLISH_SKILLS_REPO; subpath=skills/simple-english ;;
  esac
  source=$(sed -n "s/^${variable}=\"\([^\"]*\)\"$/\1/p" "$REPO_ROOT/install-claude.sh")
  [[ "$source" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+#[0-9a-f]{40}$ ]] || { echo "Invalid pin: $variable" >&2; exit 1; }
  git init --quiet "$EVAL_DIR/$name"
  git -C "$EVAL_DIR/$name" fetch --quiet --depth 1 "https://github.com/${source%%#*}.git" "${source##*#}"
  git -C "$EVAL_DIR/$name" checkout --quiet FETCH_HEAD
  cp -R "$EVAL_DIR/$name/$subpath" "$EVAL_DIR/workspace/.agents/skills/$name"
  rm -rf "$EVAL_DIR/workspace/.agents/skills/$name/.git"
done

mkdir -p "$SCRIPT_DIR/results/writing"
SKILL_EVAL_WORKSPACE="$EVAL_DIR/workspace" \
SKILL_EVAL_CODEX_HOME="$EVAL_DIR/codex-home" \
SKILL_EVAL_MODEL="${SKILL_EVAL_MODEL:-gpt-5.6-sol}" \
PROMPTFOO_DISABLE_TELEMETRY=1 \
  "$PROMPTFOO_BIN" eval -c "$SCRIPT_DIR/promptfooconfig.writing.yaml" \
    --no-cache --repeat 3 --no-progress-bar \
    -o "$SCRIPT_DIR/results/writing/latest.json" "$@"
