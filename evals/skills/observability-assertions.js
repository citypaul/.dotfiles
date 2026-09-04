// Deterministic graders for the observability quality suite.
//
// The fixture (fixtures/observability-workspace) declares only that the service
// is observed with OpenTelemetry, that the platform starts the SDK, and that
// metrics and traces are the only signals the platform ingests. It shows the
// opposite of the practice: console.log at every step, the whole request
// serialised into one of them, the card token and the customer's email in
// another. Nothing here assumes a folder layout — telemetry is found by content
// (calls that set attributes, log, or record a measurement) in the production
// files the agent touched, and alerting is found in the documents the agent
// added. Every rule below is one the skill states as a rule; the quote is in
// each grader's comment.
//
// Design rules, after verification rounds found graders that could be satisfied
// by vocabulary rather than construction, or that failed a correct answer for
// its spelling:
//
//   * Source is read as code, never as text: one pass replaces comments,
//     string literals and regular-expression literals with tokens before any
//     identifier is harvested, so a literal `"/checkout"` is a constant rather
//     than a use of `checkout`, `/^\/orders\/[^/]+\/cancel$/` is a membership
//     test rather than a mention of orders, and no bracket scan can be thrown
//     by a bracket inside a string.
//   * Metric-label graders resolve the value that actually reaches each label —
//     per key of the attributes object, through local declarations and
//     reassignments, and through any helper the value calls — instead of
//     matching identifier spellings such as `request.path`.
//   * Normalisation is recognised by construction wherever it is written: an
//     expression that both tests membership of a fixed set and carries an
//     unknown-value fallback. A named helper, an inline ternary, an allowlist
//     `includes`, and a lookup table with `?? "_OTHER"` are the same act and
//     must score the same; a `typeof` guard is not one of them, because its
//     true branch returns whatever was fed in.
//   * A label written at a call site is graded at that call site: a helper that
//     forwards one of its parameters onto a measurement is a metric sink, and
//     the arguments its callers pass are read as labels. Otherwise `recordRequest(
//     ms, { "enduser.id": customerId })` would launder anti-pattern #1 through
//     one ordinary refactor.
//   * Teardown is graded as teardown, not as syntax: a `finally { … }` block and
//     a promise chain's `.finally(…)` both survive the exception path, so both
//     satisfy the canonical-event rule. The spans held to it are found by what
//     they are made from (`startSpan`/`startActiveSpan`) and by whether they
//     bracket awaited work — never by whether the variable is spelled `span`.
//   * Trace context is graded on what reaches the wire: `traceparent`, the
//     propagator the W3C standard is named after, or an `inject` of the active
//     OpenTelemetry context all count, because they are the same act.
//   * The alerting graders parse alert *rules* (an `alert:` head, its `expr:`,
//     its severity label, its annotations) and grade the paging rule's
//     expression: the windows it references, whether it conjoins a long and a
//     short one, and whether its threshold is a burn-rate multiple of the error
//     budget. No grader looks for the words "burn rate" anywhere, and a rule's
//     body ends where the document stops indenting under it, so prose appended
//     after the last rule is not read as part of it.

const { existsSync, readdirSync, statSync } = require("node:fs");
const { join } = require("node:path");
const lib = require("./quality-lib");

const src = () => lib.sourceFiles(lib.resolve(lib.workspace(), "src"));
const production = () => src().filter((file) => !lib.isTestPath(file));

// Once the agent has edited any production file, the whole production tree is
// in scope: instrumentation added in a new file does not excuse a leak left
// behind in the file it instruments. An agent that changed no production code
// (the alerting case says not to) is not held to the code rules.
const scopeFiles = (context) => {
  const touched = lib.touchedBy(context);
  return production().some(touched) ? production() : [];
};
const scopeText = (context) => scopeFiles(context).map(lib.read).join("\n");
const list = (files) => files.map(lib.rel).join(", ") || "(none)";
const untouched = () => lib.verdict(true, "the agent changed no production source file");

// Documents (alert rules, runbooks) the agent added or edited, wherever it put
// them. Project plumbing is never an alerting document.
const PLUMBING = /^(pnpm-lock\.yaml|pnpm-workspace\.yaml|package\.json|tsconfig\.json)$/;
const walk = (dir) => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    if (entry === "node_modules" || entry === ".git") return [];
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
};
const docFiles = (context) => {
  const touched = lib.touchedBy(context);
  return walk(lib.workspace()).filter(
    (file) => /\.(md|ya?ml)$/i.test(file) && !PLUMBING.test(lib.basename(file)) && touched(file),
  );
};

// ---------------------------------------------------------------------------
// Reading what a value actually is
// ---------------------------------------------------------------------------

const escapeRe = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Source is read as code, in one pass. Comments become a space; a string
// literal becomes a token (`__OTHERSTR__` when its content is the
// unknown-value fallback the skill prescribes, `__STR__` otherwise); a regular
// expression literal becomes `__RE__`; a template literal keeps its `${…}`
// interpolations, which are code. The tokens carry no quotes, brackets,
// slashes or identifiers, so a literal `"/checkout"` is a constant rather than
// a use of `checkout`, `/^\/orders\/[^/]+\/cancel$/` is a membership test
// rather than a mention of orders, and no bracket scan can be thrown by a
// bracket inside a string.
const OTHER_STRING = /^[\s_]*(?:other|unknown)[\w\s_-]*$/i;
const stringToken = (content) =>
  OTHER_STRING.test(content) ? " __OTHERSTR__ " : " __STR__ ";
const REGEX_MAY_START =
  /[([{,;:=!&|?+\-*%~^<>]$|\b(?:return|typeof|instanceof|in|of|new|do|else|case|void|delete|await|yield)$/;
const codeView = (source) => {
  let out = "";
  let index = 0;
  while (index < source.length) {
    const two = source.slice(index, index + 2);
    if (two === "//") {
      const end = source.indexOf("\n", index);
      out += " ";
      index = end === -1 ? source.length : end;
      continue;
    }
    if (two === "/*") {
      const end = source.indexOf("*/", index + 2);
      out += " ";
      index = end === -1 ? source.length : end + 2;
      continue;
    }
    const char = source[index];
    if (char === '"' || char === "'") {
      let end = index + 1;
      while (end < source.length && source[end] !== char)
        end += source[end] === "\\" ? 2 : 1;
      out += stringToken(source.slice(index + 1, end));
      index = end + 1;
      continue;
    }
    if (char === "`") {
      let end = index + 1;
      let literal = "";
      let inner = "";
      while (end < source.length && source[end] !== "`") {
        if (source[end] === "\\") {
          literal += source.slice(end, end + 2);
          end += 2;
          continue;
        }
        if (source.slice(end, end + 2) === "${") {
          let depth = 1;
          let cursor = end + 2;
          for (; cursor < source.length && depth > 0; cursor += 1) {
            if (source[cursor] === "{") depth += 1;
            else if (source[cursor] === "}") depth -= 1;
          }
          inner += ` ${source.slice(end + 2, cursor - 1)} `;
          end = cursor;
          continue;
        }
        literal += source[end];
        end += 1;
      }
      out += `${stringToken(literal)} ${codeView(inner)} `;
      index = end + 1;
      continue;
    }
    if (char === "/") {
      const before = out.replace(/\s+$/, "");
      if (before === "" || REGEX_MAY_START.test(before)) {
        let end = index + 1;
        let inClass = false;
        let closed = false;
        while (end < source.length) {
          const current = source[end];
          if (current === "\\") {
            end += 2;
            continue;
          }
          if (current === "\n") break;
          if (current === "[") inClass = true;
          else if (current === "]") inClass = false;
          else if (current === "/" && !inClass) {
            closed = true;
            break;
          }
          end += 1;
        }
        if (closed) {
          out += " __RE__ ";
          index = end + 1;
          while (index < source.length && /[gimsuyvd]/.test(source[index]))
            index += 1;
          continue;
        }
      }
    }
    out += char;
    index += 1;
  }
  return out;
};

// Top-level commas only: quotes and brackets hold their contents together, so
// an argument list or a parameter list splits into the pieces a reader sees.
const splitTopLevel = (text) => {
  const parts = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== "") {
      if (char === "\\") index += 1;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth -= 1;
    else if (char === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(text.slice(start));
  return parts;
};

// The contents of one bracketed run, starting at its opener.
const bracketedFrom = (text, open) => {
  const opener = text[open];
  const closer = opener === "{" ? "}" : ")";
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    if (text[index] === opener) depth += 1;
    else if (text[index] === closer) {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index);
    }
  }
  return text.slice(open + 1);
};

// Argument text of every telemetry-shaped call: span attributes, span events,
// structured log records, metric measurements. `console.*` is deliberately NOT
// here — consoleLoggingRemoved owns the console noise, and the two graders must
// not both be satisfied by deleting the same planted lines.
const TELEMETRY_CALL =
  /\.(?:setAttributes?|addEvent|recordException|record|add|set)\s*\(|\b(?:logger|log)\.\w+\s*\(|\b(?:emit\w*|canonical\w*)\s*\(/;
const callArguments = (text, pattern) => {
  const found = [];
  const scanner = new RegExp(pattern.source, "g");
  let match = scanner.exec(text);
  while (match !== null) {
    const open = text.indexOf("(", match.index + match[0].length - 1);
    let depth = 0;
    let index = open;
    for (; index < text.length; index += 1) {
      if (text[index] === "(") depth += 1;
      else if (text[index] === ")") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    found.push(text.slice(open + 1, index));
    scanner.lastIndex = open + 1;
    match = scanner.exec(text);
  }
  return found;
};

// Object-literal keys inside an argument, quoted or bare. Anchoring on `{` or
// `,` keeps a ternary's colon out of the key set.
const attributeKeys = (argument) =>
  [...argument.matchAll(/[{,]\s*(?:["']([\w.\-/]+)["']|([A-Za-z_]\w*))\s*:/g)].map(
    (match) => match[1] ?? match[2],
  );
const setAttributeKeys = (text) =>
  [...text.matchAll(/\.setAttribute\s*\(\s*["']([\w.\-/]+)["']/g)].map((match) => match[1]);
// `{ method, status }` is the same invented name written shorthand; only the
// words semconv already owns are read this way, so an array of words cannot
// be mistaken for attribute keys.
const shorthandKeys = (argument) =>
  [
    ...argument.matchAll(
      /[{,]\s*(method|verb|status|statusCode|status_code|code|url|endpoint|route|path|host|server)\s*[,}]/g,
    ),
  ].map((match) => match[1]);

// The attribute *keys* name the concept; the leak and the cardinality rules are
// about the attribute *values*. Drop the keys so `"user.email_hash"` is not read
// as an email and `"url.path"` is not read as a raw path.
const stripKeys = (argument) =>
  argument
    .replace(/["'][\w.\-/ ]+["']\s*:/g, " : ")
    .replace(/(^|[{,]\s*)(?:__(?:OTHER)?STR__|[A-Za-z_$][\w$]*)\s*:/g, "$1 : ");

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "new", "await", "async", "typeof",
  "true", "false", "null", "undefined", "this", "of", "in", "for", "while", "do", "try", "catch",
  "finally", "throw", "export", "import", "from", "as", "string", "number", "boolean", "readonly",
  "type", "interface", "satisfies", "Math", "JSON", "String", "Number", "Boolean", "Object",
  "Array", "Date", "Set", "Map", "Promise", "process", "void", "Error",
  "__STR__", "__OTHERSTR__", "__RE__",
]);
const identifiersIn = (text) =>
  [...codeView(text).matchAll(/\b[A-Za-z_$][\w$]*\b/g)]
    .map((match) => match[0])
    .filter((name) => !KEYWORDS.has(name));

// From `start`, the rest of one declaration: balanced brackets, ending at a `;`
// at depth zero or at the newline before the next top-level statement (so a
// helper whose arrow body continues on the following line is read whole).
const STATEMENT_START =
  /^[ \t]*(?:(?:export|const|let|var|function|import|class|type|interface)\b|\}|\/\/)/;
const balancedFrom = (text, start) => {
  let depth = 0;
  for (let index = start; index < text.length && index - start < 4000; index += 1) {
    const char = text[index];
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) {
      depth -= 1;
      if (depth < 0) return text.slice(start, index);
    } else if (depth === 0 && char === ";") return text.slice(start, index);
    else if (depth === 0 && char === "\n") {
      const next = text.slice(index + 1).split("\n").find((line) => line.trim() !== "") ?? "";
      if (STATEMENT_START.test(next)) return text.slice(start, index);
    }
  }
  return text.slice(start, start + 4000);
};

// The `=` that starts an initializer, skipping a type annotation of any shape:
// `const label: (r: Request) => string = …` has three `=`-looking tokens before
// the real one, so match on brackets and on what surrounds the character
// rather than on "no `=` until the assignment".
const assignmentAfter = (text, start) => {
  let depth = 0;
  for (let index = start; index < text.length && index - start < 2000; index += 1) {
    const char = text[index];
    if ("([{".includes(char)) depth += 1;
    else if (")]}".includes(char)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && (char === ";" || char === "\n")) return -1;
    else if (
      char === "=" &&
      depth === 0 &&
      text[index + 1] !== "=" &&
      text[index + 1] !== ">" &&
      !"=!<>+-*/%&|^".includes(text[index - 1] ?? "")
    )
      return index;
  }
  return -1;
};

// Every `const|let|var NAME = …`, every `function NAME(…)` and every later
// `NAME = …` reassignment in one file, each with the text that flows into it.
// Reassignments count because `let label = "ok"; label = request.path;` is the
// same laundering as writing the path at the label site.
const declarationsIn = (source) => {
  const text = codeView(source);
  const found = [];
  const head = /(?:^|[^\w$.])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\b/g;
  let match = head.exec(text);
  while (match !== null) {
    const assignment = assignmentAfter(text, match.index + match[0].length);
    if (assignment !== -1)
      found.push({ name: match[1], body: balancedFrom(text, assignment + 1) });
    match = head.exec(text);
  }
  const fn = /function\s+([A-Za-z_$][\w$]*)\s*(?=\()/g;
  match = fn.exec(text);
  while (match !== null) {
    found.push({ name: match[1], body: balancedFrom(text, match.index + match[0].length) });
    match = fn.exec(text);
  }
  const reassignment = /(?:^|[^\w$.])([A-Za-z_$][\w$]*)\s*=(?![=>])/g;
  match = reassignment.exec(text);
  while (match !== null) {
    const before = text.slice(Math.max(0, match.index - 12), match.index + match[0].length);
    if (!/\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=$/.test(before))
      found.push({
        name: match[1],
        body: balancedFrom(text, match.index + match[0].length),
      });
    match = reassignment.exec(text);
  }
  return found;
};

const declarationBodies = (source, name) =>
  declarationsIn(source)
    .filter((declaration) => declaration.name === name)
    .map((declaration) => declaration.body);

// A name's declaration: the file it is used in first, then anywhere in the
// production tree.
const definitionOf = (file, name) => {
  const own = declarationBodies(lib.read(file), name);
  if (own.length > 0) return own;
  return production().flatMap((other) => declarationBodies(lib.read(other), name));
};

// "Request-derived labels are safe only after normalization to a fixed
// allowlist … map unknown values to `_OTHER` or omit them". Normalisation is
// recognised by its *construction*, wherever it is written: an expression that
// both tests membership of a fixed set and carries an unknown-value fallback.
// A named helper qualifies on the same terms — being called `routeLabel` is
// not enough, and neither is an `_OTHER` constant sitting unused elsewhere in
// the tree — but so does the same test written inline at the label site, which
// is how the skill's own one-line prescription reads.
const FIXED_SET =
  /\.includes\s*\(|\.has\s*\(|\.get\s*\(|new Set\s*\(|new Map\s*\(|\bswitch\b|===\s*(?:__(?:OTHER)?STR__|["'`])|\.test\s*\(|\.match\s*\(|\[[^\]\n]*\]\s*(?:\?\?|\|\|)|\bin\s+[A-Za-z_$]|\.find\s*\(|\.some\s*\(/;
const UNKNOWN_FALLBACK =
  /__OTHERSTR__|_OTHER\b|_UNKNOWN\b|["'`](?:other|unknown|_other|_unknown)["'`]/i;
// A `typeof x === "string"` guard is a type test, not a membership test: its
// true branch returns whatever `x` was, so `typeof id === "string" ? id :
// "_OTHER"` bounds nothing. Every type test is erased before the fixed-set
// question is asked, so that shape cannot buy a value its way past the
// cardinality rule. The operand is consumed by scanning — identifiers, dots,
// optional chaining and balanced brackets — because by the time a value is
// resolved the operand may be an inlined expression of any shape.
const eraseTypeTests = (text) => {
  let out = text;
  for (let guard = 0; guard < 40; guard += 1) {
    const at = out.search(/\btypeof\b/);
    if (at === -1) break;
    let index = at + "typeof".length;
    while (index < out.length) {
      const char = out[index];
      if (/[\s.?!A-Za-z0-9_$]/.test(char)) {
        index += 1;
        continue;
      }
      if (char === "(" || char === "[") {
        index += bracketedFrom(out, index).length + 2;
        continue;
      }
      break;
    }
    const comparison = /^\s*[=!]==?\s*(?:__(?:OTHER)?STR__|["'`][^"'`]*["'`])/.exec(
      out.slice(index),
    );
    out =
      `${out.slice(0, at)} TYPETEST ` +
      (comparison === null ? out.slice(index) : out.slice(index + comparison[0].length));
  }
  return out;
};
const normalises = (text) => {
  const tested = eraseTypeTests(text);
  return tested.trim() !== "" && FIXED_SET.test(tested) && UNKNOWN_FALLBACK.test(tested);
};

const helperContext = (file, name) => {
  const body = definitionOf(file, name).join("\n");
  if (body.trim() === "") return "";
  const nested = [...new Set(identifiersIn(body))]
    .filter((inner) => inner !== name)
    .flatMap((inner) => definitionOf(file, inner));
  return [body, ...nested].join("\n");
};
const isNormaliser = (file, name) => normalises(helperContext(file, name));

// A real normaliser's call disappears, arguments and all: what it returns is a
// member of a fixed set whatever was fed in.
const eraseNormalisers = (file, text) => {
  const called = [...new Set([...text.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))]
    .filter((name) => !KEYWORDS.has(name) && isNormaliser(file, name));
  return called.length === 0
    ? text
    : text.replace(
        new RegExp(`\\b(?:${called.map(escapeRe).join("|")})\\s*\\([^()]*\\)`, "g"),
        " NORMALISED ",
      );
};

// An object literal's values, in source order, with the keys dropped
// structurally. `null` when the text is not an object literal.
const objectValues = (view) => {
  const text = view.trim();
  if (!text.startsWith("{")) return null;
  return splitTopLevel(bracketedFrom(text, 0))
    .map((part) => {
      const trimmed = part.trim();
      if (trimmed === "") return "";
      const key = /^(?:__(?:OTHER)?STR__|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*:/.exec(trimmed);
      return key === null ? trimmed : trimmed.slice(key[0].length);
    })
    .filter((value) => value !== "");
};

// What actually reaches one label, as a list of values — one per key of an
// object literal, so a raw path written beside a properly normalised route is
// still read as a raw path. A value normalises when its own expression tests a
// fixed set and falls back for the unknown; otherwise every name in it is
// replaced by what flows into that name, so hiding `incoming.path` behind
// `toRoute(incoming)` or behind a local `const` does not launder it. String
// and regular-expression literals contribute nothing, because they are
// constants rather than request-derived values.
const NORMALISED = " NORMALISED ";
const resolveLabel = (file, text, depth = 3, seen = new Set()) => {
  const view = eraseNormalisers(file, codeView(text));
  // Split an object literal into its values *before* asking whether the text
  // normalises: otherwise one properly normalised route in the same attributes
  // object would vouch for every other label written beside it.
  const parts = objectValues(view);
  if (parts !== null && parts.length > 0)
    return parts.flatMap((part) => resolveLabel(file, part, depth, seen));
  if (normalises(view)) return [NORMALISED];
  if (depth <= 0) return [stripKeys(view)];
  let resolved = stripKeys(view);
  [...new Set(identifiersIn(view))]
    .filter((name) => !seen.has(name))
    .forEach((name) => {
      const bodies = definitionOf(file, name);
      if (bodies.length === 0) return;
      // `response.status` is a property of the response, not the response, so
      // replacing `response` by the awaited call it came from would drag a
      // whole function body into one label. Only a name used on its own is
      // replaced by what flows into it — unless what flows into it is an
      // object literal, whose members are exactly what a property reads.
      const bare = new RegExp(`\\b${escapeRe(name)}\\b(?!\\s*[.[])`).test(resolved);
      const literal = bodies.every((body) => codeView(body).trim().startsWith("{"));
      if (!bare && !literal) return;
      const inner = bodies
        .flatMap((body) => resolveLabel(file, body, depth - 1, new Set([...seen, name])))
        .join(" ");
      resolved = resolved.replace(new RegExp(`\\b${escapeRe(name)}\\b`, "g"), ` ( ${inner} ) `);
    });
  return normalises(resolved) ? [NORMALISED] : [resolved];
};

// ---------------------------------------------------------------------------
// Code graders
// ---------------------------------------------------------------------------

// A pseudonymising wrapper is the skill's own remedy for a personal
// identifier, so collapse those before looking for one. Secrets get no such
// tolerance: "Never emit passwords, tokens, API keys, cookies, or session IDs
// into any signal" is absolute.
// The whole chain collapses, not just its head: `createHash("sha256")
// .update(email).digest("hex")` is one pseudonymisation, spelled the way
// node:crypto spells it.
const PSEUDONYMISED =
  /\b\w*(?:hash|digest|sha\d*|hmac|pseudonym\w*|redact|mask|anonymi[sz]e|fingerprint|tokeni[sz]e)\w*\s*\([^()]*\)(?:\s*\.\s*\w+\s*\([^()]*\))*/gi;

// 1. "Never emit passwords, tokens, API keys, cookies, or session IDs into any
//    signal" / "Allowlist named fields — never serialize whole request/user/
//    config objects; a JSON serializer will happily dump auth headers" /
//    "minimize or pseudonymize" personal identifiers.
exports.telemetryFieldsAllowlisted = (output, context) => {
  const files = scopeFiles(context);
  if (files.length === 0) return untouched();
  const leaks = files.flatMap((file) => {
    const text = lib.read(file);
    const argumentText = callArguments(text, TELEMETRY_CALL).join("\n");
    const minimised = argumentText.replace(PSEUDONYMISED, " PSEUDONYMISED ");
    return [
      [
        /JSON\.stringify\s*\(\s*(?:request|req|body|input|payload|order|customer|user|charge|basket|parsed)\b/,
        argumentText,
        "serialises a whole object into telemetry",
      ],
      [
        /\.{3}\s*(?:request|req|body|input|payload|charge|customer|user|order|basket|parsed)\b/,
        argumentText,
        "spreads a whole request/user object into the fields",
      ],
      [
        /\b(?:cardToken|card_token|cvv|password|authorization|cookie|apiKey|api_key|secret|sessionId|session_id)\b/,
        argumentText,
        "puts a secret in a telemetry field",
      ],
      [
        /\bemail\b/,
        minimised,
        "puts the customer's email address in a telemetry field without pseudonymising it",
      ],
    ]
      .filter(([pattern, haystack]) => pattern.test(haystack))
      .map(([, , label]) => `${lib.rel(file)}: ${label}`);
  });
  return lib.verdict(
    leaks.length === 0,
    leaks.length === 0 ? `fields allowlisted in ${list(files)}` : leaks.join("; "),
  );
};

// 2. "Never invent an attribute name semconv already defines" — `method`,
//    `status`, `url`, `route`, `host`, `error` have standard names
//    (`http.request.method`, `http.response.status_code`, `http.route`,
//    `server.address`, `error.type`), and the pre-1.0 `http.*` spellings are
//    superseded by them.
const BARE_SEMCONV = new Set([
  "method",
  "verb",
  "httpMethod",
  "http_method",
  "status",
  "statusCode",
  "status_code",
  "http_status",
  "code",
  "url",
  "endpoint",
  "route",
  "path",
  "host",
  "server",
  "db",
  "database",
  "exception",
]);
const LEGACY_SEMCONV = /^http\.(method|status_code|url|target|host|scheme)$/;
exports.semanticConventionAttributeNames = (output, context) => {
  const files = scopeFiles(context);
  if (files.length === 0) return untouched();
  const keys = files.flatMap((file) => {
    const text = lib.read(file);
    return [
      ...callArguments(text, TELEMETRY_CALL).flatMap(attributeKeys),
      ...callArguments(text, TELEMETRY_CALL).flatMap(shorthandKeys),
      ...setAttributeKeys(text),
    ].map((key) => ({ key, file }));
  });
  if (keys.length === 0) return lib.verdict(true, "no literal attribute keys to check");
  const invented = keys
    .filter(({ key }) => BARE_SEMCONV.has(key) || LEGACY_SEMCONV.test(key))
    .map(({ key, file }) => `${lib.rel(file)}: \`${key}\` (semconv already names this concept)`);
  return lib.verdict(
    invented.length === 0,
    invented.length === 0
      ? `attribute names clear of semconv collisions (${keys.length} keys)`
      : [...new Set(invented)].join("; "),
  );
};

// Measurements: the attributes argument of every `.record(...)` / `.add(...)`
// on an instrument created from a meter.
const INSTRUMENT = /\.create(?:Histogram|Counter|UpDownCounter|Gauge|Observable\w+)\s*\(/;
const hasInstrument = (context) =>
  scopeFiles(context).some((file) => INSTRUMENT.test(lib.read(file)));

// Parameter names of a function-shaped initializer, in order (`""` for a
// destructured or unreadable one, which keeps the positions right).
const parameterNames = (initializer) => {
  const open = initializer.indexOf("(");
  if (open === -1 || !/^\s*(?:async\s*)?$/.test(initializer.slice(0, open))) return [];
  let depth = 0;
  let close = open;
  for (; close < initializer.length; close += 1) {
    if (initializer[close] === "(") depth += 1;
    else if (initializer[close] === ")") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  return splitTopLevel(initializer.slice(open + 1, close)).map((part) => {
    const name = /^\s*(?:\.\.\.)?\s*([A-Za-z_$][\w$]*)/.exec(part);
    return name === null ? "" : name[1];
  });
};

// Calls to `name(...)` that are calls, not the `function name(...)` head.
const callsTo = (text, name) =>
  callArguments(text, new RegExp(`(?<!function\\s{1,8})(?<![\\w$.])${escapeRe(name)}\\s*\\(`));

// The attributes argument of every measurement a body performs: directly on an
// instrument, or through a helper already known to record one.
const attributeArgumentsIn = (text, sinks) => [
  ...callArguments(text, /\.(?:record|add)\s*\(/).map((argument) =>
    splitTopLevel(argument).slice(1).join(","),
  ),
  ...sinks.flatMap(({ name, index }) =>
    callsTo(text, name).map((argument) => splitTopLevel(argument)[index] ?? ""),
  ),
];

// "bounded, low-cardinality dimensions go on metrics" is a rule about the
// label, not about where the label is written down: putting the instrument
// behind `recordRequest(ms, attributes)` moves the labels to the call site, so
// the call site is where they must be graded. A parameter makes its helper a
// metric sink only when it still appears in a resolved label value — a
// parameter the helper normalises inside its own body is not a label, and
// neither is a request handed to a helper that derives a bounded route from
// it. Iterating catches a helper called through another helper.
const metricSinks = () => {
  const declarations = production().flatMap((file) =>
    declarationsIn(lib.read(file)).map((declaration) => ({ ...declaration, file })),
  );
  const sinks = [];
  for (let round = 0; round < 3; round += 1) {
    const before = sinks.length;
    declarations.forEach(({ file, name, body }) => {
      const params = parameterNames(body);
      if (params.length === 0) return;
      attributeArgumentsIn(body, sinks).forEach((argument) => {
        resolveLabel(file, argument).forEach((value) => {
          params.forEach((param, index) => {
            if (param === "" || !new RegExp(`\\b${escapeRe(param)}\\b`).test(value)) return;
            if (sinks.some((sink) => sink.name === name && sink.index === index)) return;
            sinks.push({ file, name, index });
          });
        });
      });
    });
    if (sinks.length === before) break;
  }
  return sinks;
};

// The instrument is often created in one module and recorded on in another, so
// once any file creates one, every measurement in the tree is in scope. One
// entry per label value, not per measurement, so a raw path written beside a
// normalised route is graded on its own.
const measurementAttributes = (context) => {
  if (!hasInstrument(context)) return [];
  const sinks = metricSinks();
  return scopeFiles(context).flatMap((file) => {
    const text = lib.read(file);
    return attributeArgumentsIn(text, sinks)
      .filter((argument) => argument.trim() !== "")
      .flatMap((argument) => resolveLabel(file, argument).map((value) => ({ file, value })));
  });
};

// The unbounded parts of a request: everything an attacker or a URL generator
// can vary. `request.method` and a response status are bounded and are not
// here — the skill only forbids "raw or unbounded attacker-controlled values
// such as IDs, paths, query strings, arbitrary headers, or body fields".
const RAW_REQUEST_VALUE =
  /(?:[\w$]+\s*(?:\?\.|\.)\s*)?\b(?:path|url|originalUrl|pathname|href|uri|target|query|params|headers|search|requestUrl)\b/;
const HIGH_CARDINALITY_VALUE =
  /\b(?:customer|user|enduser|email|order|payment|session|account|basket|sku|tenant)\w*\b/i;
const TRACE_VALUE = /\btraceId|trace_id|spanId|span_id\b/i;

// 3. "bounded, low-cardinality dimensions go on metrics; unbounded,
//    high-cardinality dimensions go on events/spans" — a user, customer, order
//    or session identifier as a metric label is anti-pattern #1.
exports.highCardinalityOffMetricLabels = (output, context) => {
  const labels = measurementAttributes(context);
  if (labels.length === 0) return lib.verdict(true, "no metric measurement to check");
  const violations = labels.flatMap(({ file, value }) =>
    [
      [HIGH_CARDINALITY_VALUE, "high-cardinality identifier"],
      [RAW_REQUEST_VALUE, "raw request path"],
      [TRACE_VALUE, "trace identifier"],
    ]
      .filter(([pattern]) => pattern.test(value))
      .map(([, label]) => `${lib.rel(file)}: ${label} used as a metric label`),
  );
  return lib.verdict(
    violations.length === 0,
    violations.length === 0
      ? `metric labels bounded (${labels.length} label value(s))`
      : [...new Set(violations)].join("; "),
  );
};

// 4. "Request-derived labels are safe only after normalization to a fixed
//    allowlist … map unknown values to `_OTHER` or omit them" — and the
//    dashboard needs a metric at all.
exports.routeLabelBounded = (output, context) => {
  if (scopeFiles(context).length === 0) return lib.verdict(false, "no production source changed");
  if (!hasInstrument(context))
    return lib.verdict(false, "no metric instrument was created, so nothing reaches the dashboard");
  const labels = measurementAttributes(context);
  if (labels.length === 0)
    return lib.verdict(false, "an instrument was created but nothing records a measurement on it");
  const raw = labels.filter(({ value }) => RAW_REQUEST_VALUE.test(value));
  if (raw.length > 0)
    return lib.verdict(
      false,
      `${lib.rel(raw[0].file)}: a raw request path/URL reaches a metric label unnormalised`,
    );
  const normalised = labels.filter(({ value }) => /NORMALISED/.test(value));
  return lib.verdict(
    true,
    normalised.length > 0
      ? `the route label is mapped to a fixed set with an unknown-value fallback (${normalised.length} of ${labels.length} label value(s))`
      : `no unbounded request value reaches a metric label (${labels.length} label value(s))`,
  );
};

// Every teardown block in scope, with the span of source it covers. Both
// spellings count: `finally { … }` on a try, and a promise chain's
// `.finally(…)` callback. The rule is that the event survives the exception
// path, not which syntax carries it.
const teardownRanges = (text) => {
  const ranges = [];
  const scanner = /\bfinally\s*[({]/g;
  let match = scanner.exec(text);
  while (match !== null) {
    const open = match.index + match[0].length - 1;
    const body = bracketedFrom(text, open);
    ranges.push({ start: open, end: open + body.length + 1, body });
    scanner.lastIndex = open + 1;
    match = scanner.exec(text);
  }
  return ranges;
};
const teardownBlocks = (text) => teardownRanges(text).map((range) => range.body);

// The names that hold a span, found by what they are made from rather than by
// what they are called: a declaration initialized from `startSpan`/
// `startActiveSpan`, or the span parameter of a `startActiveSpan` callback.
const SPAN_FACTORY = /\b(?:startSpan|startActiveSpan)\s*\(/;
const spanNames = (view) => {
  const names = new Set();
  declarationsIn(view).forEach(({ name, body }) => {
    if (SPAN_FACTORY.test(body)) names.add(name);
  });
  callArguments(view, /\bstartActiveSpan\s*\(/).forEach((argument) => {
    splitTopLevel(argument).forEach((part) => {
      const arrow = /^\s*(?:async\s+)?\(?\s*([A-Za-z_$][\w$]*)\s*(?::[^,)]*)?\)?\s*=>/.exec(part);
      if (arrow !== null) names.add(arrow[1]);
      const declared = /^\s*(?:async\s+)?function\s*[\w$]*\s*\(\s*([A-Za-z_$][\w$]*)/.exec(part);
      if (declared !== null) names.add(declared[1]);
    });
  });
  return [...names];
};

// A span that brackets awaited work is the one the rule is about: the awaited
// call is what can throw, so ending that span anywhere but teardown loses the
// event on exactly the path that needed it. A span opened and closed around
// synchronous work is not that span, whatever it is called — the check reads
// what sits between the span's first mention and its `end()`, never the
// variable's spelling.
const spansEndedOutsideTeardown = (file) => {
  const view = codeView(lib.read(file));
  const ranges = teardownRanges(view);
  const inTeardown = (index) =>
    ranges.some((range) => index > range.start && index < range.end);
  return spanNames(view).flatMap((name) => {
    const opened = view.search(new RegExp(`\\b${escapeRe(name)}\\b`));
    return [...view.matchAll(new RegExp(`\\b${escapeRe(name)}\\s*\\.\\s*end\\s*\\(`, "g"))]
      .filter(
        (end) => !inTeardown(end.index) && /\bawait\b/.test(view.slice(opened, end.index)),
      )
      .map(
        () =>
          `${lib.rel(file)}: \`${name}\` wraps awaited work but is ended outside \`finally\`/teardown, so the exception path loses it`,
      );
  });
};

// 5. "The event is emitted once, at the end of the request, in
//    `finally`/teardown logic — it must survive the exception path, because
//    that is exactly when you need it" (anti-pattern #3: "Canonical event
//    skipped on the exception path").
const EMITTER = /\.end\s*\(|\bemit\w*\s*\(|logger\.\w+\s*\(|\.setAttributes\s*\(|\.record\s*\(/;
exports.canonicalEventEmittedInFinally = (output, context) => {
  const files = scopeFiles(context);
  if (files.length === 0) return lib.verdict(false, "no production source changed");
  const teardown = files.flatMap((file) =>
    teardownBlocks(codeView(lib.read(file))).map((block) => ({ file, block })),
  );
  const emitting = teardown.filter(({ block }) => EMITTER.test(block));
  if (emitting.length === 0)
    return lib.verdict(
      false,
      "nothing emits the request's event from teardown (no `finally` block, no `.finally(…)`), so the exception path loses it",
    );
  const stray = files.flatMap(spansEndedOutsideTeardown);
  return lib.verdict(
    stray.length === 0,
    stray.length === 0
      ? `the request's event is emitted in teardown: ${list(emitting.map(({ file }) => file))}`
      : [...new Set(stray)].join("; "),
  );
};

// 6. "`console.log` debugging left behind as 'instrumentation'" is
//    anti-pattern #9: "Unstructured, unqueryable, uncorrelated — remove or
//    promote to a real field", and "Most in-request `info` chatter should
//    become fields on the wide event, not separate lines".
exports.consoleLoggingRemoved = (output, context) => {
  const files = scopeFiles(context);
  if (files.length === 0) return untouched();
  const noisy = files
    .filter((file) => /\bconsole\.(?:log|info|warn|error|debug|trace)\s*\(/.test(lib.read(file)))
    .map(lib.rel);
  return lib.verdict(
    noisy.length === 0,
    noisy.length === 0
      ? `no console logging left in ${list(files)}`
      : `console logging still in ${noisy.join(", ")}`,
  );
};

// 7. "the W3C `traceparent` header carries trace ID and parent span ID across
//    every service hop, which is what makes distributed traces exist at all" —
//    and inventing a name for something the standard already defines is
//    anti-pattern #7.
exports.traceContextHeaderIsStandard = (output, context) => {
  const files = scopeFiles(context);
  if (files.length === 0) return lib.verdict(false, "no production source changed");
  const text = scopeText(context);
  const invented = [
    ...text.matchAll(
      /["'](x-trace-?id|x-correlation-?id|x-request-trace|x-span-?id|trace-?id|correlation-?id|x-b3-[\w-]+|b3)["']/gi,
    ),
  ].map((match) => match[1]);
  if (invented.length > 0)
    return lib.verdict(
      false,
      `a home-made correlation header is sent instead of W3C trace context: ${[...new Set(invented)].join(", ")}`,
    );
  // W3C trace context reaches the outgoing call either by name — the
  // `traceparent` header, or the propagator the standard is named after — or
  // by construction: an `inject` that writes the active OpenTelemetry context
  // into a carrier. The API's `propagation.inject`, a `new
  // W3CTraceContextPropagator().inject(…)` and a propagator held in a variable
  // are the same act, so none of them may be graded on its spelling. A
  // propagator for a different wire format is not this one.
  const OTHER_FORMAT = /\bB3(?:Propagator|MultiPropagator|InjectEncoding)?\b|\bJaegerPropagator\b/;
  const named = /\btraceparent\b|W3CTraceContext/i.test(text);
  const injected =
    /\.\s*inject\s*\(/.test(text) &&
    /\bcontext\s*\.\s*active\s*\(|\btrace\s*\.\s*setSpan\s*\(|propagat/i.test(text) &&
    !OTHER_FORMAT.test(text);
  const standard = named || injected;
  return lib.verdict(
    standard,
    standard
      ? "W3C trace context is injected into the outgoing call"
      : "nothing propagates W3C trace context (no `traceparent`, nothing injecting the active context into the charge's headers) to the payments client",
  );
};

// ---------------------------------------------------------------------------
// Alerting graders: parse rules, grade the paging rule's expression
// ---------------------------------------------------------------------------

// One alerting rule: its `alert:` head plus the lines that belong to that
// mapping. A rule's body ends where the document stops indenting under it — at
// the next list item or rule head, at a code fence, at a markdown heading, or
// at the first line of prose that is not another key. Nothing pasted *after*
// the rules — a runbook section, a paragraph, a burn-rate table — is ever read
// as part of the last rule, so the runbook and the expression are graded on
// what the rule itself says.
const indentOf = (line) => (/^[ \t]*/.exec(line) ?? [""])[0].replace(/\t/g, "  ").length;
const KEY_LINE = /^[ \t]*-?[ \t]*["']?[\w.\-]+["']?[ \t]*:/;
const FENCE_OR_HEADING = /^[ \t]*```|^#{1,6}[ \t]/;
const alertRules = (text) => {
  const lines = text.split("\n");
  const rules = [];
  lines.forEach((line, start) => {
    const head = /^([ \t]*)(-[ \t]*)?alert[ \t]*:[ \t]*["']?([\w.\-]+)/.exec(line);
    if (head === null) return;
    const indent = indentOf(line);
    const listItem = head[2] !== undefined;
    const body = [line];
    for (let index = start + 1; index < lines.length; index += 1) {
      const next = lines[index] ?? "";
      if (next.trim() === "") {
        body.push(next);
        continue;
      }
      if (FENCE_OR_HEADING.test(next)) break;
      const deeper = indentOf(next) > indent;
      if (listItem ? !deeper : !deeper && !KEY_LINE.test(next)) break;
      if (!listItem && /^[ \t]*-[ \t]|^[ \t]*-?[ \t]*alert[ \t]*:/.test(next) && !deeper) break;
      body.push(next);
    }
    rules.push({ name: head[3], body: body.join("\n") });
  });
  return rules;
};
const PAGING = /severity[ \t]*:[ \t]*["']?(?:page|critical|paging|p1)\b/i;
const alertDocuments = (context) => docFiles(context).map(lib.read);
const pagingRules = (context) => alertDocuments(context).flatMap((text) => alertRules(text).filter((rule) => PAGING.test(rule.body)));
const alertText = (context) => alertDocuments(context).join("\n\n");

// The expression a rule fires on — everything under `expr:` up to the rule's
// next key. Falls back to the comparison-bearing lines when the document is not
// YAML-shaped.
const expressionOf = (body) => {
  const match =
    /expr[ \t]*:[ \t]*(?:[|>][-+]?[ \t]*)?\n?([\s\S]*?)(?=\n[ \t]*(?:for|labels|annotations|keep_firing_for|alert|record)[ \t]*:|$)/.exec(
      body,
    );
  if (match) return match[1];
  return body
    .split("\n")
    .filter((line) => /rate\(|sum\(|[<>]=?\s*[\d.]/.test(line))
    .join("\n");
};

const SECONDS = { s: 1, m: 60, h: 3600, d: 86400 };
const windowsIn = (expression) =>
  [...expression.matchAll(/(\d+(?:\.\d+)?)\s*([smhd])(?![A-Za-z0-9_])/g)]
    .map((match) => Number(match[1]) * SECONDS[match[2]])
    .filter((seconds) => seconds > 0);
const describeWindows = (seconds) =>
  [...new Set(seconds)]
    .sort((a, b) => a - b)
    .map((value) =>
      value % 86400 === 0
        ? `${value / 86400}d`
        : value % 3600 === 0
          ? `${value / 3600}h`
          : value % 60 === 0
            ? `${value / 60}m`
            : `${value}s`,
    )
    .join(", ") || "none";

// Page burn rates from the skill's canonical table (99.9%/30d): 14.4 at 1h/5m
// and 6 at 6h/30m. `threshold = burn_rate × (1 - SLO)`, so a rule is calibrated
// when a canonical burn rate appears as a multiplier, as a bare threshold on a
// burn-rate recording rule, or as `threshold / budget`.
const PAGE_BURN_RATES = [14.4, 6];
const near = (value, target) => Math.abs(value - target) <= Math.max(0.02, target * 0.02);
const budgetsIn = (text) =>
  [...text.matchAll(/\b(9\d(?:\.\d+)?)\s*%/g)]
    .map((match) => 1 - Number(match[1]) / 100)
    .filter((budget) => budget > 0);
const isBurnRateCalibrated = (expression, budgets) => {
  const multipliers = [...expression.matchAll(/(\d+(?:\.\d+)?)\s*\*/g)].map((m) => Number(m[1]));
  const thresholds = [...expression.matchAll(/[<>]=?\s*\(?\s*(\d+(?:\.\d+)?)/g)].map((m) =>
    Number(m[1]),
  );
  const rates = [
    ...multipliers,
    ...thresholds,
    ...thresholds.flatMap((threshold) => budgets.map((budget) => threshold / budget)),
  ];
  return rates.some((rate) => PAGE_BURN_RATES.some((canonical) => near(rate, canonical)));
};

const noDocument = () =>
  lib.verdict(false, "the agent added no alert-rule or runbook document to the repository");
const noPagingRule = () =>
  lib.verdict(
    false,
    "no alerting rule with a paging severity was defined, so nothing reaches the on-call phone",
  );

// 8. "Define availability, correctness, and freshness as good events over
//    valid events" / "an SLO is a target value for that SLI" / "The error
//    budget is 100% minus the SLO".
exports.sloIsRatioBased = (output, context) => {
  const text = alertText(context);
  if (text.trim() === "") return noDocument();
  const missing = [
    [/\b9\d(?:\.\d+)?\s*%/, "no explicit objective percentage"],
    [
      /good\s+(?:events|requests)|\/\s*valid|valid\s+(?:events|requests)|success\w*\s*\/|\)\s*\/\s*sum|ratio|proportion/i,
      "the SLI is not defined as good events over valid events",
    ],
    [/error budget/i, "no error budget"],
  ]
    .filter(([pattern]) => !pattern.test(text))
    .map(([, label]) => label);
  return lib.verdict(
    missing.length === 0,
    missing.length === 0 ? "ratio SLI, objective and error budget stated" : missing.join("; "),
  );
};

// 9. "The default alert construction is the multiwindow, multi-burn-rate
//    alert … The short window (1/12 of the long) confirms the problem is
//    *still happening*" / "Alerting on every error the moment it happens" is
//    anti-pattern #11.
//
// Graded on the paging rule's own expression, never on the document's
// vocabulary: the expression must reference a long window and a short one,
// require both at once, and compare against a burn-rate multiple of the error
// budget. A single-window threshold page fails all three however the document
// is worded, and the skill's own worked Prometheus rule passes without ever
// spelling "burn rate".
exports.pagesAreBurnRateMultiwindow = (output, context) => {
  const text = alertText(context);
  if (text.trim() === "") return noDocument();
  const rules = pagingRules(context);
  if (rules.length === 0) return noPagingRule();
  const budgets = budgetsIn(text);
  const problems = rules.flatMap((rule) => {
    const expression = expressionOf(rule.body);
    const windows = windowsIn(expression);
    const longest = Math.max(...windows, 0);
    const shortest = Math.min(...windows, Infinity);
    const faults = [];
    if (!(windows.length >= 2 && longest / shortest >= 4))
      faults.push(
        `${rule.name}: the expression uses ${describeWindows(windows)} — a multiwindow page needs a long window and a short one about a twelfth of it`,
      );
    if (!/\band\b|&&/i.test(expression))
      faults.push(
        `${rule.name}: the windows are not required to breach at once (no \`and\` in the expression), so the page does not confirm the burn is still happening`,
      );
    if (!isBurnRateCalibrated(expression, budgets))
      faults.push(
        `${rule.name}: the threshold is a bare error rate, not a burn rate — expected 14.4x or 6x the error budget`,
      );
    return faults;
  });
  return lib.verdict(
    problems.length === 0,
    problems.length === 0
      ? `${rules.length} paging rule(s), each pairing a long and a short window against a burn-rate threshold`
      : problems.join("; "),
  );
};

// 10. "Page on symptoms, not causes … Cause-based data belongs on dashboards
//     and in tickets, not pages" (anti-pattern #4).
exports.pagesAreSymptomBased = (output, context) => {
  const text = alertText(context);
  if (text.trim() === "") return noDocument();
  const rules = pagingRules(context);
  if (rules.length === 0) return noPagingRule();
  // Cause words hide inside exporter metric names (`node_cpu_seconds_total`,
  // `container_memory_usage_bytes`), where a plain `\b` boundary never fires.
  const CAUSE_METRIC =
    /(?:^|[^A-Za-z])(?:cpu|mem|memory|heap|disk|swap|inode|jvm|goroutines?|filesystem|replica(?:tion)?[ _]?lag|saturation|pod|container|threadpool)(?![A-Za-z])|\b(?:node|container|kube|kubelet|jvm|process|machine)_\w+/gi;
  const causes = rules.flatMap((rule) => expressionOf(rule.body).match(CAUSE_METRIC) ?? []);
  return lib.verdict(
    causes.length === 0,
    causes.length === 0
      ? `every page fires on a user-visible symptom (${rules.length} rule(s))`
      : `a page fires on a cause, not a symptom: ${[...new Set(causes.map((cause) => cause.toLowerCase()))].join(", ")}`,
  );
};

// 11. "Every page links a runbook — a concise 'what this alert means and
//     current mitigations'" (anti-pattern #5).
exports.everyPageLinksRunbook = (output, context) => {
  const text = alertText(context);
  if (text.trim() === "") return noDocument();
  const rules = pagingRules(context);
  if (rules.length === 0) return noPagingRule();
  const without = rules.filter((rule) => !/runbook/i.test(rule.body));
  if (without.length > 0)
    return lib.verdict(
      false,
      `${without.length} of ${rules.length} paging rule(s) link no runbook: ${without.map((rule) => rule.name).join(", ")}`,
    );
  const hasRunbookBody = /(?:meaning|mitigat|escalate|verify)/i.test(text);
  return lib.verdict(
    hasRunbookBody,
    hasRunbookBody
      ? `all ${rules.length} paging rule(s) link a runbook, and the runbook says what to do`
      : "the pages link a runbook, but nothing in the repository says what it should contain",
  );
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "observability", name: context?.vars?.acceptance, targetDir: "src", config: "vitest.config.ts" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
