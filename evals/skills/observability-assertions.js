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
// Two deliberate design rules, after a verification round found graders that
// could be satisfied by vocabulary rather than construction:
//
//   * Metric-label graders resolve the value that actually reaches the label —
//     one hop through local declarations, and through any helper the label
//     value calls — instead of matching identifier spellings such as
//     `request.path`. A helper counts as a normaliser only when its own body
//     tests membership of a fixed set AND has an unknown-value fallback, so an
//     unused `_OTHER` constant left elsewhere in the tree proves nothing.
//   * The alerting graders parse alert *rules* (an `alert:` head, its `expr:`,
//     its severity label, its annotations) and grade the paging rule's
//     expression: the windows it references, whether it conjoins a long and a
//     short one, and whether its threshold is a burn-rate multiple of the error
//     budget. No grader looks for the words "burn rate" anywhere.

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
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/[^\n]*/g, " ");

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
    .replace(/([{,]\s*)[A-Za-z_$][\w$]*\s*:/g, "$1 : ");

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "new", "await", "async", "typeof",
  "true", "false", "null", "undefined", "this", "of", "in", "for", "while", "do", "try", "catch",
  "finally", "throw", "export", "import", "from", "as", "string", "number", "boolean", "readonly",
  "type", "interface", "satisfies", "Math", "JSON", "String", "Number", "Boolean", "Object",
  "Array", "Date", "Set", "Map", "Promise", "process", "void", "Error",
]);
const identifiersIn = (text) =>
  [...stripComments(text).matchAll(/\b[A-Za-z_$][\w$]*\b/g)]
    .map((match) => match[0])
    .filter((name) => !KEYWORDS.has(name));

// From `start`, the rest of one declaration: balanced brackets, ending at a `;`
// at depth zero or at the newline before the next top-level statement (so a
// helper whose arrow body continues on the following line is read whole).
const STATEMENT_START = /^[ \t]*(?:export|const|let|var|function|import|class|type|interface|\}|\/\/)/;
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

const declarationBodies = (source, name) => {
  const found = [];
  const declaration = new RegExp(
    `(?:^|[^\\w$.])(?:const|let|var)\\s+${escapeRe(name)}\\s*(?::[^=\\n]*)?=`,
    "g",
  );
  let match = declaration.exec(source);
  while (match !== null) {
    found.push(balancedFrom(source, match.index + match[0].length));
    match = declaration.exec(source);
  }
  const fn = new RegExp(`function\\s+${escapeRe(name)}\\s*(?=\\()`, "g");
  match = fn.exec(source);
  while (match !== null) {
    found.push(balancedFrom(source, match.index + match[0].length));
    match = fn.exec(source);
  }
  return found;
};

// A name's declaration: the file it is used in first, then anywhere in the
// production tree.
const definitionOf = (file, name) => {
  const own = declarationBodies(lib.read(file), name);
  if (own.length > 0) return own;
  return production().flatMap((other) => declarationBodies(lib.read(other), name));
};

// "Request-derived labels are safe only after normalization to a fixed
// allowlist … map unknown values to `_OTHER` or omit them". A helper counts as
// a normaliser only when its own body (plus the constants it names) both tests
// membership of a fixed set and has an unknown-value fallback — being called
// `routeLabel` is not enough, and neither is an `_OTHER` constant sitting
// unused elsewhere in the tree.
const FIXED_SET =
  /\.includes\s*\(|\.has\s*\(|new Set\s*\(|\bswitch\b|===\s*["'`]|\[[^\]\n]*\]\s*(?:\?\?|\|\|)|\bin\s+[A-Za-z_$]|\.find\s*\(|\.some\s*\(/;
const UNKNOWN_FALLBACK = /_OTHER\b|_UNKNOWN\b|["'`](?:other|unknown|_other|_unknown)["'`]/i;
const helperContext = (file, name) => {
  const body = definitionOf(file, name).join("\n");
  if (body.trim() === "") return "";
  const nested = [...new Set(identifiersIn(body))]
    .filter((inner) => inner !== name)
    .flatMap((inner) => definitionOf(file, inner));
  return stripComments([body, ...nested].join("\n"));
};
const isNormaliser = (file, name) => {
  const context = helperContext(file, name);
  return context.trim() !== "" && FIXED_SET.test(context) && UNKNOWN_FALLBACK.test(context);
};

// The text of everything that actually reaches a label: keys removed, calls to
// real normalisers erased along with their arguments, every other name replaced
// by its declaration (two hops). A helper that is not a normaliser is inlined,
// so hiding `incoming.path` behind `toRoute(incoming)` does not launder it.
const resolvedValues = (file, argument) => {
  let text = stripKeys(stripComments(argument));
  const expanded = new Set();
  for (let hop = 0; hop < 2; hop += 1) {
    const called = [...new Set([...text.matchAll(/\b([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]))]
      .filter((name) => !KEYWORDS.has(name) && isNormaliser(file, name));
    if (called.length > 0) {
      text = text.replace(
        new RegExp(`\\b(?:${called.map(escapeRe).join("|")})\\s*\\([^()]*\\)`, "g"),
        " NORMALISED ",
      );
    }
    const names = [...new Set(identifiersIn(text))].filter((name) => !expanded.has(name));
    names.forEach((name) => expanded.add(name));
    const additions = names.flatMap((name) => definitionOf(file, name));
    if (additions.length === 0) break;
    text = stripKeys(stripComments([text, ...additions].join("\n")));
  }
  return text;
};

// ---------------------------------------------------------------------------
// Code graders
// ---------------------------------------------------------------------------

// A pseudonymising wrapper is the skill's own remedy for a personal
// identifier, so collapse those before looking for one. Secrets get no such
// tolerance: "Never emit passwords, tokens, API keys, cookies, or session IDs
// into any signal" is absolute.
const PSEUDONYMISED =
  /\b\w*(?:hash|digest|sha\d*|hmac|pseudonym\w*|redact|mask|anonymi[sz]e|fingerprint|tokeni[sz]e)\w*\s*\([^()]*\)/gi;

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
// The instrument is often created in one module and recorded on in another, so
// once any file creates one, every measurement in the tree is in scope.
const measurementAttributes = (context) =>
  !hasInstrument(context)
    ? []
    : scopeFiles(context).flatMap((file) =>
        callArguments(lib.read(file), /\.(?:record|add)\s*\(/)
          .map((argument) => argument.slice(argument.indexOf(",") + 1))
          .filter((argument) => argument.trim() !== "")
          .map((argument) => ({ file, argument, values: resolvedValues(file, argument) })),
      );

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
  const measurements = measurementAttributes(context);
  if (measurements.length === 0) return lib.verdict(true, "no metric measurement to check");
  const violations = measurements.flatMap(({ file, values }) =>
    [
      [HIGH_CARDINALITY_VALUE, "high-cardinality identifier"],
      [RAW_REQUEST_VALUE, "raw request path"],
      [TRACE_VALUE, "trace identifier"],
    ]
      .filter(([pattern]) => pattern.test(values))
      .map(([, label]) => `${lib.rel(file)}: ${label} used as a metric label`),
  );
  return lib.verdict(
    violations.length === 0,
    violations.length === 0
      ? `metric labels bounded (${measurements.length} measurement site(s))`
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
  const measurements = measurementAttributes(context);
  if (measurements.length === 0)
    return lib.verdict(false, "an instrument was created but nothing records a measurement on it");
  const raw = measurements.filter(({ values }) => RAW_REQUEST_VALUE.test(values));
  if (raw.length > 0)
    return lib.verdict(
      false,
      `${lib.rel(raw[0].file)}: a raw request path/URL reaches a metric label unnormalised`,
    );
  const normalised = measurements.filter(({ values }) => /NORMALISED/.test(values));
  return lib.verdict(
    true,
    normalised.length > 0
      ? `the route label is produced by a helper that maps to a fixed set with an unknown-value fallback (${normalised.length} measurement site(s))`
      : `no unbounded request value reaches a metric label (${measurements.length} measurement site(s))`,
  );
};

// Bodies of every `finally { … }` block in scope.
const finallyBlocks = (text) => {
  const blocks = [];
  const scanner = /finally\s*{/g;
  let match = scanner.exec(text);
  while (match !== null) {
    const open = text.indexOf("{", match.index);
    let depth = 0;
    let index = open;
    for (; index < text.length; index += 1) {
      if (text[index] === "{") depth += 1;
      else if (text[index] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    blocks.push(text.slice(open + 1, index));
    scanner.lastIndex = index;
    match = scanner.exec(text);
  }
  return blocks;
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
    finallyBlocks(lib.read(file)).map((block) => ({ file, block })),
  );
  const emitting = teardown.filter(({ block }) => EMITTER.test(block));
  if (emitting.length === 0)
    return lib.verdict(
      false,
      "nothing emits the request's event from a finally/teardown block, so the exception path loses it",
    );
  const stray = files.flatMap((file) => {
    const text = lib.read(file);
    const inTeardown = finallyBlocks(text).join("\n");
    const ends = (text.match(/\b\w*[Ss]pan\w*\.end\s*\(/g) ?? []).length;
    const endsInTeardown = (inTeardown.match(/\b\w*[Ss]pan\w*\.end\s*\(/g) ?? []).length;
    return ends > endsInTeardown ? [`${lib.rel(file)}: a span is ended outside a finally block`] : [];
  });
  return lib.verdict(
    stray.length === 0,
    stray.length === 0
      ? `the request's event is emitted in teardown: ${list(emitting.map(({ file }) => file))}`
      : stray.join("; "),
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
      /["'](x-trace-?id|x-correlation-?id|x-request-trace|x-span-?id|trace-?id|correlation-?id)["']/gi,
    ),
  ].map((match) => match[1]);
  if (invented.length > 0)
    return lib.verdict(
      false,
      `a home-made correlation header is sent instead of W3C trace context: ${[...new Set(invented)].join(", ")}`,
    );
  const standard = /propagation\.inject\s*\(/.test(text) || /\btraceparent\b/i.test(text);
  return lib.verdict(
    standard,
    standard
      ? "W3C trace context is injected into the outgoing call"
      : "nothing propagates W3C trace context (no propagation.inject, no traceparent) to the payments client",
  );
};

// ---------------------------------------------------------------------------
// Alerting graders: parse rules, grade the paging rule's expression
// ---------------------------------------------------------------------------

// One alerting rule: its `alert:` head through to the next rule, the end of the
// enclosing code fence, or the next markdown heading — so a runbook pasted
// underneath a rule file never counts as part of the rule.
const RULE_BOUNDARY = /^(?:[ \t]*-?[ \t]*(?:alert|record)[ \t]*:|[ \t]*```|#{1,6}[ \t])/m;
const alertRules = (text) => {
  const heads = [...text.matchAll(/^[ \t]*-?[ \t]*alert[ \t]*:[ \t]*["']?([\w.\-]+)/gm)];
  return heads.map((head) => {
    const after = head.index + head[0].length;
    const rest = text.slice(after);
    const boundary = rest.search(RULE_BOUNDARY);
    return { name: head[1], body: text.slice(head.index, boundary === -1 ? text.length : after + boundary) };
  });
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
  lib.runAcceptance({ suite: "observability", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
