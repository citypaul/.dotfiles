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
const { mkdtempSync, rmSync, cpSync, symlinkSync, existsSync, readFileSync, readdirSync } = require("node:fs");
const { join, basename } = require("node:path");
const { tmpdir } = require("node:os");

const isTest = (path) => lib.isTestPath(path);
const isBench = (path) =>
  /\.bench\.[jt]sx?$/.test(path) || /(^|\/)(perf|bench|benchmarks)\//.test(path);
const isVendored = (path) => /(^|\/)(node_modules|\.claude|\.git)\//.test(path);
const isConfig = (path) => /(^|\/)(vitest|vite|tsup|rollup|webpack)\.(config|workspace|projects)\.[cm]?[jt]sx?$/.test(path);
// Production = the app's own code: a script file that is not a test, not the
// measurement harness, not build configuration and not a dependency. Where
// the agent put it is its own choice — a helper in `lib/`, a second entry
// point, a folder that did not exist before — so nothing here looks for
// `src/`.
const isProduction = (path) =>
  /\.[jt]sx?$/.test(path) && !isTest(path) && !isBench(path) && !isVendored(path) && !isConfig(path);

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
  git("diff --no-ext-diff --name-status HEAD")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [status, ...paths] = line.split("\t");
      return { status: String(status).charAt(0), path: last(paths) ?? "" };
    });

const untrackedPaths = () =>
  git("status --porcelain --untracked-files=all")
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
  const touched = trackedChanges().filter(
    (change) => isTest(`/${change.path}`) && !isVendored(`/${change.path}`),
  );
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
//
//    Only *added mechanism* is counted — a cache, a memo, a scheduler, a
//    worker. Restructuring is not: splitting a provider, moving a boundary or
//    narrowing a subscription is the fix house rule 5 prefers, and a diff
//    that both narrows the subscription and memoises the component it
//    narrowed is one hypothesis spelled in two lines, not two hypotheses.
const OPTIMISATION_KINDS = [
  [/\buseMemo\s*\(/, "useMemo"],
  [/\buseCallback\s*\(/, "useCallback"],
  [/(^|[^.\w])memo\s*\(|\bReact\.memo\s*\(/, "React.memo"],
  [/\buseDeferredValue\s*\(|\buseTransition\s*\(|\bstartTransition\s*\(/, "deferred rendering"],
  [/\bdebounce|\bthrottle/i, "debounce/throttle"],
  [/react-window|react-virtual|\bvirtuali[sz]/i, "virtualisation"],
  [/new Worker\s*\(|worker_threads/, "web worker"],
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
const MUTATORS =
  /\b([A-Za-z_$][\w$]*)\s*(?:\?\.|\.)\s*(?:push|splice|unshift|pop|shift|sort|reverse|fill|copyWithin)\s*\(/;

// A write through a receiver: `rows.total = 1`, `rows[0] = 1`, and the
// compound forms `rows.total += 1`, `rows.total ??= 1`.
//
// This is read by scanning for a lone `=` and looking at what sits
// immediately to its left, not by one regex over the raw line, because
// TypeScript spells two completely different things with square brackets:
// `rows[0] = 1` is a write, and `const ranked: RankedNote[] = [];` is a *type
// annotation* on an ordinary local declaration — exactly the accumulator
// house rule 2 sanctions ("the mutation stays local to a pure function's own
// scope"). A `:` or a `>` anywhere between the start of the statement and the
// `=` means the `=` closes a declaration, a generic type or a parameter
// default, so whatever brackets precede it are a type and not an index.
const MEMBER_TARGET =
  /([A-Za-z_$][\w$]*)((?:\s*\??\.\s*[A-Za-z_$][\w$]*|\s*\[[^\]]*\])+)\s*(?:\*\*|<<|>>>?|&&|\|\||\?\?|[+\-*/%&|^])?\s*$/;
// Where the statement (or the sub-expression) holding this `=` begins. `>`
// is one of them so that an arrow body — `(t: Totals) => t.count = 1` — is
// read after the parameter list rather than through it, and so that a
// generic annotation such as `Record<string, number[]>` ends before the `=`.
const STATEMENT_BREAKS = ";{}(,>";
const COMPARISONS = "=!<>";

const assignmentReceivers = (masked) => {
  const receivers = [];
  for (let at = 0; at < masked.length; at += 1) {
    if (masked[at] !== "=") continue;
    if (masked[at + 1] === "=" || masked[at + 1] === ">") continue;
    if (COMPARISONS.includes(masked[at - 1] ?? "")) continue;
    let start = 0;
    for (let back = at - 1; back >= 0; back -= 1) {
      if (STATEMENT_BREAKS.includes(masked[back])) {
        start = back + 1;
        break;
      }
    }
    const before = masked.slice(start, at);
    if (before.includes(":")) continue;
    const target = MEMBER_TARGET.exec(before);
    if (target !== null) receivers.push(target[1]);
  }
  return receivers;
};

const mutatorReceivers = (masked) => {
  const found = MUTATORS.exec(masked);
  return found === null ? [] : [found[1]];
};
const COPIES = /\[\s*\.\.\.|\.slice\s*\(|\.map\s*\(|\.filter\s*\(|\.concat\s*\(|Array\.from\s*\(|Object\.entries|\.flatMap\s*\(/;
const SAFE_RECEIVERS = /^(this|console|window|globalThis|Math|Object|Array|JSON|document|event|process|module|exports)$/;

// "never a caller's array or a shared object" — the receiver is the caller's
// when the scope the mutation sits in did not make it. Anything declared with
// its own initialiser it made: `useRef(0)`, `notes.map(…)`, `[]`,
// `new Map()`. The exception is an alias — `const rows = props.rows` — which
// is still the caller's object under a local name, so a bare identifier or
// member expression on the right-hand side does not count as making it.
const ALIAS_INITIALISER = /^[A-Za-z_$][\w$]*(?:\s*\.\s*[\w$]+|\s*\[[^\]]*\])*\s*[;,)]*\s*$/;

// Blank out the contents of strings, template literals and comments, so a
// brace inside a template literal or a `//` note is never read as a block
// delimiter, and an `=` inside them is never read as an assignment. Offsets are
// preserved, so the mask lines up with the original text.
const maskLiterals = (text) => {
  const out = text.split("");
  let mode = "code";
  for (let at = 0; at < text.length; at += 1) {
    const here = text[at];
    const next = text[at + 1];
    if (mode === "code") {
      if (here === "/" && next === "/") {
        mode = "line";
        out[at] = " ";
      } else if (here === "/" && next === "*") {
        mode = "block";
        out[at] = " ";
      } else if (here === '"' || here === "'" || here === "`") {
        mode = here;
      }
      continue;
    }
    if (mode === "line") {
      if (here === "\n") mode = "code";
      else out[at] = " ";
      continue;
    }
    if (mode === "block") {
      if (here === "*" && next === "/") {
        out[at] = " ";
        out[at + 1] = " ";
        at += 1;
        mode = "code";
      } else if (here !== "\n") {
        out[at] = " ";
      }
      continue;
    }
    if (here === "\\") {
      out[at] = " ";
      if (at + 1 < text.length) out[at + 1] = " ";
      at += 1;
      continue;
    }
    if (here === mode) {
      mode = "code";
      continue;
    }
    if (here !== "\n") out[at] = " ";
  }
  return out.join("");
};

// The text lexically visible from `offset`: the file with the body of every
// brace-delimited block that does not contain the offset blanked out. A
// `const rows = [...]` inside a sibling function therefore no longer
// exonerates a mutation of a prop called `rows` over here, while a
// declaration in any enclosing scope still does.
const visibleFrom = (text, offset) => {
  const masked = maskLiterals(text);
  const chars = text.split("");
  const opens = [];
  for (let at = 0; at < masked.length; at += 1) {
    if (masked[at] === "{") {
      opens.push(at);
      continue;
    }
    if (masked[at] !== "}") continue;
    const start = opens.pop();
    if (start === undefined) continue;
    if (start < offset && offset < at) continue;
    for (let inner = start + 1; inner < at; inner += 1) chars[inner] = " ";
  }
  return chars.join("");
};

// Where an added line ended up in the file it was added to. A line the agent
// later rewrote is not found; the whole file is then read, which can only be
// lenient.
const offsetsOf = (text, line) => {
  const wanted = line.trim();
  if (wanted === "") return [];
  const offsets = [];
  let at = 0;
  for (const current of text.split("\n")) {
    if (current.trim() === wanted) offsets.push(at);
    at += current.length + 1;
  }
  return offsets;
};

const declaredIn = (scope, name) => {
  const declaration = new RegExp(`(?:const|let|var)\\s+${name}\\s*(?::[^=\\n]*)?=\\s*([^\\n]*)`).exec(scope);
  if (declaration === null) return false;
  return !ALIAS_INITIALISER.test(String(declaration[1]).trim());
};

const createdLocally = (text, name, line) => {
  const offsets = offsetsOf(text, line);
  if (offsets.length === 0) return declaredIn(text, name);
  return offsets.some((offset) => declaredIn(visibleFrom(text, offset), name));
};

exports.noTypeEscapeOrSharedMutation = () => {
  const added = addedProductionLines();
  if (added.length === 0) return noEdits();
  const escapes = added.flatMap((line) =>
    TYPE_ESCAPES.filter(([pattern]) => pattern.test(line.text)).map(([, label]) => `${line.path}: ${label} — ${shorten(line.text)}`),
  );
  const mutations = added.flatMap((line) => {
    const masked = maskLiterals(line.text);
    return [...mutatorReceivers(masked), ...assignmentReceivers(masked)]
      .filter((receiver) => !SAFE_RECEIVERS.test(receiver))
      .filter(() => !COPIES.test(line.text))
      .filter((receiver) => !createdLocally(productionText(line.path), receiver, line.text))
      .map((receiver) => `${line.path}: mutates \`${receiver}\`, which it did not create — ${shorten(line.text)}`);
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
  const fromTo = /\bfrom\b[\s*_`~]*\d+(?:[.,]\d+)?[^\n]{0,40}?(?:\bto\b|→|->)[\s*_`~]*\d/i.test(text);
  const before = fromTo || /\bbefore\b|\bbaseline\b|\bwas\b|\bpreviously\b|\bstarting\b/i.test(text);
  const after = fromTo || /\bafter\b|\bnow\b|→|->|\bdown to\b|\bimproved?\b|\bdropped\b|\breduction\b|\bfaster\b/i.test(text);
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
//    Both runs take the whole of `src/perf` — the benchmark, its vitest
//    options and `makeNotes`, the generator that decides how many notes of
//    what size are measured — plus the vitest config, the tsconfig and
//    package.json from HEAD. Everything that decides *what is measured* is
//    therefore the committed harness. Everything else — the whole working
//    tree, wherever the agent put its code — is the agent's, so a fix split
//    into a new module outside `src` measures exactly like one written in
//    place. Shrinking the sample or weakening the benchmark moves no number
//    here. A change that leaves the number where it was, or makes it worse,
//    fails however plausible the diff and however confident the reply.
// The observed band on this fixture, over repeated runs on a loaded machine:
// the fixes that take the work out of the measured path land at 0.05x-0.53x;
// the reflex ones that leave it in place land at 0.86x-1.31x. 0.7x sits
// between them with about a third of margin either side.
const IMPROVEMENT_RATIO = 0.7;
// This is the suite's one wall-clock grader, so a first pair that is not a
// clear win is confirmed by a second pair before it decides anything, and
// each side then keeps its fastest run — the number least polluted by
// whatever else the machine was doing. A decisive first pair is not re-run.
const CLEAR_WIN = 0.5;
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

// The measurement harness: `src/perf` holds the benchmark *and* the sample
// data it renders, and package.json, the tsconfig and the vitest config decide
// how it runs. All of it always comes from HEAD, in both trees, so nothing the
// agent can edit changes what is measured.
const HARNESS = ["package.json", "tsconfig.json", "vitest.config.ts", "src/perf"];
// Not the agent's code: the installed dependencies (symlinked instead), the
// git directory, the mounted skills bundle and pnpm's store.
const NEVER_COPIED = new Set(["node_modules", ".git", ".claude", ".pnpm-store"]);
// Vitest picks its configuration by extension, `.js` before `.ts`, so a
// second config file at the root would quietly outrank the one restored from
// HEAD and could point the benchmark somewhere else. Only HEAD's own config
// survives in either tree.
const CONFIG_HIJACK = /^(vite|vitest)\.(config|workspace|projects)\.[cm]?[jt]sx?$/;

// A tree that can run one benchmark. `from` decides where the code under
// measurement comes from: HEAD for the baseline, the workspace for the
// agent's version. The agent's version is the *whole* working tree minus
// `node_modules` and the git directory — a helper the agent put in `lib/`, a
// second entry point, a folder that did not exist before, all of it — because
// where a fix is split is the agent's choice and nothing in the fixture
// confines it to `src`. The harness is then restored over the top from HEAD,
// and `node_modules` is the workspace's, symlinked.
const benchTree = (from) => {
  const ws = lib.workspace();
  const dir = mkdtempSync(join(tmpdir(), "react-performance-bench-"));
  if (from === "workspace") {
    cpSync(ws, dir, {
      recursive: true,
      filter: (source) => !NEVER_COPIED.has(basename(source)),
    });
    HARNESS.forEach((path) => rmSync(join(dir, path), { recursive: true, force: true }));
    rmSync(join(dir, "node_modules"), { recursive: true, force: true });
  } else {
    execSync(`git -C "${ws}" archive HEAD | tar -x -C "${dir}"`, { stdio: "ignore" });
  }
  readdirSync(dir)
    .filter((entry) => CONFIG_HIJACK.test(entry) && !HARNESS.includes(entry))
    .forEach((entry) => rmSync(join(dir, entry), { force: true }));
  execSync(`git -C "${ws}" archive HEAD ${HARNESS.join(" ")} | tar -x -C "${dir}"`, { stdio: "ignore" });
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
    const candidate = benchTree("workspace");
    trees.push(candidate);
    const runs = [];
    for (let round = 0; round < 2; round += 1) {
      const before = benchMean(baseline, benchFile);
      if (before.error) return lib.verdict(false, `the committed fixture's benchmark would not run: ${before.error}`);
      const after = benchMean(candidate, benchFile);
      if (after.error)
        return lib.verdict(
          false,
          `the agent's code would not benchmark: ${after.error}. The tree measured is the whole workspace with ${HARNESS.join(", ")} restored from HEAD, so this is the agent's own code failing to load or produce a timing, not a missing file`,
        );
      runs.push({ before: before.mean, after: after.mean });
      if (runs[0].after / runs[0].before <= CLEAR_WIN) break;
    }
    const fastest = (side) => Math.min(...runs.map((run) => run[side]));
    const before = fastest("before");
    const after = fastest("after");
    const ratio = after / before;
    const pass = ratio <= IMPROVEMENT_RATIO;
    return lib.verdict(
      pass,
      `${benchFile}: ${ms(before)} before, ${ms(after)} after (${ratio.toFixed(2)}×${
        pass ? "" : `, needs ≤ ${IMPROVEMENT_RATIO}×`
      }; best of ${runs.length} pair${runs.length === 1 ? "" : "s"})`,
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
