#!/usr/bin/env node
// Summarise a promptfoo results file from a quality suite (tdd, hexagonal, ddd) as a
// metric-by-provider scoreboard, then one line per case with the failing
// metrics and their reasons.
//
// Usage: node report-quality.mjs results/<suite>-latest.json

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? resolve(here, "results/tdd-latest.json");
const { results } = JSON.parse(readFileSync(file, "utf8"));

const rows = results.results.map((result) => ({
  provider: result.provider?.label ?? result.provider?.id ?? "?",
  description: result.testCase?.description ?? "(no description)",
  error: result.failureReason === 2 ? String(result.error).split("\n")[0] : undefined,
  metrics: (result.gradingResult?.componentResults ?? []).map((component) => ({
    name: component.assertion?.metric ?? component.assertion?.type ?? "?",
    pass: component.pass,
    reason: component.reason,
  })),
}));

const providers = [...new Set(rows.map((row) => row.provider))];
const metrics = [...new Set(rows.flatMap((row) => row.metrics.map((metric) => metric.name)))];
const pad = (text, width) => String(text).padEnd(width);
const metricWidth = Math.max(24, ...metrics.map((m) => m.length + 2));

console.log(pad("metric", metricWidth) + providers.map((provider) => pad(provider, 14)).join(""));
for (const metric of metrics) {
  const cells = providers.map((provider) => {
    const scored = rows
      .filter((row) => row.provider === provider)
      .map((row) => row.metrics.find((m) => m.name === metric))
      .filter(Boolean);
    const passes = scored.filter((m) => m.pass).length;
    return pad(`${passes}/${scored.length}`, 14);
  });
  console.log(pad(metric, metricWidth) + cells.join(""));
}
const overall = providers.map((provider) => {
  const scored = rows.filter((row) => row.provider === provider).flatMap((row) => row.metrics);
  const passes = scored.filter((m) => m.pass).length;
  return pad(`${passes}/${scored.length}`, 14);
});
console.log(pad("all metrics", metricWidth) + overall.join(""));

console.log("");
for (const row of rows) {
  const failed = row.metrics.filter((metric) => !metric.pass);
  const status = row.error ? "ERR " : failed.length === 0 ? "PASS" : "FAIL";
  console.log(`${status}  ${pad(row.provider, 12)} ${row.description}`);
  if (row.error) console.log(`      ↳ ${row.error}`);
  for (const metric of failed) console.log(`      ↳ ${metric.name}: ${metric.reason}`);
}
