#!/usr/bin/env node
// Summarise a promptfoo results file from the skill-routing suite.
//
// Prints one line per case — PASS, FAIL (an assertion failed) or ERR (the
// provider itself failed, e.g. the agent hit the turn cap), the skills the agent
// actually loaded, and the reasons for failures — followed by a per-cluster tally.
// The results file is the JSON `promptfoo eval -o` writes; run.sh writes it
// to results/latest.json.
//
// Usage: node report.mjs [results/latest.json]

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] ?? resolve(here, "results/latest.json");
const { results } = JSON.parse(readFileSync(file, "utf8"));

const loadedSkills = (result) =>
  (result.response?.metadata?.toolCalls ?? [])
    .filter((call) => call.name === "Skill")
    .map((call) => call.input?.skill ?? "?");

const rows = results.results.map((result) => ({
  description: result.testCase?.description ?? "(no description)",
  cluster: result.testCase?.metadata?.cluster ?? "-",
  pass: result.success,
  loaded: loadedSkills(result),
  reasons: (result.gradingResult?.componentResults ?? [])
    .filter((component) => !component.pass)
    .map((component) => component.reason),
  error: result.failureReason === 2 ? result.error : undefined,
}));

const pad = (text, width) => String(text).padEnd(width);

for (const row of rows) {
  const status = row.error ? "ERR " : row.pass ? "PASS" : "FAIL";
  console.log(
    `${status}  ${pad(row.cluster, 12)} ${pad(row.description, 64)} loaded: ${row.loaded.join(", ") || "-"}`,
  );
  for (const reason of row.reasons) console.log(`      ↳ ${reason}`);
  if (row.error) console.log(`      ↳ ${String(row.error).split("\n")[0]}`);
}

const tally = rows.reduce((acc, row) => {
  const entry = acc[row.cluster] ?? { pass: 0, total: 0 };
  return {
    ...acc,
    [row.cluster]: { pass: entry.pass + (row.pass ? 1 : 0), total: entry.total + 1 },
  };
}, {});

console.log("");
for (const [cluster, { pass, total }] of Object.entries(tally)) {
  console.log(`${pad(cluster, 12)} ${pass}/${total}`);
}
const passed = rows.filter((row) => row.pass).length;
console.log(`${pad("all", 12)} ${passed}/${rows.length}`);
