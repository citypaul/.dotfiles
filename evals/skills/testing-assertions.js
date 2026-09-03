// Deterministic graders for the testing quality suite.
//
// The fixture (fixtures/testing-workspace) declares that tests are behaviour
// tests through the package's public interface, src/index.ts, and shows
// nothing else. Every case asks for tests, so the graders read the test files
// the agent wrote or edited (found from the tool-call trail, wherever the
// agent put them) plus any test-support module those tests import, and grade
// them against the rules the testing skill states as rules. Nothing here
// assumes a folder layout beyond what README.md fixes: the public interface is
// src/index.ts and everything reachable from it by import is internal.

const { existsSync, statSync, writeFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const lib = require("./quality-lib");

const stripExt = (path) => path.replace(/\.(ts|js|tsx|jsx)$/, "");
const isBare = (spec) => !spec.startsWith(".") && !spec.startsWith("/");
const isFile = (path) => existsSync(path) && statSync(path).isFile();
// "./discounts", "./discounts.js", "./discounts.ts" and "." all resolve the
// way the bundler moduleResolution in the fixture's tsconfig resolves them.
const resolveImport = (from, spec) => {
  const base = resolve(dirname(from), spec);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${stripExt(base)}.ts`, resolve(base, "index.ts")];
  return candidates.find(isFile) ?? `${stripExt(base)}.ts`;
};
const relativeImports = (file) => lib.importsOf(lib.read(file)).filter((spec) => !isBare(spec)).map((spec) => resolveImport(file, spec));

const entryPoint = () => resolve(lib.workspace(), "src", "index.ts");
const isEntry = (file) => lib.sameFile(file, entryPoint());

// Internal production modules: everything reachable from src/index.ts by import.
const internalModules = () => {
  const seen = new Set();
  const queue = [entryPoint()];
  while (queue.length > 0) {
    const file = queue.shift();
    if (!existsSync(file) || seen.has(file)) continue;
    seen.add(file);
    queue.push(...relativeImports(file));
  }
  seen.delete(entryPoint());
  return [...seen];
};
const isInternal = (file) => internalModules().some((internal) => lib.sameFile(internal, file));

// Test files the agent wrote or edited, wherever it put them.
const touchedTests = (context) =>
  [...new Set(lib.edits(lib.trail(context)).filter((call) => lib.isTestPath(call.path)).map((call) => call.path))].filter(existsSync);

// Those tests plus the test-support modules they import (factories in their
// own file are the skill's own pattern); production modules are excluded.
const testSources = (context) => {
  const seen = new Set();
  const queue = touchedTests(context);
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file) || isEntry(file) || isInternal(file) || !existsSync(file)) continue;
    seen.add(file);
    queue.push(...relativeImports(file));
  }
  return [...seen];
};
// Does a test file, or a test-support module it pulls in, import `target`?
const importsReach = (file, target) => {
  const seen = new Set();
  const queue = [file];
  while (queue.length > 0) {
    const current = queue.shift();
    if (seen.has(current) || !existsSync(current)) continue;
    seen.add(current);
    const imports = relativeImports(current);
    if (imports.some((imported) => lib.sameFile(imported, target))) return true;
    queue.push(...imports.filter((imported) => !isEntry(imported) && !isInternal(imported)));
  }
  return false;
};
const list = (files) => files.map((file) => lib.basename(file)).join(", ") || "(none)";
// Trail paths and the realpath'd workspace may spell the root differently
// (/var vs /private/var); name a file by the part after src/.
const inSrc = (file) => `src/${file.split("/src/").slice(1).join("/src/") || lib.basename(file)}`;
const noTests = () => lib.verdict(false, "the agent wrote or edited no test file");

// 1. "Prefer fresh state per test." / "❌ WRONG: One mutable object shared by
//    the suite" — no `let`-bound state, no beforeEach/beforeAll rebuilding it,
//    in any test the agent touched.
exports.freshStatePerTest = (output, context) => {
  const files = testSources(context);
  if (files.length === 0) return noTests();
  const smells = files.flatMap((file) => {
    const text = lib.read(file);
    return [
      [/^\s*let\s/m, "let-bound shared state"],
      [/\b(beforeEach|beforeAll)\s*\(/, "lifecycle hook rebuilding state"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.basename(file)}: ${label}`);
  });
  return lib.verdict(smells.length === 0, smells.length === 0 ? `fresh state in ${list(files)}` : smells.join("; "));
};

// 2. "Use factory functions with optional overrides when test data is
//    repeated" — some test source defines a factory whose parameter is a
//    Partial<…> (or defaults to {}) and spreads it into the object it builds.
exports.factoriesWithOverrides = (output, context) => {
  const files = testSources(context);
  if (files.length === 0) return noTests();
  const hasFactory = (text) =>
    /\(\s*\w+\??\s*(?::\s*(?:Readonly<)?(?:Deep)?Partial<|=\s*\{\s*\})/.test(text) && /\.\.\.\s*\w+\s*[,}\n]/.test(text);
  const withFactory = files.filter((file) => hasFactory(lib.read(file)));
  return lib.verdict(withFactory.length > 0, withFactory.length > 0 ? `factory with overrides in ${list(withFactory)}` : `no factory taking Partial<…> overrides in ${list(files)}`);
};

// 3. "Reuse a production schema when the contract already has one; do not
//    invent a schema only for a factory" / "❌ WRONG: Redefining schemas in
//    tests" — the fixture exports OrderSchema/LineSchema; tests reference them
//    and declare no schema or contract type of their own.
exports.realSchemaReused = (output, context) => {
  const files = testSources(context);
  if (files.length === 0) return noTests();
  const texts = files.map((file) => [file, lib.read(file)]);
  const redefined = texts
    .flatMap(([file, text]) => [
      [/\bz\.(object|strictObject|looseObject)\s*\(/, "declares its own zod schema"],
      [/^\s*(?:export\s+)?(?:type|interface)\s+(Order|Line|Quote|QuoteResult)\b/m, "redeclares a contract type"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.basename(file)}: ${label}`));
  if (redefined.length > 0) return lib.verdict(false, redefined.join("; "));
  const reused = texts.filter(([, text]) => /\b(OrderSchema|LineSchema)\b/.test(text)).map(([file]) => file);
  return lib.verdict(reused.length > 0, reused.length > 0 ? `real schema reused in ${list(reused)}` : `no test references the exported OrderSchema/LineSchema (${list(files)})`);
};

// 4. "Test behavior through the subject's public interface" — README.md fixes
//    that interface as src/index.ts. Every relative import from a touched test
//    (or a test-support module it pulls in) resolves to src/index.ts or to
//    another test-support module, never to a module reachable from index.ts.
exports.publicInterfaceOnly = (output, context) => {
  const files = testSources(context);
  if (files.length === 0) return noTests();
  const violations = files.flatMap((file) =>
    relativeImports(file)
      .filter((target) => !isEntry(target) && isInternal(target))
      .map((target) => `${lib.basename(file)} imports internal ${inSrc(target)}`),
  );
  return lib.verdict(violations.length === 0, violations.length === 0 ? `only src/index.ts imported by ${list(files)}` : violations.join("; "));
};

// 5. "No mocks of the function being tested" / "What this pattern forbids is
//    spying on internal collaborators the caller never provided" — no
//    vi.mock/vi.doMock of the package's own modules, no vi.spyOn, no
//    call-count assertions, in the tests the agent touched.
exports.noMocksOfOwnModules = (output, context) => {
  const files = testSources(context);
  if (files.length === 0) return noTests();
  const smells = files.flatMap((file) => {
    const text = lib.read(file);
    return [
      [/\bvi\.(mock|doMock)\s*\(\s*["']\.{1,2}\//, "vi.mock of an own module"],
      [/\bvi\.spyOn\s*\(/, "vi.spyOn"],
      [/\.toHaveBeenCalled(Times|With|Once)?\s*\(/, "asserts on calls rather than outcomes"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.basename(file)}: ${label}`);
  });
  return lib.verdict(smells.length === 0, smells.length === 0 ? `no mocks or spies in ${list(files)}` : smells.join("; "));
};

// 6. "Do not mirror every implementation file by reflex. Organize tests around
//    stable behavior or contracts" — touched test files that are named after an
//    internal module *and* import it (validate-order.test.ts pulling in
//    ./validate-order, …). A behaviour-named file that happens to share a
//    module's name but goes through src/index.ts is a behaviour grouping, not
//    a mirror. One mirror is tolerated (that file may be the unit under test);
//    two is the reflex.
exports.noOneToOneMirror = (output, context) => {
  const files = touchedTests(context);
  if (files.length === 0) return noTests();
  const internal = internalModules();
  const mirrorOf = (file) => {
    const name = lib.basename(file).replace(/\.test\.[jt]sx?$/, "");
    const mirrored = internal.find((module) => stripExt(lib.basename(module)) === name);
    return mirrored !== undefined && importsReach(file, mirrored) ? mirrored : undefined;
  };
  const mirrors = files.filter((file) => mirrorOf(file) !== undefined);
  return lib.verdict(mirrors.length < 2, mirrors.length < 2 ? `tests organised by behaviour: ${list(files)}` : `one test file per internal module, each importing the module it is named after: ${list(mirrors)}`);
};

// 7. "A good test should fail if a realistic mutant changes the behavior." —
//    plant each of the case's bugs (vars.mutants) in the production code and
//    require the agent's suite to go red for every one of them.
const MUTANTS = {
  "tier-one-boundary": { file: "src/discounts.ts", from: />=\s*TIER_ONE_THRESHOLD_PENCE/, to: "> TIER_ONE_THRESHOLD_PENCE" },
  "tier-two-boundary": { file: "src/discounts.ts", from: />=\s*TIER_TWO_THRESHOLD_PENCE/, to: "> TIER_TWO_THRESHOLD_PENCE" },
  "promo-does-not-stack": { file: "src/discounts.ts", from: /Math\.max\(\s*tierPercent/, to: "Math.min(tierPercent" },
  // "Method calls: Would removing, swapping, or changing the method fail?" —
  // only a test that sends a promo code in another letter case sees this one.
  "promo-code-case": { file: "src/discounts.ts", from: /input\.promoCode\.toUpperCase\(\)/, to: "input.promoCode" },
  "free-shipping-boundary": { file: "src/shipping.ts", from: />=\s*FREE_DOMESTIC_SHIPPING_FROM_PENCE/, to: "> FREE_DOMESTIC_SHIPPING_FROM_PENCE" },
  "international-shipping": { file: "src/shipping.ts", from: /return\s+INTERNATIONAL_SHIPPING_PENCE/, to: "return DOMESTIC_SHIPPING_PENCE" },
  "irish-rate": { file: "src/tax.ts", from: /IE:\s*23/, to: "IE: 20" },
  "round-to-penny": { file: "src/tax.ts", from: /Math\.round\(/, to: "Math.floor(" },
  "vat-on-delivery": { file: "src/index.ts", from: /taxablePence:\s*goodsPence\s*\+\s*shippingPence/, to: "taxablePence: goodsPence" },
  "quantity-boundary": { file: "src/validate-order.ts", from: /quantity\s*>\s*MAX_QUANTITY_PER_LINE/, to: "quantity >= MAX_QUANTITY_PER_LINE" },
  "duplicate-sku": { file: "src/validate-order.ts", from: /new Set\(skus\)\.size\s*!==\s*skus\.length/, to: "new Set(skus).size > skus.length" },
};
const SUITE = "pnpm exec vitest run --exclude '**/acceptance-*.test.ts'";

exports.testsCatchPlantedBugs = (output, context) => {
  const names = String(context?.vars?.mutants ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (names.length === 0) return lib.verdict(false, "test case has no vars.mutants");
  if (touchedTests(context).length === 0) return noTests();
  const baseline = lib.run(SUITE);
  if (!baseline.ok) return lib.verdict(false, `suite is not green before any bug is planted: ${lib.vitestSummary(baseline.out)}`);
  const outcomes = names.map((name) => {
    const mutant = MUTANTS[name];
    if (!mutant) return `${name}: unknown mutant`;
    const file = resolve(lib.workspace(), mutant.file);
    const original = lib.read(file);
    if (!mutant.from.test(original)) return `${name}: mutation site missing from ${mutant.file} (the production code was rewritten)`;
    writeFileSync(file, original.replace(mutant.from, mutant.to));
    try {
      const result = lib.run(SUITE);
      return result.ok ? `${name}: survived (no test failed)` : null;
    } finally {
      writeFileSync(file, original);
    }
  });
  const survivors = outcomes.filter(Boolean);
  return lib.verdict(survivors.length === 0, survivors.length === 0 ? `every planted bug caught: ${names.join(", ")}` : survivors.join("; "));
};

// Regression guard, not a measure of the agent's tests: every request asks
// only for tests, so the untouched fixture already delivers this behaviour and
// the hidden acceptance test passes on the pristine workspace. It fails only
// when the agent rewrites production code (to make a test easier, say) and
// breaks the specified behaviour. Weighted 1 for that reason; the behaviour
// weight of this suite sits on testsCatchPlantedBugs.
exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "testing", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
