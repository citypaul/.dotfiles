// Deterministic graders for the mutation-testing quality suite.
//
// The fixture (checkout-core) has 100% line coverage and weak tests: identity
// values, all-true boolean cases, one side of every boundary, "does not
// throw". It declares mutation testing (README, CLAUDE.md) and carries the
// Stryker packages in its lockfile, but has no Stryker config, no scripts and
// no run. Every rule below is one the skill states as a rule; the survivor
// check re-runs Stryker with the harness's own config so the comparison with
// the recorded baseline is apples to apples whatever config the agent wrote.

const { existsSync, readdirSync, writeFileSync, rmSync } = require("node:fs");
const { createHash } = require("node:crypto");
const lib = require("./quality-lib");

// Baseline recorded from the fixture as committed (stryker 10.0.0, vitest
// runner, mutate src/**/*.ts minus tests): 44 mutants, 24 killed, 20 survived.
// One survivor is equivalent — `if (items.length === 0) return 0;` mutated to
// `if (false)` leaves reduce to return 0 for an empty array — so 19 are
// killable. The gate passes when at most the equivalent one plus one
// judgment call survive.
const BASELINE_SURVIVORS = 20;
const EQUIVALENT_MUTANTS = 1;
const MAX_SURVIVORS_TO_PASS = EQUIVALENT_MUTANTS + 1;

const root = () => lib.workspace();
const packageJson = () => JSON.parse(lib.read(lib.resolve(root(), "package.json")));
const scripts = () => packageJson().scripts ?? {};

const strykerConfigFiles = () =>
  readdirSync(root())
    .filter((name) => /^stryker\.(config|conf)\.(mjs|cjs|js|json|ts)$/.test(name) && !/harness/.test(name))
    .map((name) => lib.resolve(root(), name));

const strykerConfigText = () => {
  const files = strykerConfigFiles();
  if (files.length > 0) return { file: lib.rel(files[0]), text: lib.read(files[0]) };
  const inline = packageJson().stryker;
  return inline ? { file: "package.json#stryker", text: JSON.stringify(inline) } : null;
};

const isStrykerCommand = (command) => /\bstryker\s+run\b|\b(pnpm|npm|yarn)\s+(run\s+)?mutation(:\w+)?\b/.test(command);
const strykerRuns = (context) => lib.trail(context).filter((call) => call.name === "Bash" && isStrykerCommand(call.command));
const isScoped = (command) => /--mutate\b|--incremental\b|mutation:diff\b|mutation:incremental\b/.test(command);

// 1. "Prefer the project test runner plugin when available (`vitest`, `jest`,
//    `mocha`, etc.). Use the generic command runner only when no tighter
//    integration is practical." The config exists and names the vitest runner.
exports.strykerConfigUsesVitestRunner = () => {
  const config = strykerConfigText();
  if (!config) return lib.verdict(false, "no stryker.config.* / stryker.conf.* in the workspace");
  const vitest = /testRunner["']?\s*:\s*["']vitest["']/.test(config.text);
  const command = /testRunner["']?\s*:\s*["']command["']/.test(config.text);
  return lib.verdict(vitest, vitest ? `${config.file}: testRunner vitest` : command ? `${config.file}: generic command runner` : `${config.file}: no vitest testRunner`);
};

// 2. "Mutate first-party production source only. Exclude tests, fixtures,
//    snapshots, generated files, declaration files, build outputs". A `mutate`
//    list, when written, names no test/spec/fixture/snapshot/declaration file
//    in a positive pattern and either carries a negated test pattern (or an
//    extglob that excludes tests) or consists only of explicit non-glob
//    production paths. Leaving `mutate` to Stryker's default (which already
//    excludes tests) also passes.
const NON_PRODUCTION = /\.(test|spec)\.|__tests__|__snapshots__|\.snap\b|fixture|\.d\.ts\b|(^|\/)(dist|build|out|coverage)(\/|$)/i;
const isGlob = (pattern) => /[*?{}\[\]()]/.test(pattern);
exports.mutatesProductionOnly = () => {
  const config = strykerConfigText();
  if (!config) return lib.verdict(false, "no Stryker config");
  const mutate = config.text.match(/mutate["']?\s*:\s*\[([\s\S]*?)\]/);
  if (!mutate) return lib.verdict(true, `${config.file}: mutate left to Stryker's default (tests excluded)`);
  const patterns = [...mutate[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);
  const positive = patterns.filter((p) => !p.startsWith("!"));
  const negated = patterns.filter((p) => p.startsWith("!"));
  const includesNonProduction = positive.some((p) => NON_PRODUCTION.test(p));
  const negatesTests = negated.some((p) => /test|spec/i.test(p)) || positive.every((p) => /!\(.*(test|spec)/.test(p));
  const explicitPaths = positive.length > 0 && positive.every((p) => !isGlob(p));
  const pass = !includesNonProduction && (negatesTests || explicitPaths);
  const why = includesNonProduction ? "a positive pattern names test/fixture/snapshot/declaration/build files" : negatesTests ? "tests negated" : explicitPaths ? "explicit production paths" : "globs with no test exclusion";
  return lib.verdict(pass, `${config.file}: mutate ${JSON.stringify(patterns)} (${why})`);
};

// 3. "Add failing thresholds only after establishing a realistic baseline."
//    A first setup carries no numeric `break` threshold.
exports.noBreakThresholdBeforeBaseline = () => {
  const config = strykerConfigText();
  if (!config) return lib.verdict(false, "no Stryker config");
  const breakAt = config.text.match(/\bbreak["']?\s*:\s*(\d+)/);
  return lib.verdict(!breakAt, breakAt ? `${config.file}: break threshold ${breakAt[1]} set before a baseline exists` : `${config.file}: no break threshold`);
};

// 4. "Do not stop at reasoning about whether a test would catch a mutation;
//    run the harness against the accumulated change". The trail shows Stryker
//    executed.
exports.harnessRun = (output, context) => {
  const runs = strykerRuns(context);
  return lib.verdict(runs.length > 0, runs.length > 0 ? `stryker executed ${runs.length} time(s): ${runs[0].command.slice(0, 80)}` : "no `stryker run` (or mutation script) in the tool-call trail");
};

// 5. "Re-run Stryker scoped to the mutated file or line range" / "Use exact
//    line ranges for tiny follow-up checks". After the first full run, every
//    further run is scoped (`--mutate`, `--incremental`, the diff script) with
//    at most one more full run for the final report.
exports.rerunsAreFocused = (output, context) => {
  const runs = strykerRuns(context);
  if (runs.length === 0) return lib.verdict(false, "stryker never ran");
  const full = runs.filter((run) => !isScoped(run.command));
  const pass = full.length <= 2;
  return lib.verdict(pass, `${runs.length} run(s), ${full.length} unscoped` + (pass ? "" : `; third full run: ${full[2].command.slice(0, 80)}`));
};

// 6. "Present the final mutation report": the reply gives killed and
//    survived counts and the mutation score.
exports.reportPresented = (output) => {
  const text = String(output ?? "");
  const killed = /\bkilled\b/i.test(text);
  const survived = /\bsurviv(ed|ing|ors?)\b/i.test(text);
  const score = /\d+(\.\d+)?\s*%|mutation score/i.test(text);
  return lib.verdict(killed && survived && score, `reply mentions killed: ${killed}; survived: ${survived}; score: ${score}`);
};

// 7. "Categorize Stryker findings: Killed / Survived / No Coverage /
//    Equivalent" and "Handle equivalent mutants by documenting why behavior
//    cannot differ." The fixture has exactly one equivalent mutant; the reply
//    names the category rather than treating every survivor as a failure.
exports.survivorsTriaged = (output) => {
  const text = String(output ?? "");
  const equivalent = /\bequivalent\b/i.test(text);
  return lib.verdict(equivalent, equivalent ? "reply classifies at least one survivor as equivalent" : "reply never classifies a survivor as equivalent (the empty-items guard is one)");
};

// 8. "add dependencies, config, scripts, and `.gitignore` entries for Stryker
//    temp/report output". Stryker writes .stryker-tmp/ and reports/.
exports.gitignoreCoversStrykerOutput = () => {
  const file = lib.resolve(root(), ".gitignore");
  const text = existsSync(file) ? lib.read(file) : "";
  const tmp = /^\.?stryker-tmp\/?$|^\.stryker-tmp/m.test(text);
  const reports = /^\/?reports\/?$|stryker.*report|^reports\//m.test(text);
  return lib.verdict(tmp && reports, `.gitignore covers .stryker-tmp: ${tmp}; reports: ${reports}`);
};

// 9. "Suggest project scripts for full-project, cached, and branch-diff
//    mutation runs": `mutation` and `mutation:diff` (pinned by the request)
//    plus an `--incremental` run under any name.
exports.mutationScriptsAdded = () => {
  const s = scripts();
  const full = typeof s.mutation === "string" && /stryker/.test(s.mutation);
  const diff = typeof s["mutation:diff"] === "string";
  const incremental = Object.values(s).some((value) => /--incremental\b/.test(String(value)));
  return lib.verdict(full && diff && incremental, `mutation: ${full}; mutation:diff: ${diff}; an --incremental script: ${incremental}`);
};

const diffHelper = () => {
  const script = scripts()["mutation:diff"];
  if (typeof script !== "string") return { error: "no mutation:diff script" };
  const inlineShell = /\$\(|\||\bxargs\b|\bgit\s+diff\b/.test(script);
  const helper = script.match(/(?:^|\s)((?:\.\/)?[\w./-]+\.(?:mjs|cjs|js|ts|mts))\b/);
  if (!helper) return { script, inlineShell, error: `mutation:diff runs no script file: ${script}` };
  const file = lib.resolve(root(), helper[1]);
  if (!existsSync(file)) return { script, inlineShell, error: `${helper[1]} does not exist` };
  return { script, inlineShell, file, text: lib.read(file) };
};

// 10. "Use a small Node helper, not dense shell inside `package.json`".
exports.diffScriptIsNodeHelper = () => {
  const helper = diffHelper();
  if (helper.error) return lib.verdict(false, helper.error);
  const runsNode = /\b(node|tsx|ts-node|bun)\b/.test(helper.script);
  return lib.verdict(runsNode && !helper.inlineShell, `${helper.script}` + (helper.inlineShell ? " (inline shell)" : ""));
};

// 11. "Collect changed files with `git diff --name-only -z --diff-filter=...
//     <base>...HEAD` and parse NUL-delimited records; filenames may contain
//     whitespace or newlines."
exports.diffHelperNulDelimited = () => {
  const helper = diffHelper();
  if (helper.error) return lib.verdict(false, helper.error);
  const nul = /(^|[\s"'\[,])-z\b|\\0|\\u0000|\\x00|NUL/.test(helper.text);
  const threeDots = /\.\.\.HEAD|\.\.\.\$\{|\.\.\.["'`]?\s*\+|\.\.\./.test(helper.text);
  return lib.verdict(nul && threeDots, `NUL-delimited: ${nul}; <base>...HEAD range: ${threeDots}`);
};

// 12. "Exclude test/spec files, fixtures, snapshots, generated files,
//     declaration files, and build output."
exports.diffHelperExcludesTests = () => {
  const helper = diffHelper();
  if (helper.error) return lib.verdict(false, helper.error);
  const excludes = /\.(test|spec)\b|\\\.test|\\\.spec|test\|spec|spec\|test|__tests__/.test(helper.text);
  return lib.verdict(excludes, excludes ? "helper filters test/spec files out of the mutate scope" : "helper does not exclude test/spec files");
};

// 13. "Invoke the repository-local Stryker binary without a shell." and "Use
//     the repository's actual package manager; the examples use pnpm only to
//     show a repository-local binary." Repository-local means the binary under
//     node_modules/.bin, the @stryker-mutator/core package, or the package
//     manager's exec/run/dlx as the argv[0] of a shell-less spawn with
//     `stryker` in its argument array; a bare `stryker` on PATH is not.
const PACKAGE_MANAGER_ARGV = /["'`](?:pnpm|npm|yarn|npx|bunx?|corepack)["'`]\s*,\s*\[[^\]]*["'`]stryker["'`]/;
exports.diffHelperNoShell = () => {
  const helper = diffHelper();
  if (helper.error) return lib.verdict(false, helper.error);
  const noShellCall = /\b(spawnSync|execFileSync|spawn|execFile)\s*\(/.test(helper.text);
  const shellOptIn = /shell\s*:\s*true/.test(helper.text);
  const shellCall = /\bexec(Sync)?\s*\(\s*[`'"][^`'"]*stryker/.test(helper.text);
  const local = /node_modules|\.bin|@stryker-mutator\/core|(pnpm|yarn|npm)\s+(exec|dlx|x)\b|npx\b/.test(helper.text) || PACKAGE_MANAGER_ARGV.test(helper.text);
  const pass = noShellCall && !shellOptIn && !shellCall && local;
  return lib.verdict(pass, `spawn/execFile: ${noShellCall}; shell opt-in: ${shellOptIn}; exec string: ${shellCall}; repository-local binary: ${local}`);
};

// 14. "Fix obvious issues immediately: missing boundary tests, weak or absent
//     assertions, one-sided branch coverage" and "re-run focused mutations
//     until they are killed or classified". Hidden check: Stryker runs on the
//     final tree with the harness's own config; survivors (survived + no
//     coverage) must fall from the baseline of 20 to at most the equivalent
//     one plus one.
const HARNESS_CONFIG = `export default {
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  reporters: ["json"],
  jsonReporter: { fileName: ".stryker-harness/report.json" },
  mutate: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts", "!src/**/acceptance-*.ts", "!src/**/*.d.ts", "!src/**/__tests__/**", "!src/**/test/**"],
  tempDirName: ".stryker-harness-tmp",
  ignorePatterns: [".claude/**", ".stryker-harness/**", ".stryker-harness-tmp/**", ".pnpm-store/**"],
  incremental: false,
  cleanTempDir: true,
  logLevel: "warn",
};
`;

const treeStamp = () => {
  const status = lib.run("git status --porcelain=v1 -z").out;
  const diff = lib.run("git diff HEAD").out;
  const untracked = lib.run("git ls-files --others --exclude-standard -z").out.split("\0").filter(Boolean);
  const contents = untracked.map((file) => (existsSync(lib.resolve(root(), file)) ? lib.read(lib.resolve(root(), file)) : "")).join("\n");
  return createHash("sha1").update(root()).update(status).update(diff).update(contents).digest("hex");
};

const cache = new Map();
const mutationReport = () => {
  const key = treeStamp();
  if (cache.has(key)) return cache.get(key);
  const config = lib.resolve(root(), "stryker.harness.config.mjs");
  const reportDir = lib.resolve(root(), ".stryker-harness");
  writeFileSync(config, HARNESS_CONFIG);
  try {
    const result = lib.run("pnpm exec stryker run stryker.harness.config.mjs", { timeout: 300_000 });
    const reportFile = lib.resolve(reportDir, "report.json");
    if (!existsSync(reportFile)) return { error: `stryker produced no report: ${result.out.split("\n").filter(Boolean).slice(-3).join(" | ")}` };
    const report = JSON.parse(lib.read(reportFile));
    const mutants = Object.values(report.files ?? {}).flatMap((file) => file.mutants ?? []);
    const count = (status) => mutants.filter((m) => m.status === status).length;
    const summary = { total: mutants.length, killed: count("Killed") + count("Timeout"), survived: count("Survived"), noCoverage: count("NoCoverage"), errors: count("CompileError") + count("RuntimeError") };
    cache.set(key, summary);
    return summary;
  } finally {
    rmSync(config, { force: true });
    rmSync(reportDir, { recursive: true, force: true });
    rmSync(lib.resolve(root(), ".stryker-harness-tmp"), { recursive: true, force: true });
  }
};

exports.survivorsBelowBaseline = () => {
  const report = mutationReport();
  if (report.error) return lib.verdict(false, report.error);
  const survivors = report.survived + report.noCoverage;
  const pass = survivors <= MAX_SURVIVORS_TO_PASS;
  const score = Math.max(0, Math.min(1, (BASELINE_SURVIVORS - survivors) / (BASELINE_SURVIVORS - EQUIVALENT_MUTANTS)));
  return {
    pass,
    score: pass ? 1 : score,
    reason: `${survivors} survivor(s) of ${report.total} mutants (killed ${report.killed}, no coverage ${report.noCoverage}, errors ${report.errors}); baseline ${BASELINE_SURVIVORS}, ${EQUIVALENT_MUTANTS} equivalent, pass at <= ${MAX_SURVIVORS_TO_PASS}`,
  };
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "mutation-testing", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
