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
// Nothing assumes a folder layout: tests are found by name anywhere under
// src/, and which Vitest project a test belongs to is asked of Vitest itself
// (`vitest list --filesOnly --project <name>`) rather than inferred from the
// file's path.
//
// The fixture's `browser` project needs a real Chromium. The fixture installs
// it itself: `pnpm install` runs `playwright install chromium`, so the
// `pnpm install --frozen-lockfile` run-quality.sh already performs provisions
// the browser on any host, and an offline host fails loudly at install time
// rather than silently failing the browser project mid-eval.

const { writeFileSync } = require("node:fs");
const { resolve } = require("node:path");
const lib = require("./quality-lib");

const srcDir = () => resolve(lib.workspace(), "src");
const allTests = () => lib.sourceFiles(srcDir()).filter(lib.isTestPath);

// Test files the agent touched, located in the current workspace: trail paths
// name the run's own temp directory (regrade rebuilds the workspace
// elsewhere), and a Bash heredoc leaves no edit call at all, which the git
// status half of lib.touchedBy catches.
const touchedTests = (context) => {
  const touched = lib.touchedBy(context);
  return allTests().filter(touched);
};

const list = (files) => files.map((file) => lib.basename(file)).join(", ") || "(none)";
const noTests = () => lib.verdict(false, "the agent wrote or edited no test file");

const BROWSER_HARNESS = /["'](vitest-browser-react|vitest\/browser|@vitest\/browser)["']/;
// Something a person does to a control: a Browser Mode locator event, a
// user-event call, or either library's `user.<verb>()`.
const INTERACTION = /\buserEvent\b|\buser\.\w+\s*\(|\.(click|fill|type|selectOptions|clear|keyboard)\s*\(/;
const usesBrowserHarness = (file) => BROWSER_HARNESS.test(lib.read(file));
const rendersComponent = (file) => /\brender\s*\(/.test(lib.read(file));

const smellsIn = (files, patterns) =>
  files.flatMap((file) => {
    const text = lib.read(file);
    return patterns
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.basename(file)}: ${label}`);
  });

// Which files a Vitest project actually collects, asked of Vitest rather than
// guessed from the path, so a project renamed or re-globbed by the agent is
// still read correctly.
const filesInProject = (project) => {
  const result = lib.run(`pnpm exec vitest list --filesOnly --project ${project}`);
  if (!result.ok) return [];
  return result.out
    .split("\n")
    .map((line) => line.replace(/^\[[^\]]*\]\s*/, "").trim())
    .filter((line) => /\.[jt]sx?$/.test(line))
    .map((line) => resolve(lib.workspace(), line));
};

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
    (file) => !/\b(get|query|find)(All)?By(Role|LabelText|Text|PlaceholderText|Placeholder|AltText|DisplayValue|Title)\s*\(/.test(lib.read(file)),
  );
  if (withoutAccessible.length > 0) return lib.verdict(false, `no accessible query in ${list(withoutAccessible)}`);
  // `getByRole` tops the priority list, but the list is a priority, not a
  // requirement: a component that renders text and no control offers no role
  // to query, and `getByText`/`getByTitle` are then the top of the list that
  // applies. Only a file that drives a control — which is a control precisely
  // because it has a role — must have found it by role.
  const driving = rendering.filter((file) => INTERACTION.test(lib.read(file)));
  if (driving.length === 0) return lib.verdict(true, `accessible queries, no control to find by role (${list(rendering)})`);
  const withoutRole = driving.filter((file) => !/\b(get|query|find)(All)?ByRole\s*\(/.test(lib.read(file)));
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
  const interacting = files.filter((file) => INTERACTION.test(lib.read(file)));
  return lib.verdict(true, interacting.length > 0 ? `user-driven interactions in ${list(interacting)}` : `no raw events; nothing to drive (${list(files)})`);
};

// 3. react-testing anti-pattern 3, Shallow rendering: "❌ WRONG … Child
//    components not rendered - incomplete test … Why: Shallow rendering hides
//    integration bugs between parent/child components." A module mock of a
//    child component is the same hole by another name.
exports.noMockedChildComponents = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const smells = smellsIn(files, [
    [/\bvi\.(mock|doMock)\s*\(\s*["']\.{1,2}\//, "mocks one of the app's own modules"],
    [/\bjest\.mock\s*\(/, "jest.mock"],
    [/\bshallow\s*\(/, "shallow renders"],
  ]);
  return lib.verdict(smells.length === 0, smells.length === 0 ? `whole tree rendered in ${list(files)}` : smells.join("; "));
};

// 4. react-testing checklist: "Using `renderHook()` for custom hooks, with its
//    returned `act` for state updates." A test that imports a hook module must
//    exercise it through renderHook, not call it or reimplement it.
exports.hooksThroughRenderHook = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const hookModules = lib
    .sourceFiles(srcDir())
    .filter((file) => !lib.isTestPath(file) && /^use[A-Z]/.test(lib.basename(file)));
  const hookNames = hookModules.map((file) => lib.basename(file).replace(/\.[jt]sx?$/, ""));
  const importers = files.filter((file) =>
    lib.importsOf(lib.read(file)).some((spec) => hookNames.includes(lib.basename(spec).replace(/\.[jt]sx?$/, ""))),
  );
  if (importers.length === 0) return lib.verdict(true, `no test imports a hook directly (${list(files)})`);
  const without = importers.filter((file) => !/\brenderHook\s*\(/.test(lib.read(file)));
  return lib.verdict(without.length === 0, without.length === 0 ? `hooks exercised through renderHook: ${list(importers)}` : `imports a hook but never calls renderHook: ${list(without)}`);
};

// The text an `act(` call actually wraps: its own argument list, from the "("
// that follows `act` to the parenthesis that closes it, with string and
// template literals skipped so a bracket inside a string cannot unbalance the
// scan. Anything after that closing parenthesis belongs to the rest of the
// test file, not to this call — reading a fixed-size window instead once made a
// legal `renderHook` + `act` test fail because the NEXT `it(...)` block's
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
    if (quote !== null) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return text.slice(open, index + 1);
    }
  }
  return text.slice(open, nextBlockBoundary(text, open + 1));
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
    const text = lib.read(file);
    return [...text.matchAll(/\bact\s*\(/g)]
      .filter((match) => wrapped.test(argumentListAt(text, match.index + match[0].length - 1)))
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
exports.noFakedLayoutOrEnvironment = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const smells = smellsIn(files, [
    [/\bObject\.defineProperty\s*\(/, "redefines a DOM property instead of letting the browser answer"],
    [/\.(scrollWidth|clientWidth|offsetWidth|offsetHeight|scrollHeight|clientHeight)\s*=[^=]/, "assigns a layout measurement"],
    [/\bgetBoundingClientRect\s*=/, "replaces getBoundingClientRect"],
    [/\b(HTMLElement|Element|HTMLSpanElement)\.prototype\b/, "patches an element prototype"],
    [/\bvi\.(stubGlobal|spyOn)\s*\(\s*(window|globalThis|document|HTMLElement|Element)\b/, "stubs a browser global"],
    [/\bmatchMedia\s*[:=][^=]/, "fakes matchMedia"],
  ]);
  return lib.verdict(smells.length === 0, smells.length === 0 ? `nothing faked; the harness answers the claim itself (${list(files)})` : smells.join("; "));
};

// 8. testing skill, mutation rule: "A good test should fail if a realistic
//    mutant changes the behavior." Each case names the bugs to plant
//    (vars.mutants); every one must turn the agent's suite red.
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
  "status-filter-inverted": {
    file: "src/hooks/useVisibleTasks.ts",
    from: /task\.status === status/,
    to: "task.status !== status",
  },
  "empty-state-hidden": {
    file: "src/components/TaskBoard.tsx",
    from: /visible\.length === 0/,
    to: "visible.length < 0",
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
const SUITE = "pnpm exec vitest run --exclude '**/acceptance-*.test.ts'";

exports.testsCatchPlantedBugs = (output, context) => {
  const names = String(context?.vars?.mutants ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return lib.verdict(false, "test case has no vars.mutants");
  if (touchedTests(context).length === 0) return noTests();
  const baseline = lib.run(SUITE, { timeout: 300_000 });
  if (!baseline.ok) return lib.verdict(false, `suite is not green before any bug is planted: ${lib.vitestSummary(baseline.out)}`);
  const outcomes = names.map((name) => {
    const mutant = MUTANTS[name];
    if (!mutant) return `${name}: unknown mutant`;
    const file = resolve(lib.workspace(), mutant.file);
    const original = lib.read(file);
    if (!mutant.from.test(original)) return `${name}: mutation site missing from ${mutant.file} (the component was rewritten)`;
    writeFileSync(file, original.replace(mutant.from, mutant.to));
    try {
      const result = lib.run(SUITE, { timeout: 300_000 });
      return result.ok ? `${name}: survived (no test failed)` : null;
    } finally {
      writeFileSync(file, original);
    }
  });
  const survivors = outcomes.filter(Boolean);
  return lib.verdict(survivors.length === 0, survivors.length === 0 ? `every planted bug caught: ${names.join(", ")}` : survivors.join("; "));
};

// Regression guard rather than a measure of the agent's tests: every request
// asks only for tests, so the hidden acceptance test already passes on the
// untouched fixture. It fails when the agent changed a component to make a
// test easier and broke the behaviour the product owner described. The
// behaviour weight of this suite therefore sits on testsCatchPlantedBugs.
exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "react-testing", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
