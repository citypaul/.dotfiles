// Deterministic graders for the tdd quality suite.
//
// Each export is a promptfoo JavaScript assertion: (output, context) => result.
// They read two sources of truth — the ordered tool-call trail the Claude Agent
// SDK reports (what the agent did, in what order) and the workspace it left
// behind (does the work actually behave). Nothing here asks a model to grade
// a model.
//
// The workspace path comes from SKILL_EVAL_WORKSPACE, set by run-tdd.sh.

const { execSync } = require("node:child_process");
const { readFileSync, writeFileSync, unlinkSync, existsSync } = require("node:fs");
const { resolve, basename } = require("node:path");

const EDIT_TOOLS = new Set(["Write", "Edit", "MultiEdit", "NotebookEdit"]);
const isTestPath = (path) => /\.test\.[jt]sx?$/.test(path) || /__tests__\//.test(path);
const isSourcePath = (path) => /\/src\/.*\.[jt]sx?$/.test(path) && !isTestPath(path);
const looksLikeTestRun = (command) => /\b(vitest|pnpm test|npm test|pnpm run test|npm run test)\b/.test(command);

const trail = (context) =>
  (context?.providerResponse?.metadata?.toolCalls ?? []).map((call, index) => ({
    index,
    name: call.name,
    path: call.input?.file_path ?? "",
    command: call.input?.command ?? "",
  }));

const edits = (calls) => calls.filter((call) => EDIT_TOOLS.has(call.name));
const testRuns = (calls) => calls.filter((call) => call.name === "Bash" && looksLikeTestRun(call.command));
const first = (items) => items[0];
const last = (items) => items[items.length - 1];

const verdict = (pass, reason) => ({ pass, score: pass ? 1 : 0, reason });

const workspace = () => {
  const dir = process.env.SKILL_EVAL_WORKSPACE;
  if (!dir) throw new Error("SKILL_EVAL_WORKSPACE is not set; run via run-quality.sh");
  return dir;
};

const runVitest = (args) => {
  try {
    const stdout = execSync(`pnpm exec vitest run ${args}`, {
      cwd: workspace(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, CI: "1" },
      timeout: 120_000,
    });
    return { ok: true, out: stdout };
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim() };
  }
};

const summaryLine = (out) => (out.match(/Tests\s+.*$/m) ?? [out.split("\n").slice(-3).join(" | ")])[0];

// 1. RED before production: the first edit to a test file precedes the first
//    edit to a production source file.
exports.testFirst = (output, context) => {
  const all = edits(trail(context));
  const firstTest = first(all.filter((call) => isTestPath(call.path)));
  const firstProd = first(all.filter((call) => isSourcePath(call.path)));
  if (!firstProd) return verdict(false, "no production source file was edited");
  if (!firstTest) return verdict(false, "no test file was written or edited");
  return verdict(
    firstTest.index < firstProd.index,
    firstTest.index < firstProd.index
      ? `test edit (#${firstTest.index}, ${basename(firstTest.path)}) preceded production edit (#${firstProd.index}, ${basename(firstProd.path)})`
      : `production edit (#${firstProd.index}, ${basename(firstProd.path)}) came before any test edit (#${firstTest.index})`,
  );
};

// 2. RED observed: a test run happened after the first test edit and before
//    the first production edit — the failure was seen, not assumed.
exports.redObserved = (output, context) => {
  const calls = trail(context);
  const firstTest = first(edits(calls).filter((call) => isTestPath(call.path)));
  const firstProd = first(edits(calls).filter((call) => isSourcePath(call.path)));
  if (!firstTest || !firstProd) return verdict(false, "no complete test-then-production sequence to inspect");
  const between = testRuns(calls).filter((run) => run.index > firstTest.index && run.index < firstProd.index);
  return verdict(
    between.length > 0,
    between.length > 0
      ? `test run between RED edit and first production edit: ${between[0].command.slice(0, 80)}`
      : "no test run between writing the test and writing production code",
  );
};

// 3. GREEN verified: a test run after the last production edit.
exports.greenVerified = (output, context) => {
  const calls = trail(context);
  const lastProd = last(edits(calls).filter((call) => isSourcePath(call.path)));
  if (!lastProd) return verdict(false, "no production source file was edited");
  const after = testRuns(calls).filter((run) => run.index > lastProd.index);
  return verdict(
    after.length > 0,
    after.length > 0 ? `verified after final edit: ${last(after).command.slice(0, 80)}` : "no test run after the final production edit",
  );
};

// 4. No watch mode: every test invocation terminates on its own.
exports.noWatchMode = (output, context) => {
  const watchy = trail(context).filter(
    (call) =>
      call.name === "Bash" &&
      (/\btest:watch\b/.test(call.command) ||
        /\bvitest\s+watch\b/.test(call.command) ||
        /--watch(?!=false)\b/.test(call.command) ||
        /\s-w\b/.test(call.command) ||
        /\bvitest\s*(\||&&|;|$)/.test(call.command)),
  );
  return verdict(
    watchy.length === 0,
    watchy.length === 0 ? "every test command was a finite run" : `watch-mode command: ${watchy[0].command.slice(0, 80)}`,
  );
};

// 5. Suite green at the end: the workspace's own tests pass on the final tree.
exports.suiteGreen = () => {
  const result = runVitest("--exclude '**/acceptance-*.test.ts'");
  return verdict(result.ok, summaryLine(result.out));
};

// 6. Behaviour delivered: a hidden acceptance test for the requested behaviour
//    passes against the agent's implementation. `vars.acceptance` names the
//    file under tests/tdd/acceptance/.
exports.behaviourDelivered = (output, context) => {
  const name = context?.vars?.acceptance;
  if (!name) return verdict(false, "test case has no vars.acceptance");
  const source = resolve(__dirname, "tests/tdd/acceptance", name);
  const target = resolve(workspace(), "src", `acceptance-${name}`);
  writeFileSync(target, readFileSync(source, "utf8"));
  try {
    const result = runVitest(`src/acceptance-${name}`);
    return verdict(result.ok, summaryLine(result.out));
  } finally {
    if (existsSync(target)) unlinkSync(target);
  }
};

// 7. Tests are behaviour tests: no spies on internals, no mocking the subject,
//    no shared mutable state via let/beforeEach, in any test file the agent
//    touched.
exports.behaviourStyleTests = (output, context) => {
  const touched = [...new Set(edits(trail(context)).filter((call) => isTestPath(call.path)).map((call) => call.path))];
  if (touched.length === 0) return verdict(false, "no test file was written or edited");
  const smells = touched.flatMap((path) => {
    if (!existsSync(path)) return [];
    const text = readFileSync(path, "utf8");
    return [
      [/\bvi\.(spyOn|mock|fn)\(/, "spy/mock"],
      [/^\s*let\s/m, "let-bound shared state"],
      [/\bbeforeEach\(/, "beforeEach lifecycle hook"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${basename(path)}: ${label}`);
  });
  return verdict(smells.length === 0, smells.length === 0 ? `clean: ${touched.map((path) => basename(path)).join(", ")}` : smells.join("; "));
};

// 8. Evidence reported: the reply names both the failing run and the passing run.
exports.evidenceReported = (output) => {
  const text = String(output ?? "");
  const red = /\b(RED|fail(s|ed|ing)?)\b/i.test(text);
  const green = /\b(GREEN|pass(es|ed|ing)?)\b/i.test(text);
  return verdict(red && green, `reply mentions failing run: ${red}; passing run: ${green}`);
};

// 9. RED runs the narrowest selector: the first test run after the RED edit
//    names a test file or a test, rather than running the whole suite.
exports.narrowRedSelector = (output, context) => {
  const calls = trail(context);
  const firstTest = first(edits(calls).filter((call) => isTestPath(call.path)));
  if (!firstTest) return verdict(false, "no test file was written or edited");
  const redRun = first(testRuns(calls).filter((run) => run.index > firstTest.index));
  if (!redRun) return verdict(false, "no test run after the RED edit");
  const narrow = /\.test\.[jt]sx?|\s-t\s|--testNamePattern|related\b/.test(redRun.command);
  return verdict(narrow, `${narrow ? "narrow" : "whole-suite"} RED run: ${redRun.command.slice(0, 80)}`);
};

// 10. No speculative code: every export the agent added to production is
//     referenced by some test.
const FIXTURE_EXPORTS = new Set(["NoteSchema", "Note", "NotesState", "initialState", "createNote", "addTag", "selectNote", "searchNotes"]);
exports.noSpeculativeExports = () => {
  const { readdirSync } = require("node:fs");
  const src = resolve(workspace(), "src");
  const files = readdirSync(src).filter((name) => /\.[jt]sx?$/.test(name)).map((name) => resolve(src, name));
  const production = files.filter((file) => !isTestPath(file));
  const testText = files.filter(isTestPath).map((file) => readFileSync(file, "utf8")).join("\n");
  const added = production.flatMap((file) => [...readFileSync(file, "utf8").matchAll(/export\s+(?:const|function|type)\s+(\w+)/g)].map((m) => m[1])).filter((name) => !FIXTURE_EXPORTS.has(name));
  const untested = added.filter((name) => !new RegExp(`\\b${name}\\b`).test(testText));
  return verdict(untested.length === 0, added.length === 0 ? "no new exports" : untested.length === 0 ? `every new export is tested: ${added.join(", ")}` : `exports with no test: ${untested.join(", ")}`);
};

// 11. The end-of-phase gate is acknowledged: the reply says mutation testing
//     ran, or records it as N/A with a reason.
exports.mutationGateRecorded = (output) => {
  const text = String(output ?? "");
  const mentioned = /mutation/i.test(text);
  return verdict(mentioned, mentioned ? "reply addresses the mutation gate" : "reply does not mention mutation testing (ran or N/A)");
};

module.exports = require("./quality-lib").withWorkspace(module.exports);
