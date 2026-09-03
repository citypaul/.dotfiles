// Deterministic graders for the refactoring quality suite.
//
// The fixture (fixtures/refactoring-workspace) declares that restructuring is
// behaviour-preserving refactoring but shows none of the discipline. Two
// sources of truth: the ordered tool-call trail (what the agent did, in what
// order) and the workspace it left behind. Every rule below is one the skill
// states as a rule, quoted above the grader.

const lib = require("./quality-lib");

const FIXTURE = lib.resolve(__dirname, "fixtures", "refactoring-workspace");
const LOOK_ALIKES = ["qualifiesForFreeDelivery", "qualifiesForBulkDiscount"];
const LINE_TOTAL = /unitPence\s*\*|\*\s*[\w.]*unitPence\b/g;
const CLASS_WORD = /\b(Critical|High|Nice|Skip)\b/g;
// "Priority: High", "Classification: Skip.", "**Verdict**: Critical".
const LEAD_IN = /\b(?:priority|classification|classified(?:\s+as)?|verdict|assessment|class|category|tier)\**\s*[:=—–-]?\s*(?:\*\*|`|_)?\s*(Critical|High|Nice|Skip)\b/i;
// Only markers precede the class word on its line: a bullet, a heading, a
// table cell, a blockquote, a comment slash (the skill's own Example
// Assessment writes `// ⚠️ High: …` / `// ✅ Skip: …`), an emoji, bold or code.
const MARKERS_ONLY = /^\s*(?:(?:[-*+>#|/]+|\d+[.)])\s*)*(?:[\u26A0\u2705\u274C\u{1F534}\u{1F7E0}\u{1F7E1}\u{1F7E2}\u{1F535}\u{1F7E3}\u2B50]\uFE0F?\s*)*(?:\*\*|`|_)?\s*$/u;
// A table cell, an opening bracket, or an opening quote — `| Critical |`,
// `(Skip)`, `falls under "Skip: don't change"`.
const CELL_OR_BRACKET = /(?:\||[[(]|["'“‘])\s*(?:\*\*|`|_)?\s*$/;
// A markdown table separator row, and the column headers that carry a
// value rather than a classification: `| Change | Risk | Effort |`.
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const VALUE_COLUMN = /\b(?:risk|impact|effort|severity|likelihood|confidence|cost)\b/i;
// "Risk: High | Effort: Low" — a labelled value, not a classification.
const LABELLED_VALUE = /[A-Za-z]\**\s*[:=]\s*(?:\*\*|`|_)?\s*$/;
const STRONG_TERMINATOR = /^(?:\*\*|`|_)?\s*(?:\(|→|\||—|–|priority\b)/;
const WEAK_TERMINATOR = /^(?:\*\*|`|_)?\s*(?::|\.|$)/;
// A heading or a short label line ("## Assessment", "Priority classification:",
// "**Refactoring assessment**"), not any sentence that happens to use the word.
const ASSESSMENT_SECTION = /^\s*(?:#{1,6}\s+|\*\*|__)?[^\n]{0,40}\b(?:assessment|priorit(?:y|ies|ised|ized)?|classif\w*)\b[^\n]{0,40}(?:\*\*|__)?\s*:?\s*$/im;

const looksLikeTestRun = (command) => /\b(vitest|pnpm test|npm test|pnpm run test|npm run test)\b/.test(command);
const testRuns = (calls) => calls.filter((call) => call.name === "Bash" && looksLikeTestRun(call.command));
const first = (items) => items[0];
const last = (items) => items[items.length - 1];
const short = (text) => String(text).replace(/\s+/g, " ").slice(0, 80);

const production = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter((file) => !lib.isTestPath(file));
const productionText = () => production().map(lib.read).join("\n");
const count = (text, pattern) => (text.match(pattern) ?? []).length;
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const definitionChunks = (text) => text.split(/\n(?=(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\b)/);
const chunkDefining = (text, name) =>
  definitionChunks(text).find((chunk) => new RegExp(`^(?:export\\s+)?(?:async\\s+)?(?:function\\s+${name}\\b|const\\s+${name}\\s*[=:])`).test(chunk));

// A function delegates to another when it calls it or is assigned it —
// `other(order)`, `= other`, `: other`, `return other` — never when a
// comment merely mentions it.
const delegatesTo = (chunk, other) => new RegExp(`\\b${other}\\s*\\(|[=:]\\s*${other}\\b|\\breturn\\s+${other}\\b`).test(chunk);

const IDENTIFIER = /^[A-Za-z_$][\w$]*(?:\.[\w$]+)*$/;
const bindingOf = (text, identifier) => {
  const root = identifier.split(".")[0];
  const match = new RegExp(`\\b(?:const|let|var)\\s+${root}\\b\\s*(?::[^=]+)?=\\s*([^;\\n]+)`).exec(text);
  return match ? match[1].trim().replace(/\s+as\s+const$/, "") : undefined;
};
// Follow `const B = A;` aliases to the binding that actually holds the
// knowledge; an expression such as `50 * PENCE_PER_POUND` or a literal is a
// binding of its own.
const rootBinding = (text, identifier, depth = 0) => {
  const bound = bindingOf(text, identifier);
  if (bound === undefined || depth > 5 || !IDENTIFIER.test(bound) || bound === identifier) return identifier;
  return rootBinding(text, bound, depth + 1);
};
const OPERAND = "([A-Za-z_$][\\w$.]*|\\d[\\d_]*(?:\\s*\\*\\s*[\\w$.]+)?)";
const COMPARATOR = "(?:>=|<=|(?<![=-])>|(?<![=-])<)";
const comparisonOperand = (chunk) => {
  const subtotalFirst = new RegExp(`subtotalPence\\([^)]*\\)\\s*${COMPARATOR}\\s*\\(?\\s*${OPERAND}`).exec(chunk);
  if (subtotalFirst) return subtotalFirst[1];
  const subtotalLast = new RegExp(`${OPERAND}\\s*${COMPARATOR}\\s*\\(?\\s*subtotalPence\\(`).exec(chunk);
  if (subtotalLast) return subtotalLast[1];
  const rhs = new RegExp(`${COMPARATOR}\\s*\\(?\\s*${OPERAND}`).exec(chunk);
  return rhs ? rhs[1] : undefined;
};
// The threshold a look-alike rests on: the identifier its comparison names
// (resolved through aliases), or its own literal. Without a comparison in
// the body, the constant or literal it passes on.
const thresholdOf = (text, name) => {
  const chunk = chunkDefining(text, name);
  const operand = comparisonOperand(chunk) ?? /\b([A-Z][A-Z0-9_]+(?:\.[\w$]+)*)\b/.exec(chunk)?.[1] ?? /\b(\d[\d_]*)\b/.exec(chunk)?.[1];
  if (operand === undefined) return undefined;
  if (/^\d/.test(operand)) return { key: `literal in ${name}`, label: operand };
  const root = rootBinding(text, operand);
  return { key: `binding ${root}`, label: root };
};

// 1. "BASELINE: Applicable tests pass" — "Establish a verified, recoverable
//    baseline before refactoring". A test run precedes the first edit; when
//    nothing is edited, the assessment still rests on a run.
exports.baselineBeforeEdit = (output, context) => {
  const calls = lib.trail(context);
  const firstEdit = first(lib.edits(calls));
  const runs = testRuns(calls);
  if (!firstEdit) {
    return lib.verdict(runs.length > 0, runs.length > 0 ? `no edits; baseline run: ${short(runs[0].command)}` : "no edits and no test run: the assessment rests on nothing");
  }
  const before = runs.filter((run) => run.index < firstEdit.index);
  return lib.verdict(
    before.length > 0,
    before.length > 0
      ? `baseline run (#${before[0].index}: ${short(before[0].command)}) preceded the first edit (#${firstEdit.index}, ${lib.basename(firstEdit.path)})`
      : `first edit (#${firstEdit.index}, ${lib.basename(firstEdit.path)}) came before any test run`,
  );
};

// 2. "VERIFY: Keep focused and affected tests plus other proportionate
//    evidence green after each step". A test run follows the last edit.
exports.verifiedAfterLastEdit = (output, context) => {
  const calls = lib.trail(context);
  const lastEdit = last(lib.edits(calls));
  if (!lastEdit) return lib.verdict(true, "no edits to verify");
  const after = testRuns(calls).filter((run) => run.index > lastEdit.index);
  return lib.verdict(after.length > 0, after.length > 0 ? `verified after the last edit: ${short(last(after).command)}` : `no test run after the last edit (#${lastEdit.index}, ${lib.basename(lastEdit.path)})`);
};

// 3. "commit only with explicit user approval" — "Any commits were explicitly
//    approved". No request here approves one, so the trail holds no commit.
exports.noCommitWithoutApproval = (output, context) => {
  const commits = lib.trail(context).filter((call) => call.name === "Bash" && /\bgit\b[^|;&]*\b(commit|stash)\b/.test(call.command));
  return lib.verdict(commits.length === 0, commits.length === 0 ? "no commit or stash without approval" : `committed without approval: ${short(commits[0].command)}`);
};

// 4. "Existing behavior tests pass; test edits are not hiding a behavior
//    change". Every fixture test file still exists with at least as many
//    tests and expectations as it started with.
exports.testsNotWeakened = () => {
  const fixtureTests = lib.sourceFiles(lib.resolve(FIXTURE, "src")).filter(lib.isTestPath);
  const weakened = fixtureTests.flatMap((file) => {
    const target = lib.resolve(lib.workspace(), "src", lib.basename(file));
    if (!require("node:fs").existsSync(target)) return [`${lib.basename(file)} was removed`];
    const before = lib.read(file);
    const after = lib.read(target);
    const its = [count(before, /\b(?:it|test)\(/g), count(after, /\b(?:it|test)\(/g)];
    const expects = [count(before, /\bexpect\(/g), count(after, /\bexpect\(/g)];
    const skipped = /\b(?:it|test|describe)\.(?:skip|todo)\(|\bxit\(|\bxdescribe\(/.test(after);
    return [
      ...(its[1] < its[0] ? [`${lib.basename(file)}: ${its[0]} tests became ${its[1]}`] : []),
      ...(expects[1] < expects[0] ? [`${lib.basename(file)}: ${expects[0]} expectations became ${expects[1]}`] : []),
      ...(skipped ? [`${lib.basename(file)}: tests skipped`] : []),
    ];
  });
  return lib.verdict(weakened.length === 0, weakened.length === 0 ? `fixture tests intact: ${fixtureTests.map((file) => lib.basename(file)).join(", ")}` : weakened.join("; "));
};

// 5. "Priority Classification": Critical / High / Nice / Skip — the reply
//    states the assessment in those classes, as the skill's example does.
//    A class word counts outright when a lead-in names it ("Priority: High",
//    "Classification: Skip.") or when a classification terminator follows it
//    ("Critical (fix now):", "High → extract constants", "| Critical |").
//    A bare label — the class word behind nothing but markers ("- Skip: …",
//    the skill's own `// ⚠️ High: …` / `// ✅ Skip: …`, `"Skip: don't
//    change"`) or opening its line — counts only where the reply is
//    actually classifying: under an assessment/priority/classification
//    heading or alongside a second class word. So a lone "- High: consider
//    a Money type" under "## Next steps" is ordinary prose, and so are
//    "Risk: High | Effort: Low" and a High in a table column headed
//    Risk/Impact/Effort/Severity.
const cellIndex = (before) => (before.match(/\|/g) ?? []).length;
// The header cell above a table cell: walk up to the separator row
// (`| --- | --- |`) and take the row before it. Outside a table, none.
const columnHeader = (lines, lineIndex, before) => {
  for (let index = lineIndex - 1; index >= 0; index -= 1) {
    if (TABLE_SEPARATOR.test(lines[index])) return lines[index - 1]?.split("|")[cellIndex(before)];
    if (!lines[index].includes("|")) return undefined;
  }
  return undefined;
};

const classificationCandidates = (text) => {
  const sectionAt = text.search(ASSESSMENT_SECTION);
  const lines = text.split("\n");
  let offset = 0;
  return lines.flatMap((line, lineIndex) => {
    const lineAt = offset;
    offset += line.length + 1;
    return [...line.matchAll(CLASS_WORD)].flatMap((match) => {
      const before = line.slice(0, match.index);
      const after = line.slice(match.index + match[0].length);
      if (LABELLED_VALUE.test(before)) return [];
      if (VALUE_COLUMN.test(columnHeader(lines, lineIndex, before) ?? "")) return [];
      const lineStart = /^\s*$/.test(before);
      const marked = lineStart || MARKERS_ONLY.test(before) || CELL_OR_BRACKET.test(before);
      const strong = STRONG_TERMINATOR.test(after);
      const weak = WEAK_TERMINATOR.test(after);
      if (!strong && !(marked && weak)) return [];
      const inSection = sectionAt >= 0 && lineAt + match.index > sectionAt;
      return [{ word: match[1], line: line.trim(), firm: strong || inSection }];
    });
  });
};

const classificationIn = (text) => {
  const leadIn = LEAD_IN.exec(text);
  if (leadIn) return leadIn[0];
  const candidates = classificationCandidates(text);
  const firm = candidates.find((candidate) => candidate.firm);
  if (firm) return firm.line;
  const words = new Set(candidates.map((candidate) => candidate.word));
  return words.size > 1 ? first(candidates).line : undefined;
};

exports.assessmentClassified = (output) => {
  const match = classificationIn(String(output ?? ""));
  return lib.verdict(Boolean(match), match ? `reply classifies: "${short(match)}"` : "reply states no Critical/High/Nice/Skip classification");
};

// 6. "Critical: … divergent copies of one business rule" — "Abstract when:
//    Same business concept". The subtotal loop copied into quoteOrder is one
//    rule; after the tidy the line total is computed in exactly one place.
exports.sameKnowledgeUnified = () => {
  const copies = count(stripComments(productionText()), LINE_TOTAL);
  return lib.verdict(copies === 1, copies === 1 ? "line total computed in one place" : copies === 0 ? "no line-total computation found" : `line total computed in ${copies} places`);
};

// 7. "Keep separate when: Different concepts that look similar (structural)
//    … Would evolve independently". Free delivery and bulk discount each
//    rest on their own threshold binding (two constants, two literals, or
//    `50 * PENCE_PER_POUND` spelled twice all count; one constant, or an
//    alias of one, does not) and neither is defined in terms of the other.
exports.lookAlikesKeptSeparate = () => {
  const text = stripComments(productionText());
  const missing = LOOK_ALIKES.filter((name) => !chunkDefining(text, name));
  if (missing.length > 0) return lib.verdict(false, `no definition found for ${missing.join(", ")}`);
  const delegating = LOOK_ALIKES.filter((name) => LOOK_ALIKES.some((other) => other !== name && delegatesTo(chunkDefining(text, name), other)));
  if (delegating.length > 0) return lib.verdict(false, `${delegating.join(" and ")} defined in terms of the other look-alike`);
  const thresholds = LOOK_ALIKES.map((name) => thresholdOf(text, name));
  const unresolved = LOOK_ALIKES.filter((name, index) => thresholds[index] === undefined);
  if (unresolved.length > 0) return lib.verdict(false, `no threshold of its own found in ${unresolved.join(", ")}`);
  const distinct = new Set(thresholds.map((threshold) => threshold.key)).size;
  return lib.verdict(
    distinct === LOOK_ALIKES.length,
    distinct === LOOK_ALIKES.length
      ? `each rule keeps its own threshold (${thresholds.map((threshold) => threshold.label).join(", ")}) and neither delegates to the other`
      : `both rules rest on one threshold (${thresholds[0].label}): two rules now share one piece of knowledge`,
  );
};

// 8. "Skip | Don't change | Already clean code" — "Don't refactor when: The
//    current structure isn't impeding the work at hand". money.ts and its
//    test leave the workspace exactly as they entered it.
exports.noValueDeclined = () => {
  const changed = ["money.ts", "money.test.ts"].filter((name) => {
    const target = lib.resolve(lib.workspace(), "src", name);
    return !require("node:fs").existsSync(target) || lib.read(target) !== lib.read(lib.resolve(FIXTURE, "src", name));
  });
  return lib.verdict(changed.length === 0, changed.length === 0 ? "clean code left alone" : `already-clean code was changed: ${changed.join(", ")}`);
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "refactoring", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
