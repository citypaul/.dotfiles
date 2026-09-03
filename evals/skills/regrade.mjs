#!/usr/bin/env node
// Re-grade a saved quality run without spending tokens.
//
// Rebuilds each case's workspace by applying the diff quality-hooks.js saved
// under results/<suite>/ to a fresh copy of the fixture, then runs every
// grader with the saved tool-call trail and reply. Use it to iterate on
// graders (hex-assertions.js etc.) against real agent output before the next
// paid run.
//
// Usage: node regrade.mjs <suite> [run directory]
// The run directory (results/<suite>/<timestamp>/) holds results.json and the
// per-case diffs; it defaults to the newest one for the suite.

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const [suite, runDirArg] = process.argv.slice(2);
if (!suite) throw new Error("usage: node regrade.mjs <suite> [run directory]");
const suiteDir = resolve(here, `results/${suite}`);
const runDir = runDirArg
  ? resolve(runDirArg)
  : readdirSync(suiteDir).filter((name) => /^\d{8}-\d{6}$/.test(name)).sort().map((name) => join(suiteDir, name)).at(-1);
if (!runDir) throw new Error(`no run directory under ${suiteDir}`);
const file = join(runDir, "results.json");

const modules = { tdd: "tdd-assertions.js", hexagonal: "hex-assertions.js", ddd: "ddd-assertions.js" };
const graders = require(resolve(here, modules[suite] ?? `${suite}-assertions.js`));
const yaml = readFileSync(resolve(here, `promptfooconfig.${suite}.yaml`), "utf8");
const casesYaml = readFileSync(resolve(here, `tests/${suite}-quality.yaml`), "utf8");
const defaultMetrics = [...yaml.matchAll(/file:\/\/[a-z-]+\.js:(\w+)', metric: ([a-z-]+)/g)].map((m) => ({ fn: m[1], metric: m[2] }));
const caseBlock = (description) => {
  const start = casesYaml.indexOf(`description: ${description}`);
  const end = casesYaml.indexOf("\n- description:", start + 1);
  return casesYaml.slice(start, end < 0 ? undefined : end);
};
const caseMetrics = (description) =>
  [...caseBlock(description).matchAll(/file:\/\/[a-z-]+\.js:(\w+)', metric: ([a-z-]+)/g)].map((m) => ({ fn: m[1], metric: m[2] }));

const slug = (text) => String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
const { results } = JSON.parse(readFileSync(file, "utf8"));
const fixture = resolve(here, `fixtures/${suite}-workspace`);
const tally = {};

for (const result of results.results) {
  const label = result.provider?.label ?? result.provider?.id;
  const description = result.testCase?.description;
  const diff = join(runDir, `${slug(description)}--${slug(label)}.diff`);
  if (!existsSync(diff)) {
    console.log(`SKIP  ${label.padEnd(13)} ${description} (no saved diff)`);
    continue;
  }
  const workspace = mkdtempSync(join(tmpdir(), `regrade-${suite}-`));
  try {
    cpSync(fixture, workspace, { recursive: true });
    execSync("git init -q && git -c user.name=r -c user.email=r@r add -A && git -c user.name=r -c user.email=r@r -c commit.gpgsign=false commit -qm fixture", { cwd: workspace, stdio: "ignore" });
    execSync(`git apply --whitespace=nowarn --exclude=".pnpm-store/*" --exclude="node_modules/*" "${diff}"`, { cwd: workspace, stdio: ["ignore", "ignore", "pipe"] });
    process.env.SKILL_EVAL_WORKSPACE = workspace;
    process.env.SKILL_EVAL_CURRENT_WORKSPACE = workspace;
    delete process.env.SKILL_EVAL_BASELINE_WORKSPACE;
    // Grade with the case's *current* vars (markers may have changed since the run).
    const currentVars = Object.fromEntries(
      [...caseBlock(description).matchAll(/^\s{4}(\w+):\s*(.+)$/gm)]
        .filter(([, key]) => key !== "request")
        .map(([, key, raw]) => [key, raw.trim().replace(/^"(.*)"$/, "$1").replace(/\\\\/g, "\\")]),
    );
    const context = { vars: { ...(result.testCase?.vars ?? {}), ...currentVars }, provider: result.provider, providerResponse: result.response };
    const output = result.response?.output;
    const failed = [];
    for (const { fn, metric } of [...defaultMetrics, ...caseMetrics(description)]) {
      const verdict = graders[fn](output, context);
      const key = `${label}|${metric}`;
      tally[key] = tally[key] ?? { pass: 0, total: 0 };
      tally[key].total += 1;
      if (verdict.pass) tally[key].pass += 1;
      else failed.push(`${metric}: ${String(verdict.reason).replace(/\x1b\[[0-9;]*m/g, "").slice(0, 160)}`);
    }
    console.log(`${failed.length ? "FAIL" : "PASS"}  ${label.padEnd(13)} ${description}`);
    for (const line of failed) console.log(`      ↳ ${line}`);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

console.log("");
const labels = [...new Set(Object.keys(tally).map((k) => k.split("|")[0]))];
const metrics = [...new Set(Object.keys(tally).map((k) => k.split("|")[1]))];
const width = Math.max(24, ...metrics.map((m) => m.length + 2));
console.log("metric".padEnd(width) + labels.map((l) => l.padEnd(14)).join(""));
for (const metric of metrics) {
  console.log(metric.padEnd(width) + labels.map((l) => { const t = tally[`${l}|${metric}`]; return (t ? `${t.pass}/${t.total}` : "-").padEnd(14); }).join(""));
}
