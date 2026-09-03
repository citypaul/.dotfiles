// Deterministic graders for the api-design quality suite.
//
// The fixture (fixtures/api-design-workspace) declares only that the service
// is a consumer-facing HTTP API called by a mobile app and by partners, and
// that the app tags every attempt at one order with the same
// `Idempotency-Key` header, which the service ignores — the client's habit,
// not a design. Its one resource is written the naive way — ad-hoc
// `{ error: "…" }` bodies, 200 on a rejected order, a stack of hand-rolled
// `typeof` checks, offset slicing with no bound — so nothing in the workspace
// teaches the rules graded here; the skill has to supply them.
//
// Most rules here are about observable HTTP behaviour, which is the thing the
// skill is about ("all observable behaviors of your system will be depended on
// by somebody"), so most graders drive the agent's own app in process through
// a hidden probe under tests/api-design/acceptance/ rather than grepping
// source. Probes are copied in as `src/acceptance-*.test.ts`, which is the
// pattern quality-lib's runAcceptance uses and which suiteGreen excludes.
// The graders that are about where code sits, or about what the repository
// documents, read the workspace instead, and are limited to files the agent
// actually touched.

const { writeFileSync, existsSync, unlinkSync, readdirSync, statSync } = require("node:fs");
const lib = require("./quality-lib");

// --- probes -----------------------------------------------------------------

const plain = (text) => text.replace(/\u001b\[[0-9;]*m/g, "");

// Name the probe expectations that failed, with vitest's one-line reason for
// each, so a failing metric reads as the rule it broke rather than a count.
const probeReason = (out) => {
  const clean = plain(out);
  const failures = [...clean.matchAll(/^\s*×\s+(.+?)(?:\s+\d+ms)?$\n?(?:\s*→\s*(.+)$)?/gm)].map(
    ([, name, why]) => (why === undefined ? name.trim() : `${name.trim()} — ${why.trim()}`),
  );
  return failures.length > 0 ? failures.join("; ") : lib.vitestSummary(clean);
};

const runProbe = (name) => {
  const source = lib.resolve(__dirname, "tests", "api-design", "acceptance", name);
  const relative = `src/acceptance-${name}`;
  const target = lib.resolve(lib.workspace(), relative);
  writeFileSync(target, lib.read(source));
  try {
    return lib.run(`pnpm exec vitest run ${relative}`);
  } finally {
    if (existsSync(target)) unlinkSync(target);
  }
};

const probe = (name) => {
  const result = runProbe(name);
  return lib.verdict(result.ok, result.ok ? lib.vitestSummary(plain(result.out)) : probeReason(result.out));
};

// A status the probe printed for one of the two failures it sent.
const reported = (out, label) => Number((plain(out).match(new RegExp(`${label}=(\\d{3})`)) ?? [])[1]);

// --- workspace reading ------------------------------------------------------

const productionFiles = () =>
  lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter((file) => !lib.isTestPath(file));

// Every file a human consumer of this repository could read a deprecation out
// of: production source plus any markdown, anywhere but node_modules and the
// mounted skills.
const documentFiles = (dir = lib.workspace()) =>
  readdirSync(dir).flatMap((entry) => {
    if (entry === "node_modules" || entry === ".git" || entry === ".claude" || entry === ".pnpm-store") return [];
    const full = lib.resolve(dir, entry);
    if (statSync(full).isDirectory()) return documentFiles(full);
    return /\.(md|mdx)$/i.test(entry) ? [full] : [];
  });

const list = (files) => files.map(lib.rel).join(", ") || "(none)";

// --- rule graders -----------------------------------------------------------

// 1. Hyrum's Law — "With a sufficient number of users of an API, all
//    observable behaviors of your system will be depended on by somebody" —
//    and "What breaks backward compatibility: Removing fields / Changing
//    field types". Whatever the case asked for, the fields and statuses this
//    API already publishes are still there.
exports.shippedContractIntact = () => probe("contract.test.ts");

// 2. "If parameters differ on retry with the same key, return an error."
exports.replayWithDifferentBodyRejected = () => probe("idempotency-mismatch.test.ts");

// 3. "For public APIs with external consumers, use RFC 9457 (Problem
//    Details). It's the industry standard, machine-readable, and what
//    third-party developers expect. Use `application/problem+json` as the
//    Content-Type." — plus "`status` (must match the actual HTTP status)" and
//    "never expose stack traces, internal paths, or implementation details".
exports.errorsUseProblemDetails = () => probe("problem-details.test.ts");

// 4. "Return 400 when the representation itself cannot be parsed (for example
//    malformed JSON). Once parsing succeeds, return 422 when the value fails
//    the endpoint schema or business validation. Pick and document a different
//    house mapping only when every example, error translator, and consumer
//    uses it consistently." The probe fails outright when either failure is
//    not a client error; the skill's own mapping passes on the statuses alone,
//    and any other pair passes only when the repository documents it.
exports.validationStatusMapping = (output, context) => {
  const result = runProbe("validation-status.test.ts");
  if (!result.ok) return lib.verdict(false, probeReason(result.out));
  const parse = reported(result.out, "PARSE_STATUS");
  const value = reported(result.out, "VALIDATION_STATUS");
  if (parse === 400 && value === 422) {
    return lib.verdict(true, "an unparseable body is 400 and a value that breaks the rules is 422");
  }
  const touched = lib.touchedBy(context);
  const documenting = documentFiles()
    .filter(touched)
    .filter((file) => {
      const text = lib.read(file);
      return [parse, value].every((status) => new RegExp(`\\b${status}\\b`).test(text)) && /valid|unprocessable|malformed/i.test(text);
    });
  return lib.verdict(
    documenting.length > 0,
    documenting.length > 0
      ? `house mapping — unparseable ${parse}, invalid value ${value} — documented in ${list(documenting)}`
      : `an unparseable body is ${parse} and a value that breaks the rules is ${value}, which is neither the 400/422 mapping nor a house mapping documented in any file the agent wrote`,
  );
};

// 5. "Validate untrusted representation and endpoint-schema input where it
//    enters the system, then pass the derived type through internal code",
//    against the red flag "No typed input/output schemas for endpoints": the
//    endpoint parses the body through a schema instead of a stack of hand
//    written `typeof` checks.
exports.validationBySchemaAtBoundary = (output, context) => {
  const touched = lib.touchedBy(context);
  const files = productionFiles().filter(touched);
  if (files.length === 0) return lib.verdict(false, "the agent changed no production file");
  const parsing = files.filter((file) => {
    const text = lib.read(file);
    return /\bsafeParse(Async)?\s*\(/.test(text) || /\bSchema\s*\.\s*parse(Async)?\s*\(/.test(text);
  });
  if (parsing.length === 0) {
    const handRolled = files.filter((file) => (lib.read(file).match(/typeof\s+/g) ?? []).length >= 3);
    return lib.verdict(false, `no touched endpoint file parses the body through a schema${handRolled.length ? `; still hand-rolled in ${list(handRolled)}` : ""}`);
  }
  return lib.verdict(true, `schema-parsed at the boundary in ${list(parsing)}`);
};

// 6. "Plan for deprecation at design time. Removing things users depend on
//    always costs more than expected." — and the evolution checklist,
//    "Communicate early … Use headers — `Deprecation` and `Sunset` headers on
//    every response from deprecated endpoints … Provide migration path". The
//    superseded field is recorded as superseded somewhere a consumer can see:
//    a Deprecation/Sunset header the agent sets, a marker on the field, or the
//    repository's own documentation.
exports.deprecationRecorded = (output, context) => {
  const touched = lib.touchedBy(context);
  const candidates = [...productionFiles(), ...documentFiles()].filter(touched);
  if (candidates.length === 0) return lib.verdict(false, "the agent changed no source or documentation file");
  const recorded = candidates.filter((file) => {
    const text = lib.read(file);
    return /deprecat|sunset/i.test(text) && /\btotal\b/i.test(text);
  });
  return lib.verdict(recorded.length > 0, recorded.length > 0 ? `deprecation of the old total recorded in ${list(recorded)}` : `nothing in ${list(candidates)} records that the old total field is superseded`);
};

// --- shared -----------------------------------------------------------------

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "api-design", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
