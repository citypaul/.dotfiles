// Offline proof of this suite's deterministic graders, not an agent evaluation.
// References live only in a scratch fixture copy and are never shown to the agent.
const assert = require("node:assert/strict");
const { mkdtempSync, cpSync, writeFileSync, rmSync } = require("node:fs");
const { join, resolve } = require("node:path");
const { tmpdir } = require("node:os");
const graders = require("../../explain-clearly-assertions");
const transform = require("../../explain-clearly-output");
const root = resolve(__dirname, "../..");
const scratch = mkdtempSync(join(tmpdir(), "explain-clearly-proof-"));
cpSync(join(root, "fixtures/explain-clearly-workspace"), scratch, { recursive: true });
process.env.SKILL_EVAL_WORKSPACE = scratch;
process.env.SKILL_EVAL_CURRENT_WORKSPACE = scratch;
const markdown = `# What happens as a stored response gets older
A cache keeps a stored response. A refresh gets a new response.
A response is fresh below 60 seconds. From 60 seconds until just before 90
seconds, it may be served stale while a refresh runs in the background.
At 90 seconds or older, a request must wait for a successful refresh or receive
an error. Failed refreshes do not extend either limit.
The configuration example is STALE_WINDOW_SECONDS=30.
Stale service may reduce waiting time; no performance measurements are available.
Operators should investigate repeated refresh failures. That is advice, not a
mandatory operational rule.
`;
const reference = `<!doctype html><html lang="en-GB"><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Response age</title><style>body{font:1.2rem/1.6 sans-serif;max-width:65ch;margin:auto;padding:1rem}input{width:100%}:focus-visible{outline:3px solid navy}</style>
</head><body><main><h1>Response age</h1><p>Source: cache-note.txt.</p>
<p>Fresh below 60 seconds; stale from 60 inclusive to 90 exclusive;
expired from 90 seconds. A stale response may be served during background
refresh. An expired request must wait for a successful refresh or receive an
error. A failed refresh extends no limits.</p>
<p>STALE_WINDOW_SECONDS=30 is the example configuration. Stale service may reduce
waiting; no measurements are available. Operators should investigate repeated
failures as a recommendation, not a mandatory operational rule.</p>
<p>Illustrative example: one stored response, at different possible request ages.</p>
<label for="age">Response age in seconds</label>
<input id="age" type="range" min="0" max="120" value="45">
<p id="outcome" aria-live="polite">45 seconds: fresh.</p>
<script>const age=document.getElementById('age');const outcome=document.getElementById('outcome');age.addEventListener('input',()=>{const n=Number(age.value);outcome.textContent=n+' seconds: '+(n<60?'fresh.':n<90?'stale; may be served during refresh.':'expired; wait for successful refresh or receive an error.');});</script>
</main></body></html>`;
const context = (artifact) => ({ vars: { artifact }, provider: { label: "skill-forced" } });
const put = (name, content) => writeFileSync(join(scratch, name), content);
let checks = 0;
async function expect(name, artifact, pass, label) {
  const result = await graders[name]("agent completion text is not the artifact", context(artifact));
  assert.equal(result.pass, pass, `${label}: ${JSON.stringify(result)}`);
  assert.equal(result.score, pass ? 1 : 0);
  console.log(`PASS ${label}: ${result.reason}`);
  checks++;
}
(async () => {
  try {
    put("customer-note.md", markdown);
    put("cache-explainer.html", reference);
    for (const artifact of ["customer-note.md", "cache-explainer.html"]) {
      await expect("artifactWritten", artifact, true, `reference ${artifact} exists`);
      await expect("literalFacts", artifact, true, `reference ${artifact} literals`);
      assert.equal(JSON.parse(transform("do not grade me", context(artifact))).content, artifact.endsWith(".md") ? markdown : reference);
      checks++;
    }
    const equivalentUnits = markdown
      .replace("below 60 seconds", "below one minute")
      .replace("From 60 seconds until just before 90\nseconds", "From one minute until just before a minute and a half")
      .replace("At 90 seconds or older", "At a minute and a half or older");
    put("customer-note.md", equivalentUnits);
    await expect("literalFacts", "customer-note.md", true, "equivalent time units accepted");
    await expect("standaloneHtml", "cache-explainer.html", true, "reference standalone HTML");
    await expect("controlMarkup", "cache-explainer.html", true, "reference control markup");
    await expect("artifactWritten", "missing.md", false, "missing artifact rejected");
    assert.equal(JSON.parse(transform("claimed success", context("missing.md"))).content, null);
    checks++;
    put("customer-note.md", markdown.replace("STALE_WINDOW_SECONDS", "STALE_TIME"));
    await expect("literalFacts", "customer-note.md", false, "renamed configuration rejected");
    put("customer-note.md", markdown.replace("STALE_WINDOW_SECONDS=30", "STALE_WINDOW_SECONDS=40"));
    await expect("literalFacts", "customer-note.md", false, "changed configuration example rejected");
    put("cache-explainer.html", reference.replace("<style>", '<link rel="stylesheet" href="https://example.test/theme.css"><style>'));
    await expect("standaloneHtml", "cache-explainer.html", false, "network stylesheet rejected");
    put("cache-explainer.html", reference.replace(' lang="en-GB"', ""));
    await expect("standaloneHtml", "cache-explainer.html", false, "missing page language rejected");
    put("cache-explainer.html", reference.replace('<label for="age">Response age in seconds</label>', ""));
    await expect("controlMarkup", "cache-explainer.html", false, "unlabelled age control rejected");
    put("cache-explainer.html", reference.replace(/<script>[\s\S]*?<\/script>/, ""));
    await expect("controlMarkup", "cache-explainer.html", false, "unwired age control rejected");
    put("cache-explainer.html", reference.replace('<p id="outcome"', '<p id="age"'));
    await expect("controlMarkup", "cache-explainer.html", false, "ambiguous control ID rejected");
    console.log(`${checks} offline proof checks passed. Rendering, executed interaction and rubric quality are not established.`);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
