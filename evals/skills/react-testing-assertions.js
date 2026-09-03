// Deterministic graders for the react-testing quality suite.
//
// The fixture (fixtures/react-testing-workspace) is a React app whose only
// test covers a pure text helper: no component test, no hook test, nothing
// showing which harness to reach for or how to query. Its components carry
// `data-testid` attributes and BEM-ish class names, so the default answer is
// available and tempting. Every case asks for tests, so each grader reads the
// test files the agent wrote or edited (found from the tool-call trail unioned
// with git status, then located in the current workspace) and checks them
// against a rule the react-testing skill — or the front-end-testing skill it
// sends the reader to for queries and events — states as a rule.
//
// Nothing assumes a folder layout: tests are found by name anywhere in the
// workspace (`src/__tests__/board.test.tsx` counts), which Vitest project a
// test belongs to is asked of Vitest itself (`vitest list --filesOnly
// --project <name>`), and a module a test mocks is resolved to a file on disk
// rather than matched as a string, so `vi.mock(import("./TaskRow"))` and
// `vi.mock("../components/TaskRow")` are the same fact. Rules are decided by
// reading the balanced argument list of the call that carries them, with
// strings, template literals and comments skipped, so a bracket inside text
// cannot move a verdict.
//
// Running the workspace's tests is done through `runIsolated` below, never
// `lib.run`, for three reasons this suite has and the others do not:
//
//   * this is the only suite whose hidden acceptance tests are `.tsx`, so the
//     shared `--exclude '**/acceptance-*.test.ts'` glob would let a copied
//     hidden test run inside the agent's own suite — and a glob alone is not
//     enough either, because the fixture's `unit` project sets an `exclude` of
//     its own that overrides the CLI one (see the ACCEPTANCE block below for
//     the lock and the sweep that finish the job);
//   * its `browser` project drives a real Chromium, and a browser session left
//     behind by an earlier failed run (an agent's `*.browser.test.tsx` that
//     renders with `@testing-library/react` hangs and dies that way) made an
//     unrelated later run report "no tests" — an infrastructure answer, not
//     the agent's work, so such a run is retried once;
//   * every browser run gets its own TMPDIR and anything still holding it is
//     reaped afterwards, so a grader leaves no stray `headless_shell` behind
//     for the next one.
//
// The workspace-mutating graders (planting a bug, copying a hidden test in)
// also take a lock keyed on the workspace, so two grader processes over one
// workspace cannot plant a mutant while the other is running the hidden test.

const { execSync } = require("node:child_process");
const { existsSync, mkdtempSync, mkdirSync, readdirSync, rmSync, statSync, unlinkSync, writeFileSync } = require("node:fs");
const { createHash } = require("node:crypto");
const { tmpdir } = require("node:os");
const { dirname, join, resolve } = require("node:path");
const lib = require("./quality-lib");

// ---------------------------------------------------------------- running --

// The hidden acceptance test is copied into the workspace as
// `src/acceptance-<name>`. Three things keep that copy out of the agent's own
// suite, because no one of them is enough:
//
//   * the suite run excludes it by glob — spelled `.test.*` rather than the
//     shared helper's `.test.ts`, since this suite's hidden tests are `.tsx`.
//     Vitest applies that CLI exclude to the `browser` project (proven: the
//     copied browser acceptance test is not collected) but NOT to the `unit`
//     project, which sets an `exclude` of its own in the fixture config and so
//     overrides it;
//   * every grader that runs or mutates the workspace holds the lock below, so
//     the copy is on disk only while `behaviourDelivered` itself is running;
//   * and each locked run first sweeps away a copy left behind by a killed
//     process. The sweep only ever removes a file whose name is one this suite
//     copies in, so a test the agent happened to call `acceptance-*.test.tsx`
//     is safe.
const ACCEPTANCE = "acceptance-";
const acceptanceDir = () => resolve(__dirname, "tests", "react-testing", "acceptance");
const hiddenCopyNames = () => readdirSync(acceptanceDir()).map((name) => `${ACCEPTANCE}${name}`);
const isHiddenCopy = (file) => hiddenCopyNames().includes(lib.basename(file));
const SUITE = `pnpm exec vitest run --exclude '**/${ACCEPTANCE}*.test.*'`;

const sweepHiddenCopies = () => {
  for (const name of hiddenCopyNames()) {
    const stale = resolve(lib.workspace(), "src", name);
    if (existsSync(stale)) unlinkSync(stale);
  }
};

// Failures that say nothing about the agent's tests: a browser session that
// never came up, a browser that went away mid-run, or a collection that found
// nothing where there is something to find.
const TRANSIENT =
  /Failed to connect to the browser session|Failed to initialise|browser (?:session|has been) closed|Browser closed|close timed out after|Target (?:page|closed|crashed)|page\.goto|net::ERR|ECONNREFUSED|ECONNRESET|EADDRINUSE|No test files found/i;
// Only Playwright's own "the browser binary is not there" wording. It must NOT
// match pnpm's `. postinstall$ playwright install chromium` line, which
// `pnpm exec` echoes into the captured output of every run: matching that made
// an ordinary failure (a stylesheet the component imports having gone missing)
// report a missing browser instead of the error that actually happened.
const MISSING_BROWSER = /Executable doesn't exist|Looks like Playwright (?:Test )?was just installed|browserType\.launch:/i;
const BROWSER_HELP =
  "Chromium for the fixture's `browser` project is missing — `pnpm install` runs `playwright install chromium`; run it in the workspace";

const sleep = (ms) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
};

const reap = (scratch) => {
  try {
    execSync(`pkill -f ${scratch}`, { stdio: "ignore" });
  } catch {
    // nothing was still holding this run's TMPDIR
  }
  try {
    rmSync(scratch, { recursive: true, force: true });
  } catch {
    // best effort
  }
};

// Run a command in the workspace with its own TMPDIR (Playwright puts the
// browser profile there, so everything this run started can be reaped by that
// path afterwards), and retry once when the failure is the harness rather than
// the tests.
const runIsolated = (command, { timeout = 300_000, attempts = 2 } = {}) => {
  let last = { ok: false, out: "" };
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const scratch = mkdtempSync(join(tmpdir(), "react-testing-eval-"));
    try {
      const out = execSync(command, {
        cwd: lib.workspace(),
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, CI: "1", TMPDIR: scratch },
        timeout,
      });
      last = { ok: true, out };
    } catch (error) {
      last = { ok: false, out: `${error.stdout ?? ""}\n${error.stderr ?? ""}`.trim() };
    } finally {
      reap(scratch);
    }
    if (last.ok || !TRANSIENT.test(last.out)) return last;
    sleep(3_000);
  }
  return last;
};

// A failing run's reason has to name what actually failed: which test, and —
// preferred, because a run that died before collection has no failing test to
// name — why. Vitest's own "Tests …" line says how many, not why, and says
// nothing at all when the run never got as far as collecting (an import that
// will not resolve, a config error).
const WHICH = /^FAIL\b/;
const WHY =
  /Failed to resolve import|Cannot find (?:module|package|name)|^(?:Error|TypeError|ReferenceError|SyntaxError|AssertionError|Vitest failed)\b|\berror TS\d+|No test files found|Unhandled error/;

const reported = (out) =>
  out.split("\n").map((line) => line.replace(/\u001b\[[0-9;]*m/g, "").trim()).filter(Boolean);

const summarise = (result) => {
  if (result.ok) return lib.vitestSummary(result.out);
  const read = reported(result.out);
  const detail = [lib.vitestSummary(result.out), read.find((line) => WHICH.test(line)), read.find((line) => WHY.test(line))]
    .filter(Boolean)
    .map((part) => part.slice(0, 240))
    .join(" — ");
  return MISSING_BROWSER.test(result.out) ? `${BROWSER_HELP} (${detail})` : detail;
};

// One workspace, one mutator at a time. promptfoo runs assertions
// concurrently; in one process these graders are synchronous and cannot
// interleave, but two processes over the same workspace (a regrade beside a
// run) could, and a planted mutant or a copied hidden test would then be read
// as the agent's work.
const lockPath = () =>
  join(tmpdir(), `react-testing-eval-${createHash("sha1").update(lib.workspace()).digest("hex").slice(0, 12)}.lock`);
const STALE_LOCK_MS = 20 * 60_000;

// Whoever holds the lock leaves its pid inside it. A lock is stale when that
// process is gone — a grader killed mid-run (a timeout, a Ctrl-C) would
// otherwise block every later grader on this workspace until the age cut-off
// twenty minutes later, which is long enough to lose a whole eval run. The age
// cut-off stays as the answer for a lock whose pid cannot be read at all.
const holderIsGone = (path) => {
  let pid;
  try {
    pid = Number(lib.read(join(path, "pid")).trim());
  } catch {
    return false;
  }
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return error.code === "ESRCH";
  }
};

const withLock = (work) => {
  const path = lockPath();
  let held = false;
  for (let attempt = 0; attempt < 2_400 && !held; attempt += 1) {
    try {
      mkdirSync(path);
      writeFileSync(join(path, "pid"), String(process.pid));
      held = true;
    } catch {
      const age = (() => {
        try {
          return Date.now() - statSync(path).mtimeMs;
        } catch {
          return 0;
        }
      })();
      if (age > STALE_LOCK_MS || holderIsGone(path)) rmSync(path, { recursive: true, force: true });
      else sleep(500);
    }
  }
  try {
    return work();
  } finally {
    if (held) rmSync(path, { recursive: true, force: true });
  }
};

// ------------------------------------------------------- reading the tests --

const IGNORED_DIRECTORIES = new Set(["node_modules", ".git", ".claude", ".pnpm-store", "dist", "coverage"]);

// Every test file in the workspace, wherever the agent put it — `src/`,
// `src/__tests__/`, a `tests/` directory of its own — minus a hidden
// acceptance test that happens to be on disk while another grader runs it.
const allTests = () => {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true })
      .flatMap((entry) => {
        if (IGNORED_DIRECTORIES.has(entry.name)) return [];
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return walk(full);
        return /\.[jt]sx?$/.test(entry.name) ? [full] : [];
      });
  return walk(lib.workspace()).filter((file) => lib.isTestPath(file) && !isHiddenCopy(file));
};

// Test files the agent touched, located in the current workspace: trail paths
// name the run's own temp directory (regrade rebuilds the workspace
// elsewhere), and a Bash heredoc leaves no edit call at all, which the git
// status half of lib.touchedBy catches.
const touchedTests = (context) => {
  const touched = lib.touchedBy(context);
  return allTests().filter(touched);
};

// A test file with its comments blanked out. Every rule below is about what a
// test does, so a rule must never be decided by a sentence explaining what the
// test deliberately does not do ("no Object.defineProperty here"), a commented
// out line, or a licence header. Line structure is preserved so the code that
// remains still reads the same.
// A quote only opens a string when it closes on the same line. Without that
// rule an apostrophe inside a regular expression — `/doesn't look right/i`,
// which a test of this fixture's error text plausibly contains — would open a
// string that swallowed the code after it, and a rule could be decided on text
// the scanner never saw. Template literals legitimately span lines, so they
// keep the plain rule.
const opensString = (text, index) => {
  const char = text[index];
  if (char === "`") return true;
  if (char !== '"' && char !== "'") return false;
  const lineEnd = text.indexOf("\n", index + 1);
  const line = text.slice(index + 1, lineEnd === -1 ? text.length : lineEnd);
  return line.includes(char);
};

const codeOf = (text) => {
  let out = "";
  let quote = null;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quote !== null) {
      out += char;
      if (char === "\\") {
        out += next ?? "";
        index += 1;
      } else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end - 1;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      const skipped = text.slice(index, end === -1 ? text.length : end + 2);
      out += skipped.replace(/[^\n]/g, "");
      index = end === -1 ? text.length : end + 1;
      continue;
    }
    if (opensString(text, index)) quote = char;
    out += char;
  }
  return out;
};

const source = (file) => codeOf(lib.read(file));

const list = (files) => files.map((file) => lib.basename(file)).join(", ") || "(none)";
const noTests = () => lib.verdict(false, "the agent wrote or edited no test file");

const BROWSER_HARNESS = /["'](vitest-browser-react|vitest\/browser|@vitest\/browser)["']/;
// Something a person does to a control: a Browser Mode locator event, a
// user-event call, or either library's `user.<verb>()`.
const INTERACTION = /\buserEvent\b|\buser\.\w+\s*\(|\.(click|fill|type|selectOptions|clear|keyboard)\s*\(/;
const usesBrowserHarness = (file) => BROWSER_HARNESS.test(source(file));
const rendersComponent = (file) => /\brender\s*\(/.test(source(file));

const smellsIn = (files, patterns) =>
  files.flatMap((file) => {
    const text = source(file);
    return patterns
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.basename(file)}: ${label}`);
  });

// Which files a Vitest project actually collects, asked of Vitest rather than
// guessed from the path, so a project renamed or re-globbed by the agent is
// still read correctly.
const filesInProject = (project) => {
  const result = runIsolated(`pnpm exec vitest list --filesOnly --project ${project}`, { timeout: 180_000 });
  if (!result.ok) return [];
  return result.out
    .split("\n")
    .map((line) => line.replace(/^\[[^\]]*\]\s*/, "").trim())
    .filter((line) => /\.[jt]sx?$/.test(line))
    .map((line) => resolve(lib.workspace(), line));
};

// ------------------------------------------------------------- source scan --

// The text a call actually carries: its own argument list, from the "(" that
// opens it to the parenthesis that closes it, with strings, template literals
// and comments skipped so a bracket inside text cannot unbalance the scan.
// Anything after that closing parenthesis belongs to the rest of the file, not
// to this call — reading a fixed-size window instead once made a legal
// `renderHook` + `act` test fail because the NEXT `it(...)` block's
// `renderHook(` sat inside the window. If the parentheses never close (a
// half-written file), stop at the next test-block boundary rather than running
// on to the end of the file.
const nextBlockBoundary = (text, from) => {
  const match = /\b(it|test|describe)\s*(\.\w+)?\s*\(/.exec(text.slice(from));
  return match === null ? text.length : from + match.index;
};

const argumentListAt = (text, open) => {
  let depth = 0;
  let quote = null;
  for (let index = open; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quote !== null) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      const end = text.indexOf("\n", index);
      index = end === -1 ? text.length : end;
      continue;
    }
    if (char === "/" && next === "*") {
      const end = text.indexOf("*/", index + 2);
      index = end === -1 ? text.length : end + 1;
      continue;
    }
    if (opensString(text, index)) quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open, index + 1);
    }
  }
  return text.slice(open, nextBlockBoundary(text, open + 1));
};

// Every call of `<object>.<method>(` in a file, with the balanced argument
// list each one carries.
const callsTo = (text, pattern) =>
  [...text.matchAll(pattern)].map((match) => ({
    match,
    args: argumentListAt(text, match.index + match[0].length - 1),
  }));

const stringLiteralsIn = (text) =>
  [...text.matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|`([^`\\$]*)`/g)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter((value) => value !== undefined && value !== "");

// A module specifier a test mocks, resolved to a file in the workspace: the
// fact that matters is "one of the app's own modules", not how the specifier
// was spelled.
const MODULE_SUFFIXES = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index.js", "/index.jsx"];

const resolveAppModule = (fromFile, specifier) => {
  const bare = specifier.replace(/[?#].*$/, "");
  const candidates = bare.startsWith(".")
    ? [resolve(dirname(fromFile), bare)]
    : bare.startsWith("/")
      ? [resolve(lib.workspace(), `.${bare}`), bare]
      : [
          resolve(lib.workspace(), "src", bare.replace(/^(@|~|#)\//, "").replace(/^src\//, "")),
          resolve(lib.workspace(), bare.replace(/^(@|~|#)\//, "")),
        ];
  for (const candidate of candidates) {
    for (const suffix of MODULE_SUFFIXES) {
      const full = `${candidate}${suffix}`;
      if (existsSync(full) && statSync(full).isFile()) return full;
    }
  }
  return null;
};

const isRelative = (specifier) => /^\.{1,2}\//.test(specifier);

// ------------------------------------------------------------------ rules --

// 1. front-end-testing, Query Selection Priority: "`getByRole` - Highest
//    priority", "`getByTestId` - Last resort only; not user-facing", and the
//    Common Mistakes block: "❌ WRONG - querySelector (DOM implementation
//    detail)", "❌ WRONG - testId when a role is available (not how users find
//    the button)".
exports.accessibleQueries = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const smells = smellsIn(files, [
    [/\b(get|query|find)(All)?ByTestId\s*\(/, "queries by test id"],
    [/["'`]data-testid/, "reaches for a data-testid attribute"],
    [/\.querySelector(All)?\s*\(/, "queries the DOM with a CSS selector"],
    [/\.(className|classList)\b/, "selects or asserts on a CSS class"],
  ]);
  if (smells.length > 0) return lib.verdict(false, smells.join("; "));
  const rendering = files.filter(rendersComponent);
  if (rendering.length === 0) return lib.verdict(true, `no component query to check (${list(files)})`);
  const withoutAccessible = rendering.filter(
    (file) => !/\b(get|query|find)(All)?By(Role|LabelText|Text|PlaceholderText|Placeholder|AltText|DisplayValue|Title)\s*\(/.test(source(file)),
  );
  if (withoutAccessible.length > 0) return lib.verdict(false, `no accessible query in ${list(withoutAccessible)}`);
  // `getByRole` tops the priority list, but the list is a priority, not a
  // requirement: a component that renders text and no control offers no role
  // to query, and `getByText`/`getByTitle` are then the top of the list that
  // applies. Only a file that drives a control — which is a control precisely
  // because it has a role — must have found it by role.
  const driving = rendering.filter((file) => INTERACTION.test(source(file)));
  if (driving.length === 0) return lib.verdict(true, `accessible queries, no control to find by role (${list(rendering)})`);
  const withoutRole = driving.filter((file) => !/\b(get|query|find)(All)?ByRole\s*\(/.test(source(file)));
  return lib.verdict(withoutRole.length === 0, withoutRole.length === 0 ? `role and accessible-name queries in ${list(driving)}` : `drives a control it did not find by role: ${list(withoutRole)}`);
};

// 2. front-end-testing checklist: "Using `userEvent` for interactions
//    (CDP-based in Browser Mode, or `@testing-library/user-event`)" — and
//    "prefer it over `fireEvent` for user interactions".
exports.userEventNotFireEvent = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const smells = smellsIn(files, [
    [/\bfireEvent\b/, "drives the component with fireEvent"],
    [/\.dispatchEvent\s*\(/, "dispatches a raw DOM event"],
    [/\bSimulate\./, "uses react-dom test-utils Simulate"],
  ]);
  if (smells.length > 0) return lib.verdict(false, smells.join("; "));
  // The rule is about *how* a component is driven, not whether it is: a
  // component with nothing to drive (a title that only renders text) breaks no
  // rule by asserting on what it renders. The raw-event smells above are what
  // this grader exists to catch.
  const interacting = files.filter((file) => INTERACTION.test(source(file)));
  return lib.verdict(true, interacting.length > 0 ? `user-driven interactions in ${list(interacting)}` : `no raw events; nothing to drive (${list(files)})`);
};

// 3. react-testing anti-pattern 3, Shallow rendering: "❌ WRONG … Child
//    components not rendered - incomplete test … Why: Shallow rendering hides
//    integration bugs between parent/child components." A module mock of a
//    child component is the same hole by another name, and front-end-testing's
//    Browser Mode gotchas say the same of module mocking generally: "treat
//    module mocking as temporary scaffolding — prefer parameter injection".
//
//    Every spelling of the same fact counts, because the fact is "the child
//    was replaced", not the shape of the first argument: the string form
//    `vi.mock("./TaskRow", …)`, Vitest's documented type-safe form
//    `vi.mock(import("./TaskRow"), …)`, `vi.doMock(await import(…))`, an alias
//    or workspace-root specifier, `jest.mock`, a namespace import spied on,
//    and enzyme-style `shallow()`.
const MOCK_CALLS = /\b(?:vi|vitest|jest)\s*\.\s*(?:mock|doMock|unstable_mockModule)\s*\(/g;
const NAMESPACE_IMPORTS = /import\s*\*\s*as\s+(\w+)\s*from\s*["']([^"']+)["']/g;

const mockedAppModules = (file) => {
  const text = source(file);
  const mocked = callsTo(text, MOCK_CALLS).flatMap(({ args }) =>
    stringLiteralsIn(args)
      .map((specifier) => ({ specifier, resolved: resolveAppModule(file, specifier) }))
      .filter(({ specifier, resolved }) => resolved !== null || isRelative(specifier))
      .map(({ specifier, resolved }) => (resolved === null ? specifier : lib.rel(resolved))),
  );
  const spied = [...text.matchAll(NAMESPACE_IMPORTS)]
    .filter(([, binding, specifier]) => {
      const resolved = resolveAppModule(file, specifier);
      return (resolved !== null || isRelative(specifier)) && new RegExp(`\\bvi\\.spyOn\\s*\\(\\s*${binding}\\b`).test(text);
    })
    .map(([, , specifier]) => `${specifier} (spied through its module namespace)`);
  return [...new Set([...mocked, ...spied])];
};

exports.noMockedChildComponents = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const mocks = files.flatMap((file) =>
    mockedAppModules(file).map((module) => `${lib.basename(file)}: replaces the app's own ${module} instead of rendering it`),
  );
  const shallow = smellsIn(files, [
    [/\bshallow\s*\(/, "shallow renders"],
    [/["']enzyme["']/, "imports enzyme"],
  ]);
  const smells = [...mocks, ...shallow];
  return lib.verdict(smells.length === 0, smells.length === 0 ? `whole tree rendered in ${list(files)}` : smells.join("; "));
};

// 4. react-testing checklist: "Using `renderHook()` for custom hooks, with its
//    returned `act` for state updates." A test that imports a hook module must
//    exercise it through renderHook, not call it or reimplement it.
exports.hooksThroughRenderHook = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const hookModules = lib
    .sourceFiles(resolve(lib.workspace(), "src"))
    .filter((file) => !lib.isTestPath(file) && /^use[A-Z]/.test(lib.basename(file)));
  const hookNames = hookModules.map((file) => lib.basename(file).replace(/\.[jt]sx?$/, ""));
  const importers = files.filter((file) =>
    lib.importsOf(source(file)).some((spec) => hookNames.includes(lib.basename(spec).replace(/\.[jt]sx?$/, ""))),
  );
  if (importers.length === 0) return lib.verdict(true, `no test imports a hook directly (${list(files)})`);
  const without = importers.filter((file) => !/\brenderHook\s*\(/.test(source(file)));
  return lib.verdict(without.length === 0, without.length === 0 ? `hooks exercised through renderHook: ${list(importers)}` : `imports a hook but never calls renderHook: ${list(without)}`);
};

// 5. react-testing anti-pattern 1: "❌ WRONG - Manual act() around renders and
//    interactions … ✅ CORRECT - Locator events handle timing". The act()
//    returned by renderHook for hook state updates is the documented exception
//    ("When you DO need `act()`: hook state updates via `renderHook`"), so only
//    what a single act() call wraps is read, and a hook update driven through
//    `result.current` stays legal even when its method shares a name with a
//    locator event.
exports.noManualActAroundInteractions = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const wrapped = /\b(render\s*\(|renderHook\s*\(|userEvent\.|user\.\w+\s*\(|(?<!result\.current)\.(click|fill|type|selectOptions|clear|keyboard)\s*\()/;
  const smells = files.flatMap((file) => {
    const text = source(file);
    return callsTo(text, /\bact\s*\(/g)
      .filter(({ args }) => wrapped.test(args))
      .map(() => `${lib.basename(file)}: act() wrapped around a render or an interaction`);
  });
  return lib.verdict(smells.length === 0, smells.length === 0 ? `no act() gymnastics in ${list(files)}` : [...new Set(smells)].join("; "));
};

// 6. Case rule (browser-observable claim). react-testing: "Prefer
//    `vitest-browser-react` when the claim depends on real rendering, events,
//    focus, CSS, accessibility, or browser APIs and the repository supports the
//    harness"; front-end-testing checklist: "The harness fits the claim … Browser
//    Mode for browser-observable behavior". The fixture supports it: a `browser`
//    Vitest project is configured and its dependencies are installed. Vitest is
//    asked which files that project actually collects, so a test that imports
//    the browser harness but never runs there does not count.
exports.browserHarnessForBrowserClaim = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const harness = files.filter(usesBrowserHarness);
  if (harness.length === 0) return lib.verdict(false, `no touched test uses the browser harness (${list(files)})`);
  const collected = filesInProject("browser");
  const running = harness.filter((file) => collected.some((candidate) => lib.sameFile(candidate, file)));
  return lib.verdict(running.length > 0, running.length > 0 ? `browser-mode tests running in Chromium: ${list(running)}` : `browser harness imported but no such test is collected by the browser project: ${list(harness)}`);
};

// 7. Case rule (a claim the environment cannot fake). front-end-testing, "Why
//    Browser Mode Over jsdom": CSS is "Not rendered" under jsdom against "Real
//    CSS rendering, layout, computed styles" in Browser Mode, and "Prefer
//    Vitest Browser Mode when the claim depends on real rendering, CSS,
//    events, focus management, accessibility, or browser APIs". Redefining a
//    layout measurement or a browser global so jsdom answers a layout question
//    is the shortcut that rule exists to prevent, and it asserts on the
//    environment rather than on "behavior users see, not implementation
//    details — this applies in every environment".
//
//    What is graded is the fake, not one spelling of it: the measurement can be
//    redefined on the element, on `HTMLElement.prototype`, on a prototype
//    reached through `Object.getPrototypeOf(...)`, through a getter spy, an
//    object literal, or a stubbed global, and each of those names either a
//    layout measurement or a browser global inside the call that does it.
const LAYOUT_MEASUREMENT =
  /\b(scrollWidth|clientWidth|offsetWidth|scrollHeight|clientHeight|offsetHeight|offsetLeft|offsetTop|scrollLeft|scrollTop|getBoundingClientRect|getClientRects|getComputedStyle|innerWidth|innerHeight)\b/;
const BROWSER_GLOBAL =
  /\b(window|globalThis|global|document|navigator|HTMLElement|HTMLSpanElement|HTMLInputElement|HTMLDivElement|Element|Node|SVGElement|CSSStyleDeclaration|ResizeObserver|IntersectionObserver|matchMedia)\b/;

const fakesIn = (file) => {
  const text = source(file);
  const found = [];
  const define = callsTo(text, /\b(?:Object\.defineProperty|Object\.defineProperties|Reflect\.defineProperty|Object\.assign)\s*\(/g).filter(
    ({ args }) => LAYOUT_MEASUREMENT.test(args) || BROWSER_GLOBAL.test(args),
  );
  if (define.length > 0) found.push("redefines a DOM property instead of letting the browser answer it");
  if (/\bObject\.getPrototypeOf\s*\(|\b__proto__\b/.test(text)) found.push("reaches for an element's prototype");
  if (/\b(HTMLElement|HTMLSpanElement|HTMLDivElement|HTMLInputElement|Element|Node|SVGElement)\.prototype\b/.test(text))
    found.push("patches an element prototype");
  // front-end-testing documents one spy on a browser global as the right
  // answer — "`alert()`/`confirm()`: … Mock them with `vi.spyOn(window,
  // 'alert')`" — so a dialog spy is not a faked measurement.
  const spies = callsTo(text, /\b(?:vi|vitest|jest)\s*\.\s*spyOn\s*\(/g).filter(
    ({ args }) =>
      (LAYOUT_MEASUREMENT.test(args) || BROWSER_GLOBAL.test(args)) &&
      !(/\b(alert|confirm|prompt)\b/.test(args) && !LAYOUT_MEASUREMENT.test(args)),
  );
  if (spies.length > 0) found.push("spies on a layout measurement or a browser global");
  if (/\.(scrollWidth|clientWidth|offsetWidth|scrollHeight|clientHeight|offsetHeight|getBoundingClientRect)\s*=[^=]/.test(text))
    found.push("assigns a layout measurement");
  if (/(^|[{,\s])(get\s+)?(scrollWidth|clientWidth|offsetWidth|scrollHeight|clientHeight|offsetHeight)\s*[:(]/m.test(text))
    found.push("declares a layout measurement of its own");
  if (/\bvi\.stubGlobal\s*\(/.test(text)) found.push("stubs a browser global");
  if (/\b(matchMedia|ResizeObserver|IntersectionObserver)\s*[:=][^=]/.test(text)) found.push("fakes a browser API");
  const react = callsTo(text, /\b(?:vi|vitest|jest)\s*\.\s*(?:mock|doMock)\s*\(/g).filter(({ args }) =>
    stringLiteralsIn(args).some((specifier) => /^react(-dom)?(\/|$)/.test(specifier)),
  );
  if (react.length > 0) found.push("replaces React itself");
  return found.map((label) => `${lib.basename(file)}: ${label}`);
};

exports.noFakedLayoutOrEnvironment = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const smells = files.flatMap(fakesIn);
  return lib.verdict(smells.length === 0, smells.length === 0 ? `nothing faked; the harness answers the claim itself (${list(files)})` : smells.join("; "));
};

// 8. testing skill, mutation rule: "A good test should fail if a realistic
//    mutant changes the behavior." Each case names the bugs to plant
//    (vars.mutants); every one must turn the agent's suite red. Each mutant is
//    a bug a person could ship, and is chosen so that any test that covers the
//    behaviour the request describes catches it whatever data the test made up
//    — a mutant that only some fixtures expose would grade the agent's choice
//    of test data instead of its tests, and a mutant only one assertion style
//    reaches (identity but not counts, or the other way round) would grade the
//    style. Where a mutant lives decides what it can measure: a bug in the
//    component the request names is caught by every honest test of it, so at
//    least one bug per case sits where the case's own temptation would hide it
//    — the stylesheet only real CSS applies for case 1, the child component a
//    stand-in replaces for case 2, the layout only a real browser measures for
//    case 3.
const MUTANTS = {
  // The email rule stops looking for a domain: "alice@example" is accepted.
  "email-pattern": {
    file: "src/components/SubscribeForm.tsx",
    from: /!EMAIL_PATTERN\.test\(email\.trim\(\)\)/,
    to: '!email.trim().includes("@")',
  },
  // One invalid field is no longer enough to stop the submission.
  "submits-with-errors": {
    file: "src/components/SubscribeForm.tsx",
    from: /invalidFields\.length > 0/,
    to: "invalidFields.length > 1",
  },
  // The cursor is not sent back to the field that needs fixing.
  "no-focus-on-error": {
    file: "src/components/SubscribeForm.tsx",
    from: /firstInvalid\?\.focus\(\)/,
    to: "firstInvalid?.blur()",
  },
  // A stylesheet regression stops the boxes being drawn at all: nobody can
  // type in them and the cursor cannot land in one. Real CSS is applied in the
  // browser project and stubbed out under jsdom, so only a test that runs
  // where the claim lives sees it.
  "boxes-not-rendered": {
    file: "src/components/SubscribeForm.css",
    from: /display: block;/,
    to: "display: none;",
  },
  // The status filter is ignored: every task stays on the board whichever
  // button is pressed.
  "status-filter-ignored": {
    file: "src/hooks/useVisibleTasks.ts",
    from: /task\.status === status/,
    to: "true",
  },
  "empty-state-hidden": {
    file: "src/components/TaskBoard.tsx",
    from: /visible\.length === 0/,
    to: "visible.length < 0",
  },
  // The row itself draws nothing: the board still decides which tasks are
  // showing, and none of them reaches the screen. This is the integration bug
  // between parent and child that anti-pattern 3 is about ("Shallow rendering
  // hides integration bugs between parent/child components"), so it is the
  // one case-2 bug that lives in the child rather than in the board. A test
  // that renders the whole tree fails on it however it asserts — no list item
  // is left to count and no title is left to read — while a test that stands
  // something in for the row, by module mock or by injecting a replacement,
  // never loads the file the bug is in.
  "rows-not-rendered": {
    file: "src/components/TaskRow.tsx",
    from: /return \(\s*<li className="task-row"/,
    to: 'return null;\n\n  return (\n    <li className="task-row"',
  },
  "count-ignores-filter": {
    file: "src/components/TaskBoard.tsx",
    from: /describeCount\(visible\.length, tasks\.length\)/,
    to: "describeCount(tasks.length, tasks.length)",
  },
  // A title is never counted as cut off, so the hover text never appears.
  // jsdom reports 0 for both measurements, so only a real browser sees this.
  "tooltip-never-clipped": {
    file: "src/components/TaskTitle.tsx",
    from: /element\.scrollWidth > element\.clientWidth/,
    to: "element.scrollWidth < element.clientWidth",
  },
  // Every title carries the hover text, cut off or not.
  "tooltip-always": {
    file: "src/components/TaskTitle.tsx",
    from: /title=\{clipped \? title : undefined\}/,
    to: "title={title}",
  },
  // The hover text is there but empty, so the full title still cannot be read.
  "tooltip-empty": {
    file: "src/components/TaskTitle.tsx",
    from: /title=\{clipped \? title : undefined\}/,
    to: 'title={clipped ? "" : undefined}',
  },
};

// Every occurrence, so a bug planted in one of a pair of identical lines
// cannot be missed by a test that happens to read the other one.
const plant = (original, mutant) => original.replace(new RegExp(mutant.from.source, "g"), mutant.to);

const runSuite = () => {
  sweepHiddenCopies();
  return runIsolated(SUITE);
};

exports.testsCatchPlantedBugs = (output, context) => {
  const names = String(context?.vars?.mutants ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return lib.verdict(false, "test case has no vars.mutants");
  if (touchedTests(context).length === 0) return noTests();
  return withLock(() => {
    const baseline = runSuite();
    if (!baseline.ok) return lib.verdict(false, `suite is not green before any bug is planted: ${summarise(baseline)}`);
    const outcomes = names.map((name) => {
      const mutant = MUTANTS[name];
      if (!mutant) return `${name}: unknown mutant`;
      const file = resolve(lib.workspace(), mutant.file);
      if (!existsSync(file)) return `${name}: ${mutant.file} is gone (the component was rewritten)`;
      const original = lib.read(file);
      if (!mutant.from.test(original)) return `${name}: mutation site missing from ${mutant.file} (the component was rewritten)`;
      writeFileSync(file, plant(original, mutant));
      try {
        const result = runSuite();
        return result.ok ? `${name}: survived (no test failed)` : null;
      } finally {
        writeFileSync(file, original);
      }
    });
    const survivors = outcomes.filter(Boolean);
    return lib.verdict(survivors.length === 0, survivors.length === 0 ? `every planted bug caught: ${names.join(", ")}` : survivors.join("; "));
  });
};

// Regression guard rather than a measure of the agent's tests: every request
// asks only for tests, so the hidden acceptance test already passes on the
// untouched fixture. It fails when the agent changed a component to make a
// test easier and broke the behaviour the product owner described. The
// behaviour weight of this suite therefore sits on testsCatchPlantedBugs.
//
// Its own copy of `lib.runAcceptance`, because this suite's hidden tests are
// `.tsx` (the shared helper's suite glob would leave the copy running inside
// the agent's suite) and because the copy has to be exclusive: a mutant
// planted by another grader process would otherwise be read as the agent's
// component.
exports.behaviourDelivered = (output, context) => {
  const name = context?.vars?.acceptance;
  if (typeof name !== "string" || name === "") return lib.verdict(false, "test case has no vars.acceptance");
  const source = resolve(__dirname, "tests", "react-testing", "acceptance", name);
  const target = resolve(lib.workspace(), "src", `${ACCEPTANCE}${name}`);
  return withLock(() => {
    writeFileSync(target, lib.read(source));
    try {
      const result = runIsolated(`pnpm exec vitest run src/${ACCEPTANCE}${name}`);
      return lib.verdict(result.ok, summarise(result));
    } finally {
      if (existsSync(target)) unlinkSync(target);
    }
  });
};

// Shared rule, suite-local plumbing: the agent's own suite must pass. The
// hidden acceptance test is excluded by `.test.*` rather than the shared
// helper's `.test.ts`, since this suite's hidden tests are `.tsx` and would
// otherwise run — and pass or fail — inside the agent's suite.
exports.suiteGreen = () =>
  withLock(() => {
    const result = runSuite();
    return lib.verdict(result.ok, summarise(result));
  });

exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
