// Deterministic graders for the domain-driven-design quality suite.
//
// The fixture is greenfield with a glossary, so every grader reads the whole
// of src/ (production files) and checks a rule the skill states as a rule.
// Nothing assumes a folder layout beyond src/.

const lib = require("./quality-lib");

const production = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter((file) => !lib.isTestPath(file));
const tests = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter(lib.isTestPath);
const text = () => production().map((file) => lib.read(file)).join("\n");
const requireCode = (grade) => (production().length <= 1 ? lib.verdict(false, "no domain code under src/") : grade());

// ---------------------------------------------------------------- generic ---

// 1. The code speaks the glossary's language: canonical terms present as
//    identifiers, rejected aliases absent (as PascalCase and camelCase).
exports.glossaryVocabulary = () =>
  requireCode(() => {
    const all = text();
    const aliases = ["Member", "User", "Customer", "Borrower", "Reader", "Book", "Copy", "Borrowing", "Checkout", "Rental", "Reservation", "Waitlist", "Extension", "Fee", "Penalty", "Charge", "Deadline"];
    const found = aliases.filter((alias) => new RegExp(`\\b(${alias}|${alias[0].toLowerCase()}${alias.slice(1)})(s|Id)?\\b`).test(all));
    const canonical = ["Patron", "Item", "Loan"].filter((term) => !new RegExp(`\\b${term}(Id)?\\b`).test(all));
    const problems = [...found.map((a) => `rejected alias: ${a}`), ...canonical.map((c) => `canonical term missing: ${c}`)];
    return lib.verdict(problems.length === 0, problems.length === 0 ? "glossary language throughout" : problems.join("; "));
  });

// 2. Identities are branded types with validating factories.
exports.brandedIds = () =>
  requireCode(() => {
    const all = text();
    const missing = ["PatronId", "ItemId", "LoanId"].filter((id) => !new RegExp(`type\\s+${id}\\s*=\\s*string\\s*&`).test(all));
    const factories = ["PatronId", "ItemId", "LoanId"].filter((id) => !new RegExp(`create${id}\\b`).test(all));
    const problems = [...missing.map((m) => `${m} not branded`), ...factories.map((f) => `no create${f} factory`)];
    return lib.verdict(problems.length === 0, problems.length === 0 ? "PatronId, ItemId, LoanId branded with factories" : problems.join("; "));
  });

// 3. Expected outcomes are Result values: no exported operation throws.
//    Validating factories (`create…`) may throw — the skill treats a factory
//    throw as an invariant violation, i.e. a programmer error — so only the
//    commands and queries a caller can legitimately drive to a refusal are
//    held to this.
exports.resultsNotThrows = () =>
  requireCode(() => {
    const throwing = production().flatMap((file) => {
      const source = lib.read(file);
      return [...source.matchAll(/export\s+(?:const|function)\s+(\w+)/g)]
        .map((match) => ({ name: match[1], start: match.index }))
        .filter(({ name }) => !/^create\w+$/.test(name))
        .filter(({ start }) => {
          const rest = source.slice(start + 1);
          const end = rest.search(/\nexport\s/);
          return /\bthrow\b/.test(end < 0 ? rest : rest.slice(0, end));
        })
        .map(({ name }) => `${lib.rel(file)}:${name}`);
    });
    const resultShape = /success:\s*false|success:\s*true/.test(text());
    return lib.verdict(throwing.length === 0 && resultShape, [throwing.length ? `throws in: ${throwing.join(", ")}` : "no command throws", resultShape ? "Result shape used" : "no { success } Result shape found"].join("; "));
  });

// 4. Immutable data, honest types: no let/mutation, no any, assertions only
//    where a type is branded, readonly fields declared.
exports.immutableAndHonest = () =>
  requireCode(() => {
    const all = text();
    const problems = [
      [/^\s*let\s/m, "let binding"],
      [/\.push\(|\.splice\(|\.sort\(\)|\bdelete\s+\w+\./, "in-place mutation"],
      [/:\s*any\b|<any>|as any/, "any"],
    ]
      .filter(([pattern]) => pattern.test(all))
      .map(([, label]) => label);
    const assertions = (all.match(/\bas\s+[A-Z]\w*/g) ?? []).length;
    const branded = (all.match(/&\s*\{\s*readonly\s+__brand/g) ?? []).length;
    if (assertions > branded) problems.push(`${assertions} type assertions for ${branded} branded types`);
    if (!/\breadonly\b/.test(all)) problems.push("no readonly fields");
    return lib.verdict(problems.length === 0, problems.length === 0 ? "immutable, no any, assertions only for brands" : problems.join("; "));
  });

// 5. The domain does not read the clock: dates arrive as data.
exports.noClockInDomain = () =>
  requireCode(() => {
    const hits = production().filter((file) => /new Date\(\)|Date\.now\(\)/.test(lib.read(file))).map(lib.rel);
    return lib.verdict(hits.length === 0, hits.length === 0 ? "time is passed in as data" : `reads the clock: ${hits.join(", ")}`);
  });

// 6. Tests are named by domain concept.
exports.testsSpeakTheLanguage = () => {
  const files = tests().filter((file) => !/index\.test\.ts$/.test(file));
  if (files.length === 0) return lib.verdict(false, "no domain tests");
  const titles = files.flatMap((file) => {
    const text = lib.read(file);
    const describes = [...text.matchAll(/describe\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
    return describes.length > 0 ? describes : [...text.matchAll(/\b(?:it|test)\(\s*["'`]([^"'`]+)/g)].map((m) => m[1]);
  });
  const technical = titles.filter((d) => !/Patron|Item|Loan|Hold|Fine|Renewal|renew|return|lending|due|late|borrow/i.test(d));
  return lib.verdict(titles.length > 0 && technical.length === 0, titles.length === 0 ? "no test titles found" : technical.length === 0 ? `test titles speak the language (${titles.length})` : `not domain language: ${technical.join(" | ")}`);
};

// ------------------------------------------------------------ per case ---

// Loan lifecycle is a status-discriminated union, not a boolean.
exports.lifecycleAsUnion = () =>
  requireCode(() => {
    const all = text();
    const flags = all.match(/\b(returned|isReturned|isOpen|open)\s*\??:\s*boolean/g) ?? [];
    const union = /status\s*:\s*["']open["']/.test(all) && /status\s*:\s*["']returned["']/.test(all);
    return lib.verdict(flags.length === 0 && union, flags.length ? `boolean lifecycle flags: ${flags.join(", ")}` : union ? "status union open | returned" : "no status-discriminated union");
  });

// Domain events are returned data, never published from the domain.
exports.eventsAsReturnedData = () =>
  requireCode(() => {
    const all = text();
    const typed = /type\s*:\s*["']LoanOpened["']/.test(all) && /type\s*:\s*["']ItemReturned["']/.test(all);
    const sideEffects = /EventEmitter|\.emit\(|dispatch\(|subscribe\(|publish\(/.test(all);
    return lib.verdict(typed && !sideEffects, `LoanOpened and ItemReturned as data: ${typed}; publishing from the domain: ${sideEffects}`);
  });

// A Loan references Patron and Item by id, never by embedding them.
exports.referencesById = () =>
  requireCode(() => {
    const all = text();
    const byId = /patronId\s*:\s*PatronId/.test(all) && /itemId\s*:\s*ItemId/.test(all);
    const embeds = /\bpatron\s*:\s*Patron\b|\bitem\s*:\s*Item\b/.test(all);
    return lib.verdict(byId && !embeds, `by id: ${byId}; embeds an aggregate: ${embeds}`);
  });

// Fines are whole pence with integer arithmetic: no pounds as floats.
exports.moneyInWholePence = () =>
  requireCode(() => {
    const all = text();
    const pence = /\bpence\b/.test(all) && /\b20\b/.test(all) && /\b500\b/.test(all);
    const floaty = /\b0\.2\b|\b5\.0\b|\b5\.00\b|toFixed\(|\/\s*100\b|\*\s*100\b/.test(all);
    return lib.verdict(pence && !floaty, `pence with 20 and 500: ${pence}; pound/float arithmetic: ${floaty}`);
  });

// --------------------------------------------------------------- shared ---

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "ddd", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
