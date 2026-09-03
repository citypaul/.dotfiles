// Deterministic graders for the front-end-testing quality suite.
//
// The fixture (fixtures/front-end-testing-workspace) is a plain-DOM TypeScript
// storefront that declares it covers its UI with behaviour-driven front-end
// tests and shows none: its only test file is a pure-money unit test, so no
// query style, no API-mocking approach and no harness choice is demonstrated.
// Both harnesses are installed and wired (Vitest + jsdom over src/**/*.test.ts,
// Playwright over e2e/**/*.spec.ts against scripts/serve.mjs), and MSW is in
// the lockfile, so the skill — not the fixture — has to say which harness a
// claim needs, how elements are found, and where the network is observed.
//
// Nothing here assumes where the agent put a file: test files are found in the
// current workspace (trail paths name the run's own temp directory, which
// regrade rebuilds elsewhere) and filtered by lib.touchedBy, which unions the
// tool-call trail with git status so a Bash heredoc still counts. Every rule
// graded is one the skill states as a rule; the comment above each grader
// quotes it.

const { readdirSync, statSync } = require("node:fs");

const lib = require("./quality-lib");

const CODE_DIRS = ["src", "e2e", "tests", "test", "mocks", "test-support"];
const isSpecPath = (file) => /\.(test|spec)\.[jt]sx?$/.test(file);

// Every source file the agent could have written a test in, plus the root
// config/setup files (vitest.setup.ts, vitest.config.ts) an MSW server usually
// lives in. The mounted .claude/skills copy and the built output are not code
// the agent wrote.
const codeFiles = () => {
  const dirs = CODE_DIRS.flatMap((dir) => lib.sourceFiles(lib.resolve(lib.workspace(), dir)));
  const roots = readdirSync(lib.workspace())
    .filter((entry) => /\.[cm]?[jt]sx?$/.test(entry))
    .map((entry) => lib.resolve(lib.workspace(), entry))
    .filter((file) => statSync(file).isFile());
  return [...new Set([...dirs, ...roots])].filter((file) => !/\/(node_modules|dist-web)\//.test(file));
};

const touchedFiles = (context) => {
  const touched = lib.touchedBy(context);
  return codeFiles().filter(touched);
};
// The hidden acceptance test is copied in and deleted by runAcceptance; it is
// never the agent's work, so it never counts as a touched test.
const touchedTests = (context) =>
  touchedFiles(context).filter((file) => isSpecPath(file) && !/acceptance-/.test(lib.basename(file)));

const isPlaywright = (file) => /@playwright\/test/.test(lib.read(file));
const playwrightTests = (context) => touchedTests(context).filter(isPlaywright);
const domTests = (context) => touchedTests(context).filter((file) => !isPlaywright(file));

const list = (files) => files.map((file) => lib.rel(file)).join(", ") || "(none)";
const noTests = () => lib.verdict(false, "the agent wrote or edited no test file");

// Report every (file, label) pair whose pattern matches.
const hits = (files, checks) =>
  files.flatMap((file) => {
    const text = lib.read(file);
    return checks.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`);
  });

// 1. "The harness fits the claim … Browser Mode for browser-observable
//    behavior; a stable lighter harness when it proves the contract" and
//    "Playwright E2E Is a Different Subject … never assume guidance transfers
//    between them". vars.harness names the claim the request makes: a
//    form-level claim is proved by the DOM harness the repository already has,
//    a journey claim by Playwright against the running app.
exports.harnessMatchesClaim = (output, context) => {
  const claim = context?.vars?.harness ?? "dom";
  const dom = domTests(context);
  const e2e = playwrightTests(context);
  if (dom.length === 0 && e2e.length === 0) return noTests();
  if (claim === "e2e") {
    const journeys = e2e.filter((file) => {
      const text = lib.read(file);
      return /page\.goto\s*\(/.test(text) && /\.(click|fill|press|selectOption|check)\s*\(/.test(text);
    });
    return lib.verdict(
      journeys.length > 0,
      journeys.length > 0
        ? `journey claim proved in the browser: ${list(journeys)}`
        : `no Playwright journey drives the served app (touched tests: ${list([...dom, ...e2e])})`,
    );
  }
  if (dom.length === 0) return lib.verdict(false, `component-level claim has no DOM test: ${list(e2e)}`);
  return lib.verdict(
    e2e.length === 0,
    e2e.length === 0
      ? `proved by the lightest harness that fits: ${list(dom)}`
      : `full end-to-end harness used for a component-level claim: ${list(e2e)}`,
  );
};

// 2. "Most critical skill: choosing the right query … 1. getByRole - Highest
//    priority … 8. getByTestId - Last resort only; not user-facing" and
//    "❌ WRONG - querySelector (DOM implementation detail)". Every test the
//    agent touched finds elements by role, label, text or placeholder, and
//    none reaches for a CSS selector or a test id. (getElementById is left
//    alone: it is how a test creates the container it mounts into.)
exports.queriesByRole = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const implementation = hits(files, [
    [/\.querySelector(All)?\s*\(/, "querySelector"],
    [/getElementsBy(ClassName|TagName)\s*\(/, "getElementsBy…"],
    [/(get|query|find)(All)?ByTestId\s*\(/, "getByTestId"],
    [/data-testid/, "data-testid hook"],
    [/\.locator\s*\(\s*["'`][.#[]/, "CSS locator"],
  ]);
  const accessible = files.filter((file) =>
    /(get|query|find)(All)?By(Role|LabelText|Label|Text|PlaceholderText|Placeholder|AltText)\s*\(/.test(lib.read(file)),
  );
  const missing = files.filter((file) => !accessible.includes(file)).map((file) => `${lib.rel(file)}: no accessible query`);
  const problems = [...implementation, ...missing];
  return lib.verdict(problems.length === 0, problems.length === 0 ? `queried by role/label: ${list(files)}` : problems.join("; "));
};

// 3. "Arbitrary sleeps (waitForTimeout), waitForLoadState('networkidle')
//    (officially discouraged) … merely hide lifecycle races" — and the async
//    resource's answer: findBy/waitFor/waitForElementToBeRemoved, or
//    Playwright's web-first assertions.
exports.noArbitraryWaits = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const problems = hits(files, [
    [/waitForTimeout\s*\(/, "page.waitForTimeout sleep"],
    [/setTimeout\s*\(/, "hand-rolled setTimeout sleep"],
    [/networkidle/, "waitForLoadState('networkidle')"],
    [/\bsleep\s*\(/, "sleep()"],
  ]);
  return lib.verdict(problems.length === 0, problems.length === 0 ? `no arbitrary waits: ${list(files)}` : problems.join("; "));
};

// 4. "Use MSW, not fetch/axios mocks — it intercepts at the network level" /
//    "❌ WRONG - Mocking fetch implementation: vi.spyOn(global, 'fetch')…
//    Tight coupling, won't work in Storybook". The app's own transport is
//    never replaced from the test.
exports.networkNotStubbedInApp = (output, context) => {
  const files = touchedFiles(context).filter((file) => !/acceptance-/.test(lib.basename(file)));
  if (touchedTests(context).length === 0) return noTests();
  const problems = hits(files, [
    [/stubGlobal\s*\(\s*["'`]fetch["'`]/, "vi.stubGlobal('fetch')"],
    [/spyOn\s*\(\s*(global|globalThis|window)\s*,\s*["'`]fetch["'`]/, "vi.spyOn(global, 'fetch')"],
    [/(global|globalThis|window)\s*\.\s*fetch\s*=/, "assigns globalThis.fetch"],
    [/\bfetch\s*=\s*vi\.fn/, "replaces fetch with vi.fn()"],
  ]);
  return lib.verdict(problems.length === 0, problems.length === 0 ? `transport left alone: ${list(files)}` : problems.join("; "));
};

// 5. "Testing implementation details … Test user-visible behavior" and
//    "treat module mocking as temporary scaffolding — prefer parameter
//    injection so the dependency is an explicit seam": the module under test,
//    and the modules it uses, are not replaced with vi.mock.
exports.subjectNotMocked = (output, context) => {
  const files = touchedFiles(context).filter((file) => !/acceptance-/.test(lib.basename(file)));
  if (touchedTests(context).length === 0) return noTests();
  const problems = hits(files, [
    [/vi\.(mock|doMock)\s*\(\s*["'`]\.{1,2}\//, "vi.mock of one of the app's own modules"],
    [/vi\.(mock|doMock)\s*\(\s*["'`](src|@)\//, "vi.mock of one of the app's own modules"],
  ]);
  return lib.verdict(problems.length === 0, problems.length === 0 ? `subject not mocked: ${list(files)}` : problems.join("; "));
};

// 6. "MSW for API mocking — setupWorker in Browser Mode, setupServer in
//    Node/jsdom": a DOM claim that depends on the API is proved with the
//    network intercepted, not with the app's fetch wrapper swapped out.
exports.apiMockedAtNetworkBoundary = (output, context) => {
  const files = touchedFiles(context).filter((file) => !/acceptance-/.test(lib.basename(file)));
  if (touchedTests(context).length === 0) return noTests();
  const withMsw = files.filter((file) => /from\s*["'`]msw(\/(node|browser))?["'`]|setupServer\s*\(|setupWorker\s*\(/.test(lib.read(file)));
  return lib.verdict(
    withMsw.length > 0,
    withMsw.length > 0 ? `network intercepted by MSW: ${list(withMsw)}` : `no MSW handler in ${list(files)}`,
  );
};

// 7. "a browser or user-journey claim must be proved by a browser initiator —
//    an accessible locator action or a navigation — never by a direct HTTP
//    call standing in for the user or the frontend"; and the outcome must be
//    the one the user sees.
exports.browserInitiatorForJourney = (output, context) => {
  const files = playwrightTests(context);
  if (files.length === 0) return lib.verdict(false, "no Playwright journey to inspect");
  const problems = hits(files, [
    [/page\.request\s*\./, "page.request performs the journey's work"],
    [/\bAPIRequestContext\b|request\.newContext\s*\(/, "a direct APIRequestContext stands in for the browser"],
    [/\{\s*page\s*,\s*request\s*\}|\{\s*request\s*\}/, "the `request` fixture stands in for the browser"],
    [/page\.evaluate\s*\([^)]*fetch/, "page.evaluate(fetch) manufactures the frontend's request"],
    [/(Sec-Fetch|sec-fetch)/, "forged browser headers"],
  ]);
  const proved = files.filter((file) => {
    const text = lib.read(file);
    return (
      /page\.goto\s*\(/.test(text) &&
      /\.(click|fill|press|selectOption|check)\s*\(/.test(text) &&
      /\bexpect\s*\(/.test(text) &&
      /toBeVisible|toHaveText|toContainText|toHaveValue|toHaveURL|toBeEnabled|toBeDisabled|toHaveCount/.test(text)
    );
  });
  if (problems.length > 0) return lib.verdict(false, problems.join("; "));
  return lib.verdict(
    proved.length > 0,
    proved.length > 0
      ? `user drives the browser and the outcome is asserted: ${list(proved)}`
      : `no navigation + locator action + assertion in ${list(files)}`,
  );
};

// 8. "Names, comments, CI step labels, docs, and PR prose are evidence too: no
//    'E2E', 'browser', or 'journey' label may claim more than the driver and
//    assertions prove … its test name and comments must state that narrower
//    role — and what it does *not* prove." The hand-back names the harness the
//    evidence came from and where that evidence stops.
exports.evidenceBoundaryStated = (output) => {
  const text = String(output ?? "");
  const harness = /(playwright|browser|jsdom|vitest|end[- ]to[- ]end|e2e|dom test)/i.test(text);
  const boundary =
    /\b(does not|doesn't|do not|don't|cannot|can't|no|not)\b[^.\n]{0,80}\b(prove|proof|cover|exercise|verify|guarantee|evidence|catch)\b/i.test(text) ||
    /\b(only|just)\b[^.\n]{0,40}\b(proves|covers|exercises|verifies)\b/i.test(text) ||
    /\b(evidence|proof)\s+(boundary|stops|ends)|boundary of (the|this) evidence|out of scope/i.test(text);
  return lib.verdict(
    harness && boundary,
    `reply names the harness: ${harness}; states where the evidence stops: ${boundary}`,
  );
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "front-end-testing", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
