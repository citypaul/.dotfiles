// Deterministic graders for the event-sourcing quality suite.
//
// The fixture declares that the wallet ledger is event sourced and shows none
// of it, so nothing here assumes a folder layout, and nothing here assumes a
// *file* layout either. Roles are found by definition, and every rule is
// graded over the definitions actually reachable from the role it is about:
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
// screen's fold).
//
// A definition's span is found by walking the source the way the language
// reads it: parameter lists, generic arguments and RETURN TYPE ANNOTATIONS
// are skipped before the body is entered, so `(…): Promise<{ … }> => { … }`
// is graded on its body and not on its signature, and comments, strings,
// template literals and regular-expression literals never contribute a brace
// or decide a rule. Files are located in the current workspace and never by
// an absolute path from the tool-call trail, which names the run's own temp
// directory. Every rule graded below is one the event-sourcing skill states.
//
// No rule may be decided by a NAME the agent was free to choose. A fold is
// found by walking back from `.reduce(` over the whole receiver chain
// (`history.facts.reduce(…)`) or by the local binding that chain starts from,
// or by a reducer that handles the declared event names; a fold's seed is
// read for what it holds, through local and module-scope bindings, so
// `nothingYet` is as good as `initialState`; the discriminated union may be
// declared as a type or parsed by a schema (`type: z.literal("WalletOpened")`);
// and a lost race is handled when the code retries, catches, or looks at the
// write's answer and can refuse the caller — never because it used a
// particular word for the conflict. Anything that would mark the skill's own
// prescribed shape wrong is a defect in this file, not in the answer.

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

// One pass over the source recording where comments, string and template
// literals and regular-expression literals are. A `/` starts a regex only
// where a value may start (after an operator, a keyword or an opening
// bracket); anywhere else it is division.
const REGEX_MAY_START = /[({[,;:=!&|?+\-*%^~<>]$|\b(?:return|typeof|case|in|of|do|else|yield|await|new|delete|void|instanceof)$/;
const literalRanges = (source) => {
  const comments = [];
  const literals = [];
  let index = 0;
  let significant = "";
  const remember = (character) => {
    if (!/\s/.test(character)) significant = (significant + character).slice(-12);
  };
  while (index < source.length) {
    const here = source[index];
    const next = source[index + 1];
    if (here === "/" && next === "/") {
      const start = index;
      while (index < source.length && source[index] !== "\n") index += 1;
      comments.push([start, index]);
      continue;
    }
    if (here === "/" && next === "*") {
      const start = index;
      index += 2;
      while (index < source.length && !(source[index] === "*" && source[index + 1] === "/")) index += 1;
      index = Math.min(index + 2, source.length);
      comments.push([start, index]);
      continue;
    }
    if (here === '"' || here === "'" || here === "`") {
      const start = index;
      index += 1;
      while (index < source.length && source[index] !== here) {
        index += source[index] === "\\" ? 2 : 1;
      }
      literals.push([start + 1, Math.min(index, source.length)]);
      index += 1;
      significant = "x";
      continue;
    }
    if (here === "/" && REGEX_MAY_START.test(significant)) {
      const start = index;
      index += 1;
      let inClass = false;
      while (index < source.length && source[index] !== "\n") {
        const character = source[index];
        if (character === "\\") {
          index += 2;
          continue;
        }
        if (character === "[") inClass = true;
        else if (character === "]") inClass = false;
        else if (character === "/" && !inClass) break;
        index += 1;
      }
      if (index < source.length && source[index] === "/") {
        literals.push([start + 1, index]);
        index += 1;
        significant = "x";
        continue;
      }
      index = start + 1;
      remember(here);
      continue;
    }
    remember(here);
    index += 1;
  }
  return { comments, literals };
};

const blankOut = (source, ranges) => {
  const out = source.split("");
  for (const [from, to] of ranges) {
    for (let index = from; index < to && index < source.length; index += 1) {
      if (source[index] !== "\n") out[index] = " ";
    }
  }
  return out.join("");
};

// `code`  — comments and literal interiors blanked: what the structural rules
//           read, so neither prose nor a string can decide one.
// `plain` — comments blanked only: what the rules that must read event names
//           and refusal reasons read.
const analysed = new Map();
const analyse = (file) => {
  const source = text(file);
  const cached = analysed.get(file);
  if (cached && cached.source === source) return cached;
  const { comments, literals } = literalRanges(source);
  const entry = {
    source,
    code: blankOut(source, [...comments, ...literals]),
    plain: blankOut(source, comments),
  };
  analysed.set(file, entry);
  return entry;
};
const isSpace = (character) => character === " " || character === "\t" || character === "\n" || character === "\r";
const skipSpace = (n, from) => {
  let index = from;
  while (index < n.length && isSpace(n[index])) index += 1;
  return index;
};
const CLOSER = { "(": ")", "[": "]", "{": "}" };
// The index just after the bracket group opening at `at`.
const groupEnd = (n, at) => {
  const stack = [CLOSER[n[at]]];
  let index = at + 1;
  while (index < n.length) {
    const character = n[index];
    if (character === "(" || character === "[" || character === "{") stack.push(CLOSER[character]);
    else if (character === ")" || character === "]" || character === "}") {
      if (character !== stack[stack.length - 1]) return index;
      stack.pop();
      if (stack.length === 0) return index + 1;
    }
    index += 1;
  }
  return n.length;
};
// The index just after a generic argument list opening at `at`.
const angleEnd = (n, at) => {
  let depth = 0;
  let index = at;
  while (index < n.length) {
    const character = n[index];
    if (character === "<") {
      depth += 1;
      index += 1;
      continue;
    }
    if (character === "=" && n[index + 1] === ">") {
      index += 2;
      continue;
    }
    if (character === ">") {
      depth -= 1;
      index += 1;
      if (depth <= 0) return index;
      continue;
    }
    if (character === "(" || character === "[" || character === "{") {
      index = groupEnd(n, index);
      continue;
    }
    if (character === ")" || character === "]" || character === "}" || character === ";") return index;
    index += 1;
  }
  return n.length;
};

const TYPE_OPERATOR = /^(?:keyof|typeof|readonly|infer|extends|is|asserts|new|in|out|const|abstract)$/;
// Where a type annotation ends. Type atoms (identifiers, literals, object,
// tuple and parenthesised types, generic arguments) alternate with type
// operators; the first thing that cannot continue the type ends it — which,
// for a function signature, is the `{` of the body or the `=>` of an arrow.
const typeEnd = (n, from) => {
  let index = skipSpace(n, from);
  let expectAtom = true;
  let lastAtomWasParen = false;
  while (index < n.length) {
    index = skipSpace(n, index);
    if (index >= n.length) return index;
    const character = n[index];
    if (character === "{") {
      if (!expectAtom) return index;
      index = groupEnd(n, index);
      expectAtom = false;
      lastAtomWasParen = false;
      continue;
    }
    if (character === "(") {
      if (!expectAtom) return index;
      index = groupEnd(n, index);
      expectAtom = false;
      lastAtomWasParen = true;
      continue;
    }
    if (character === "[") {
      index = groupEnd(n, index);
      expectAtom = false;
      lastAtomWasParen = false;
      continue;
    }
    if (character === "<") {
      index = angleEnd(n, index);
      expectAtom = false;
      continue;
    }
    if (character === "=" && n[index + 1] === ">") {
      // `(a: string) => void` is a function type; anything else that reaches
      // an arrow has finished the type — this is an arrow function's body.
      if (!lastAtomWasParen) return index;
      index += 2;
      expectAtom = true;
      lastAtomWasParen = false;
      continue;
    }
    if (character === "|" || character === "&" || character === "," || character === "?" || character === ":") {
      index += 1;
      expectAtom = true;
      lastAtomWasParen = false;
      continue;
    }
    if (character === ".") {
      index += 1;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      const close = n.indexOf(character, index + 1);
      index = close === -1 ? n.length : close + 1;
      expectAtom = false;
      lastAtomWasParen = false;
      continue;
    }
    const word = /^[A-Za-z_$][\w$]*/.exec(n.slice(index));
    if (word) {
      expectAtom = TYPE_OPERATOR.test(word[0]);
      lastAtomWasParen = false;
      index += word[0].length;
      continue;
    }
    const number = /^-?\d[\w.]*/.exec(n.slice(index));
    if (number) {
      expectAtom = false;
      lastAtomWasParen = false;
      index += number[0].length;
      continue;
    }
    return index;
  }
  return n.length;
};

// Where an expression ends: the `;` that closes it, or the newline after it
// when nothing continues the expression on the next line.
const CONTINUES = /^(?:[.?:|&+\-*/%,)\]}<>=!]|as\b|satisfies\b|instanceof\b|in\b)/;
const expressionEnd = (n, from) => {
  let index = from;
  while (index < n.length) {
    const character = n[index];
    if (character === "(" || character === "[" || character === "{") {
      index = groupEnd(n, index);
      continue;
    }
    if (character === ";") return index + 1;
    if (character === ")" || character === "]" || character === "}") return index;
    if (character === "\n") {
      const next = skipSpace(n, index);
      if (next >= n.length) return index;
      if (CONTINUES.test(n.slice(next, next + 12))) {
        index = next;
        continue;
      }
      return index;
    }
    index += 1;
  }
  return n.length;
};

// Where a value ends: an arrow's or function expression's body brace, an
// object or array literal, or the expression's own end. The signature — type
// parameters, parameter list, return type — is walked over, never counted as
// the body.
const valueEnd = (n, from) => {
  let index = skipSpace(n, from);
  while (true) {
    const word = /^[A-Za-z_$][\w$]*/.exec(n.slice(index));
    if (word && word[0] === "async") {
      index = skipSpace(n, index + word[0].length);
      continue;
    }
    break;
  }
  const keyword = /^[A-Za-z_$][\w$]*/.exec(n.slice(index));
  if (keyword && keyword[0] === "function") {
    index = skipSpace(n, index + keyword[0].length);
    if (n[index] === "*") index = skipSpace(n, index + 1);
    const name = /^[A-Za-z_$][\w$]*/.exec(n.slice(index));
    if (name) index = skipSpace(n, index + name[0].length);
    if (n[index] === "<") index = skipSpace(n, angleEnd(n, index));
    if (n[index] === "(") index = skipSpace(n, groupEnd(n, index));
    if (n[index] === ":") index = skipSpace(n, typeEnd(n, index + 1));
    return n[index] === "{" ? groupEnd(n, index) : index;
  }
  if (n[index] === "<") {
    const afterGenerics = skipSpace(n, angleEnd(n, index));
    if (n[afterGenerics] === "(") index = afterGenerics;
  }
  if (n[index] === "(") {
    let after = skipSpace(n, groupEnd(n, index));
    if (n[after] === ":") after = skipSpace(n, typeEnd(n, after + 1));
    if (n[after] === "=" && n[after + 1] === ">") {
      const body = skipSpace(n, after + 2);
      return n[body] === "{" ? groupEnd(n, body) : expressionEnd(n, body);
    }
    return expressionEnd(n, index);
  }
  const identifier = /^[A-Za-z_$][\w$]*/.exec(n.slice(index));
  if (identifier) {
    const after = skipSpace(n, index + identifier[0].length);
    if (n[after] === "=" && n[after + 1] === ">") {
      const body = skipSpace(n, after + 2);
      return n[body] === "{" ? groupEnd(n, body) : expressionEnd(n, body);
    }
  }
  if (n[index] === "{" || n[index] === "[") return expressionEnd(n, groupEnd(n, index));
  return expressionEnd(n, index);
};

// Where a `class` or `interface` declaration ends: its own `{ … }`, past any
// type parameters and `extends`/`implements` clause.
const headerBodyEnd = (n, from) => {
  let index = from;
  while (index < n.length) {
    const character = n[index];
    if (character === "<") {
      index = angleEnd(n, index);
      continue;
    }
    if (character === "(") {
      index = groupEnd(n, index);
      continue;
    }
    if (character === "{") return groupEnd(n, index);
    if (character === ";") return index + 1;
    index += 1;
  }
  return n.length;
};

const DECLARATION =
  /\b(?:const|let|var)\s+(\w+)\s*[:=]|\bfunction\s*\*?\s+(\w+)\s*(?=\()|\btype\s+(\w+)\b|\binterface\s+(\w+)\b|\bclass\s+(\w+)\b/g;

// Module-scope declarations only. A `const state = …` inside somebody else's
// function is a local, not a definition another role can reach, and treating
// it as one would drag unrelated code into every closure.
const depths = (n) => {
  let depth = 0;
  return [...n].map((character) => {
    if (character === "(" || character === "[" || character === "{") return depth++;
    if (character === ")" || character === "]" || character === "}") return (depth -= 1);
    return depth;
  });
};

const definitionEnd = (n, match) => {
  const [value, asConst, asFunction, asType] = match;
  const after = match.index + value.length;
  if (asConst) {
    if (value.trim().endsWith(":")) {
      const afterType = typeEnd(n, after);
      const assignment = skipSpace(n, afterType);
      if (n[assignment] === "=" && n[assignment + 1] !== "=" && n[assignment + 1] !== ">") {
        return valueEnd(n, assignment + 1);
      }
      return afterType;
    }
    return valueEnd(n, after);
  }
  if (asFunction) {
    let index = skipSpace(n, after);
    if (n[index] === "<") index = skipSpace(n, angleEnd(n, index));
    if (n[index] === "(") index = skipSpace(n, groupEnd(n, index));
    if (n[index] === ":") index = skipSpace(n, typeEnd(n, index + 1));
    return n[index] === "{" ? groupEnd(n, index) : index;
  }
  if (asType) {
    let index = skipSpace(n, after);
    if (n[index] === "<") index = skipSpace(n, angleEnd(n, index));
    if (n[index] !== "=") return index;
    const end = typeEnd(n, index + 1);
    return n[end] === ";" ? end + 1 : end;
  }
  return headerBodyEnd(n, after);
};

const definitionsIn = (file) => {
  const { code, plain } = analyse(file);
  const depth = depths(code);
  return [...code.matchAll(DECLARATION)]
    .filter((match) => depth[match.index] === 0)
    .map((match) => {
      const [, asConst, asFunction, asType, asInterface, asClass] = match;
      const kind = asConst || asFunction ? "value" : asClass ? "class" : asType ? "type" : "interface";
      const end = definitionEnd(code, match);
      return {
        file,
        kind,
        name: asConst ?? asFunction ?? asType ?? asInterface ?? asClass,
        // `plain` keeps the string literals a rule needs to read (event
        // names, refusal reasons) with comments gone; `code` has both
        // comments and literals blanked, so neither a prose mention of
        // "balance" nor a string can decide a structural rule.
        plain: plain.slice(match.index, end),
        code: code.slice(match.index, end),
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
// every production definition whose name its *code* mentions, transitively.
// Reading `code` and not the raw span is what keeps a comment from dragging
// an unrelated role into a closure. This is the unit every rule is graded
// over.
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
      for (const match of definition.code.matchAll(/\b[A-Za-z_$][\w$]*\b/g)) {
        if (!seen.has(match[0]) && index.has(match[0])) queue.push(match[0]);
      }
    }
  }
  return reached;
};

const joined = (definitions) => definitions.map((definition) => definition.code).join("\n");
const filesOf = (definitions) => definitions.map((definition) => definition.file);
const named = (name) => byName().get(name) ?? [];

// --- the wallet's history, whatever the agent called it ---------------------

// "Stream | The ordered sequence of events for one aggregate instance." One
// list of the words a codebase uses for that sequence, shared by every rule
// that has to recognise it, so no two rules can disagree about what an event
// stream may be called. `console.log` is not a log.
const EVENT_WORD =
  /(?<!console\s*\.\s*)\b(?:events?|evts?|stream\w*|histor\w*|logs?|records?|envelopes?|facts?|journal\w*|ledger\w*|timelines?)\b/i;

const OPENER = { ")": "(", "]": "[", "}": "{" };
// The index of the bracket opening the group that closes at `at`.
const groupStart = (n, at) => {
  const want = OPENER[n[at]];
  let depth = 0;
  let index = at;
  while (index >= 0) {
    const character = n[index];
    if (character === ")" || character === "]" || character === "}") depth += 1;
    else if (character === "(" || character === "[" || character === "{") {
      depth -= 1;
      if (depth === 0) return character === want ? index : -1;
    }
    index -= 1;
  }
  return -1;
};

// The expression a `.method(…)` hangs off, read backwards from its dot:
// identifiers, property accesses, and the call, index and group brackets
// before them. `history.facts.reduce(…)` reads as `history.facts` and
// `(await store.readStream(id)).events.reduce(…)` as the whole parenthesised
// load — so a chained property access can no longer hide the stream.
const receiverChain = (n, dot) => {
  let index = dot - 1;
  let from = dot;
  while (index >= 0) {
    while (index >= 0 && isSpace(n[index])) index -= 1;
    if (index < 0) break;
    const character = n[index];
    if (character === ")" || character === "]") {
      const open = groupStart(n, index);
      if (open < 0) break;
      from = open;
      index = open - 1;
      continue;
    }
    if (/[\w$]/.test(character)) {
      let head = index;
      while (head >= 0 && /[\w$]/.test(n[head])) head -= 1;
      from = head + 1;
      index = head;
      while (index >= 0 && isSpace(n[index])) index -= 1;
      if (index >= 0 && n[index] === ".") {
        index = n[index - 1] === "?" ? index - 2 : index - 1;
        continue;
      }
      break;
    }
    break;
  }
  return n.slice(from, dot);
};

// The depth-0 arguments of the bracket group opening at `at`.
const argumentsOf = (n, at) => {
  const inside = n.slice(at + 1, Math.max(at + 1, groupEnd(n, at) - 1));
  const parts = [];
  let depth = 0;
  let last = 0;
  for (let index = 0; index < inside.length; index += 1) {
    const character = inside[index];
    if (character === "(" || character === "[" || character === "{") depth += 1;
    else if (character === ")" || character === "]" || character === "}") depth -= 1;
    else if (character === "," && depth === 0) {
      parts.push(inside.slice(last, index));
      last = index + 1;
    }
  }
  parts.push(inside.slice(last));
  return parts.map((part) => part.trim());
};

// Every `const x = …` in a body, destructured ones included, kept with the
// declaration it came from, so a rule can ask what a local name actually
// holds instead of guessing from how it is spelled.
const bindingsIn = (body) => {
  const bindings = new Map();
  for (const match of body.matchAll(
    /\b(?:const|let|var)\s+(\{[^{}]*\}|\[[^\][]*\]|[A-Za-z_$][\w$]*)\s*(?::[^=;]*?)?=\s*/g,
  )) {
    const declaration = body.slice(match.index, expressionEnd(body, match.index + match[0].length));
    const target = match[1];
    const names = /^[{[]/.test(target)
      ? [...target.matchAll(/([A-Za-z_$][\w$]*)\s*(?::\s*([A-Za-z_$][\w$]*))?/g)].map((part) => part[2] ?? part[1])
      : [target];
    for (const name of names) if (!bindings.has(name)) bindings.set(name, declaration);
  }
  return bindings;
};

// A fold: what it folds over, what it folds with, and what it starts from.
const reduceCalls = (body) =>
  [...body.matchAll(/\.\s*(?:reduce|reduceRight)\s*\(/g)].map((match) => {
    const open = body.indexOf("(", match.index + match[0].length - 1);
    const args = argumentsOf(body, open).filter((argument, index, all) => !(index === all.length - 1 && index > 0 && argument.trim() === ""));
    return {
      receiver: receiverChain(body, match.index),
      reducer: args[0] ?? "",
      seed: args.length > 1 ? args[args.length - 1] : "",
    };
  });
const LOOP_OVER = /\bfor\s*(?:await\s+)?\(\s*(?:const|let|var)\s+[^;()]*?\bof\b([^)]*)\)/g;

// Is this expression the wallet's history? Either it is named for it, or the
// local name it starts from was bound to something that is.
const READ_FROM_STORE = /\b(?:read\w*|load\w*|fetch\w*|stream\w*|history|events?|store)\b/i;
const eventSource = (expression, bindings) => {
  if (EVENT_WORD.test(expression)) return true;
  const root = /^[A-Za-z_$][\w$]*/.exec(expression.trim());
  if (root === null) return false;
  const bound = bindings.get(root[0]) ?? "";
  return EVENT_WORD.test(bound) || READ_FROM_STORE.test(bound);
};
// A reducer that handles the declared event names is folding events, whatever
// the thing it folds over happens to be called.
const handlesEvents = (reducer) => {
  const names = [...new Set(eventUnions().flatMap((union) => union.literals))];
  if (names.length === 0) return false;
  const identifier = /^[A-Za-z_$][\w$]*$/.exec(reducer.trim());
  const bodies = [reducer, ...(identifier === null ? [] : named(identifier[0]).map((definition) => definition.plain))];
  if (/\b(?:evolve\w*|apply\w*)\s*\(/i.test(reducer)) return true;
  return bodies.some((text) => names.some((name) => text.includes(name)));
};

// A fold over a stream of events — `events.reduce(evolve, initialState)`,
// `history.facts.reduce(buildScreen, { … })`, or the loop form — found by
// what it folds, never by how the fold is spelled.
const eventFolds = (definitions) => {
  const body = joined(definitions);
  const bindings = bindingsIn(body);
  return {
    body,
    bindings,
    folds: reduceCalls(body).filter((call) => eventSource(call.receiver, bindings) || handlesEvents(call.reducer)),
    loops: [...body.matchAll(LOOP_OVER)].filter((match) => eventSource(match[1], bindings)),
  };
};
const foldsEvents = (definitions) => {
  const { folds, loops } = eventFolds(definitions);
  return folds.length > 0 || loops.length > 0;
};

// "…from its initial state": a rebuild starts from nothing, not from what is
// already there. The seed is nothing when it is written out as the empty
// thing (`{ currency: "", balancePence: 0, statement: [] }`) or when the name
// it uses resolves — locally or at module scope — to one. No name is
// required to contain a blessed word: `nothingYet` and `unopenedWallet` are
// read for what they hold.
const NOTHING_NAMED = /\b(?:initial|empty|unopened|blank|zero|fresh|seed|nothing|scratch|none|start)\w*/i;
const NOTHING_VALUE = /=\s*(?:[{[]|new\b|0\b|undefined\b|null\b|""|''|``)/;
const seedIsNothing = (seed, bindings) => {
  const text = seed.trim();
  if (text === "") return false;
  if (/^[{[]/.test(text) || /^new\b/.test(text)) return true;
  if (/^(?:undefined|null|0|""|''|``)$/.test(text)) return true;
  if (NOTHING_NAMED.test(text)) return true;
  const root = /^[A-Za-z_$][\w$]*/.exec(text);
  if (root === null) return false;
  const declaration = bindings.get(root[0]) ?? named(root[0]).map((definition) => definition.code).join("\n");
  return NOTHING_VALUE.test(declaration) && !/\bawait\b/.test(declaration) && !STORED_STATE_ACCESS.test(declaration);
};
// The loop form's seed is the accumulator the loop assigns: find what the
// loop body writes to, then read what that name was declared as.
const loopSeedIsNothing = (body, loop, bindings) => {
  const start = skipSpace(body, loop.index + loop[0].length);
  const end = body[start] === "{" ? groupEnd(body, start) : expressionEnd(body, start);
  return [...body.slice(start, end).matchAll(/\b([A-Za-z_$][\w$]*)\s*=[^=]/g)].some((assignment) => {
    const declaration = bindings.get(assignment[1]);
    return declaration !== undefined && seedIsNothing(declaration.slice(declaration.indexOf("=") + 1), bindings);
  });
};
const foldsFromScratch = (definitions) => {
  const { body, folds, loops, bindings } = eventFolds(definitions);
  return (
    folds.some((call) => seedIsNothing(call.seed, bindings)) ||
    loops.some((loop) => loopSeedIsNothing(body, loop, bindings))
  );
};

// A discriminated union's members, whether the discriminant is written as a
// type literal (`type: "WalletOpened"`) or parsed by a schema at the trust
// boundary (`type: z.literal("WalletOpened")`) — the skill asks for both:
// "Model events as a discriminated union with a `type` discriminant" and
// "stored events are validated with a schema (tolerant reader) on read".
const TYPE_LITERAL = /\btype\s*:\s*(?:["'`](\w+)["'`]|\w+\s*\.\s*literal\s*\(\s*["'`](\w+)["'`]\s*\))/g;
const literalsIn = (body) => [...body.matchAll(TYPE_LITERAL)].map((match) => match[1] ?? match[2]);
// A union may name its members instead of inlining them, and a schema union
// names them too (`z.discriminatedUnion("type", [opened, toppedUp])`, or
// `type WalletEvent = z.infer<typeof walletEventSchema>`): follow every name
// it mentions, whatever kind of definition that name turns out to be. The
// command union is never followed — it would otherwise leak `TopUp` into a
// result type that merely mentions both.
const memberLiterals = (body) => {
  const index = byName();
  return [...new Set([...body.matchAll(/\b[A-Za-z_$][\w$]*\b/g)].map((match) => match[0]))].flatMap((name) =>
    (index.get(name) ?? []).flatMap((definition) => {
      const literals = literalsIn(definition.plain);
      return literals.every((literal) => COMMANDS.has(literal)) ? [] : literals;
    }),
  );
};
// A value definition only counts as a union when it is one: a schema built
// out of literals, not any old constant.
const SCHEMA_SHAPED = /discriminatedUnion|\w+\s*\.\s*(?:literal|object|union|enum)\s*\(|Schema\b|\bas\s+const\b/;
// Every declared union of `type: "…"` facts that is not the command union.
const eventUnions = () =>
  allDefinitions()
    .filter(
      (definition) =>
        definition.kind !== "class" && (definition.kind !== "value" || SCHEMA_SHAPED.test(definition.code)),
    )
    .map((definition) => {
      const direct = literalsIn(definition.plain);
      return {
        ...definition,
        literals: [...new Set(direct.length > 0 ? direct : memberLiterals(definition.plain))],
      };
    })
    .filter((union) => union.literals.length > 0 && !union.literals.every((name) => COMMANDS.has(name)));
const words = (name) => name.split(/(?=[A-Z])/).filter(Boolean);

// The wallet's decision logic: whatever the agent called it. `decide`/`evolve`
// when those names exist (no case pins them any more), otherwise every function whose
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
            REASON_PATTERNS.filter((pattern) => pattern.test(definition.plain)).length >= 3,
        )
        .map((definition) => definition.name),
    ),
  ];
};

// The wallet's own state vocabulary: the state type the decider folds events
// into, and everything that describes it. A snapshot of that state is "a
// cached fold result stored to avoid replaying long streams. An optimisation,
// never the source of truth", so it is not what `noStoredCurrentState` looks
// for. The command handler is never treated as the decider here: when the
// rules were inlined into it, its row types are exactly what that rule is
// about.
const stateVocabulary = () => {
  const found = [
    ...new Set([
      ...decisionEntries().filter((name) => name !== "handleWalletCommand" && name !== "walletScreen"),
      ...["initialState", "evolve", "decide"].filter((name) => named(name).length > 0),
    ]),
  ];
  // The decider's own functions belong to it too: a store that folds a
  // snapshot with `evolve` reaches the decider, and `evolve` naturally names
  // the balance. What the STORE keeps beside the events is what this rule is
  // about, not what it calls.
  return new Set(
    (found.length > 0 ? closureFrom(found) : []).map((definition) => `${definition.file}:${definition.name}`),
  );
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
//    actually holds, not over every line of the file it sits in. A snapshot
//    is not marked down: the skill calls it "a cached fold result stored to
//    avoid replaying long streams. An optimisation, never the source of
//    truth."
exports.noStoredCurrentState = () => {
  const entries = named("createWalletStore");
  if (entries.length === 0) return lib.verdict(true, "this case persists nothing (no `createWalletStore`)");
  const everything = closureFrom(["createWalletStore"]);
  // The events themselves carry money, and so does the state the decider
  // folds them into — a snapshot of that state is an optimisation the skill
  // blesses, not a stored source of truth — so the declared event vocabulary
  // and the decider's own types are not what this rule is looking for. What
  // the store keeps BESIDE the events is.
  const vocabulary = stateVocabulary();
  const reached = everything.filter(
    (definition) => literalsIn(definition.plain).length === 0 && !vocabulary.has(`${definition.file}:${definition.name}`),
  );
  const keepsEvents = EVENT_WORD.test(joined(everything));
  const hits = reached.flatMap((definition) =>
    [
      [/balance/i, "keeps a balance"],
      [/\bstatement\b|\bview\b|\bscreen\b/i, "keeps a read model beside the events"],
      [/currentState|latestState/i, "keeps the current state"],
    ]
      .filter(([pattern]) => pattern.test(definition.code))
      .map(([, label]) => `${definition.name} (${lib.rel(definition.file)}) ${label}`),
  );
  const all = [
    ...new Set([...hits, ...(keepsEvents ? [] : ["the store keeps no stream of events, so what it holds IS the state"])]),
  ];
  return lib.verdict(
    all.length === 0,
    all.length === 0 ? `the store holds events only: ${list(filesOf(reached))}` : all.join("; "),
  );
};

// 4. "You never `UPDATE` or `DELETE` an event — you only `append`." /
//    "Mutable events … The moment you edit history, replay is no longer
//    trustworthy and the pattern's core promise is broken."
exports.storedEventsNeverMutated = () => {
  const files = production();
  if (files.length === 0) return lib.verdict(false, "no production code");
  const hits = files.flatMap((file) => {
    const body = analyse(file).code;
    return [
      // The index has to be an expression, never a quoted key: a type
      // annotation such as `WalletStore["readStream"] = …` names a method on
      // the port, it does not write over an event.
      [/\b\w*[Ee]vents?\s*\[\s*[^\]"'`\s][^\]]*\]\s*=[^=]/, "assigns over a stored event"],
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
      [/\b\w+\s*\[\s*[^\]"'`\s][^\]]*\]\s*=[^=]/, "assigns into a stored stream"],
    ]
      .filter(([pattern]) => pattern.test(definition.code))
      .map(([, label]) => `${definition.name} (${lib.rel(definition.file)}) ${label}`),
  );
  const all = [...new Set([...hits, ...inStore])];
  return lib.verdict(all.length === 0, all.length === 0 ? `append-only: ${list(files)}` : all.join("; "));
};

// A read or write of state held by something that persists it: `store.state`,
// `await repository.loadBalance(id)`, `db.saveState(…)`. A pure helper called
// `updateBalance` is not that — the receiver is what makes it storage.
const STORED_STATE_ACCESS =
  /\b(?:store|stores|repo|repos|repository|repositories|db|database|persistence|storage|cache|state[Ss]tore)\b\s*(?:\??\.\s*\w*\s*)*\??\.\s*\w*(?:[Ss]tate|[Bb]alance|[Cc]urrent)\w*\s*(?:\(|\.|;|,|\)|=|$)/;
const STORED_STATE_FIELD = /\b(?:store|repository|db|database|persistence|storage)\s*\??\.\s*(?:state|balance\w*|current\w*)\b/i;

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
    foldsEvents(reached) &&
      !foldsFromScratch(reached) &&
      "the fold starts from something already there rather than from nothing, so it updates rather than rebuilds",
    (STORED_STATE_ACCESS.test(body) || STORED_STATE_FIELD.test(body)) &&
      "the write path reads or writes a current state held by the store instead of rebuilding it",
  ].filter(Boolean);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0
      ? `the command handler rebuilds state by folding the stream from its initial state: ${list(filesOf(reached))}`
      : `${missing.join("; ")} (${list(filesOf(reached))})`,
  );
};

// The version a write is made against, however the agent spelled it.
const EXPECTATION =
  /\b(?:expected\w*|version\w*|revision\w*|sequence\w*|seq|position|offset|concurrencyToken|ifMatch|atVersion|etag)\b/i;
// Something compares it against where the stream actually is: any relational
// test with a version-ish operand on either side.
const VERSION_SIDE = "[\\w.?[\\]]*(?:expected|version|revision|sequence|seq|position|offset|etag)[\\w.?[\\]]*";
const VERSION_COMPARED = new RegExp(
  `${VERSION_SIDE}\\s*(?:!==|===|!=|==|<=|>=|<|>)|(?:!==|===|!=|==|<=|>=|<|>)\\s*${VERSION_SIDE}`,
  "i",
);
// Writing the stream down, however the agent spelled that: append, commit,
// save, write, persist, put, add, record, publish.
const WRITE_VERB = /\b(append|commit|save|write|persist|put|add|record|publish|push)\w*\s*(?::\s*)?(?:=\s*)?(?:async\s*)?(?:<[^<>()]*>\s*)?\(/gi;

// Is what a call answers actually used? `const outcome = await store.append(…)`
// and `if (!(await commit(…)))` use it; a bare `await store.append(…)` throws
// the answer away, so it can neither report nor retry a lost race.
const resultObserved = (body, at) => {
  let start = at;
  let index = at - 1;
  while (index >= 0 && isSpace(body[index])) index -= 1;
  if (index >= 0 && body[index] === ".") start = index - receiverChain(body, index).length;
  let fragment = "";
  let scan = start - 1;
  while (scan >= 0 && !";{}".includes(body[scan])) {
    fragment = body[scan] + fragment;
    scan -= 1;
  }
  const before = fragment.replace(/\bawait\b/g, "").trim();
  return before !== "" && !/^[)\]},.?:]+$/.test(before);
};
// Every write in a body, with the arguments (or parameters) it takes and
// whether its answer is used. A declaration (`append: (…) => …`) is a write
// that can carry a version but is not itself a call.
const writeCalls = (body) =>
  [...body.matchAll(new RegExp(WRITE_VERB.source, "gi"))].flatMap((match) => {
    const open = body.indexOf("(", match.index + match[0].length - 1);
    if (open === -1) return [];
    return [
      {
        args: body.slice(open, groupEnd(body, open)),
        isCall: !/[:=]/.test(match[0]),
        observed: resultObserved(body, match.index),
      },
    ];
  });
// The version travels inside the write's own argument or parameter list —
// directly, or in a name bound to it (`const guard = { expectedVersion: … }`).
const carriesVersion = (args, bindings) =>
  EXPECTATION.test(args) ||
  [...args.matchAll(/[A-Za-z_$][\w$]*/g)].some((match) => EXPECTATION.test(bindings.get(match[0]) ?? ""));

// 6. "Appends use optimistic concurrency (expected version); conflicts are
//    handled by reload-and-retry." / "Never skip the expected version —
//    without it, two concurrent withdrawals can both pass the balance check
//    and overdraw the account." Graded over the write path's own definitions
//    (the handler and the store), and the version has to travel in a write's
//    own argument or parameter list — a nearby type declaration is not a
//    write asserting a version. How a lost race is *handled* is read from
//    what the code does with the write's answer, never from the words it
//    chooses: the skill's own bounded reload-and-re-decide loop counts, and so
//    does refusing the loser, whatever the reason string says.
exports.optimisticConcurrencyOnAppend = () => {
  const roles = ["handleWalletCommand", "createWalletStore"].filter((name) => named(name).length > 0);
  const writePath = roles.length > 0 ? closureFrom(roles) : allDefinitions();
  if (writePath.length === 0) return lib.verdict(false, "no production code");
  const body = joined(writePath);
  const bindings = bindingsIn(body);
  const carrying = writePath.filter((definition) =>
    writeCalls(definition.code).some((call) => carriesVersion(call.args, bindings)),
  );
  // "conflicts are handled by reload-and-retry": either the write is inside a
  // loop that reloads and re-decides, or its answer is caught, or its answer
  // is looked at and the caller can be refused. All three are handling; a
  // bare `await store.append(…)` whose answer is discarded is not.
  const retries = writePath.some(
    (definition) => /\b(?:for|while)\s*\(/.test(definition.code) && writeCalls(definition.code).some((call) => call.isCall),
  );
  const caught = /\btry\s*\{/.test(body) && /\bcatch\b/.test(body);
  const refuses =
    /\b(?:success|accepted|ok|appended|committed|written|stored|saved|applied|persisted)\s*:\s*false\b|\breason\s*:|\bthrow\b/.test(
      body,
    );
  const answered = writeCalls(body).some((call) => call.isCall && call.observed) && refuses;
  const missing = [
    !EXPECTATION.test(body) && "no production code in the write path names the version a command was decided against",
    carrying.length === 0 && "no write takes the version the command was decided against",
    !VERSION_COMPARED.test(body) && "nothing compares that version against where the stream actually is",
    !(retries || caught || answered) &&
      "a lost race is neither reported nor retried: the write's answer is thrown away",
  ].filter(Boolean);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0
      ? `a write asserts an expected version in ${list(filesOf(carrying))}, and the write path compares it and handles a lost race`
      : `${missing.join("; ")} (${list(filesOf(writePath))})`,
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
  // A view kept up to date as the writes happen is legitimate too — but only
  // if it is disposable: something has to rebuild the screen's own shape by
  // replaying the wallet's events from zero. Found by what it does, not by
  // what it is called.
  const rebuilders = [
    ...new Set(
      allDefinitions()
        .filter(
          (definition) =>
            definition.kind === "value" &&
            definition.name !== "walletScreen" &&
            /statement|balanceAfterPence/i.test(
              closureFrom([definition.name])
                .map((reached) => reached.code)
                .join("\n"),
            ) &&
            foldsFromScratch(closureFrom([definition.name])),
        )
        .map((definition) => definition.name),
    ),
  ];
  if (rebuilders.length > 0)
    return lib.verdict(
      true,
      `the screen reads a projection that is rebuilt by replaying the wallet's events: ${rebuilders.join(", ")}`,
    );
  return lib.verdict(
    false,
    `the screen is not derived from the wallet's events: nothing reachable from \`walletScreen\` folds a stream (${list(filesOf(reading))}), and nothing rebuilds the screen's shape by replaying them either`,
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
    /\b(decide|evolve|createWalletStore|handleWalletCommand|walletScreen)\s*\(/.test(analyse(file).code),
  );
  if (exercising.length === 0)
    return lib.verdict(false, `no touched test calls the wallet's public functions: ${list(files)}`);
  const smells = files.flatMap((file) => {
    const body = analyse(file).code;
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

// --- the envelope, the trust boundary, versioning and checkpoints -----------

// The depth-1 keys of every `{ … }` in a span. An object literal, a type body
// and an interface body all read the same way, and keys are read from `code`
// (comments and literal interiors blanked), so neither prose nor a string can
// contribute one. This is how the envelope rules are decided by the FIELDS a
// shape actually carries rather than by what the agent called the shape.
const objectBodies = (code) => {
  const bodies = [];
  for (let index = 0; index < code.length; index += 1) {
    if (code[index] !== "{") continue;
    const end = groupEnd(code, index);
    const inner = code.slice(index + 1, Math.max(index + 1, end - 1));
    const depth = depths(inner);
    const ownKeys = [...inner.matchAll(/([A-Za-z_$][\w$]*)\s*\??\s*:/g)]
      .filter((match) => depth[match.index] === 0)
      .map((match) => match[1]);
    const spreadKeys = [...inner.matchAll(/\.\.\.\s*([A-Za-z_$][\w$]*)/g)]
      .filter((match) => depth[match.index] === 0)
      .flatMap((match) => named(match[1]).flatMap((definition) => objectBodies(definition.code).flatMap((body) => body.keys)));
    const keys = [...new Set([...ownKeys, ...spreadKeys])];
    if (keys.length > 0) bodies.push({ inner, keys });
  }
  return bodies;
};

// The envelope's facets, matched against whole key names so the stream's own
// `version` and a per-event `schemaVersion` can never stand in for each other.
const ENVELOPE_ID_KEY = /^(?:id|eventId|event_id|messageId|message_id|uuid|guid|eventUuid|identifier)$/i;
const ENVELOPE_TIME_KEY =
  /^(?:timestamp|timeStamp|occurredAt|occurredOn|recordedAt|createdAt|happenedAt|writtenAt|appendedAt|loggedAt|storedAt|at|on|time|when|date|dateTime|ts)$/i;
const ENVELOPE_POSITION_KEY =
  /^(?:version|streamVersion|streamPosition|position|globalPosition|sequence|sequenceNumber|seq|seqNo|offset|revision|index|ordinal|number|no)$/i;
const ENVELOPE_PAYLOAD_KEY = /^(?:data|payload|event|domainEvent|body|fact|content|value)$/i;
// A timestamp has to come from somewhere at write time; an injected clock
// counts, so this asks for a clock reading, not for a particular spelling.
const CLOCK_READ = /new Date\s*\(|Date\.now\s*\(|toISOString\s*\(|\bnow\s*\(|\bclock\b/i;

const writePathRoles = () => ["handleWalletCommand", "createWalletStore"].filter((name) => named(name).length > 0);
const writePathDefinitions = () => {
  const roles = writePathRoles();
  return roles.length > 0 ? closureFrom(roles) : [];
};
// The read path: everything the command handler, the store and the screen
// reach. Stored events cross the trust boundary in any of them.
const readPathDefinitions = () => {
  const roles = ["handleWalletCommand", "walletScreen", "createWalletStore"].filter((name) => named(name).length > 0);
  return roles.length > 0 ? closureFrom(roles) : [];
};

// Unions that declare their own `type: "…"` facts — the DOMAIN PAYLOAD. A
// stored-event type that merely mentions one of them is not itself one, so
// the envelope is never mistaken for the payload it wraps.
const payloadUnions = () => eventUnions().filter((union) => literalsIn(union.plain).length > 0);
const eventNames = () => new Set(payloadUnions().flatMap((union) => union.literals));

// 9. "Give every event an envelope: a unique id, type, stream id, version,
//    timestamp, and metadata (correlation and causation ids for tracing a
//    command through the events it caused). The domain payload is separate
//    from this envelope." — the shape the store writes carries the id, the
//    time and the stream position; the facts the decider returns do not.
exports.eventsHaveEnvelopes = () => {
  const writePath = writePathDefinitions();
  if (writePath.length === 0)
    return lib.verdict(false, "nothing persists events (no `createWalletStore` and no `handleWalletCommand`)");
  const envelopes = writePath.flatMap((definition) =>
    objectBodies(definition.code)
      .filter(
        (body) =>
          body.keys.some((key) => ENVELOPE_ID_KEY.test(key)) &&
          body.keys.some((key) => ENVELOPE_TIME_KEY.test(key)) &&
          body.keys.some((key) => ENVELOPE_POSITION_KEY.test(key)),
      )
      .map((body) => ({ definition, body })),
  );
  const unionNames = [...new Set(payloadUnions().map((union) => union.name))];
  const separates = envelopes.filter(
    ({ body }) =>
      body.keys.some((key) => ENVELOPE_PAYLOAD_KEY.test(key)) ||
      (unionNames.length > 0 && new RegExp(`\\b(?:${unionNames.join("|")})\\b`).test(body.inner)),
  );
  const stamped = CLOCK_READ.test(joined(writePath));
  const flattened = payloadUnions().filter((union) =>
    objectBodies(union.code).some(
      (body) =>
        body.keys.some((key) => ENVELOPE_ID_KEY.test(key) || ENVELOPE_TIME_KEY.test(key)) &&
        !body.keys.some((key) => ENVELOPE_PAYLOAD_KEY.test(key)),
    ),
  );
  const missing = [
    envelopes.length === 0 &&
      "the shape written to the store carries no envelope: nothing the write path builds or declares holds an id, a timestamp and a stream position together",
    envelopes.length > 0 &&
      separates.length === 0 &&
      "the envelope does not keep the domain payload separate: it has no field holding the event itself",
    envelopes.length > 0 &&
      !stamped &&
      "nothing stamps an envelope when the event is written: the write path never reads a clock",
    flattened.length > 0 &&
      `the domain payload carries envelope fields instead of leaving them to the envelope: ${flattened
        .map((union) => union.name)
        .join(", ")}`,
  ].filter(Boolean);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0
      ? `stored events are wrapped in an envelope (id, timestamp, stream position) with the domain payload separate: ${list(
          filesOf(separates.map((hit) => hit.definition)),
        )}`
      : `${missing.join("; ")} (${list(filesOf(writePath))})`,
  );
};

// A schema built out of parts, however the library spells it: `z.object(…)`,
// `z.literal(…)`, `z.discriminatedUnion(…)`. Content, not a name ending in
// "Schema".
const SCHEMA_BUILT =
  /\b\w+\s*\.\s*(?:object|literal|union|discriminatedUnion|enum|array|record|tuple|lazy|strictObject|looseObject)\s*\(/;
const PARSE_CALL = /\.\s*(?:safeParseAsync|parseAsync|safeParse|parse|decode|validate)\s*\(/;
const READ_ISH = /\.\s*(?:read|load|get|fetch|find|select|query|list|all|stream)\w*\s*\(/i;
const TOLERANT = /\.\s*(?:default|optional|nullish|catch|passthrough|loose)\s*\(|\?\?/;
const STRICT = /\.\s*(?:strict|strictObject|exact)\s*\(/;

// Every name used to fold: the reducer handed to `.reduce(…)`, and the
// function a loop folds with (`wallet = applyFact(wallet, fact)`, found by
// the accumulator appearing on both sides). `evolve` under any spelling is a
// fold function, never the trust boundary's parser, so it is never counted as
// one — and that holds however the agent spelled it or folded with it.
const reducerNames = () => {
  const body = joined(allDefinitions());
  return new Set(
    [
      ...reduceCalls(body).map((call) => (/^[A-Za-z_$][\w$]*$/.exec(call.reducer.trim()) ?? [])[0]),
      ...[...body.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*\(\s*\1\b/g)].map((match) => match[2]),
    ].filter(Boolean),
  );
};

// A parser for stored events: a value definition that either builds a schema
// or hand-checks a discriminant and refuses what it does not recognise, and
// that covers at least two of the declared events. The decider and the fold
// are excluded by role, so a `switch` full of event names is not mistaken for
// a validator.
const validatorNames = () => {
  const names = eventNames();
  if (names.size === 0) return [];
  const excluded = new Set([...decisionEntries(), ...reducerNames(), "handleWalletCommand", "walletScreen", "createWalletStore"]);
  return allDefinitions()
    .filter((definition) => {
      if (definition.kind !== "value" || excluded.has(definition.name)) return false;
      const own = definition.code;
      const schema = SCHEMA_BUILT.test(own);
      const guard =
        /\bthrow\b|\breturn\s+(?:null|undefined|false)\b|\bsuccess\s*:/.test(own) &&
        /\btypeof\b|\bswitch\s*\(|\bin\b|\.\s*type\b/.test(own);
      if (!schema && !guard) return false;
      const covered = closureFrom([definition.name]).flatMap((reached) => literalsIn(reached.plain));
      return new Set(covered.filter((literal) => names.has(literal))).size >= 2;
    })
    .map((definition) => definition.name);
};

// A parse whose ANSWER IS USED. Calling a parser and throwing its answer away
// — `rows.forEach((row) => acceptRow(row)); return rows as Fact[];` — leaves
// the fold reading exactly what came out of the store, so nothing crossed the
// trust boundary. The call therefore has to sit where a value is consumed
// (returned, bound, passed on, chained), and a binding it fills has to be read
// somewhere else in the same definition.
const VALUE_BEFORE = /[([,:?|&+\-*/%!<>=~^.]/;
const TRANSPARENT_PREFIX = /^(?:await|void|yield)$/;
const VALUE_KEYWORD = /^(?:return|throw|case|of|in|new|typeof|instanceof|do|else)$/;
const BINDING_BEFORE = /(?:\b(?:const|let|var)\s+)?([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=\s*$/;

const answerUsed = (code, start) => {
  let index = start - 1;
  for (let step = 0; step < 6; step += 1) {
    while (index >= 0 && isSpace(code[index])) index -= 1;
    if (index < 0) return false;
    const head = code.slice(0, index + 1);
    const word = /[\w$]+$/.exec(head);
    if (word !== null) {
      if (TRANSPARENT_PREFIX.test(word[0])) {
        index -= word[0].length;
        continue;
      }
      return VALUE_KEYWORD.test(word[0]);
    }
    const character = code[index];
    if (character === "=" && !/[=!<>]/.test(code[index - 1] ?? "")) {
      const binding = BINDING_BEFORE.exec(head);
      if (binding === null) return true;
      return (code.match(new RegExp(`\\b${binding[1]}\\b`, "g")) ?? []).length > 1;
    }
    return VALUE_BEFORE.test(character);
  }
  return false;
};

// Where each parse of a stored row starts: a validator called by name, or a
// `.parse(`-style call, read back to the head of its receiver chain.
const parseCallStarts = (code, validators) => {
  const called = new RegExp(`\\b(?:${validators.join("|")})\\b(?=\\s*(?:\\(|\\)|,))`, "g");
  return [
    ...[...code.matchAll(called)].map((match) => match.index),
    ...[...code.matchAll(/\.\s*(?:safeParseAsync|parseAsync|safeParse|parse|decode|validate)\s*\(/g)].map(
      (match) => match.index - receiverChain(code, match.index).length,
    ),
  ];
};

// Where that parser is actually applied to what came back out of the store.
// "on the way out" is what has to be true, so the search starts at whatever
// definition READS the stream and follows only what that reading reaches —
// a parser wired in on the way IN would not be found here. The parse may sit
// a helper or two away from the read (`load` → `readStoredEvents` → `parse`),
// which is why reachability, not one definition's own text, decides it.
const validationSites = () => {
  const validators = [...new Set(validatorNames())];
  if (validators.length === 0) return { validators, sites: [] };
  const readers = readPathDefinitions().filter((definition) => READ_ISH.test(definition.code));
  const afterRead = readers.length > 0 ? closureFrom([...new Set(readers.map((definition) => definition.name))]) : [];
  const mentions = new RegExp(`\\b(?:${validators.join("|")})\\b`);
  const called = new RegExp(`\\b(?:${validators.join("|")})\\b(?=\\s*(?:\\(|\\)|,))`);
  const parsing = afterRead.filter(
    (definition) =>
      !validators.includes(definition.name) &&
      mentions.test(definition.code) &&
      (PARSE_CALL.test(definition.code) || called.test(definition.code)) &&
      parseCallStarts(definition.code, validators).some((start) => answerUsed(definition.code, start)),
  );
  // …and the parse has to be on the way to the fold, not in a helper whose
  // own answer is dropped: either the parsing definition is the one reading
  // the stream, or something else on the read path uses what it returns.
  const sites = parsing.filter(
    (definition) =>
      READ_ISH.test(definition.code) ||
      afterRead.some(
        (caller) =>
          caller.name !== definition.name &&
          parseCallStarts(caller.code, [definition.name]).some((start) => answerUsed(caller.code, start)),
      ),
  );
  return { validators, sites };
};

// 10. "Events are stored as data across a trust boundary, so on the way out
//     they are validated with a schema (a tolerant reader) before `evolve`
//     ever sees them." / "the stored JSON is untrusted input, parsed into
//     branded domain events on read." Found by what parses on the read path,
//     never by a name: a zod schema and a hand-written parse of the
//     discriminant both count.
exports.storedEventsValidatedOnRead = () => {
  if (readPathDefinitions().length === 0)
    return lib.verdict(false, "nothing reads events back (no `createWalletStore`, `handleWalletCommand` or `walletScreen`)");
  const { validators, sites } = validationSites();
  if (validators.length === 0)
    return lib.verdict(
      false,
      "nothing parses a stored event: no schema and no hand-written check of the event's discriminant covers the declared events, so what comes out of the store is folded untrusted",
    );
  if (sites.length === 0)
    return lib.verdict(
      false,
      `\`${validators.join(", ")}\` parses events but nothing on the read path applies it: events come back out of the store and are folded without crossing the trust boundary`,
    );
  return lib.verdict(
    true,
    `stored events are validated before they are folded: ${validators.join(", ")} applied in ${list(filesOf(sites))}`,
  );
};

// A per-event schema version, as opposed to the stream's own version.
const SCHEMA_VERSION_KEY =
  /^(?:schemaVersion|eventVersion|payloadVersion|schema_version|event_version|payload_version|eventSchemaVersion|dataVersion)$/i;
const VERSIONED_EVENT_NAME = /(?:V|_v)\d+$/;

// 11. "A versioning strategy exists before the first event ships (tolerant
//     reader and/or upcasters)" / anti-pattern "No versioning strategy.
//     Shipping v1 events with no plan for evolving them … decide the
//     tolerant-reader / upcasting strategy on day one." Either mechanism the
//     skill names is accepted.
exports.versioningStrategyExists = () => {
  const readPath = readPathDefinitions();
  if (readPath.length === 0)
    return lib.verdict(false, "nothing reads events back (no `createWalletStore`, `handleWalletCommand` or `walletScreen`)");
  const { validators, sites } = validationSites();
  const validatorBody = joined(validators.flatMap((name) => closureFrom([name])));
  // Tolerant reader: a parser that is applied on the way out and does not
  // insist on the exact shape it was written with.
  const tolerant =
    sites.length > 0 && !STRICT.test(validatorBody) && (SCHEMA_BUILT.test(validatorBody) || TOLERANT.test(validatorBody));
  // Upcasters: a per-event schema version, and somewhere on the read path
  // that branches on it.
  const markers = [
    ...new Set(
      allDefinitions().flatMap((definition) =>
        objectBodies(definition.code).flatMap((body) => body.keys.filter((key) => SCHEMA_VERSION_KEY.test(key))),
      ),
    ),
  ];
  const versionedNames = [...eventNames()].filter((name) => VERSIONED_EVENT_NAME.test(name));
  const marked = markers.length > 0 || versionedNames.length > 0;
  // The version has to be READ, not merely written: switched on, compared,
  // or used as a key. Stamping a `schemaVersion` on the way in and never
  // looking at it again is the anti-pattern, not the strategy.
  const alternation = (words) => words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const markerAlt = markers.length > 0 ? alternation(markers) : "\\0";
  const nameAlt = versionedNames.length > 0 ? alternation(versionedNames) : "\\0";
  const branchOn = new RegExp(
    [
      `switch\\s*\\(\\s*[\\w.?[\\]]*(?:${markerAlt})\\b`,
      `[\\w.?[\\]]*(?:${markerAlt})[\\w.?[\\]]*\\s*(?:===|!==|==|!=|<=|>=|<|>)`,
      `(?:===|!==|==|!=|<=|>=|<|>)\\s*[\\w.?[\\]]*(?:${markerAlt})`,
      `\\[\\s*[\\w.?[\\]]*(?:${markerAlt})\\b`,
      `case\\s*["'\`](?:${nameAlt})["'\`]`,
    ].join("|"),
  );
  const upcasts =
    marked && [...readPath, ...validators.flatMap((name) => closureFrom([name]))].some((definition) => branchOn.test(definition.code));
  if (tolerant || upcasts)
    return lib.verdict(
      true,
      upcasts
        ? `old events have a way forward: a per-event schema version (${[...markers, ...versionedNames].join(
            ", ",
          )}) with a version branch on the read path${tolerant ? ", read by a tolerant reader" : ""}`
        : `old events have a way forward: the read path parses them with a tolerant reader (${validators.join(", ")})`,
    );
  return lib.verdict(
    false,
    [
      "no versioning strategy: nothing plans for the day a stored event's shape changes",
      sites.length === 0
        ? "no tolerant reader is applied on the read path"
        : STRICT.test(validatorBody)
          ? "the reader on the read path is strict, so an event written by a newer writer is rejected rather than tolerated"
          : "the reader on the read path neither ignores unknown fields nor defaults absent ones",
      marked ? "and nothing branches on the per-event schema version" : "and no event carries a schema version to upcast from",
    ].join("; "),
  );
};

// Where a maintained view says how far it has got, and how it refuses a
// redelivery. Read only over the view's own definitions, so the stream
// version an append asserts is never mistaken for a projection checkpoint.
const CHECKPOINT_SIDE =
  "[\\w.?[\\]]*(?:checkpoint|lastApplied|lastProcessed|lastSeen|lastEvent|processedUpTo|position|offset|sequence|seq|version|index)[\\w.?[\\]]*";
const CHECKPOINT_COMPARED = new RegExp(
  `${CHECKPOINT_SIDE}\\s*(?:<=|>=|<|>|===|!==|==|!=)|(?:<=|>=|<|>|===|!==|==|!=)\\s*${CHECKPOINT_SIDE}`,
  "i",
);
const SCREEN_SHAPE = /statement|balanceAfter/i;
const viewDefinitions = () => allDefinitions().filter((definition) => SCREEN_SHAPE.test(definition.code));
// A redelivery refused by keying on the event's own id or position.
const KEYED_ON_EVENT = /\.\s*has\s*\(\s*[\w.?[\]]*(?:id|position|offset|sequence|seq|version|event)[\w.?[\]]*\s*\)/i;
// The view and everything that keeps it: what the screen reaches, the
// definitions that carry the screen's shape, and whatever writes to them.
// The command handler and the store are left out on purpose — the version an
// append asserts is not a projection's checkpoint.
const viewNeighbourhood = () => {
  const reading = closureFrom(["walletScreen"]);
  const views = viewDefinitions();
  const names = [...new Set([...reading, ...views].map((definition) => definition.name))];
  if (names.length === 0) return reading;
  const mentions = new RegExp(`\\b(?:${names.join("|")})\\b`);
  const keepers = allDefinitions().filter(
    (definition) =>
      definition.name !== "createWalletStore" &&
      definition.name !== "handleWalletCommand" &&
      mentions.test(definition.code),
  );
  return [...new Set([...reading, ...views, ...keepers])];
};
// A way back to event zero: a definition other than the screen itself that
// folds the wallet's events from nothing into the screen's own shape. Found
// by what the fold builds — its reducer, or its own text — so a command
// handler that merely folds the wallet's state is never mistaken for one.
const screenRebuilders = () =>
  allDefinitions().filter((definition) => {
    if (definition.kind !== "value" || definition.name === "walletScreen") return false;
    const { folds, bindings } = eventFolds([definition]);
    return folds.some((call) => {
      if (!seedIsNothing(call.seed, bindings)) return false;
      if (SCREEN_SHAPE.test(definition.code)) return true;
      // The screen's shape may be a hop or two inside the reducer (`showOnScreen`
      // → `withLine` → `statement`), so the reducer's whole closure is read.
      const reducer = /^[A-Za-z_$][\w$]*$/.exec(call.reducer.trim());
      return reducer !== null && closureFrom([reducer[0]]).some((target) => SCREEN_SHAPE.test(target.code));
    });
  });

// 12. "Projections are disposable. Track a checkpoint (the last event
//     position processed); to rebuild, reset the read model and the
//     checkpoint to zero and replay." / "Projections must be idempotent …
//     Key on the event id or global position." A screen folded from event
//     zero on every read satisfies both trivially — it keeps no state to fall
//     behind and nothing to double-count — so it passes. A view kept up to
//     date has to earn it: a checkpoint, a refusal to apply the same event
//     twice, and a way back to zero.
exports.projectionRebuildableFromCheckpoint = () => {
  if (named("walletScreen").length === 0) return lib.verdict(false, "no production file defines `walletScreen`");
  const reading = closureFrom(["walletScreen"]);
  if (foldsEvents(reading) && foldsFromScratch(reading))
    return lib.verdict(
      true,
      `the screen is folded from the wallet's events from zero on every read, so it can never fall behind and cannot double-count: ${list(
        filesOf(reading),
      )}`,
    );
  const views = viewNeighbourhood();
  const checkpointed = views.filter(
    (definition) => CHECKPOINT_COMPARED.test(definition.code) || KEYED_ON_EVENT.test(definition.code),
  );
  const rebuilders = screenRebuilders();
  const missing = [
    checkpointed.length === 0 &&
      "the maintained view tracks no checkpoint and keys on nothing, so a redelivered event double-counts and a missed one is lost forever",
    rebuilders.length === 0 &&
      "nothing rebuilds the view by replaying the wallet's events from zero, so a wrong screen cannot be put right",
  ].filter(Boolean);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0
      ? `the maintained view keeps a checkpoint (${checkpointed
          .map((definition) => definition.name)
          .join(", ")}) and can be rebuilt from event zero (${rebuilders.map((definition) => definition.name).join(", ")})`
      : `${missing.join("; ")} (${list(filesOf(views.length > 0 ? views : reading))})`,
  );
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "event-sourcing", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
