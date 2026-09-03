// Deterministic graders for the finding-seams quality suite.
//
// The fixture's legacy functions construct the database driver inside, read
// process.env and Date.now() directly, and are called from two call sites.
// Each case names the function under test (vars.entry) and its file
// (vars.subject); the graders read the tool-call trail, the workspace and the
// reply. Every rule below is one the skill states as a rule.
//
// Scope: rules about the subject's tests grade every test file that imports
// the subject module, whether the agent wrote it, edited it or left it as the
// fixture shipped it. Leaving the fixture's vi.mock test in place next to a
// new seam test is the outcome case 3 exists to catch.

const { dirname } = require("node:path");
const { existsSync, statSync, writeFileSync } = require("node:fs");
const lib = require("./quality-lib");

const CALLERS = ["src/http/api-keys.ts", "src/cli.ts"];
const FIXTURE = lib.resolve(__dirname, "fixtures/finding-seams-workspace");
const DAY_ONE_DATABASE_IMPORTERS = new Set(["issue-key.ts", "revoke-key.ts", "expiry-report.ts"]);
// The environment the fixture's defaults read. The hidden callers test sets
// these; the subject's own tests must run without them ("nothing set up").
const FIXTURE_ENV = ["DATABASE_URL", "API_KEY_TTL_DAYS", "EXPIRY_WARNING_DAYS"];

const entryOf = (context) => context?.vars?.entry ?? "issueApiKey";
const subjectOf = (context) => lib.resolve(lib.workspace(), context?.vars?.subject ?? "src/issue-key.ts");
const srcFiles = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src"));
const isTestSupport = (file) => /\/(testing|test-support|test-utils|__tests__|fakes?)\//.test(file) || /(fake|stub|test-support)s?\.ts$/.test(file);
const production = () => srcFiles().filter((file) => !lib.isTestPath(file) && !isTestSupport(file) && !/\/src\/lib\//.test(file));
const tests = () => srcFiles().filter(lib.isTestPath);
const touchedTests = (context) => {
  const touched = lib.touchedBy(context);
  return tests().filter(touched);
};
const moduleName = (file) => lib.basename(file).replace(/\.[jt]s$/, "");
const importsModule = (file, name) => lib.importsOf(lib.read(file)).some((spec) => moduleName(spec) === name);
const subjectTests = (context) => tests().filter((file) => importsModule(file, moduleName(subjectOf(context))));
const subjectOrTouchedTests = (context) => [...new Set([...subjectTests(context), ...touchedTests(context)])];
const valueImports = (text) => [...text.matchAll(/import\s+(?!type\b)[^;]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
const list = (files) => files.map(lib.rel).join(", ") || "(none)";

const resolveImport = (file, spec) => {
  if (!spec.startsWith(".")) return undefined;
  const base = lib.resolve(dirname(file), spec.replace(/\.[jt]s$/, ""));
  return [`${base}.ts`, `${base}/index.ts`].find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
};

// The subject file plus every production file it (transitively) imports:
// where a production default for its hidden dependencies can legitimately
// live. The two legacy files a case does not touch are not in here, so they
// cannot stand in for a default the agent dropped.
const productionClosure = (file, seen = new Set()) => {
  if (seen.has(file)) return seen;
  seen.add(file);
  valueImports(lib.read(file))
    .map((spec) => resolveImport(file, spec))
    .filter((imported) => imported !== undefined && !lib.isTestPath(imported))
    .forEach((imported) => productionClosure(imported, seen));
  return seen;
};

// The environment variables the fixture's version of the subject read.
const fixtureEnvNames = (context) =>
  [...lib.read(lib.resolve(FIXTURE, context?.vars?.subject ?? "src/issue-key.ts")).matchAll(/process\.env(?:\.(\w+)|\[["'](\w+)["']\])/g)].map((m) => m[1] ?? m[2]);

const typescript = () => {
  try {
    return require(lib.resolve(lib.workspace(), "node_modules", "typescript"));
  } catch {
    return require("typescript");
  }
};

const parse = (ts, file) => ts.createSourceFile(file, lib.read(file), ts.ScriptTarget.Latest, true);

const descendants = (ts, root) => {
  const found = [];
  const visit = (node) => {
    found.push(node);
    ts.forEachChild(node, visit);
  };
  visit(root);
  return found;
};

// Hidden dependencies the skill's smell table names: `new Foo()` inside a
// function, `process.env.X` read directly, `Date.now()`.
const hiddenDependency = (ts, node) => {
  if (ts.isPropertyAccessExpression(node)) {
    const object = node.expression.getText();
    if (object === "Date" && node.name.text === "now") return "clock";
    if (object === "process" && node.name.text === "env") return "environment";
  }
  if (ts.isNewExpression(node)) {
    const callee = node.expression.getText();
    if (callee === "Database") return "collaborator";
    if (callee === "Date" && (node.arguments?.length ?? 0) === 0) return "clock";
  }
  return undefined;
};

const functionName = (ts, node) => {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) return node.name?.getText();
  const parent = node.parent;
  if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) return parent.name.text;
  if (parent && ts.isPropertyAssignment(parent)) return parent.name.getText();
  return undefined;
};

// Walk up from a hidden-dependency occurrence. A parameter initializer met
// first is an enabling point (production default); reaching a function-like
// ancestor named for the entry means the dependency is still hard-coded
// inside the function under test.
const classify = (ts, node, entry) => {
  const path = [];
  for (let current = node.parent; current; current = current.parent) {
    if (ts.isParameter(current)) return { at: "default", path };
    if (ts.isFunctionLike(current)) {
      const name = functionName(ts, current);
      path.push(name ?? "(anonymous)");
      if (name === entry) return { at: "inside-entry", path };
    }
  }
  return { at: path.length === 0 ? "top-level" : "helper", path };
};

const analyse = (context) => {
  const ts = typescript();
  const file = subjectOf(context);
  const source = parse(ts, file);
  const entry = entryOf(context);
  const occurrences = [];
  const seams = [];
  descendants(ts, source).forEach((node) => {
    const kind = hiddenDependency(ts, node);
    if (kind) occurrences.push({ kind, line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1, ...classify(ts, node, entry) });
    if (ts.isParameter(node) && node.initializer) seams.push(`${node.name.getText()} = ${node.initializer.getText().slice(0, 40)}`);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === entry && node.initializer && ts.isCallExpression(node.initializer)) {
      seams.push(`${entry} = ${node.initializer.expression.getText()}(…)`);
    }
  });
  const exported = new RegExp(`export\\s+(?:const|let|async\\s+function|function)\\s+${entry}\\b|export\\s*\\{[^}]*\\b${entry}\\b`).test(source.text);
  return { entry, occurrences, seams, exported };
};

// 1. "Every seam has an enabling point -- the place where you choose which
//    behavior to activate." Smell table: `new Foo()` inside a function ->
//    parameterize; `process.env.X` / `Date.now()` -> wrap the global call
//    `(now = Date.now)` as a parameter. So: no hidden dependency is called
//    inside the entry any more, every hidden dependency the fixture had is
//    still wired as a production default in the subject or a file it imports
//    ("Production code is unchanged at every call site (the default kicks
//    in)") — the driver constructed, the clock read, and every environment
//    variable the fixture's version of the subject read still named — and
//    the entry, or the factory that produces it, has a parameter default or
//    is built by a factory call.
exports.seamHasEnablingPoint = (output, context) => {
  const { entry, occurrences, seams, exported } = analyse(context);
  if (!exported) return lib.verdict(false, `${entry} is no longer exported from ${lib.rel(subjectOf(context))}`);
  const hardCoded = occurrences.filter((o) => o.at === "inside-entry");
  if (hardCoded.length > 0) return lib.verdict(false, `still hard-coded inside ${entry}: ${hardCoded.map((o) => `${o.kind} (line ${o.line})`).join(", ")}`);
  if (seams.length === 0) return lib.verdict(false, `${entry} has no parameter default and is not produced by a factory call: no enabling point`);
  const closure = [...productionClosure(subjectOf(context))];
  const kinds = new Set(closure.flatMap((file) => {
    const text = lib.read(file);
    return [
      [/Date\.now\b|new Date\(\)/, "clock"],
      [/process\.env\b/, "environment"],
      [/new Database\(/, "collaborator"],
    ].filter(([pattern]) => pattern.test(text)).map(([, kind]) => kind);
  }));
  const closureText = closure.map(lib.read).join("\n");
  const droppedNames = fixtureEnvNames(context).filter((name) => !new RegExp(`\\b${name}\\b`).test(closureText)).map((name) => `environment ${name}`);
  const missing = [...["clock", "environment", "collaborator"].filter((kind) => !kinds.has(kind)), ...droppedNames];
  if (missing.length > 0) return lib.verdict(false, `production default dropped for: ${missing.join(", ")} (neither ${lib.rel(subjectOf(context))} nor a file it imports wires it: ${list(closure)})`);
  return lib.verdict(true, `enabling point(s): ${seams.join("; ")}`);
};

// 2. "Production code is unchanged at every call site (the default kicks
//    in)." Neither caller was edited, and both still read as the fixture
//    shipped them.
exports.callSitesUnchanged = (output, context) => {
  const touched = lib.touchedBy(context);
  const changed = CALLERS.filter((file) => {
    const current = lib.resolve(lib.workspace(), file);
    const edited = touched(current);
    const differs = !lib.run(`test -f ${file}`).ok || lib.read(current) !== lib.read(lib.resolve(FIXTURE, file));
    return edited || differs;
  });
  return lib.verdict(changed.length === 0, changed.length === 0 ? `call sites untouched: ${CALLERS.join(", ")}` : `call site changed: ${changed.join(", ")}`);
};

// 3. "Module | vi.mock() / jest.mock() replaces imports | Last resort. Quick
//    scaffolding only -- bypasses type safety, implicit, requires cleanup."
//    and "Using vi.mock() as permanent architecture -> migrate to parameter
//    injection as soon as you have tests." No test of the subject — written,
//    edited or left as shipped — and no test the agent touched mocks a module.
exports.noModuleMock = (output, context) => {
  const files = subjectOrTouchedTests(context);
  if (files.length === 0) return lib.verdict(false, `no test imports ${moduleName(subjectOf(context))} and the agent wrote or edited no test file`);
  const hits = files.flatMap((file) => {
    const text = lib.read(file);
    return [...text.matchAll(/\b(?:vi|jest)\.(mock|doMock|importMock|hoisted)\(\s*["']([^"']*)["']?/g)].map((m) => `${lib.rel(file)}: vi.${m[1]}(${m[2] || "…"})`);
  });
  return lib.verdict(hits.length === 0, hits.length === 0 ? `no module mocks in ${list(files)}` : hits.join("; "));
};

// 4. "Test -- swap in a fake at the enabling point (the argument list)" and
//    the smell table's wrap-the-global rule for `Date.now()` / `process.env`.
//    Every test of the subject injects fakes through the seam: no fake
//    timers, no environment stubs, no global spies, no real driver
//    constructed.
exports.testsInjectFakesThroughSeam = (output, context) => {
  const entry = entryOf(context);
  const subject = moduleName(subjectOf(context));
  const files = subjectTests(context);
  if (files.length === 0) return lib.verdict(false, `no test imports ${subject}`);
  const smells = files.flatMap((file) => {
    const text = lib.read(file);
    return [
      [/vi\.useFakeTimers|vi\.setSystemTime|vi\.spyOn\(\s*Date\b|vi\.stubGlobal\(\s*["']Date/, "fakes the clock globally instead of through a seam"],
      [/vi\.stubEnv|process\.env(?:\.\w+|\[[^\]]+\])\s*=[^=]/, "stubs the environment instead of injecting it"],
      [/new Database\(/, "constructs the real driver instead of a fake"],
      [new RegExp(entry, "i"), "references the function under test or its factory", true],
    ]
      .filter(([pattern, , expectPresent]) => (expectPresent ? !pattern.test(text) : pattern.test(text)))
      .map(([, label, expectPresent]) => `${lib.rel(file)}: ${expectPresent ? `never ${label}` : label}`);
  });
  return lib.verdict(smells.length === 0, smells.length === 0 ? `fakes through the seam: ${list(files)}` : smells.join("; "));
};

// 5. "Introduce the narrowest safe substitution point first" / "A seam is not
//    automatically a public module interface, port, or permanent
//    abstraction." No new production module wraps the driver (no repository
//    or adapter layer), and the function stays where its callers import it.
exports.narrowestSeam = (output, context) => {
  const { entry, exported } = analyse(context);
  const wrappers = production().filter((file) => !DAY_ONE_DATABASE_IMPORTERS.has(lib.basename(file)) && valueImports(lib.read(file)).some((spec) => /(^|\/)lib\/database$/.test(spec)));
  if (!exported) return lib.verdict(false, `${entry} no longer exported from ${lib.rel(subjectOf(context))}`);
  return lib.verdict(wrappers.length === 0, wrappers.length === 0 ? `no new production module wraps the driver; ${entry} still exported in place` : `new production module(s) wrap the driver: ${list(wrappers)}`);
};

// 6. "Every seam has an enabling point -- the place where you choose which
//    behavior to activate." Quick Reference names the seam types (function
//    parameter, configuration, module, object) and each one's enabling point
//    (the argument list, the config source, the mock configuration, where the
//    object is created). The reply names the seam type it introduced and
//    says where its enabling point is — "seam" plus "parameter" alone is the
//    fixture README's vocabulary, not the skill's.
exports.seamTypeNamed = (output) => {
  const text = String(output ?? "");
  const seam = /\bseams?\b/i.test(text);
  const type = text.match(/\b(parameter|argument|factory|higher-order|configuration|config|object|constructor)\b/i)?.[1];
  const where = "(argument|parameter|default|factory|config|construct|creat|composition|call|import|mock)\\w*";
  const enabling = text.match(new RegExp(`enabling point[^.\\n]{0,100}?\\b${where}|\\b${where}[^.\\n]{0,100}?enabling point`, "i"));
  if (!seam) return lib.verdict(false, "reply never uses the word seam");
  if (!type) return lib.verdict(false, "reply says seam but not which kind");
  if (!enabling) return lib.verdict(false, `reply names the seam type (${type}) but not where its enabling point is`);
  return lib.verdict(true, `reply names the seam type (${type}) and its enabling point: "${enabling[0].trim().slice(0, 80)}"`);
};

// 7. Case: "Mock only at the seam boundary; test real logic" and "Don't
//    create a seam for pure utility functions". The report still calls the
//    pure helpers from src/format.ts directly: no parameter, dependency key
//    or default is named for them, and no test mocks them.
exports.pureHelpersNotSeamed = (output, context) => {
  const subject = subjectOf(context);
  const text = lib.read(subject);
  const stillImports = /import\s*\{[^}]*\b(formatRelativeDays|sortByExpiry)\b[^}]*\}\s*from\s*["']\.\/format["']/.test(text) && /\bformatRelativeDays\(/.test(text) && /\bsortByExpiry\(/.test(text);
  const seamed = [
    [/\b(formatRelativeDays|sortByExpiry)\s*\??\s*[:=]/, "helper named as a parameter, dependency key or default"],
    [/\b\w*(format|sort)\w*\s*\??:\s*\(/i, "function-typed dependency named for a pure helper"],
  ].filter(([pattern]) => pattern.test(text)).map(([, label]) => label);
  const mocked = subjectOrTouchedTests(context).filter((file) => /["']\.\.?\/format["']/.test(lib.read(file)) && /\bvi\.(mock|doMock)\(\s*["'][^"']*format["']/.test(lib.read(file)));
  const problems = [...(stillImports ? [] : ["the report no longer calls formatRelativeDays/sortByExpiry from ./format directly"]), ...seamed, ...mocked.map((file) => `${lib.rel(file)} mocks ./format`)];
  return lib.verdict(problems.length === 0, problems.length === 0 ? "pure helpers called directly, no seam and no mock for them" : problems.join("; "));
};

// One regression per case that the request says the new tests must catch,
// planted in the agent's version of the subject by AST anchor so it survives
// whatever shape the seam took. A test that reaches the driver through a
// module mock or asserts only the outcome string cannot see it.
const secondArgumentToZero = (ts, source, entry) => {
  const calls = descendants(ts, source).filter((node) => ts.isCallExpression(node) && node.arguments.length >= 2 && /revoke/i.test(ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : node.expression.getText()));
  const call = calls.find((node) => classify(ts, node, entry).at === "inside-entry") ?? calls[0];
  if (!call) return undefined;
  const at = call.arguments[1];
  return `${source.text.slice(0, at.getStart())}0${source.text.slice(at.getEnd())}`;
};

const MUTANTS = {
  issueApiKey: {
    describe: "the label is stored without lower-casing it",
    apply: (ts, source) => {
      const call = descendants(ts, source).find((node) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "toLowerCase");
      if (!call) return undefined;
      return `${source.text.slice(0, call.getStart())}${call.expression.expression.getText()}${source.text.slice(call.getEnd())}`;
    },
  },
  expiringKeysReport: {
    describe: "the warning window is inverted (keys inside it are dropped, keys beyond it reported)",
    apply: (ts, source, entry) => {
      const comparisons = descendants(ts, source).filter((node) => ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.LessThanEqualsToken);
      const comparison = comparisons.find((node) => classify(ts, node, entry).at === "inside-entry") ?? comparisons[0];
      if (!comparison) return undefined;
      return `${source.text.slice(0, comparison.operatorToken.getStart())}>${source.text.slice(comparison.operatorToken.getEnd())}`;
    },
  },
  revokeApiKey: {
    describe: "the revocation is recorded at time 0 instead of now",
    apply: secondArgumentToZero,
  },
};

const withoutFixtureEnv = (command) => `env ${FIXTURE_ENV.map((name) => `-u ${name}`).join(" ")} ${command}`;
const runSubjectTests = (files) => lib.run(withoutFixtureEnv(`pnpm exec vitest run --exclude '**/acceptance-*.test.ts' ${files.map(lib.rel).join(" ")}`));

const withMutant = (context, files) => {
  const ts = typescript();
  const subject = subjectOf(context);
  const mutant = MUTANTS[entryOf(context)];
  if (!mutant) return lib.verdict(true, "no regression planted for this entry");
  const original = lib.read(subject);
  const mutated = mutant.apply(ts, parse(ts, subject), entryOf(context));
  if (mutated === undefined) return lib.verdict(false, `could not plant "${mutant.describe}" in ${lib.rel(subject)}: its anchor is gone`);
  writeFileSync(subject, mutated);
  try {
    const result = runSubjectTests(files);
    return lib.verdict(!result.ok, result.ok ? `tests stay green when ${mutant.describe}: ${lib.vitestSummary(result.out)}` : `tests catch it when ${mutant.describe}`);
  } finally {
    writeFileSync(subject, original);
  }
};

// The request, in three parts: the subject is under test ("get it under
// test", "replace that test"); those tests run with nothing set up — no
// database, no environment, no clock — and would catch a regression; and
// the two callers still work through the production defaults (hidden test).
exports.behaviourDelivered = (output, context) => {
  const subject = moduleName(subjectOf(context));
  const files = subjectTests(context);
  if (files.length === 0) return lib.verdict(false, `nothing put under test: no test imports ${subject}`);
  const bare = runSubjectTests(files);
  if (!bare.ok) return lib.verdict(false, `${list(files)} fail with ${FIXTURE_ENV.join("/")} unset: ${lib.vitestSummary(bare.out)}`);
  const regression = withMutant(context, files);
  if (!regression.pass) return regression;
  const callers = lib.runAcceptance({ suite: "finding-seams", name: context?.vars?.acceptance, targetDir: "src" });
  if (!callers.pass) return lib.verdict(false, `callers broken through the defaults: ${callers.reason}`);
  return lib.verdict(true, `${list(files)} green with nothing set up; ${regression.reason}; callers: ${callers.reason}`);
};

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
