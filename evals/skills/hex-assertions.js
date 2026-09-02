// Deterministic graders for the hexagonal-architecture quality suite.
//
// The fixture declares ports and adapters but has none, so nothing here
// assumes a folder layout. Roles are found by content: a file that imports a
// third-party SDK from src/lib is *outside*; a production file that imports
// no SDK and is not the composition root (src/index.ts) is *inside*; the use
// case is the inside file that carries the case's business text
// (vars.logicMarker). Every rule below is one the skill states as a rule.

const lib = require("./quality-lib");

const production = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter((file) => !lib.isTestPath(file));
const tests = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter(lib.isTestPath);
const importsSdk = (file) => lib.importsOf(lib.read(file)).some((spec) => /(^|\/)lib\//.test(spec));
const isRoot = (file) => /\/src\/index\.ts$/.test(file);
const isSdk = (file) => /\/src\/lib\//.test(file);
const outside = () => production().filter((file) => !isSdk(file) && !isRoot(file) && importsSdk(file));
const inside = () => production().filter((file) => !isSdk(file) && !isRoot(file) && !importsSdk(file));
const marker = (context) => new RegExp(context?.vars?.logicMarker ?? "Weekly notes", "i");
const useCaseFiles = (context) => production().filter((file) => !isSdk(file) && !isRoot(file) && marker(context).test(lib.read(file)));
const interfacesIn = (files) =>
  files.flatMap((file) => [...lib.read(file).matchAll(/export\s+interface\s+(\w+)/g)].map((m) => ({ name: m[1], file })));
const list = (files) => files.map(lib.rel).join(", ") || "(none)";

// 1. The business rule lives inside: the file carrying the marker imports no
//    SDK and no SDK-importing file. (Dependency direction, by content.)
exports.useCaseInsideHexagon = (output, context) => {
  const files = useCaseFiles(context);
  if (files.length === 0) return lib.verdict(false, "no production file carries the case's business text");
  const outsideNames = new Set(outside().map((file) => lib.basename(file).replace(/\.ts$/, "")));
  const violations = files.flatMap((file) => {
    const specs = lib.importsOf(lib.read(file));
    const sdk = specs.filter((spec) => /(^|\/)lib\//.test(spec)).map((spec) => `${lib.rel(file)} imports SDK ${spec}`);
    const viaAdapter = specs.filter((spec) => outsideNames.has(lib.basename(spec).replace(/\.ts$/, ""))).map((spec) => `${lib.rel(file)} imports adapter ${spec}`);
    return [...sdk, ...viaAdapter];
  });
  return lib.verdict(violations.length === 0, violations.length === 0 ? `use case inside: ${list(files)}` : violations.join("; "));
};

// 2. Ports exist and are named for the conversation: interfaces owned inside,
//    at least one driven port (a Promise-returning method), none named for a
//    pattern or a technology.
exports.portsOwnedInsideNamedByRole = () => {
  const declared = interfacesIn(inside());
  if (declared.length === 0) return lib.verdict(false, "no exported interface declared inside the hexagon");
  const bad = declared.filter((d) => /Port$|^I[A-Z][a-z]|Impl|Interface$|Client$|Sdk|Smtp|MailApi|Http/.test(d.name));
  return lib.verdict(bad.length === 0, bad.length === 0 ? `ports: ${declared.map((d) => d.name).join(", ")}` : `pattern/technology-shaped: ${bad.map((d) => d.name).join(", ")}`);
};

// 3. Driving ports are named for the actor's intention (house rule:
//    `ForSendingWeeklyDigests`, not `SendDigestUseCase`).
exports.drivingPortNamedByIntention = () => {
  const named = interfacesIn(inside()).filter((d) => /^For[A-Z]\w+ing\w*/.test(d.name));
  return lib.verdict(named.length > 0, named.length > 0 ? `driving port: ${named.map((d) => d.name).join(", ")}` : "no `For…ing…` driving port interface");
};

// 4. Adapters translate; they carry no business rule. The SDK-importing
//    files contain none of the digest/reminder logic or email content.
exports.adaptersCarryNoBusinessRule = (output, context) => {
  const touched = lib.touchedBy(context);
  const files = outside().filter(touched);
  if (files.length === 0) return lib.verdict(false, "the agent wrote or changed no adapter (no touched file outside src/index.ts imports an SDK)");
  const hits = files.flatMap((file) => {
    const text = lib.read(file);
    return [
      [marker(context), "business text"],
      [/7\s*\*\s*24|15\s*\*\s*60|days?\b.*\bago|draft/i, "time window or draft rule"],
      [/team-\$\{|team-\s*\+|recipients?\s*:\s*\[\s*`team-/, "recipient addressing rule"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(hits.length === 0, hits.length === 0 ? `adapters thin: ${list(files)}` : hits.join("; "));
};

// 5. Inside performs no concrete I/O: no clock, environment, network, timers.
exports.noIoInside = () => {
  const hits = inside().flatMap((file) => {
    const text = lib.read(file);
    return [
      [/new Date\(\)|Date\.now\(\)/, "reads the clock"],
      [/process\.env/, "reads the environment"],
      [/\bfetch\(/, "network call"],
      [/setTimeout|setInterval/, "timer"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(hits.length === 0, hits.length === 0 ? `inside is pure (${inside().length} files)` : hits.join("; "));
};

// 6. A port is only real if it is tested: every inside interface is referenced
//    by some test (a fake at each driven port, a driver at each driving port).
exports.portsHaveTestInteractors = () => {
  const declared = interfacesIn(inside());
  if (declared.length === 0) return lib.verdict(false, "no ports to check");
  const testText = tests().map(lib.read).join("\n");
  const testImports = tests().flatMap((file) => lib.importsOf(lib.read(file)).map((spec) => lib.basename(spec).replace(/\.ts$/, "")));
  const untested = declared
    .filter((d) => !new RegExp(`\\b${d.name}\\b`).test(testText) && !testImports.includes(lib.basename(d.file).replace(/\.ts$/, "")))
    .map((d) => d.name);
  return lib.verdict(untested.length === 0, untested.length === 0 ? `every port has a test interactor (${declared.length})` : `ports with no test interactor: ${untested.join(", ")}`);
};

// 7. Use-case tests use fakes, not mocks or the SDKs. Only tests that import
//    the use case are held to this; adapter tests may exercise the SDK.
exports.useCaseTestsUseFakes = (output, context) => {
  const useCaseNames = useCaseFiles(context).map((file) => lib.basename(file).replace(/\.ts$/, ""));
  const relevant = tests().filter((file) => lib.importsOf(lib.read(file)).some((spec) => useCaseNames.includes(lib.basename(spec).replace(/\.ts$/, ""))));
  if (relevant.length === 0) return lib.verdict(false, "no test imports the use case");
  const smells = relevant.flatMap((file) => {
    const text = lib.read(file);
    return [
      [/\bvi\.(mock|fn|spyOn)\(/, "mocks/spies"],
      [/(^|\/)lib\//, "imports an SDK"],
    ]
      .filter(([pattern]) => pattern.test(text))
      .map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(smells.length === 0, smells.length === 0 ? `fakes only: ${list(relevant)}` : smells.join("; "));
};

// 8. The composition root is the only production file that both imports an
//    SDK and value-imports anything inside the hexagon: wiring happens in
//    one place.
exports.wiringOnlyInCompositionRoot = () => {
  const insideNames = inside().map((file) => lib.basename(file).replace(/\.ts$/, ""));
  const valueImportsOf = (text) => [...text.matchAll(/import\s+(?!type\b)[^;]*?from\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const wiring = production().filter((file) => !isSdk(file) && importsSdk(file) && valueImportsOf(lib.read(file)).some((spec) => insideNames.includes(lib.basename(spec).replace(/\.ts$/, ""))));
  const stray = wiring.filter((file) => !isRoot(file));
  return lib.verdict(stray.length === 0 && wiring.length > 0, wiring.length === 0 ? "nothing wires the hexagon to an SDK-backed adapter" : stray.length === 0 ? "wired only in src/index.ts" : `wiring outside the root: ${list(stray)}`);
};

// 9. Case: the transport swap. Exactly one production file imports the mail
//    API, and it is not the use case.
exports.transportSwapIsOneFile = (output, context) => {
  const importers = production().filter((file) => !isSdk(file) && !isRoot(file) && lib.importsOf(lib.read(file)).some((spec) => /mail-api/.test(spec)));
  const useCase = new Set(useCaseFiles(context));
  const inUseCase = importers.filter((file) => useCase.has(file));
  return lib.verdict(importers.length === 1 && inUseCase.length === 0, `mail-api imported by ${list(importers)}${inUseCase.length ? " (inside the use case)" : ""}`);
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "hexagonal", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
