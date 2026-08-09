#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CLI="$REPO_ROOT/claude/.claude/skills/cli-design"
CORE="$CLI/SKILL.md"
STREAMS="$CLI/resources/stream-contracts.md"
OUTPUT="$CLI/resources/output-architecture.md"
TESTING="$CLI/resources/testing-cli.md"
SOURCE="$CLI/resources/source-notes.md"

require_fixed() {
  local label="$1" needle="$2" file="$3"
  grep -Fq "$needle" "$file" || { echo "FAIL: $label"; exit 1; }
  echo "PASS: $label"
}

reject_fixed() {
  local label="$1" needle="$2" file="$3"
  if grep -Fq "$needle" "$file"; then
    echo "FAIL: $label"
    exit 1
  fi
  echo "PASS: $label"
}

require_count() {
  local label="$1" expected="$2" needle="$3" file="$4" count
  count="$(grep -Fo "$needle" "$file" | wc -l | tr -d ' ')"
  [[ "$count" -ge "$expected" ]] || { echo "FAIL: $label"; exit 1; }
  echo "PASS: $label"
}

require_fixed "stderr EPIPE leaves stdout work running" \
  'handleEpipe(process.stderr, () => {});' "$STREAMS"
require_fixed "stream writers surface broken-pipe outcomes" \
  "if (outcome === 'epipe') return outcome;" "$STREAMS"
reject_fixed "stream writers do not wait only for drain" \
  'drainableWrite' "$STREAMS"
require_count "every cleanup example captures synchronous throws" 3 \
  'cleanupFns.map((fn) => Promise.resolve().then(fn))' "$STREAMS"
require_fixed "NDJSON uses the caller decoder" \
  'return decode(value);' "$STREAMS"
require_fixed "NDJSON failures report physical line numbers" \
  'Invalid NDJSON at line ${lineNumber}' "$STREAMS"
reject_fixed "NDJSON does not cast unvalidated input" \
  'value as T' "$STREAMS"
require_fixed "NDJSON syntax permits every JSON value" \
  'Any JSON value is valid.' "$STREAMS"
require_fixed "typed event records are a local NDJSON profile" \
  'optional local event profile' "$STREAMS"
reject_fixed "NDJSON is not falsely restricted to objects" \
  'Each line is one complete, valid JSON object.' "$STREAMS"
require_fixed "core permits every NDJSON JSON value" \
  'Any JSON value is valid NDJSON syntax' "$CORE"
require_fixed "core labels typed NDJSON events as a local profile" \
  'optional local event profile' "$CORE"

reject_fixed "cleanup timeout remains referenced" \
  'timeout.unref()' "$STREAMS"
require_fixed "SIGTERM status is an application contract" \
  "0 or the CLI's documented status" "$STREAMS"
reject_fixed "orchestrators do not require status 143" \
  'critical for Docker and Kubernetes' "$STREAMS"
require_count "settled graceful shutdowns use natural process draining" 3 \
  'process.exitCode =' "$STREAMS"
require_count "settled graceful shutdowns inspect rejected cleanup" 3 \
  "results.some((result) => result.status === 'rejected')" "$STREAMS"
require_fixed "SIGTERM cleanup rejection receives a failure status" \
  'cleanupFailed ? cleanupTimeoutExitCode : gracefulExitCode' "$STREAMS"
reject_fixed "SIGINT cleanup completion does not force immediate exit" \
  'process.exit(settledExitCode)' "$STREAMS"
reject_fixed "SIGTERM cleanup completion does not force immediate exit" \
  'process.exit(gracefulExitCode)' "$STREAMS"

cleanup_probe="$(node -e '
  const timeout = setTimeout(() => process.stdout.write("cleanup-timeout"), 20);
  void Promise.allSettled([
    Promise.resolve().then(() => new Promise(() => {})),
  ]).then(() => clearTimeout(timeout));
')"
[[ "$cleanup_probe" == 'cleanup-timeout' ]] || {
  echo 'FAIL: referenced cleanup timer keeps child alive'; exit 1;
}
echo 'PASS: referenced cleanup timer keeps child alive'

drain_bytes="$(node -e 'process.stdout.write("x".repeat(1024 * 1024)); process.exitCode = 13;' | wc -c | tr -d ' ')"
[[ "$drain_bytes" == '1048576' ]] || {
  echo 'FAIL: natural exit drains pending pipe output'; exit 1;
}
echo 'PASS: natural exit drains pending pipe output'

require_fixed "FORCE_COLOR accepts only documented enabling values" \
  "return ['', '1', '2', '3', 'true'].includes(forceColor);" "$OUTPUT"
require_fixed "FORCE_COLOR is resolved before disable-color env vars" \
  "if (input.env['NODE_DISABLE_COLORS'] !== undefined) return false;" "$OUTPUT"
reject_fixed "FORCE_COLOR does not enable every defined value" \
  "if (input.env['FORCE_COLOR'] !== undefined) return true;" "$OUTPUT"
require_fixed "prompts require stdin and prompt-output TTYs" \
  'if (!input.stdinIsTTY || !input.stderrIsTTY) return false;' "$OUTPUT"
require_fixed "writes expose broken-pipe outcomes" \
  "type WriteOutcome = 'written' | 'epipe';" "$OUTPUT"
require_fixed "JSON failures use stderr" \
  'const stream = result.ok ? deps.stdout : deps.stderr;' "$OUTPUT"
require_fixed "plain format has an explicit formatter" \
  '? createPlainFormatter()' "$OUTPUT"
require_fixed "NDJSON format has an explicit dispatch" \
  "if (outputConfig.format === 'ndjson')" "$OUTPUT"
require_fixed "unsupported formats are usage errors" \
  "code: 'INVALID_FORMAT'" "$OUTPUT"
require_fixed "parseArgs failures are classified" \
  'if (!isParseArgsError(error)) throw error;' "$OUTPUT"
require_fixed "unexpected failures reach the outer boundary" \
  "code: 'UNEXPECTED_FAILURE'" "$OUTPUT"
require_fixed "plain output cannot be colored" \
  "format === 'plain' || format === 'json'" "$OUTPUT"
require_fixed "JSON failure tests keep stdout empty" \
  "expect(result.stdout).toBe('');" "$TESTING"
require_fixed "JSON failure parsers use the final diagnostic line" \
  'parseFinalJsonLine(result.stderr)' "$TESTING"

require_fixed "exit 75 is limited to retry-safe failures" \
  'Use exit 75 only when no mutation was dispatched' "$CORE"
require_fixed "ambiguous mutations require reconciliation" \
  'direct the user to `status`/reconcile' "$CORE"
require_fixed "100ms progress is scoped to interactive human mode" \
  'Responsiveness for ongoing human work' "$CORE"
require_fixed "transient does not authorize retry" \
  'It is not retry' "$OUTPUT"

require_fixed "rename is not described as crash durable" \
  'visibility atomicity is not crash' "$STREAMS"
require_fixed "durability delegates to a reviewed writer" \
  'reviewed durable-file writer' "$STREAMS"

require_fixed "pager spawning avoids a shell" \
  'shell: false' "$STREAMS"
require_fixed "pager writes use the shared safe helper" \
  'writeOutput(pager.stdin' "$STREAMS"
reject_fixed "pager commands are not split naively" \
  "pagerCommand.split(' ')" "$STREAMS"
reject_fixed "pager writes are not fire-and-forget" \
  'pager.stdin.write' "$STREAMS"

require_fixed "worked tests use canonical target output" \
  "expect(result.data.target).toBe('src/');" "$TESTING"
require_fixed "worked tests use canonical issue count" \
  'expect(result.data.issueCount).toBe(1);' "$TESTING"
reject_fixed "worked tests do not invent a threshold contract" \
  'threshold' "$TESTING"
reject_fixed "worked tests use the documented log text" \
  'analyzing' "$TESTING"

require_fixed "CLI provenance pins the audited guide" \
  '697d6a29fc8c93d3981a755c0c7683507ad39c3e' "$SOURCE"
require_fixed "CLI provenance distinguishes unknown import revision" \
  'original source revision is unknown' "$SOURCE"
require_fixed "CLI bundle declares CC BY-SA scope" \
  'not the repository-root MIT license' "$CLI/LICENSE"
require_fixed "root MIT defers to nested licenses" \
  'Except where a nested `LICENSE` or `NOTICE` file states otherwise' "$REPO_ROOT/LICENSE"
require_fixed "package metadata points to scoped license" \
  '"license": "SEE LICENSE IN LICENSE"' "$REPO_ROOT/package.json"

echo "CLI guidance checks passed"
