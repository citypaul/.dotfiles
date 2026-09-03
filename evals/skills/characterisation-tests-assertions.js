// Deterministic graders for the characterisation-tests quality suite.
//
// The fixture is a deployed billing library with three untested legacy
// modules. The agent is asked to make one of them safe to change; the skill
// says that means pinning what the code does today — not what it should do —
// in tests that are recognisable as scaffolding, and leaving the production
// code alone. Two sources of truth: the ordered tool-call trail (what the
// agent did) and the workspace it left behind (what the tests are), compared
// against the pristine fixture in fixtures/characterisation-tests-workspace.
// Every export is a rule the skill states; the rule is quoted above it.

const { existsSync, writeFileSync, unlinkSync, mkdirSync } = require("node:fs");
const { dirname } = require("node:path");
const { tmpdir } = require("node:os");
const lib = require("./quality-lib");

const FIXTURE = lib.resolve(__dirname, "fixtures", "characterisation-tests-workspace");
const isAcceptance = (file) => /acceptance-[^/]+\.test\.ts$/.test(file);

// Fixture production files, as relative paths ("src/proration.ts").
const fixtureProduction = () =>
  lib.sourceFiles(lib.resolve(FIXTURE, "src")).filter((file) => !lib.isTestPath(file)).map((file) => file.slice(FIXTURE.length + 1));
const fixtureText = (relPath) => lib.read(lib.resolve(FIXTURE, relPath));
const workspacePath = (relPath) => lib.resolve(lib.workspace(), relPath);

// The agent's tests: every test file under the workspace's source and test
// directories that the fixture does not contain, or contains with different
// text. Found by content, not by the trail, so a regrade from a saved diff
// sees the same files the live run did.
const agentTestFiles = () =>
  ["src", "test", "tests", "__tests__"]
    .flatMap((dir) => lib.sourceFiles(lib.resolve(lib.workspace(), dir)))
    .filter((file) => lib.isTestPath(file) && !isAcceptance(file))
    .filter((file) => {
      const relPath = lib.rel(file);
      const original = lib.resolve(FIXTURE, relPath);
      return !existsSync(original) || lib.read(original) !== lib.read(file);
    });
const agentTestText = () => agentTestFiles().map(lib.read).join("\n");
const list = (files) => files.map(lib.rel).join(", ") || "(none)";

// Hidden "fixes" for each quirk the fixture carries. A pinned quirk is one
// whose fix makes the agent's tests fail; the case names which apply
// (vars.mutants, comma-separated).
const MUTANTS = {
  "proration-cancel-day-inclusive": {
    file: "src/proration.ts",
    from: "for (let d = start; d <= cancelled; d++) daysUsed++;",
    to: "for (let d = start; d < cancelled; d++) daysUsed++;",
  },
  "proration-cancelled-before-start-charged-in-full": {
    file: "src/proration.ts",
    from: "if (cancelled < start) return monthlyPence;",
    to: "if (cancelled < start) return 0;",
  },
  // Only an example whose fraction is .5 or more tells floor from round —
  // a "natural" mid-March example on a 3100p month lands on whole pence.
  "proration-rounds-down": {
    file: "src/proration.ts",
    from: "return Math.floor((monthlyPence * daysUsed) / daysInPeriod);",
    to: "return Math.round((monthlyPence * daysUsed) / daysInPeriod);",
  },
  "statement-label-boundary": {
    file: "src/statement.ts",
    from: "if (label.length >= LABEL_WIDTH)",
    to: "if (label.length > LABEL_WIDTH)",
  },
  "statement-credit-in-parentheses": {
    file: "src/statement.ts",
    from: 'pence < 0 ? "(" + formatPence(-pence) + ")" : formatPence(pence)',
    to: "formatPence(pence)",
  },
  "late-fee-grace-boundary": {
    file: "src/late-fee.ts",
    from: "if (daysOverdue <= GRACE_DAYS) return 0;",
    to: "if (daysOverdue < GRACE_DAYS) return 0;",
  },
  "late-fee-unknown-tier-standard-rate": {
    file: "src/late-fee.ts",
    from: 'if (rate === undefined) rate = RATES["standard"]!;',
    to: "if (rate === undefined) rate = 0;",
  },
  "late-fee-grace-days-charged": {
    file: "src/late-fee.ts",
    from: "Math.round(overduePence * rate * daysOverdue)",
    to: "Math.round(overduePence * rate * (daysOverdue - GRACE_DAYS))",
  },
  "late-fee-cap": {
    file: "src/late-fee.ts",
    from: "if (fee > CAP_PENCE) fee = CAP_PENCE;",
    to: "",
  },
  "late-fee-plus-rate": {
    file: "src/late-fee.ts",
    from: "plus: 0.01,",
    to: "plus: 0.015,",
  },
  // Only an example whose fee has a fraction of .5 or more tells round from
  // floor (12345p for 5 days is 1234.5 → 1235); round-number examples miss it.
  "late-fee-rounds-half-up": {
    file: "src/late-fee.ts",
    from: "let fee = Math.round(overduePence * rate * daysOverdue);",
    to: "let fee = Math.floor(overduePence * rate * daysOverdue);",
  },
};

// Run `fn` with the fixture's production files in the workspace replaced by
// `transform(relPath, pristineText)`, then put the agent's versions back.
const withProduction = (transform, fn) => {
  const saved = fixtureProduction().map((relPath) => {
    const target = workspacePath(relPath);
    return { relPath, target, existed: existsSync(target), text: existsSync(target) ? lib.read(target) : null };
  });
  try {
    saved.forEach(({ relPath, target }) => {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, transform(relPath, fixtureText(relPath)));
    });
    return fn();
  } finally {
    saved.forEach(({ target, existed, text }) => {
      if (existed) writeFileSync(target, text);
      else if (existsSync(target)) unlinkSync(target);
    });
  }
};

const runAgentTests = () => lib.run("pnpm exec vitest run --exclude '**/acceptance-*.test.ts'");

// The same run, read per test: one row per test with the file it lives in and
// whether it failed. Used to find which of the agent's tests a quirk's hidden
// fix turns red — that is the test that pins the quirk.
const runAgentTestsPerTest = () => {
  const report = lib.resolve(tmpdir(), `characterisation-tests-${process.pid}-${Math.random().toString(36).slice(2)}.json`);
  try {
    lib.run(`pnpm exec vitest run --exclude '**/acceptance-*.test.ts' --reporter=json --outputFile='${report}'`);
    if (!existsSync(report)) return null;
    const parsed = JSON.parse(lib.read(report));
    return (parsed.testResults ?? []).flatMap((file) => (file.assertionResults ?? []).map((test) => ({ file: file.name, title: test.title, failed: test.status === "failed" })));
  } catch {
    return null;
  } finally {
    if (existsSync(report)) unlinkSync(report);
  }
};
const testRunCommand = (command) => /\b(vitest|pnpm test|npm test|pnpm run test|npm run test)\b/.test(command);

// The trail only names a path for the edit tools. A file written from Bash —
// a heredoc, a redirect, `tee`, `sed -i` — shows up as a command whose write
// target matches `target` (a regex source, e.g. an escaped file name).
// The command is read as shell words rather than scanned as text: a `;` or a
// newline inside a quoted sed script belongs to the script, and a file named
// on the next line of a multi-line command belongs to that line's command, not
// to this line's `tee`.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Heredoc bodies are file content, not commands: drop them first, so the
// quotes and separators inside a test file being written cannot confuse the
// split below.
const withoutHeredocBodies = (command) => {
  const lines = command.split("\n");
  const kept = [];
  for (let index = 0; index < lines.length; index += 1) {
    kept.push(lines[index]);
    const delimiters = [...lines[index].matchAll(/<<-?(?!<)\s*(?:'([^']*)'|"([^"]*)"|\\?([A-Za-z_]\w*))/g)].map((match) => match[1] ?? match[2] ?? match[3]);
    for (const delimiter of delimiters) {
      while (index + 1 < lines.length && lines[index + 1].trim() !== delimiter) index += 1;
      index += 1;
    }
  }
  return kept.join("\n");
};

// One segment per pipeline stage, list element or line; each segment is its
// quote-aware words, with redirection operators kept as words of their own.
const SEPARATORS = new Set(["\n", ";", "|", "&", "(", ")"]);
const shellSegments = (command) => {
  const text = withoutHeredocBodies(command);
  const segments = [];
  let words = [];
  let word = "";
  let started = false;
  const endWord = () => {
    if (started) words.push(word);
    word = "";
    started = false;
  };
  const endSegment = () => {
    endWord();
    if (words.length) segments.push(words);
    words = [];
  };
  const add = (character) => {
    word += character;
    started = true;
  };
  let index = 0;
  while (index < text.length) {
    const character = text[index];
    if (character === "\\") {
      add(text[index + 1] ?? "");
      index += 2;
      continue;
    }
    if (character === "'" || character === '"') {
      started = true;
      index += 1;
      while (index < text.length && text[index] !== character) {
        if (character === '"' && text[index] === "\\") {
          add(text[index + 1] ?? "");
          index += 2;
          continue;
        }
        add(text[index]);
        index += 1;
      }
      index += 1;
      continue;
    }
    if (SEPARATORS.has(character)) {
      endSegment();
      index += 1;
      continue;
    }
    if (/\s/.test(character)) {
      endWord();
      index += 1;
      continue;
    }
    if (character === ">" || character === "<") {
      endWord();
      let operator = character;
      while (text[index + operator.length] === character) operator += character;
      index += operator.length;
      words.push(operator);
      continue;
    }
    add(character);
    index += 1;
  }
  endSegment();
  return segments;
};

const WRAPPERS = new Set(["sudo", "env", "command", "xargs", "time", "nohup"]);
const commandOf = (words) => {
  let index = 0;
  while (index < words.length && (/^\w+=/.test(words[index]) || WRAPPERS.has(lib.basename(words[index])))) index += 1;
  return { name: words[index] === undefined ? "" : lib.basename(words[index]), args: words.slice(index + 1) };
};

// sed edits the files named after its script; a bare `-i` takes a backup
// suffix first (BSD's `sed -i ''`). Reading the operands this way keeps a
// file name that only appears *inside* the script out of the answer.
const sedFiles = (args) => {
  const files = [];
  let suffixNext = false;
  let scriptSeen = false;
  for (const arg of args) {
    if (/^-/.test(arg)) {
      suffixNext = arg === "-i";
      continue;
    }
    if (suffixNext && (arg === "" || /^\.\w+$/.test(arg))) {
      suffixNext = false;
      continue;
    }
    suffixNext = false;
    if (!scriptSeen) {
      scriptSeen = true;
      continue;
    }
    files.push(arg);
  }
  return files;
};

const bashWrites = (command, target) => {
  const hits = (word) => word !== "" && new RegExp(target).test(word);
  return shellSegments(command).some((words) => {
    const redirected = words.some((word, index) => /^>>?$/.test(word) && words[index + 1] !== undefined && !/^[<>]+$/.test(words[index + 1]) && hits(words[index + 1]));
    if (redirected) return true;
    const { name, args } = commandOf(words.filter((word) => !/^[<>]+$/.test(word)));
    if (name === "tee") return args.filter((arg) => !/^-/.test(arg)).some(hits);
    if (name === "sed" && args.some((arg) => /^--in-place/.test(arg) || /^-[A-Za-z]*i/.test(arg))) return sedFiles(args).some(hits);
    return false;
  });
};
const TEST_FILE = "[\\w./-]*\\.test\\.[jt]sx?\\b";
const bashTestWrites = (calls) => calls.filter((call) => call.name === "Bash" && bashWrites(call.command, TEST_FILE) && !/acceptance-/.test(call.command));
const usesSnapshots = (text) => /toMatch(Inline|File)?Snapshot\(/.test(text);
const titlesOf = (text, callee) => [...text.matchAll(new RegExp(`\\b${callee}(?:\\.(?:each|only|skip|todo|concurrent)(?:\\([^)]*\\))?)?\\(\\s*(["'\`])((?:(?!\\1)[^\\\\]|\\\\.)*)\\1`, "g"))].map((m) => m[2]);
const CHARACTERISATION = /characteri[sz]/i;

// The skill's marker vocabulary: "-- SUSPICIOUS: returns negative bonus",
// "This may be a bug", "Documented as-is; escalate before changing." Calling
// the behaviour a bug, unintended or unexpected is the same mark in other
// words, so those count; "not a bug" does not. What is deliberately *not*
// marker wording is the fixture's own header comment — "check with billing
// before changing anything here" (src/proration.ts:2): copying a line out of
// the file under test is not flagging the behaviour.
const SUSPICIOUS_MARKER = new RegExp(
  [
    "suspicious",
    "escalat\\w*",
    "(?<!not a )(?<!n't a )(?<!no )bugs?\\b",
    "unintended",
    "unintentional",
    "not intended",
    "unexpected",
    "(?:looks?|seems?|reads?) wrong",
  ].join("|"),
  "i",
);

// The end of the call that starts at `open` (the "(" of an `it(`), skipping
// strings and comments so a ")" inside an expectation does not close it.
const callEnd = (text, open) => {
  let depth = 0;
  let index = open;
  while (index < text.length) {
    const character = text[index];
    if (character === "/" && text[index + 1] === "/") {
      const line = text.indexOf("\n", index);
      if (line === -1) return text.length;
      index = line;
      continue;
    }
    if (character === "/" && text[index + 1] === "*") {
      const close = text.indexOf("*/", index + 2);
      index = close === -1 ? text.length : close + 2;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      index += 1;
      while (index < text.length && text[index] !== character) index += text[index] === "\\" ? 2 : 1;
      index += 1;
      continue;
    }
    if (character === "(") depth += 1;
    if (character === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
    index += 1;
  }
  return text.length;
};

// The comment lines directly above a test — where the skill's example puts
// "Documented as-is; escalate before changing."
const commentAbove = (text, start) => {
  const lines = text.slice(0, start).split("\n");
  const taken = [];
  for (let index = lines.length - 2; index >= 0; index -= 1) {
    const line = lines[index].trim();
    if (line === "" || line.startsWith("//") || line.startsWith("*") || line.startsWith("/*") || line.endsWith("*/")) taken.unshift(lines[index]);
    else break;
  }
  return taken.join("\n");
};

// Each `it(...)`/`test(...)` in a file as its title and the source that
// stands for it: the comment above, the title, and the body.
const testBlocks = (text) => {
  const pattern = /(?:^|[\s;{)])(?:it|test)(?:\.(?:each|only|skip|todo|concurrent|fails)(?:\([^)]*\))?)?\s*\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g;
  return [...text.matchAll(pattern)].map((match) => {
    const start = match.index + (/^[\s;{)]/.test(match[0]) ? 1 : 0);
    // The "(" the title is the first argument of — not one an `it.each([…])`
    // opens, nor one inside the title itself.
    const quote = match.index + match[0].length - match[2].length - 2;
    const open = text.lastIndexOf("(", quote);
    return { title: match[2], text: `${commentAbove(text, start)}\n${text.slice(start, callEnd(text, open))}` };
  });
};

// A title in the source against the title the runner reported: equal once
// escapes are resolved, the first piece of a title concatenated from several
// literals, or equal up to the placeholders of an `it.each` or a template
// literal.
const titleMatches = (source, reported) => {
  const literal = source.replace(/\\(.)/g, "$1");
  if (literal === reported) return true;
  if (literal.length >= 8 && reported.startsWith(literal)) return true;
  const pattern = literal
    .split(/%[sdifjop#%]|\$\{[^}]*\}|\$\w+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\S]*");
  return new RegExp(`^${pattern}$`).test(reported);
};

// 1. "Characterisation tests have no moral authority. They don't assert
//    correctness -- they detect *change*." / "'Fixing' bugs in
//    characterisation tests: document the actual behavior, mark as
//    suspicious, escalate." The production code is left exactly as the
//    fixture shipped it: no fixture production file was edited (trail, by an
//    edit tool or a Bash write) and none differs (workspace).
exports.noProductionEdits = (output, context) => {
  const files = fixtureProduction();
  const calls = lib.trail(context);
  const edited = [
    ...lib
      .edits(calls)
      .filter((call) => files.some((relPath) => lib.sameFile(call.path, workspacePath(relPath))))
      .map((call) => `${lib.basename(call.path)} (${call.name} #${call.index})`),
    ...calls
      .filter((call) => call.name === "Bash" && files.some((relPath) => bashWrites(call.command, escapeRegex(lib.basename(relPath)))))
      .map((call) => `Bash #${call.index}: ${call.command.split("\n")[0].slice(0, 60)}`),
  ];
  const changed = files.filter((relPath) => !existsSync(workspacePath(relPath)) || lib.read(workspacePath(relPath)) !== fixtureText(relPath));
  const clean = edited.length === 0 && changed.length === 0;
  return lib.verdict(
    clean,
    clean
      ? `production untouched: ${files.join(", ")}`
      : [changed.length ? `production differs from the fixture: ${changed.join(", ")}` : "", edited.length ? `production edited: ${edited.join(", ")}` : ""].filter(Boolean).join("; "),
  );
};

// 2. "Let the code tell you what it does" / "Writing characterisation tests
//    based on what code *should* do" is a mistake. The agent's tests pass
//    against the fixture exactly as shipped, whatever the agent did to the
//    production files afterwards.
exports.testsPassOnUnmodifiedFixture = () => {
  const files = agentTestFiles();
  if (files.length === 0) return lib.verdict(false, "no test file was written or changed");
  const result = withProduction((relPath, text) => text, runAgentTests);
  return lib.verdict(result.ok, `${result.ok ? "green" : "red"} on the unmodified fixture (${list(files)}): ${lib.vitestSummary(result.out)}`);
};

// 3. "Every branch your upcoming change touches has a characterisation test
//    exercising it" and "Mark suspicious behavior -- document it in the test
//    ... don't silently 'fix' it": a quirk is pinned only if its hidden fix
//    breaks the agent's tests. Each mutant named by the case must be caught.
exports.quirksPinned = (output, context) => {
  const names = String(context?.vars?.mutants ?? "").split(",").map((name) => name.trim()).filter(Boolean);
  const unknown = names.filter((name) => !MUTANTS[name]);
  if (unknown.length) return lib.verdict(false, `unknown mutant(s) in vars.mutants: ${unknown.join(", ")}`);
  if (agentTestFiles().length === 0) return lib.verdict(false, "no test file was written or changed");
  const baseline = withProduction((relPath, text) => text, runAgentTests);
  if (!baseline.ok) return lib.verdict(false, `tests are red on the unmodified fixture, so a failure proves nothing: ${lib.vitestSummary(baseline.out)}`);
  const outcomes = names.map((name) => {
    const mutant = MUTANTS[name];
    const pristine = fixtureText(mutant.file);
    if (!pristine.includes(mutant.from)) return { name, applied: false, caught: false };
    const result = withProduction((relPath, text) => (relPath === mutant.file ? text.replace(mutant.from, mutant.to) : text), runAgentTests);
    return { name, applied: true, caught: !result.ok };
  });
  const notApplied = outcomes.filter((o) => !o.applied).map((o) => o.name);
  if (notApplied.length) return lib.verdict(false, `harness defect: mutant text not found in the fixture for ${notApplied.join(", ")}`);
  const missed = outcomes.filter((o) => !o.caught).map((o) => o.name);
  const caught = outcomes.filter((o) => o.caught).map((o) => o.name);
  return lib.verdict(missed.length === 0, missed.length === 0 ? `every quirk pinned: ${caught.join(", ")}` : `quirk(s) a hidden fix did not break: ${missed.join(", ")}${caught.length ? ` (pinned: ${caught.join(", ")})` : ""}`);
};

// 4. "Characterisation tests must be immediately recognisable": "Use a
//    distinct file suffix" (scoring.characterisation.test.ts) and "Use
//    `characterises` in the test name to distinguish from behavior-driven
//    tests" — never `it('should ...')`.
exports.recognisableAsCharacterisation = () => {
  const files = agentTestFiles();
  if (files.length === 0) return lib.verdict(false, "no test file was written or changed");
  const problems = files.flatMap((file) => {
    const text = lib.read(file);
    const describes = titlesOf(text, "describe");
    const its = [...titlesOf(text, "it"), ...titlesOf(text, "test")];
    const named = describes.some((title) => CHARACTERISATION.test(title)) || (its.length > 0 && its.every((title) => CHARACTERISATION.test(title)));
    const should = its.filter((title) => /\bshould\b/i.test(title));
    return [
      !/\.characteri[sz]ation\.test\.[jt]sx?$/.test(file) ? `${lib.rel(file)}: file suffix is not .characterisation.test.ts` : "",
      !named ? `${lib.rel(file)}: neither the describe nor every test title says "characterises"` : "",
      should.length ? `${lib.rel(file)}: "should" titles assert intent: ${should.slice(0, 2).map((t) => `"${t}"`).join(", ")}` : "",
    ].filter(Boolean);
  });
  return lib.verdict(problems.length === 0, problems.length === 0 ? `recognisable: ${list(files)}` : problems.join("; "));
};

// 5. "Add a block comment at the top of each characterisation test file
//    explaining the purpose and the planned lifecycle ... why these tests
//    exist and when to remove them."
exports.lifecycleDocumented = () => {
  const files = agentTestFiles();
  if (files.length === 0) return lib.verdict(false, "no test file was written or changed");
  const problems = files.flatMap((file) => {
    const text = lib.read(file);
    const firstImport = text.search(/^\s*import\b/m);
    const head = firstImport >= 0 ? text.slice(0, firstImport) : text;
    const comments = [...head.matchAll(/\/\*[\s\S]*?\*\/|(?:^\s*\/\/.*\n?)+/gm)].map((m) => m[0]).join("\n");
    const comment = comments.trim() ? comments : [...text.matchAll(/\/\*[\s\S]*?\*\//g)].map((m) => m[0]).join("\n");
    const purpose = CHARACTERISATION.test(comment) && /actual|current|existing|as[- ]is|today|really does|not .{0,20}(correct|intended|desired)/i.test(comment);
    const lifecycle = /replace|temporary|remove|retire|delete|scaffold|refactor|until/i.test(comment);
    return [
      !comment.trim() ? `${lib.rel(file)}: no block comment at the top of the file` : "",
      comment.trim() && !purpose ? `${lib.rel(file)}: header comment does not say these tests document actual behaviour` : "",
      comment.trim() && !lifecycle ? `${lib.rel(file)}: header comment does not say when the tests are replaced or removed` : "",
    ].filter(Boolean);
  });
  return lib.verdict(problems.length === 0, problems.length === 0 ? `lifecycle documented: ${list(files)}` : problems.join("; "));
};

// 6. "When a characterisation test captures behavior that looks like a bug,
//    mark it explicitly" (`-- SUSPICIOUS: ...`) and "Documented as-is;
//    escalate before changing." Case-specific, and specific to the one quirk
//    the case names in vars.suspicious: the marker has to be on the test that
//    pins *that* quirk — found by applying the quirk's hidden fix and seeing
//    which of the agent's tests go red — and not merely somewhere in some
//    test file. It counts in the test's title, its body, or the comment lines
//    directly above it, which is where the skill's example puts it.
exports.suspiciousMarked = (output, context) => {
  const files = agentTestFiles();
  if (files.length === 0) return lib.verdict(false, "no test file was written or changed");
  const name = String(context?.vars?.suspicious ?? "").trim();
  const quirk = MUTANTS[name];
  if (!quirk) return lib.verdict(false, `unknown quirk in vars.suspicious: ${name || "(unset)"}`);
  if (!fixtureText(quirk.file).includes(quirk.from)) return lib.verdict(false, `harness defect: quirk text not found in the fixture for ${name}`);
  const shipped = withProduction((relPath, pristine) => pristine, runAgentTestsPerTest);
  if (!shipped) return lib.verdict(false, "no test report for the fixture as shipped");
  if (shipped.some((test) => test.failed)) return lib.verdict(false, "tests are red on the unmodified fixture, so which test pins the quirk cannot be told");
  const fixed = withProduction((relPath, pristine) => (relPath === quirk.file ? pristine.replace(quirk.from, quirk.to) : pristine), runAgentTestsPerTest);
  if (!fixed) return lib.verdict(false, `no test report with ${name} fixed`);
  const own = (reported) => files.find((file) => lib.rel(file) === lib.rel(reported) || lib.basename(file) === lib.basename(reported));
  const pinning = fixed.filter((test) => test.failed && own(test.file));
  if (pinning.length === 0) return lib.verdict(false, `no test pins the ${name} quirk, so no test marks it`);
  const marked = pinning.filter((test) => {
    const source = lib.read(own(test.file));
    const blocks = testBlocks(source).filter((block) => titleMatches(block.title, test.title));
    return blocks.length ? blocks.some((block) => SUSPICIOUS_MARKER.test(block.text)) : SUSPICIOUS_MARKER.test(source);
  });
  const quoted = (tests) => tests.slice(0, 3).map((test) => `"${test.title}"`).join(", ");
  return lib.verdict(
    marked.length > 0,
    marked.length > 0
      ? `${name} pinned and marked as suspicious by ${quoted(marked)}`
      : `${name} is pinned but no test marks it as suspicious: ${quoted(pinning)}`,
  );
};

// 7. The algorithm: "Write an assertion you know will fail ... Let the failure
//    tell you the behavior ... Change the test so it expects the behavior
//    the code actually produces." In the trail that is a test run between
//    two edits of a test file — or, when snapshots do the recording
//    ("Vitest fills it in on first run"), a test run after the test edit.
//    A test written from Bash (heredoc, redirect, tee) counts as an edit; if
//    the trail shows no test write at all, the workspace's test files are
//    the evidence they were written, and the runs alone must show the
//    oracle was consulted more than once (or snapshots recorded it).
exports.oracleObserved = (output, context) => {
  const calls = lib.trail(context);
  const files = agentTestFiles();
  if (files.length === 0) return lib.verdict(false, "no test file was written or changed");
  const toolEdits = lib.edits(calls).filter((call) => lib.isTestPath(call.path) && !isAcceptance(call.path));
  const testEdits = [...toolEdits, ...bashTestWrites(calls)].sort((a, b) => a.index - b.index);
  const runs = calls.filter((call) => call.name === "Bash" && testRunCommand(call.command));
  if (testEdits.length === 0) {
    if (runs.length === 0) return lib.verdict(false, `${list(files)} exist but the trail has no test run — the oracle was never consulted`);
    if (usesSnapshots(agentTestText())) return lib.verdict(true, `no test write visible in the trail; snapshots in ${list(files)} recorded by run #${runs[0].index}`);
    if (runs.length >= 2) return lib.verdict(true, `no test write visible in the trail; ${list(files)} were run ${runs.length} times (#${runs[0].index} … #${runs[runs.length - 1].index})`);
    return lib.verdict(false, `no test write visible in the trail and a single test run (#${runs[0].index}): nothing shows the code told the test what it does`);
  }
  const firstEdit = testEdits[0];
  const runAfterEdit = runs.find((run) => run.index > firstEdit.index);
  if (!runAfterEdit) return lib.verdict(false, "no test run after the first test edit — the oracle was never consulted");
  const editAfterRun = testEdits.find((edit) => edit.index > runAfterEdit.index);
  if (editAfterRun) return lib.verdict(true, `test edit #${firstEdit.index} → run #${runAfterEdit.index} → test edit #${editAfterRun.index}: the code told the test what it does`);
  if (usesSnapshots(agentTestText())) return lib.verdict(true, `snapshots recorded by the run #${runAfterEdit.index} after test edit #${firstEdit.index}`);
  return lib.verdict(false, "the tests were written once and run once: expectations came from reading, not from the failure");
};

// 8. Case-specific (modern-tooling.md): "Snapshots automate the 'let the
//    failure tell you the behavior' step" — for a multi-line rendering, the
//    agent's statement tests use toMatchInlineSnapshot / toMatchSnapshot /
//    toMatchFileSnapshot rather than a hand-typed expected string.
exports.snapshotUsed = () => {
  const files = agentTestFiles().filter((file) => lib.importsOf(lib.read(file)).some((spec) => /statement/.test(spec)));
  if (files.length === 0) return lib.verdict(false, "no agent test imports the statement module");
  const using = files.filter((file) => usesSnapshots(lib.read(file)));
  return lib.verdict(using.length > 0, using.length > 0 ? `snapshot assertions in ${list(using)}` : `no snapshot assertion in ${list(files)}`);
};

// Shared grader, shaped for a preservation task. The hidden acceptance test
// pins the behaviour as deployed, so the untouched fixture alone would
// satisfy it; what the request asks for is a safety net. "Safe to change" is
// delivered when the agent's tests exist, are green on the fixture exactly
// as shipped, and the deployed behaviour the acceptance test pins is still
// what the workspace does.
exports.behaviourDelivered = (output, context) => {
  const files = agentTestFiles();
  if (files.length === 0) return lib.verdict(false, "no safety net delivered: no test file was written or changed");
  const own = withProduction((relPath, text) => text, runAgentTests);
  if (!own.ok) return lib.verdict(false, `the agent's tests are red on the fixture as shipped (${list(files)}): ${lib.vitestSummary(own.out)}`);
  const acceptance = lib.runAcceptance({ suite: "characterisation-tests", name: context?.vars?.acceptance, targetDir: "src" });
  return lib.verdict(acceptance.pass, `${list(files)} green on the shipped fixture; acceptance ${acceptance.reason}`);
};

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
