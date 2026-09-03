// Deterministic graders for the react-performance quality suite.
//
// Two sources of truth, as everywhere in this harness: the ordered tool-call
// trail (what the agent did, in what order) and the workspace it left behind.
// The workspace is a git repository whose HEAD is the untouched fixture, so
// "what the agent introduced" is `git diff HEAD` plus the untracked files —
// no folder layout is assumed, and fixture code the agent never touched is
// never graded.
//
// Every rule below is one the react-performance skill states as a rule; the
// comment above each grader quotes it.
//
// One of them, `measuredImprovement`, is not read from the trail or from the
// shape of the diff at all: it re-runs the fixture's own benchmark over the
// committed code and over the agent's code and compares the two numbers. It is
// the anchor the others hang from — `baselineMeasuredFirst`,
// `reMeasuredAfterChange` and `beforeAfterReported` say the agent went through
// the motions of measuring; only `measuredImprovement` says the motions were
// worth anything. `behaviourTestsUnchanged`, `behaviourDelivered`,
// `suiteGreen` and `typecheckClean` are the safety net: they say the change
// cost nothing, not that it achieved anything, and an agent that changes
// nothing passes them by construction while failing every other grader here.

const lib = require("./quality-lib");
const { execSync } = require("node:child_process");
const { mkdtempSync, rmSync, cpSync, symlinkSync, existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { tmpdir } = require("node:os");

const isTest = (path) => lib.isTestPath(path);
const isBench = (path) => /\.bench\.[jt]sx?$/.test(path) || /\/src\/perf\//.test(path);
// Production = the app's own code: not a test, not the measurement harness.
const isProduction = (path) => /\/src\/.*\.[jt]sx?$/.test(path) && !isTest(path) && !isBench(path);

const first = (items) => items[0];
const last = (items) => items[items.length - 1];
const shorten = (text) => String(text).replace(/\s+/g, " ").slice(0, 90);

// ---------------------------------------------------------------- the trail

// A measurement: the fixture's benchmark, a profile, or any timing run. Test
// runs and typechecks are not measurements.
const isMeasurement = (command) =>
  /(^|[^a-z])bench(mark)?s?\b|--bench\b|profil(e|er|ing)\b|\bmeasure(ment|d)?\b|\bhyperfine\b|\btime\s+(pnpm|npm|node)\b/i.test(
    command,
  );

const measurements = (context) =>
  lib.trail(context).filter((call) => call.name === "Bash" && isMeasurement(call.command));
const productionEdits = (context) => lib.edits(lib.trail(context)).filter((call) => isProduction(call.path));

// ------------------------------------------------------------ the workspace

// The user's global git config may install an external diff driver and a
// pager; both are switched off so the output is plain unified diff text.
const git = (command) => {
  const result = lib.run(`git --no-pager -c core.pager=cat ${command}`);
  return result.ok ? result.out : "";
};

// Tracked files the agent changed, as "<status>\t<path>" pairs.
const trackedChanges = () =>
  git("diff --no-ext-diff --name-status HEAD -- src")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split("\t");
      return { status: String(status).charAt(0), path: last(paths) ?? "" };
    });

const untrackedPaths = () =>
  git("status --porcelain --untracked-files=all -- src")
    .split("\n")
    .filter((line) => line.startsWith("??"))
    .map((line) => line.slice(3).trim());

// Every line the agent added to production code: the `+` side of the diff for
// files that existed, and the whole file for ones the agent created.
const addedProductionLines = () => {
  const changed = trackedChanges()
    .filter((change) => change.status !== "D" && isProduction(`/${change.path}`))
    .map((change) => change.path);
  const created = untrackedPaths().filter((path) => isProduction(`/${path}`));
  const fromDiff = changed.flatMap((path) =>
    git(`diff --no-ext-diff -U0 HEAD -- "${path}"`)
      .split("\n")
      .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
      .map((line) => ({ path, text: line.slice(1) })),
  );
  const fromNew = created.flatMap((path) => {
    const file = lib.resolve(lib.workspace(), path);
    return lib
      .read(file)
      .split("\n")
      .map((text) => ({ path, text }));
  });
  return [...fromDiff, ...fromNew];
};

const productionText = (path) => {
  try {
    return lib.read(lib.resolve(lib.workspace(), path));
  } catch {
    return "";
  }
};

const noEdits = () => lib.verdict(false, "the agent changed no production file");

// 1. "capture a *number* before touching code: a profile, a bundle report, a
//    trace, a field metric." — the baseline is measured before the first
//    production edit, not after it.
exports.baselineMeasuredFirst = (output, context) => {
  const edited = first(productionEdits(context));
  if (!edited) return noEdits();
  const before = measurements(context).filter((call) => call.index < edited.index);
  return lib.verdict(
    before.length > 0,
    before.length > 0
      ? `baseline measured at step #${before[0].index} before the first production edit (#${edited.index}, ${lib.basename(edited.path)}): ${shorten(before[0].command)}`
      : `no measurement before the first production edit (#${edited.index}, ${lib.basename(edited.path)}); ${measurements(context).length} measurement(s) in the whole run`,
  );
};

// 2. "Repeat the step-1 measurement. A change that does not move the number is
//    reverted" — the same measurement runs again after the last production
//    edit, so the agent has seen what its change did.
exports.reMeasuredAfterChange = (output, context) => {
  const edited = last(productionEdits(context));
  if (!edited) return noEdits();
  const after = measurements(context).filter((call) => call.index > edited.index);
  return lib.verdict(
    after.length > 0,
    after.length > 0
      ? `re-measured at step #${after[0].index} after the last production edit (#${edited.index}): ${shorten(after[0].command)}`
      : `no measurement after the last production edit (#${edited.index}, ${lib.basename(edited.path)})`,
  );
};

// 3. "Behavior tests do not change to accommodate a performance change… every
//    behavior test still passes without modification." / "Deleting or
//    weakening a test to make a benchmark look better is never in scope."
exports.behaviourTestsUnchanged = () => {
  const touched = trackedChanges().filter((change) => isTest(`/${change.path}`));
  const label = { M: "modified", D: "deleted", R: "renamed", A: "replaced" };
  return lib.verdict(
    touched.length === 0,
    touched.length === 0
      ? "the fixture's behaviour tests are untouched"
      : touched.map((change) => `${change.path}: ${label[change.status] ?? change.status}`).join("; "),
  );
};

// 4. "Apply one rule at a time… exactly one hypothesis is in the diff." /
//    "A single 'performance PR' bundling twenty rules, where no individual
//    change can be attributed or reverted" is an anti-pattern. Removing the
//    cause adds no mechanism at all, which the skill prefers, so zero kinds
//    passes and two or more fails.
const OPTIMISATION_KINDS = [
  [/\buseMemo\s*\(/, "useMemo"],
  [/\buseCallback\s*\(/, "useCallback"],
  [/(^|[^.\w])memo\s*\(|\bReact\.memo\s*\(/, "React.memo"],
  [/\buseDeferredValue\s*\(|\buseTransition\s*\(|\bstartTransition\s*\(/, "deferred rendering"],
  [/\bdebounce|\bthrottle/i, "debounce/throttle"],
  [/react-window|react-virtual|\bvirtuali[sz]/i, "virtualisation"],
  [/new Worker\s*\(|worker_threads/, "web worker"],
  [/\bcreateContext\s*\(/, "an extra context"],
  [/\blocalStorage\b|\bsessionStorage\b|\bnew Map\s*\(\s*\)\s*;?\s*\/\/\s*cache|\bcacheRef\b/, "an external cache"],
];

// A sprinkle of the same hook over three components is as batched a pass as
// three different hooks, so sites are counted as well as kinds: at most one
// kind, and at most two places where that kind was introduced.
const SITE_LIMIT = 2;

exports.oneOptimisationPerDiff = () => {
  const added = addedProductionLines();
  if (added.length === 0) return noEdits();
  const kinds = OPTIMISATION_KINDS.filter(([pattern]) => added.some((line) => pattern.test(line.text))).map(
    ([, name]) => name,
  );
  const sites = added.filter((line) => OPTIMISATION_KINDS.some(([pattern]) => pattern.test(line.text))).length;
  const pass = kinds.length <= 1 && sites <= SITE_LIMIT;
  return lib.verdict(
    pass,
    kinds.length === 0
      ? "the diff adds no memo, cache or scheduling mechanism at all"
      : kinds.length > 1
        ? `${kinds.length} optimisation kinds in one diff: ${kinds.join(", ")}`
        : sites > SITE_LIMIT
          ? `${sites} separate ${kinds[0]} sites in one diff — a batched pass, not one hypothesis`
          : `one optimisation in the diff: ${kinds[0]}${sites > 1 ? ` (${sites} sites)` : ""}`,
  );
};

// 5. "No `any`, no unjustified assertion, for speed." / "Mutating a caller's
//    array or a shared object in the name of a hot loop" is an anti-pattern;
//    a mutation "stays local to a pure function's own scope". Only lines the
//    agent added are read.
const TYPE_ESCAPES = [
  [/:\s*any\b|<any>|\bas\s+any\b/, "`any`"],
  [/\bas\s+unknown\s+as\b/, "a double assertion"],
  [/@ts-(ignore|expect-error|nocheck)/, "a suppressed type error"],
];
const MUTATORS = /\b(\w+)\s*(?:\?\.)?\.(push|splice|unshift|pop|shift|sort|reverse|fill|copyWithin)\s*\(/;
// `=(?![=>])` so an arrow function's `=>` and a comparison are not read as
// assignments: `(notes: readonly Note[]): readonly ScoredNote[] => {` assigns
// nothing.
const ASSIGNMENTS = /\b(\w+)(?:\.\w+|\[[^\]]*\])\s*=(?![=>])/;
const COPIES = /\[\s*\.\.\.|\.slice\s*\(|\.map\s*\(|\.filter\s*\(|\.concat\s*\(|Array\.from\s*\(|Object\.entries|\.flatMap\s*\(/;
const SAFE_RECEIVERS = /^(this|console|window|globalThis|Math|Object|Array|JSON|document|event|process|module|exports)$/;

// "never a caller's array or a shared object" — the receiver is the caller's
// when the file did not make it. Anything the file declares with its own
// initialiser it made: `useRef(0)`, `notes.map(…)`, `[]`, `new Map()`. The
// exception is an alias — `const rows = props.rows` — which is still the
// caller's object under a local name, so a bare identifier or member
// expression on the right-hand side does not count as making it.
const ALIAS_INITIALISER = /^[A-Za-z_$][\w$]*(?:\s*\.\s*[\w$]+|\s*\[[^\]]*\])*\s*[;,)]*\s*$/;

const createdLocally = (text, name) => {
  const declaration = new RegExp(`(?:const|let|var)\\s+${name}\\s*(?::[^=\\n]*)?=\\s*([^\\n]*)`).exec(text);
  if (declaration === null) return false;
  return !ALIAS_INITIALISER.test(String(declaration[1]).trim());
};

exports.noTypeEscapeOrSharedMutation = () => {
  const added = addedProductionLines();
  if (added.length === 0) return noEdits();
  const escapes = added.flatMap((line) =>
    TYPE_ESCAPES.filter(([pattern]) => pattern.test(line.text)).map(([, label]) => `${line.path}: ${label} — ${shorten(line.text)}`),
  );
  const mutations = added.flatMap((line) => {
    const found = [MUTATORS, ASSIGNMENTS]
      .map((pattern) => pattern.exec(line.text))
      .filter((match) => match !== null);
    return found
      .filter(([, receiver]) => !SAFE_RECEIVERS.test(receiver))
      .filter(() => !COPIES.test(line.text))
      .filter(([, receiver]) => !createdLocally(productionText(line.path), receiver))
      .map(([, receiver]) => `${line.path}: mutates \`${receiver}\`, which it did not create — ${shorten(line.text)}`);
  });
  const problems = [...escapes, ...mutations];
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? `${added.length} added line(s) keep types and immutability intact`
      : problems.slice(0, 3).join("; "),
  );
};

// 6. "Record the before/after pair in the PR… Is the before/after evidence
//    recorded where the reviewer will see it?" — the reply carries both
//    numbers, with units, not just a claim that it is faster.
exports.beforeAfterReported = (output) => {
  const text = String(output ?? "");
  const numbers = text.match(/\d+(?:[.,]\d+)?\s*(?:ms\b|milliseconds\b|µs\b|us\b|seconds?\b|s\b|hz\b|ops\/s|%|×|x\b)/gi) ?? [];
  const before = /\bbefore\b|\bbaseline\b|\bwas\b|\bpreviously\b|\bstarting\b/i.test(text);
  const after = /\bafter\b|\bnow\b|→|->|\bdown to\b|\bimproved?\b/i.test(text);
  const pass = numbers.length >= 2 && before && after;
  return lib.verdict(
    pass,
    pass
      ? `reply reports before and after: ${numbers.slice(0, 4).join(", ")}`
      : `reply has ${numbers.length} measured number(s)${numbers.length ? ` (${numbers.slice(0, 4).join(", ")})` : ""}; names a baseline: ${before}; names the result: ${after}`,
  );
};

// 7. "Repeat the step-1 measurement… A change that does not move the number is
//    reverted, not kept 'because it is better practice'." / "Does the same
//    measurement, run the same way, show the improvement?"
//
//    This is the only grader that asks reality rather than the transcript: it
//    runs the fixture's own benchmark twice — once over the fixture as it was
//    committed, once over the code the agent left — and compares the two means.
//    Both runs use the benchmark, the vitest config and the package scripts
//    from HEAD, so the number cannot be moved by editing the harness; only
//    `src` outside `src/perf` comes from the agent. A change that leaves the
//    number where it was, or makes it worse, fails here however plausible the
//    diff and however confident the reply.
const IMPROVEMENT_RATIO = 0.75;
const BENCH_TIMEOUT_MS = 300_000;

const shell = (command, cwd) => {
  try {
    return {
      ok: true,
      out: execSync(command, {
        cwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: BENCH_TIMEOUT_MS,
        env: { ...process.env, CI: "1" },
      }),
    };
  } catch (error) {
    return { ok: false, out: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim() };
  }
};

// A tree that can run one benchmark. The harness (`src/perf`), the vitest
// config, the tsconfig and package.json always come from HEAD; `node_modules`
// is the workspace's, symlinked. `from` decides where the rest of `src` comes
// from: HEAD for the baseline, the working tree for the agent's version.
const benchTree = (from) => {
  const ws = lib.workspace();
  const dir = mkdtempSync(join(tmpdir(), "react-performance-bench-"));
  execSync(`git -C "${ws}" archive HEAD package.json tsconfig.json vitest.config.ts src | tar -x -C "${dir}"`, {
    stdio: "ignore",
  });
  if (from === "workspace") {
    rmSync(join(dir, "src"), { recursive: true, force: true });
    cpSync(join(ws, "src"), join(dir, "src"), { recursive: true });
    rmSync(join(dir, "src", "perf"), { recursive: true, force: true });
    execSync(`git -C "${ws}" archive HEAD src/perf | tar -x -C "${dir}"`, { stdio: "ignore" });
  }
  symlinkSync(join(ws, "node_modules"), join(dir, "node_modules"));
  return dir;
};

const benchMean = (dir, benchFile) => {
  const report = join(dir, "bench-report.json");
  const result = shell(`./node_modules/.bin/vitest bench --run "${benchFile}" --outputJson=bench-report.json`, dir);
  if (!existsSync(report)) return { error: shorten(result.out.split("\n").filter(Boolean).slice(-4).join(" ")) };
  const means = (JSON.parse(readFileSync(report, "utf8")).files ?? [])
    .flatMap((file) => file.groups ?? [])
    .flatMap((group) => group.benchmarks ?? [])
    .map((benchmark) => benchmark.mean)
    .filter((mean) => Number.isFinite(mean) && mean > 0);
  if (means.length === 0) return { error: `${benchFile} reported no timing` };
  return { mean: means.reduce((total, mean) => total + mean, 0) / means.length };
};

const ms = (value) => `${value.toFixed(value < 1 ? 4 : 2)} ms`;

exports.measuredImprovement = (output, context) => {
  if (trackedChanges().length === 0 && untrackedPaths().length === 0) return noEdits();
  const benchFile = context?.vars?.benchmark;
  if (!benchFile) return lib.verdict(false, "the case declares no `benchmark` var to re-run");
  const trees = [];
  try {
    const baseline = benchTree("head");
    trees.push(baseline);
    const before = benchMean(baseline, benchFile);
    if (before.error) return lib.verdict(false, `the committed fixture's benchmark would not run: ${before.error}`);
    const candidate = benchTree("workspace");
    trees.push(candidate);
    const after = benchMean(candidate, benchFile);
    if (after.error) return lib.verdict(false, `the agent's code would not benchmark: ${after.error}`);
    const ratio = after.mean / before.mean;
    const pass = ratio <= IMPROVEMENT_RATIO;
    return lib.verdict(
      pass,
      `${benchFile}: ${ms(before.mean)} before, ${ms(after.mean)} after (${ratio.toFixed(2)}×${
        pass ? "" : `, needs ≤ ${IMPROVEMENT_RATIO}×`
      })`,
    );
  } catch (error) {
    return lib.verdict(false, `the benchmark could not be re-run over the agent's code: ${shorten(error.message)}`);
  } finally {
    trees.forEach((dir) => rmSync(dir, { recursive: true, force: true }));
  }
};

// 8. The behaviour a person sees is unchanged: the hidden acceptance test for
//    this case passes against whatever the agent built. "Performance is a
//    non-functional guarantee, so this measurement *is* the evidence for the
//    change; it does not substitute for the behavior tests."
exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "react-performance", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
