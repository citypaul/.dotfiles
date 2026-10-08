// Exercise the real promptfoo lifecycle with fake generation and grading.
// No model calls: later arms must never see an earlier arm's artifact.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } = require("node:fs");
const { createRequire } = require("node:module");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const root = resolve(__dirname, "../..");
const scratch = mkdtempSync(join(tmpdir(), "explain-clearly-isolation-"));
process.env.PROMPTFOO_CONFIG_DIR = join(scratch, "promptfoo");
process.env.PROMPTFOO_DISABLE_TELEMETRY = "1";
const { evaluate } = require("promptfoo");
const yaml = createRequire(require.resolve("promptfoo"))("js-yaml");
const config = yaml.load(readFileSync(join(root, "promptfooconfig.explain-clearly.yaml"), "utf8"));

async function check(timeoutMs) {
  const workspace = mkdtempSync(join(scratch, "workspace-"));
  const artifact = join(workspace, "draft.md");
  process.env.SKILL_EVAL_WORKSPACE = workspace;
  process.env.SKILL_EVAL_CURRENT_WORKSPACE = workspace;
  process.env.SKILL_EVAL_BASELINE_WORKSPACE = "";
  process.env.SKILL_EVAL_RUN_DIR = join(scratch, `diffs-${timeoutMs}`);
  execFileSync("git", ["init", "--quiet"], { cwd: workspace });
  execFileSync("git", ["-c", "user.name=eval", "-c", "user.email=eval@example.com", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "--quiet", "-m", "fixture"], { cwd: workspace });
  const sawEarlierDraft = [];
  let judgements = 0;
  const provider = (label) => ({
    id: () => `isolation-${label}`,
    label,
    callApi: async () => {
      sawEarlierDraft.push(existsSync(artifact));
      writeFileSync(artifact, label);
      return { output: label };
    },
  });
  const judge = {
    id: () => "offline-isolation-judge",
    callApi: async () => {
      judgements++;
      return { output: JSON.stringify({ pass: true, score: 1, reason: "offline lifecycle probe" }) };
    },
  };
  await evaluate({
    prompts: ["Write the draft"],
    providers: [provider("first"), provider("second")],
    extensions: config.extensions.map((path) => path.replace("file://", `file://${root}/`)),
    tests: [{ description: "isolated draft", options: { provider: judge }, assert: [{ type: "llm-rubric", value: "Lifecycle probe only" }] }],
    // The extension lifecycle reads results from the database; keep that DB
    // entirely inside this disposable proof directory.
    writeLatestResults: true,
  }, { ...config.evaluateOptions, timeoutMs, cache: false, showProgressBar: false, silent: true });
  assert.equal(judgements, 2, "both fake model rubrics must run");
  assert.equal(existsSync(artifact), false, "afterEach must clean the final artifact");
  return sawEarlierDraft;
}

(async () => {
  try {
    assert.deepEqual(await check(config.evaluateOptions.timeoutMs), [false, false]);
    console.log("PASS configured lifecycle isolates each generated draft");
    assert.deepEqual(await check(0), [false, true]);
    console.log("PASS negative control exposes contamination when serial grading is deferred");
  } finally { rmSync(scratch, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
