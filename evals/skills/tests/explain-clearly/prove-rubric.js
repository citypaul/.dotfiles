// Calibrate the meaning rubric against known positive/negative text using the
// same Claude judge as the quality suite. This spends model tokens; it is not CI.
const assert = require("node:assert/strict");
const { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } = require("node:fs");
const { createRequire } = require("node:module");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");
const root = resolve(__dirname, "../..");
process.chdir(root); // Match run-quality.sh's SDK dependency resolution.
const scratch = mkdtempSync(join(tmpdir(), "explain-clearly-rubric-"));
process.env.PROMPTFOO_CONFIG_DIR = join(scratch, "promptfoo");
process.env.PROMPTFOO_DISABLE_TELEMETRY = "1";
const yaml = createRequire(require.resolve("promptfoo"))("js-yaml");
const config = yaml.load(readFileSync(join(root, "promptfooconfig.explain-clearly.yaml"), "utf8"));
const cases = yaml.load(readFileSync(join(root, "tests/explain-clearly-quality.yaml"), "utf8"));
const possibility = cases[0].assert.find((item) => item.metric === "possibility-not-promise").value;
const faithfulness = cases[0].assert.find((item) => item.metric === "faithful-explanation").value;
const provider = config.defaultTest.options.provider;
provider.config.model = process.env.SKILL_EVAL_MODEL || "sonnet";
const reference = `A cache keeps a stored response. A refresh gets a new response.
It counts as fresh below 60 seconds. From 60 seconds until just before 90 seconds,
it may be served stale while a refresh runs in the background.
At 90 seconds or older, a request must wait for a successful refresh or receive
an error. Failed refreshes do not extend either limit.
The configuration example is STALE_WINDOW_SECONDS=30.
Stale service may reduce waiting time; no performance measurements are available.
Operators should investigate repeated refresh failures. That is advice, not a
mandatory operational rule.`;
const probes = [
  { name: "faithful reference", content: reference, pass: true, rubrics: [possibility, faithfulness] },
  { name: "purpose does not promise an outcome", content: reference.replace("A cache keeps a stored response.", "To help answer requests quickly, a cache keeps a stored response."), pass: true, rubrics: [possibility, faithfulness] },
  { name: "possibility turned into promise", content: reference.replace("it may be served stale", "it will always be served immediately"), pass: false, rubrics: [possibility] },
  { name: "example turned into default", content: reference.replace("configuration example", "universal default"), pass: false, rubrics: [faithfulness] },
  { name: "unsupported reassurance", content: reference + "\nFresh means fully up to date. A single failed refresh usually sorts itself out on the next attempt and is not a sign of bad configuration.", pass: false, rubrics: [faithfulness] },
];

(async () => {
  try {
    const { evaluate } = await import("promptfoo");
    const record = await evaluate({
      prompts: ["{{content}}"],
      providers: [{ id: () => "fixed-rubric-probe", callApi: async (content) => ({ output: JSON.stringify({ artifact: "customer-note.md", content }) }) }],
      tests: probes.map((probe) => ({
        description: probe.name,
        vars: { content: probe.content },
        options: { provider, disableVarExpansion: true },
        assert: probe.rubrics.map((value) => ({ type: probe.pass ? "llm-rubric" : "not-llm-rubric", value })),
      })),
      writeLatestResults: true,
    }, { maxConcurrency: 4, repeat: 2, cache: false, timeoutMs: 300000, showProgressBar: false });
    const summary = await record.toEvaluateSummary();
    mkdirSync(join(root, "results"), { recursive: true });
    const path = join(root, "results/explain-clearly-rubric-proof.json");
    writeFileSync(path, JSON.stringify(summary, null, 2));
    for (const row of summary.results) console.log(`${row.success ? "PASS" : "FAIL"} ${row.testCase.description}: ${row.gradingResult?.reason || row.error || ""}`);
    console.log(`Saved rubric calibration to ${path}`);
    assert.equal(summary.results.length, probes.length * 2);
    assert.equal(summary.results.filter((row) => !row.success).length, 0, "rubric must accept the reference and reject each defect on both repeats");
  } finally { rmSync(scratch, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
