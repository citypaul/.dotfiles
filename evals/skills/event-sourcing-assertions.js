// Deterministic graders for the event-sourcing quality suite.
//
// The fixture declares that the wallet ledger is event sourced and shows none
// of it, so nothing here assumes a folder layout, and — after the first round
// of verification — nothing here assumes a *file* layout either. Roles are
// found by definition, and every rule is graded over the definitions actually
// reachable from the role it is about:
//
//   * the decider     — `decide`/`evolve`, or the function carrying the
//                       glossary's refusal reasons when the agent named it
//                       something else;
//   * the event store — `createWalletStore` and what its body reaches;
//   * the write path  — `handleWalletCommand` and what its body reaches;
//   * the read model  — `walletScreen` and what its body reaches.
//
// Grading a *definition closure* rather than a whole file is what stops a
// correct single-file module from failing (an async command handler sharing
// `index.ts` with a pure `decide` is organisation, not impurity) and what
// stops a maintained view from passing (the handler's fold is not the
// screen's fold). Files are located in the current workspace and never by an
// absolute path from the tool-call trail, which names the run's own temp
// directory. Every rule graded below is one the event-sourcing skill states.

const lib = require("./quality-lib");

const COMMANDS = new Set(["Open", "TopUp", "Charge"]);
// docs/glossary.md's refused outcomes, in every spelling a codebase uses for
// them. The function that carries these IS the wallet's decision logic,
// whatever it is called — the same "find the role by the case's business
// text" rule hex-assertions.js uses.
const REASONS = ["already-open", "not-open", "invalid-amount", "insufficient-funds"];
const reasonPattern = (reason) => {
  const parts = reason.split("-");
  const camel = parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
  return new RegExp(`${reason}|${parts.join("_")}|${camel}`, "i");
};
const REASON_PATTERNS = REASONS.map(reasonPattern);

const srcFiles = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src"));
const production = () =>
  srcFiles().filter(
    (file) =>
      !lib.isTestPath(file) &&
      !/\/(testing|test-support|test-utils|__tests__)\//.test(file) &&
      !/(^|\/)acceptance-/.test(lib.basename(file)) &&
      !/fakes?\.ts$/.test(file),
  );
const testFiles = () => srcFiles().filter(lib.isTestPath);
const text = (file) => lib.read(file);
const list = (files) => [...new Set(files)].map(lib.rel).join(", ") || "(none)";

// --- reading the source structurally ---------------------------------------

// Blank the interior of comments and string/template literals, preserving
// length, so brace scanning and declaration lookup never trip over a `{` or a
// `;` that lives inside a string. Offsets still index the original text.
const neutralise = (source) => {
  const out = source.split("");
  const blank = (index) => {
    if (source[index] !== "\n") out[index] = " ";
  };
  let index = 0;
  while (index < source.length) {
    const here = source[index];
    const next = source[index + 1];
    if (here === "/" && next === "/") {
      while (index < source.length && source[index] !== "\n") blank(index++);
      continue;
    }
    if (here === "/" && next === "*") {
      blank(index++);
      blank(index++);
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) blank(index++);
      if (index < source.length) {
        blank(index++);
        blank(index++);
      }
      continue;
    }
    if (here === '"' || here === "'" || here === "`") {
      index += 1;
      while (index < source.length && source[index] !== here) {
        if (source[index] === "\\") {
          blank(index++);
          if (index < source.length) blank(index++);
          continue;
        }
        blank(index++);
      }
      index += 1;
      continue;
    }
    index += 1;
  }
  return out.join("");
};

// Where a definition's text ends. `stopAtBlock` closes on the definition's own
// `{ … }` body (functions, interfaces); otherwise only a `;` at depth zero
// ends it, so a multi-member union type is not cut off at its first `}`.
const spanEnd = (neutral, from, stopAtBlock) => {
  const stack = [];
  for (let index = from; index < neutral.length; index += 1) {
    const character = neutral[index];
    if ("{[(".includes(character)) stack.push(character);
    else if ("}])".includes(character)) {
      const opened = stack.pop();
      if (opened === undefined) return index;
      if (opened === "{" && stack.length === 0) {
        if (stopAtBlock) return index + 1;
        // A type alias may continue (`} | {`); anything else ends it, so a
        // member missing its semicolon does not swallow the next declaration.
        const rest = neutral.slice(index + 1).match(/^\s*([|&])?/);
        if (!rest?.[1]) return index + 1;
      }
    } else if (character === ";" && stack.length === 0) return index + 1;
  }
  return neutral.length;
};

const DECLARATION =
  /\b(?:const|let|var)\s+(\w+)\s*[:=]|\bfunction\s*\*?\s+(\w+)\s*(?=\()|\btype\s+(\w+)\b|\binterface\s+(\w+)\b/g;

// Module-scope declarations only. A `const state = …` inside somebody else's
// function is a local, not a definition another role can reach, and treating
// it as one would drag unrelated code into every closure.
const depths = (neutral) => {
  let depth = 0;
  return [...neutral].map((character) => {
    if ("{[(".includes(character)) return depth++;
    if ("}])".includes(character)) return (depth -= 1);
    return depth;
  });
};

const definitionsIn = (file) => {
  const source = text(file);
  const neutral = neutralise(source);
  const depth = depths(neutral);
  return [...neutral.matchAll(DECLARATION)]
    .filter((match) => depth[match.index] === 0)
    .map((match) => {
      const [value, asConst, asFunction, asType, asInterface] = match;
      const kind = asConst || asFunction ? "value" : asType ? "type" : "interface";
      const end = spanEnd(neutral, match.index + value.length, kind !== "type");
      return {
        file,
        kind,
        name: asConst ?? asFunction ?? asType ?? asInterface,
        // `body` keeps the string literals a rule needs to read (event names,
        // refusal reasons); `code` is the same span with comments and string
        // interiors blanked, so a prose mention of "balance" or "store" in a
        // comment can never decide a structural rule.
        body: source.slice(match.index, end),
        code: neutral.slice(match.index, end),
      };
    });
};

const allDefinitions = () => production().flatMap(definitionsIn);
const byName = () => {
  const index = new Map();
  for (const definition of allDefinitions()) {
    index.set(definition.name, [...(index.get(definition.name) ?? []), definition]);
  }
  return index;
};

// Every definition reachable from these names: the definition itself, plus
// every production definition whose name its body mentions, transitively.
// This is the unit every rule below is graded over.
const closureFrom = (names) => {
  const index = byName();
  const seen = new Set();
  const queue = [...names];
  const reached = [];
  while (queue.length > 0 && reached.length < 120) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    for (const definition of index.get(name) ?? []) {
      reached.push(definition);
      for (const match of definition.body.matchAll(/\b[A-Za-z_$][\w$]*\b/g)) {
        if (!seen.has(match[0]) && index.has(match[0])) queue.push(match[0]);
      }
    }
  }
  return reached;
};

const joined = (definitions) => definitions.map((definition) => definition.code).join("\n");
const filesOf = (definitions) => definitions.map((definition) => definition.file);
const named = (name) => byName().get(name) ?? [];

// A fold over a stream of events: `events.reduce(evolve, initialState)`,
// `(await store.readStream(id)).events.reduce(…)`, or the loop form.
const FOLD =
  /\b(?:events?|stream|history|log|records?|envelopes?)\w*\s*\)*\s*\.\s*reduce\s*\(|\.\s*reduce\s*\(\s*(?:async\s*)?\(?\s*\w+\s*,\s*\w+/i;
const LOOP_FOLD = /for\s*\(\s*(?:const|let|var)\s+[\w{}\s,:]+\s+of\s+[\w.\s()]*(?:events?|stream|history|log|records?|envelopes?)/i;
const foldsEvents = (definitions) => {
  const body = joined(definitions);
  return (FOLD.test(body) || LOOP_FOLD.test(body)) && /\bevents?\b/i.test(body);
};

const literalsIn = (body) => [...body.matchAll(/\btype\s*:\s*["'`](\w+)["'`]/g)].map((match) => match[1]);
// A union may name its members instead of inlining them; follow the names.
const memberLiterals = (body) => {
  const index = byName();
  return [...body.matchAll(/\b([A-Z]\w+)\b/g)].flatMap((match) =>
    (index.get(match[1]) ?? [])
      .filter((definition) => definition.kind !== "value")
      .flatMap((definition) => literalsIn(definition.body)),
  );
};
// Every declared union of `type: "…"` facts that is not the command union.
const eventUnions = () =>
  allDefinitions()
    .filter((definition) => definition.kind !== "value")
    .map((definition) => {
      const direct = literalsIn(definition.body);
      return {
        ...definition,
        literals: [...new Set(direct.length > 0 ? direct : memberLiterals(definition.body))],
      };
    })
    .filter((union) => union.literals.length > 0 && !union.literals.every((name) => COMMANDS.has(name)));
const words = (name) => name.split(/(?=[A-Z])/).filter(Boolean);

// The wallet's decision logic: whatever the agent called it. `decide`/`evolve`
// when those names exist (case 1 pins them), otherwise every function whose
// body carries three or more of the glossary's refused outcomes — a `decide`
// that lives inlined inside the async command handler is found here too, and
// that is the point.
const decisionEntries = () => {
  const pinned = ["decide", "evolve"].filter((name) => named(name).length > 0);
  if (pinned.length > 0) return pinned;
  return [
    ...new Set(
      allDefinitions()
        .filter(
          (definition) =>
            definition.kind === "value" &&
            /=>|\bfunction\b|\breturn\b/.test(definition.code) &&
            REASON_PATTERNS.filter((pattern) => pattern.test(definition.body)).length >= 3,
        )
        .map((definition) => definition.name),
    ),
  ];
};

// 1. "`decide` … has no side effects and does not touch storage." /
//    "domain/account/account.ts — pure, no infrastructure imports" / "Give
//    every event an envelope: a unique id, … timestamp … The domain payload is
//    separate from this envelope" — the id, timestamp and metadata belong to
//    the envelope, not to a clock call inside `decide`. Graded over the
//    decider's own definitions, never its file: sharing `index.ts` with an
//    async command handler is layout, not impurity.
exports.deciderIsPure = () => {
  const entries = decisionEntries();
  if (entries.length === 0)
    return lib.verdict(
      false,
      "no production function holds the wallet's decision rules (no `decide`/`evolve`, and nothing carries the glossary's refused outcomes)",
    );
  const reached = closureFrom(entries);
  const hits = reached.flatMap((definition) =>
    [
      [/new Date\s*\(|Date\.now\s*\(/, "reads the clock"],
      [/Math\.random\s*\(/, "generates randomness"],
      [/randomUUID|\bcrypto\./, "mints an id"],
      [/process\.env/, "reads the environment"],
      [/\bfetch\s*\(|setTimeout\s*\(|setInterval\s*\(/, "performs I/O"],
      [/\bawait\b|\basync\b/, "is asynchronous"],
      [/\bstore\b|\brepository\b|\bpersist\w*\b|\bdatabase\b/i, "touches storage"],
    ]
      .filter(([pattern]) => pattern.test(definition.code))
      .map(([, label]) => `${definition.name} (${lib.rel(definition.file)}) ${label}`),
  );
  return lib.verdict(
    hits.length === 0,
    hits.length === 0
      ? `decision logic is pure: ${entries.join(", ")} in ${list(filesOf(reached))}`
      : [...new Set(hits)].join("; "),
  );
};

// 2. "Name them in the past tense, in business language." / "Avoid CRUD
//    events. `AccountCreated` / `AccountUpdated` / `AccountDeleted` is a
//    database changelog wearing an event-sourcing costume." / "Model events as
//    a discriminated union with a `type` discriminant."
exports.eventsArePastTenseFacts = () => {
  const unions = eventUnions();
  if (unions.length === 0)
    return lib.verdict(
      false,
      'no discriminated union of past-tense facts declared (only command-shaped `type: "…"` values, if any)',
    );
  const names = [...new Set(unions.flatMap((union) => union.literals))];
  const pastTense = (name) =>
    words(name).some((word) => /(ed|en|wn|nt|id|ung|ought|aught|one|ade|old|ost|eft|ept)$/.test(word));
  const crud = /(Created|Updated|Deleted|Saved|Modified|Persisted|Inserted|Written|BalanceChanged|StateChanged)$/;
  const bad = names.filter((name) => crud.test(name) || COMMANDS.has(name) || !pastTense(name));
  return lib.verdict(
    bad.length === 0,
    bad.length === 0
      ? `past-tense business events: ${names.join(", ")}`
      : `not past-tense business facts: ${bad.join(", ")} (all: ${names.join(", ")})`,
  );
};

// 3. "There is no stored 'current state'." / "nothing stores current state as
//    the source of truth" — the event store keeps streams of events, not a
//    balance or a statement beside them. Graded over what `createWalletStore`
//    actually holds, not over every line of the file it sits in.
exports.noStoredCurrentState = () => {
  const entries = named("createWalletStore");
  if (entries.length === 0) return lib.verdict(true, "this case persists nothing (no `createWalletStore`)");
  // The events themselves carry money, so the declared event and command
  // vocabulary is not "stored current state" — only what is kept beside them.
  const reached = closureFrom(["createWalletStore"]).filter(
    (definition) => literalsIn(definition.body).length === 0,
  );
  const hits = reached.flatMap((definition) =>
    [
      [/balance/i, "keeps a balance"],
      [/\bstatement\b|\bview\b|\bscreen\b/i, "keeps a read model beside the events"],
      [/currentState|latestState|\bsnapshot/i, "keeps the current state"],
    ]
      .filter(([pattern]) => pattern.test(definition.code))
      .map(([, label]) => `${definition.name} (${lib.rel(definition.file)}) ${label}`),
  );
  return lib.verdict(
    hits.length === 0,
    hits.length === 0
      ? `the store holds events only: ${list(filesOf(reached))}`
      : [...new Set(hits)].join("; "),
  );
};

// 4. "You never `UPDATE` or `DELETE` an event — you only `append`." /
//    "Mutable events … The moment you edit history, replay is no longer
//    trustworthy and the pattern's core promise is broken."
exports.storedEventsNeverMutated = () => {
  const files = production();
  if (files.length === 0) return lib.verdict(false, "no production code");
  const hits = files.flatMap((file) => {
    const body = neutralise(text(file));
    return [
      [/\b\w*[Ee]vents?\s*\[[^\]]+\]\s*=[^=]/, "assigns over a stored event"],
      [
        /\b\w*([Ee]vents?|[Ss]treams?|[Hh]istory|[Rr]ecords?)\s*\.\s*(splice|pop|shift|fill|copyWithin)\s*\(/,
        "removes or overwrites stored events",
      ],
      [
        /\b(update|delete|remove|replace|rewrite|truncate)\w*(Event|Stream|History)\w*\s*[:=(]/i,
        "exposes an update or delete of stored events",
      ],
      [/\bdelete\s+\w+(\.\w+)*\.events?\b|\bstreams?\s*\.\s*(clear|delete)\s*\(/i, "throws stored events away"],
    ]
      .filter(([pattern]) => pattern.test(body))
      .map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  // Inside the store nothing may be rewritten at all: it only appends.
  const inStore = closureFrom(["createWalletStore"]).flatMap((definition) =>
    [
      [/\.\s*(splice|pop|shift|fill|copyWithin|reverse|sort)\s*\(/, "rewrites a stored stream in place"],
      [/\b\w+\s*\[[^\]]+\]\s*=[^=]/, "assigns into a stored stream"],
    ]
      .filter(([pattern]) => pattern.test(definition.code))
      .map(([, label]) => `${definition.name} (${lib.rel(definition.file)}) ${label}`),
  );
  const all = [...new Set([...hits, ...inStore])];
  return lib.verdict(all.length === 0, all.length === 0 ? `append-only: ${list(files)}` : all.join("; "));
};

// 5. "State is a left fold of events … `events.reduce(evolve, initialState)`"
//    / "REHYDRATE current state by folding" — the write path rebuilds the
//    wallet from its stream before it decides, rather than loading a stored
//    state. Graded over the command handler's own closure so a fold that
//    happens to sit elsewhere in the same file cannot stand in for it.
exports.stateRebuiltByFolding = () => {
  const entries = named("handleWalletCommand");
  const reached = entries.length > 0 ? closureFrom(["handleWalletCommand"]) : [];
  if (reached.length === 0)
    return lib.verdict(false, "no production file defines `handleWalletCommand`, so nothing rehydrates a wallet");
  const body = joined(reached);
  const missing = [
    !foldsEvents(reached) && "the command handler does not fold a stream of events",
    !/\b(?:initial|empty|unopened|blank|seed)\w*/i.test(body) &&
      "the fold does not start from an initial state, so it updates rather than rebuilds",
    /\b(?:read|load|get|fetch|restore|save|store|put|write|persist|update|set)\w*(?:State|Balance)\b/i.test(body) &&
      "the write path reads or writes a stored current state instead of rebuilding it",
  ].filter(Boolean);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0
      ? `the command handler rebuilds state by folding the stream from its initial state: ${list(filesOf(reached))}`
      : `${missing.join("; ")} (${list(filesOf(reached))})`,
  );
};

// 6. "Appends use optimistic concurrency (expected version); conflicts are
//    handled by reload-and-retry." / "Never skip the expected version —
//    without it, two concurrent withdrawals can both pass the balance check
//    and overdraw the account."
exports.optimisticConcurrencyOnAppend = () => {
  const files = production();
  if (files.length === 0) return lib.verdict(false, "no production code");
  const expectation = /expected[\s_]*(version|revision)|ifMatch|atVersion/i;
  const onAppend = /\bappend\w*\s*[:=(][\s\S]{0,400}?expected[\s_]*(version|revision)/i;
  // The expectation has to be checked, not merely carried: something compares
  // it against where the stream actually is.
  const compared =
    /(!==|===|!=|==|<=|>=|<|>)\s*[\w.]*expected[\s_]*(version|revision)|expected[\s_]*(version|revision)\s*(!==|===|!=|==|<=|>=|<|>)/i;
  // "conflicts are handled by reload-and-retry": either the loser is told it
  // lost, or the handler reloads and re-decides. Both are handling.
  const handled =
    /version[-_ ]?conflict|concurren\w*|contention|stale|WrongExpectedVersion|ConcurrencyError|\bretry\w*|\bretries\b|\battempts?\b/i;
  const declaring = files.filter((file) => expectation.test(text(file)));
  const appending = files.filter((file) => onAppend.test(text(file)));
  const comparing = files.filter((file) => compared.test(text(file)));
  const handling = files.filter((file) => handled.test(text(file)));
  const missing = [
    declaring.length === 0 && "no production file names an expected version",
    appending.length === 0 && "the append does not take the version the command was decided against",
    comparing.length === 0 && "nothing compares the expected version against the stream",
    handling.length === 0 && "a lost race is neither reported nor retried",
  ].filter(Boolean);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0
      ? `append asserts an expected version in ${list(appending)}; checked in ${list(comparing)}; a lost race is handled in ${list(handling)}`
      : missing.join("; "),
  );
};

// 7. "Read models are disposable derivations. Because state is `fold(events)`,
//    any read-optimised view is just a different fold." / "a projection is
//    just another fold … whose result is a query-shaped table" / "to rebuild,
//    reset the read model and the checkpoint to zero and replay" — the
//    screen's numbers are derived from the wallet's events, not read off a
//    view that the write path keeps up to date. Graded over the definitions
//    the screen itself reaches, so a fold sitting in the command handler
//    cannot be mistaken for the screen's fold.
exports.readModelIsAProjection = () => {
  if (named("walletScreen").length === 0)
    return lib.verdict(false, "no production file defines `walletScreen`");
  const reading = closureFrom(["walletScreen"]);
  if (foldsEvents(reading))
    return lib.verdict(true, `the screen is folded from the wallet's events: ${list(filesOf(reading))}`);
  // An inline projection is legitimate too — but only if it is a fold that can
  // be replayed from event zero, so a named rebuild/replay/projection entry
  // point has to exist and fold events itself.
  const rebuilders = [
    ...new Set(
      allDefinitions()
        .filter(
          (definition) =>
            definition.kind === "value" &&
            /^(rebuild|replay|reproject)/i.test(definition.name) &&
            /statement|balanceAfterPence/i.test(definition.code),
        )
        .map((definition) => definition.name),
    ),
  ];
  const rebuilding = rebuilders.length > 0 ? closureFrom(rebuilders) : [];
  if (rebuilding.length > 0 && foldsEvents(rebuilding))
    return lib.verdict(
      true,
      `the screen reads a projection rebuilt by folding events: ${rebuilders.join(", ")} in ${list(filesOf(rebuilding))}`,
    );
  return lib.verdict(
    false,
    `the screen is not derived from the wallet's events: nothing reachable from \`walletScreen\` folds a stream (${list(filesOf(reading))}), and no rebuildable projection folds one either`,
  );
};

// 8. "Everything pure (`evolve`, `decide`) is trivially testable with no
//    mocks." / "No event bus or mocks are required." — the tests the agent
//    wrote call the public functions and assert on the data they return.
exports.testedWithoutMocks = (output, context) => {
  const touched = lib.touchedBy(context);
  const files = testFiles().filter(touched);
  if (files.length === 0) return lib.verdict(false, "the agent wrote or edited no test file");
  const exercising = files.filter((file) =>
    /\b(decide|evolve|createWalletStore|handleWalletCommand|walletScreen)\s*\(/.test(text(file)),
  );
  if (exercising.length === 0)
    return lib.verdict(false, `no touched test calls the wallet's public functions: ${list(files)}`);
  const smells = files.flatMap((file) => {
    const body = text(file);
    return [
      [/\bvi\.(mock|doMock|fn|spyOn)\s*\(/, "mocks or spies"],
      [/\.toHaveBeenCalled(Times|With|Once)?\s*\(/, "asserts on calls rather than outcomes"],
    ]
      .filter(([pattern]) => pattern.test(body))
      .map(([, label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(
    smells.length === 0,
    smells.length === 0 ? `behaviour tests without mocks: ${list(exercising)}` : smells.join("; "),
  );
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "event-sourcing", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
