// Deterministic graders for the twelve-factor quality suite.
//
// The fixture (fixtures/twelve-factor-workspace) declares that the service is
// deployed as a twelve-factor service on a container platform and shows none of
// the practice: environment variables are read wherever they happen to be
// needed and fall back to silent defaults, the database host is chosen by
// NODE_ENV, every log line goes through an SDK stand-in that appends to a file,
// nothing handles a stop signal, and sessions are cached in a module-level Map.
// `zod` is a declared dependency the agent may reach for, but nothing in the
// fixture parses anything through a schema, so configSchemaValidated grades a
// decision the fixture never makes for the agent.
//
// Nothing here assumes a folder layout beyond what the fixture's README fixes:
// src/index.ts starts the web process, src/lib/ holds SDK stand-ins, and the
// platform runs the process types listed in Procfile. Roles are found by
// content — the config module is whichever production file exports
// createConfig, the shutdown file is whichever one registers a signal handler,
// a composition root is whichever file builds the config.
//
// Spelling is never graded. A definition may be a `const` arrow or a
// `function`; a call may sit in the file that defines it or in one that imports
// it; an options object may be named anything at all; wiring may live in the
// entry point or in a composition module several files away; a process type may
// be launched directly or through a package script. Every grader resolves those
// through the import closure, a definition-aware call scan, a brace/paren-
// balanced read of a parameter list, and a package.json script walk, so only
// the rule is graded.
//
// Prose is never graded as code either: a pattern that would read a comment or
// a sentence inside an error message as source runs over `codeOf`, which
// removes comments and blanks regular-expression bodies, and over whole string
// literals rather than substrings of them. Documenting a connection URL in a
// comment, checking a setting `startsWith("postgres://")` and telling an
// operator what a good value looks like are all correct answers to the config
// case and none of them is a hardcoded endpoint.
//
// Every grader is one rule the skill states, quoted in the comment above it.

const { existsSync, readFileSync, statSync } = require("node:fs");
const { dirname, resolve } = require("node:path");
const lib = require("./quality-lib");

const srcDir = () => lib.resolve(lib.workspace(), "src");
const wsFile = (name) => lib.resolve(lib.workspace(), name);
const readIfExists = (path) => (existsSync(path) && statSync(path).isFile() ? readFileSync(path, "utf8") : undefined);

// Production source: everything under src that is not a test and not a hidden
// acceptance test copied in by the harness.
const production = () =>
  lib.sourceFiles(srcDir()).filter((file) => !lib.isTestPath(file) && !/^acceptance-/.test(lib.basename(file)));
// The app's own code: the SDK stand-ins in src/lib are not ours.
const appCode = () => production().filter((file) => !/\/src\/lib\//.test(file));
const withText = (files) => files.map((file) => [file, lib.read(file)]);
const list = (files) => files.map(lib.rel).join(", ") || "(none)";
const joined = (files) => files.map(lib.read).join("\n");

const stripExt = (path) => path.replace(/\.(ts|tsx|js|jsx)$/, "");
const isFile = (path) => existsSync(path) && statSync(path).isFile();
const resolveImport = (from, spec) => {
  const base = resolve(dirname(from), spec);
  const candidates = [base, `${base}.ts`, `${stripExt(base)}.ts`, resolve(base, "index.ts")];
  return candidates.find(isFile);
};
const relativeImports = (file) =>
  lib
    .importsOf(lib.read(file))
    .filter((spec) => spec.startsWith("."))
    .map((spec) => resolveImport(file, spec))
    .filter(Boolean);

// Everything a process entry point actually loads: the entry itself and, going
// as far as the imports go, every relative import it reaches. Wiring that an
// entry shares through a composition module is therefore found the same way as
// wiring written into the entry.
const closureOf = (entry) => {
  if (!isFile(entry)) return [];
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...relativeImports(file));
  }
  return [...seen];
};

// Files the web process actually loads.
const webPath = () => closureOf(wsFile("src/index.ts"));

const moduleExporting = (name) =>
  production().find((file) => new RegExp(`export\\s+(const|let|function|async function)\\s+${name}\\b`).test(lib.read(file))) ??
  production().find((file) => new RegExp(`export\\s*\\{[^}]*\\b${name}\\b`).test(lib.read(file)));

// Does this text *call* `name`, as opposed to merely defining or re-exporting
// it? The definition headers are removed first, so a file that both exports
// `runCleanup` and invokes it under a main guard counts as calling it — the
// shape a one-file process entry naturally takes.
const callsInText = (text, name) => {
  const withoutDefinitions = text
    .replace(new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\s*\\(`, "g"), " ")
    .replace(new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`, "g"), " ");
  return new RegExp(`\\b${name}\\s*\\(`).test(withoutDefinitions);
};
const calls = (file, name) => callsInText(lib.read(file), name);

// Read a balanced (...) or {...} span starting at `start`, skipping over string
// and template literals so a bracket inside a string never moves the depth.
const balancedFrom = (text, start) => {
  const open = text[start];
  const close = { "(": ")", "{": "}", "[": "]" }[open];
  if (close === undefined) return undefined;
  let depth = 0;
  let quote;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quote !== undefined) {
      if (char === "\\") index += 1;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return text.slice(start + 1, index);
    }
  }
  return undefined;
};

// The declared parameter list of `name`, whether it is written as an arrow
// bound to a const or as a function declaration, and whatever return-type
// annotation follows it. `undefined` means no definition was found; `""` means
// the factory genuinely takes nothing.
const parameterListOf = (text, name) => {
  const definition = [
    new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`),
    new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\b`),
  ]
    .map((pattern) => pattern.exec(text))
    .filter(Boolean)
    .sort((a, b) => a.index - b.index)[0];
  if (!definition) return undefined;
  const open = text.indexOf("(", definition.index + definition[0].length);
  return open === -1 ? undefined : balancedFrom(text, open);
};

// The argument list of the first call to `name` in this text, if any.
const argumentListOf = (text, name) => {
  const call = new RegExp(`\\b${name}\\s*\\(`).exec(text);
  if (!call) return undefined;
  return balancedFrom(text, call.index + call[0].length - 1);
};

const anyOf = (patterns, text) => patterns.some((pattern) => pattern.test(text));
const hitsIn = (files, checks) =>
  withText(files).flatMap(([file, text]) =>
    checks.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`),
  );

// Everything before this point reads raw text. The checks that would otherwise
// read prose as source read `codeOf` instead: line and block comments are
// removed and regular-expression bodies are blanked, while string literals are
// left exactly as written. A regular expression is recognised where one may
// legally start, so `a / b` stays a division and `/^postgres:\/\//` stays one
// token.
const REGEX_MAY_START = /(^|[([{,;:=!&|?+\-*%~^<>])\s*$|\b(return|typeof|case|in|of|new|delete|void|do|else)\s*$/;
const stripComments = (text) => {
  let out = "";
  let index = 0;
  while (index < text.length) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' || char === "'" || char === "`") {
      out += char;
      index += 1;
      while (index < text.length) {
        const inner = text[index];
        out += inner;
        index += 1;
        if (inner === "\\") {
          out += text[index] ?? "";
          index += 1;
          continue;
        }
        if (inner === char) break;
      }
      continue;
    }
    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) index += 1;
      index += 2;
      continue;
    }
    if (char === "/" && REGEX_MAY_START.test(out)) {
      out += "/RE/";
      index += 1;
      let inClass = false;
      while (index < text.length) {
        const inner = text[index];
        index += 1;
        if (inner === "\\") {
          index += 1;
          continue;
        }
        if (inner === "[") inClass = true;
        else if (inner === "]") inClass = false;
        else if (inner === "\n") break;
        else if (inner === "/" && !inClass) break;
      }
      continue;
    }
    out += char;
    index += 1;
  }
  return out;
};
const codeOf = (file) => stripComments(lib.read(file));
const hitsInCode = (files, checks) =>
  files.flatMap((file) => {
    const text = codeOf(file);
    return checks.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`);
  });

// Whole string and template literals, contents only. A pattern applied to
// these asks "is this value a URL?" rather than "does this file mention one
// anywhere?".
const stringLiteralsIn = (code) => {
  const found = [];
  let index = 0;
  while (index < code.length) {
    const char = code[index];
    if (char !== '"' && char !== "'" && char !== "`") {
      index += 1;
      continue;
    }
    let value = "";
    index += 1;
    while (index < code.length) {
      const inner = code[index];
      if (inner === "\\") {
        value += inner + (code[index + 1] ?? "");
        index += 2;
        continue;
      }
      index += 1;
      if (inner === char) break;
      value += inner;
    }
    found.push(value);
  }
  return found;
};

// The platform's process declaration: "web: <command>" lines in Procfile.
const processTypes = () =>
  (readIfExists(wsFile("Procfile")) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => ({ name: line.slice(0, line.indexOf(":")).trim(), command: line.slice(line.indexOf(":") + 1).trim() }))
    .filter((type) => type.name !== "");
const packageScripts = () => {
  try {
    return JSON.parse(readIfExists(wsFile("package.json")) ?? "{}").scripts ?? {};
  } catch {
    return {};
  }
};

// The file a declared process command runs. A command naming a source file
// wins. A command that delegates to a package script is followed into that
// script, so `worker: pnpm run cleanup` with `"cleanup": "node src/cleanup.ts"`
// declares the same entry point as `worker: node src/cleanup.ts`. Failing both
// (a build step whose output is not in the tree), a production file whose
// basename is one of the names seen along the way — the process type, the
// script, the built artifact — is taken as the entry, so the choice of launcher
// is never graded.
const entryFileOf = (type) => {
  const scripts = packageScripts();
  const names = [type.name, `${type.name}-process`];
  const follow = (command, depth) => {
    if (typeof command !== "string" || depth > 4) return undefined;
    const paths = command.match(/[\w@./-]+\.(ts|tsx|mts|cts|js|mjs|cjs)\b/g) ?? [];
    const named = paths.map((path) => wsFile(path)).find(isFile);
    if (named) return named;
    paths.forEach((path) => names.push(stripExt(lib.basename(path))));
    const script = /\b(?:pnpm|npm|yarn|bun|npx)\s+(?:run\s+|exec\s+)?([\w:.@/-]+)/.exec(command)?.[1];
    if (script === undefined) return undefined;
    names.push(script);
    return Object.hasOwn(scripts, script) ? follow(scripts[script], depth + 1) : undefined;
  };
  const found = follow(type.command, 0);
  if (found) return found;
  const wanted = new Set(names);
  return production().find((file) => wanted.has(stripExt(lib.basename(file))));
};

// ---------------------------------------------------------------------------
// Config (Factor III)
// ---------------------------------------------------------------------------

// The settings the platform sets on a container, as the case's request states
// them. They are the deploy contract, not a naming convention.
const PLATFORM_SETTINGS = ["PORT", "DATABASE_URL", "SESSION_TTL_MINUTES"];

// 1. "Validate config at startup with a schema — fail fast (exit non-zero,
//    clear error) if config is invalid".
//
//    "With a schema" is graded as the deploy contract being declared in one
//    place — either through a schema library, or as one literal listing the
//    settings — never as the name of a library. `JSON.parse` is explicitly not
//    a schema. "Fail fast" is graded as the module refusing loudly rather than
//    returning something half built. "At startup" is graded over the web
//    process's whole import closure, so a composition module counts.
exports.configSchemaValidated = () => {
  const file = moduleExporting("createConfig");
  if (!file) return lib.verdict(false, "no production module exports createConfig");
  const text = lib.read(file);
  const throughASchema = anyOf(
    [
      /\b[\w$]+\s*\.\s*(object|strictObject|looseObject|record|shape)\s*\(/,
      /\bSchema\b\s*[:=]/,
      /(?<!JSON)\.(safeParse|parse|validate|assert)\s*\(/,
      /from\s+["'](zod|valibot|ajv|yup|superstruct|arktype|@sinclair\/typebox|io-ts)["']/,
    ],
    text,
  );
  // A hand-written contract counts too, as long as the settings are declared
  // together rather than read one at a time from wherever they are needed.
  const positions = PLATFORM_SETTINGS.map((key) => text.indexOf(key)).filter((index) => index >= 0).sort((a, b) => a - b);
  const declaredTogether = positions.length >= 2 && positions[positions.length - 1] - positions[0] <= 600;
  const failsFast = anyOf([/\bthrow\b/, /process\.exit\s*\(/, /\b(success|ok|valid)\s*:\s*false/], text);
  const startupUse = webPath().some((loaded) => calls(loaded, "createConfig"));
  const reasons = [
    throughASchema || declaredTogether ? undefined : `${lib.rel(file)}: the settings a container needs are not declared in one place`,
    failsFast ? undefined : `${lib.rel(file)}: invalid config is not refused, so a bad container still comes up`,
    startupUse ? undefined : "nothing the web process loads builds its config at startup",
  ].filter(Boolean);
  return lib.verdict(reasons.length === 0, reasons.length === 0 ? `config contract declared and refused in ${lib.rel(file)}, built at startup` : reasons.join("; "));
};

// 2. "Never hardcode credentials or environment-specific endpoints" — a
//    deploy-varying backing service gets no in-source default to fall back to.
//
//    What is graded is a *value* the process would carry on with, never a
//    mention of one. A connection URL counts when a whole string or template
//    literal is one — `"postgres://localhost:5432/sessions"` — so the prefix a
//    validator compares against (`startsWith("postgres://")`), a pattern it
//    matches, a sentence telling an operator what a good value looks like and a
//    comment above the schema are all left alone. A coalesce counts when what
//    follows it is a literal; `?? missing("DATABASE_URL")`, a helper that
//    throws, is a refusal and is the answer this case asks for.
const A_CONNECTION_URL = /^\s*(postgresql|postgres|mysql|mongodb\+srv|mongodb|rediss|redis|amqps|amqp)\s*:\/\/\S*[^\s:/]/;
exports.noSilentDefaultForRequiredConfig = () => {
  const hardcoded = production()
    .filter((file) => stringLiteralsIn(codeOf(file)).some((literal) => A_CONNECTION_URL.test(literal)))
    .map((file) => `${lib.rel(file)}: a backing service URL is hardcoded in source as a value`);
  const hits = [
    ...hardcoded,
    ...hitsInCode(production(), [
      [/DATABASE_URL[^\n]{0,80}?(\?\?|\|\|)\s*(["'`]|\d|new\b)/, "DATABASE_URL falls back to a default value"],
      [/DATABASE_URL[^\n]{0,120}\.default\s*\(/, "DATABASE_URL is declared with a default"],
      [/prod-db|\.internal\.example\.com/, "an environment-specific endpoint is in source"],
    ]),
  ];
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no in-source fallback for a deploy-varying backing service" : hits.join("; "));
};

// 3. "Environment-name branching creates combinatorial explosion and breaks
//    dev/prod parity" — the config anti-pattern
//    `if (process.env.NODE_ENV === 'production')`.
exports.noEnvironmentNameBranching = () => {
  const hits = hitsInCode(production(), [
    [/(NODE_ENV|APP_ENV|ENVIRONMENT)[^\n]{0,60}(===|!==|==\s|!=\s)/, "branches on the environment name"],
    [/(===|!==)[^\n]{0,20}(NODE_ENV|APP_ENV|ENVIRONMENT)\b/, "branches on the environment name"],
    [/(===|!==)\s*["'`](production|staging|development)["'`]/, "branches on the environment name"],
  ]);
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no environment-name branching in src" : hits.join("; "));
};

// 4. "Inject config via options objects — never import `process.env` deep in
//    the call tree". The environment may be read where the config is built —
//    the config module itself, a process entry point, or a composition module
//    that calls createConfig for one — and nowhere else. Where that
//    composition root lives is the agent's choice and is not graded.
exports.configInjectedNotReadDeep = () => {
  const compositionRoots = production().filter((file) => calls(file, "createConfig"));
  const allowed = new Set(
    [moduleExporting("createConfig"), wsFile("src/index.ts"), ...processTypes().map(entryFileOf), ...compositionRoots]
      .filter(Boolean)
      .filter(isFile)
      .map((file) => lib.rel(file)),
  );
  const offenders = production().filter((file) => !allowed.has(lib.rel(file)) && /process\.env/.test(lib.read(file)));
  return lib.verdict(
    offenders.length === 0,
    offenders.length === 0 ? `process.env read only where config is built: ${[...allowed].join(", ") || "(nowhere)"}` : `process.env read deep in the call tree: ${list(offenders)}`,
  );
};

// 5. "Document required configuration in the platform-appropriate example or
//    schema; use `.env.example` when environment variables are the
//    configuration interface (never commit `.env` with real values)".
exports.envExampleDocumented = () => {
  const example = readIfExists(wsFile(".env.example"));
  if (example === undefined) return lib.verdict(false, "no .env.example documents what an operator has to set");
  const configFile = moduleExporting("createConfig");
  const declared = configFile
    ? [...lib.read(configFile).matchAll(/^\s*["']?([A-Z][A-Z0-9_]{2,})["']?\s*:/gm)].map((match) => match[1])
    : [];
  const required = [...new Set([...PLATFORM_SETTINGS, ...declared])];
  const missing = required.filter((key) => !new RegExp(`^\\s*(export\\s+)?${key}\\s*=`, "m").test(example));
  const secrets = example
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[A-Z][A-Z0-9_]*\s*=/.test(line))
    .filter((line) => /(SECRET|PASSWORD|TOKEN|API_KEY|CREDENTIAL)/.test(line.split("=")[0]))
    .filter((line) => /=\s*\S{12,}/.test(line) && !/(your|example|change|placeholder|xxx|<)/i.test(line));
  const committed = existsSync(wsFile(".env")) ? [".env is committed with real values"] : [];
  const problems = [
    ...missing.map((key) => `.env.example does not document ${key}`),
    ...secrets.map((line) => `.env.example carries what looks like a real secret: ${line.split("=")[0]}`),
    ...committed,
  ];
  return lib.verdict(problems.length === 0, problems.length === 0 ? `.env.example documents ${required.join(", ")}` : problems.join("; "));
};

// ---------------------------------------------------------------------------
// Disposability (Factor IX)
// ---------------------------------------------------------------------------

const shutdownFiles = () => production().filter((file) => /SIGTERM|SIGINT/.test(lib.read(file)));

// 6. "Handle SIGTERM and SIGINT for graceful shutdown".
exports.signalHandlersRegistered = () => {
  const files = shutdownFiles();
  const text = joined(files);
  const registered = /\b(?:process|signals?|source|emitter|proc)\.(on|once|addListener)\s*\(\s*["']SIG/.test(text) || /process\.(on|once|addListener)\s*\(/.test(text);
  const missing = [
    /SIGTERM/.test(text) ? undefined : "SIGTERM",
    /SIGINT/.test(text) ? undefined : "SIGINT",
  ].filter(Boolean);
  const pass = registered && missing.length === 0;
  return lib.verdict(
    pass,
    pass ? `stop signals handled in ${list(files)}` : missing.length > 0 ? `no handler for ${missing.join(" or ")}` : "signal names appear but nothing registers a handler",
  );
};

// 7. "Set a drain timeout — force exit if shutdown hangs". Read across the
//    whole shutdown path, not one file: a timer armed in one module and the
//    forced exit it triggers may legitimately sit apart.
exports.drainTimeoutSet = () => {
  const files = shutdownFiles();
  if (files.length === 0) return lib.verdict(false, "nothing handles a stop signal, so there is no drain to time out");
  const text = joined([...new Set([...files, ...files.flatMap(closureOf)])]);
  const armed = /setTimeout\s*\(/.test(text) || /timers\/promises/.test(text) || /AbortSignal\.timeout\s*\(/.test(text);
  const forces = /process\.exit\s*\(/.test(text) || /process\.abort\s*\(/.test(text);
  const problems = [
    armed ? undefined : "no timer bounds the drain",
    forces ? undefined : "nothing forces the process to exit when the drain does not finish",
  ].filter(Boolean);
  return lib.verdict(problems.length === 0, problems.length === 0 ? `drain timeout forces exit from ${list(files)}` : `${list(files)}: ${problems.join("; ")}`);
};

// 8. "Await `server.close()` to drain in-flight connections" — a handler that
//    exits the process the moment the signal arrives drains nothing.
//    A hard exit *after* the drain is a legitimate ending and is not graded
//    here; what is graded is that the close is waited on and that the handler
//    does not exit on the spot.
exports.shutdownDrainsBeforeExiting = () => {
  const files = shutdownFiles();
  if (files.length === 0) return lib.verdict(false, "nothing handles a stop signal");
  const path = [...new Set([...files, ...files.flatMap(closureOf)])];
  const waitsForTheClose = (text) =>
    /\bawait\b[^\n;]{0,80}\.close\s*\(/.test(text) ||
    /\.close\s*\(\s*\)\s*\.then\s*\(/.test(text) ||
    (/\bawait\b[^\n;]{0,80}(Promise\.(all|race|allSettled)|\bdrain|\bshutdown|\bstop)/i.test(text) && /\.close\s*\(/.test(text));
  const drains = path.filter((file) => waitsForTheClose(lib.read(file)));
  const exitsOnTheSpot = hitsIn(files, [
    [
      /process\.(on|once|addListener)\s*\(\s*["'`]SIG[A-Z]+["'`]\s*,\s*(async\s*)?(\([^)]*\)|[\w$]+)\s*=>\s*\{?\s*process\.exit\s*\(/,
      "exits the process the moment the signal arrives instead of draining",
    ],
  ]);
  const problems = [...exitsOnTheSpot, ...(drains.length === 0 ? [`${list(files)}: nothing waits for the server to close`] : [])];
  return lib.verdict(problems.length === 0, problems.length === 0 ? `shutdown waits for the server to close in ${list(drains)}` : problems.join("; "));
};

// 9. "Close database pools, Redis connections, queue consumers" on shutdown.
exports.backingServicesClosedOnShutdown = () => {
  const files = shutdownFiles();
  if (files.length === 0) return lib.verdict(false, "nothing handles a stop signal");
  const path = [...new Set([...files, ...files.flatMap(closureOf)])];
  const closesABackingService = (text) =>
    /(pool|db|database|cache|redis|queue|store|client|connection)[\w.$]{0,24}\.(end|quit|close|disconnect|destroy)\s*\(/i.test(text);
  const closing = path.filter((file) => closesABackingService(lib.read(file)));
  return lib.verdict(
    closing.length > 0,
    closing.length > 0 ? `backing services closed in ${list(closing)}` : `${list(files)}: shutdown closes no backing service`,
  );
};

// ---------------------------------------------------------------------------
// Logs (Factor XI)
// ---------------------------------------------------------------------------

const WRITES_TO_A_FILE = /appendFile(Sync)?\s*\(|writeFile(Sync)?\s*\(|createWriteStream\s*\(|transports\.File/;
const USES_THE_FILE_TRANSPORT = /from\s+["'][^"']*file-logger["']|\bcreateFileLogger\s*\(/;

// A file puts records on the process streams when it reaches a console method,
// or when it writes through the streams themselves. Both are routinely reached
// through a name rather than at the call site — `(level === "error" ?
// console.error : console.log)(record)` and `const stream = severity ===
// "error" ? process.stderr : process.stdout; stream.write(record)` are the two
// shapes the skill's own resources/node-patterns.md teaches — so match the
// reference to the stream, and for the streams a write beside it, never a
// literal `console.log(` call site.
const putsRecordsOnAStream = (text) =>
  /\bconsole\.(log|info|warn|error|debug|trace)\b/.test(text) ||
  (/\bprocess\.(stdout|stderr)\b/.test(text) && /\.write\s*\(/.test(text));

// 10. "Never route or store logs in files from within the app" — the execution
//     environment captures the process streams.
exports.logsOnProcessStreamsNotFiles = (output, context) => {
  const touched = lib.touchedBy(context);
  const problems = [
    ...hitsIn(appCode(), [[USES_THE_FILE_TRANSPORT, "still logs through the file transport"]]),
    ...hitsIn(production().filter(touched), [[WRITES_TO_A_FILE, "writes log records to a file"]]),
  ];
  const streamed = production().filter((file) => putsRecordsOnAStream(lib.read(file)));
  if (streamed.length === 0) problems.push("nothing writes log records to stdout or stderr");
  return lib.verdict(problems.length === 0, problems.length === 0 ? `logs go to the process streams from ${list(streamed)}` : problems.join("; "));
};

// 11. "Structured output — logs are machine-parseable (JSON preferred), not
//     free-form strings"; "Unstructured string interpolation produces logs that
//     cannot be parsed or queried".
//
//     Serialisation is read over everything the logger module loads, not the
//     one file: an implementation that formats the record in a module of its
//     own and writes the result is the same answer.
exports.logRecordsAreStructured = () => {
  const file = moduleExporting("createLogger");
  const serialises = file !== undefined && closureOf(file).some((loaded) => /JSON\.stringify\s*\(/.test(lib.read(loaded)));
  // The message argument of a log call, not the stream write of a record the
  // logger has already serialised.
  const interpolated = hitsIn(production(), [
    [/(console\.(log|info|warn|error|debug)|\.(info|warn|error|debug)|\blog(ger)?\.write)\s*\(\s*`[^`]*\$\{/, "logs an interpolated sentence instead of fields"],
    [/(console\.(log|info|warn|error|debug)|\.(info|warn|error|debug)|\blog(ger)?\.write)\s*\(\s*["'][^"']*["']\s*\+/, "logs a concatenated sentence instead of fields"],
  ]);
  const problems = [
    ...(file === undefined ? ["no production module exports createLogger"] : []),
    ...(file !== undefined && !serialises ? [`${lib.rel(file)}: nothing the logger loads serialises a record as JSON`] : []),
    ...interpolated,
  ];
  return lib.verdict(problems.length === 0, problems.length === 0 ? `structured records from ${lib.rel(file)}` : problems.join("; "));
};

// 12. "Useful severity — follow the platform's recognized levels and make the
//     threshold deploy-time configurable where needed."
//
//     "Configurable" means the threshold comes from outside the logger, by any
//     of the three routes an implementation may take: the logger reads it from
//     the environment, the factory declares a parameter for it, or a
//     composition root passes one in. The parameter's *name* is never graded —
//     the declared list is read with a balanced scan that skips the return-type
//     annotation, so `(opts = {})`, `({ level })` and `(config: Config)` are
//     all the same answer. The ranking table and the comparison are read over
//     everything the logger module loads, so a levels module of its own is the
//     same answer as one file.
exports.logLevelThresholdConfigurable = () => {
  const file = moduleExporting("createLogger");
  if (file === undefined) return lib.verdict(false, "no production module exports createLogger");
  const text = lib.read(file);
  const loaded = joined(closureOf(file));
  const ranked = /\b(debug|trace)\s*:\s*\d+/.test(loaded) || /\[\s*["']debug["'][^\]]*\]/.test(loaded);
  const compared = /[<>]=?/.test(loaded) && /(threshold|level|severity|rank|weight)/i.test(loaded);
  const parameters = parameterListOf(text, "createLogger");
  const takesAnOption = parameters !== undefined && parameters.trim() !== "";
  const injectedByACaller = production()
    .filter((other) => lib.rel(other) !== lib.rel(file))
    .some((other) => (argumentListOf(lib.read(other), "createLogger") ?? "").trim() !== "");
  const fromTheEnvironment = /process\.env\s*(\.\s*[A-Z_]*LEVEL|\[\s*["'][A-Z_]*LEVEL)/.test(text);
  const configurable = takesAnOption || injectedByACaller || fromTheEnvironment;
  const problems = [
    ranked ? undefined : "levels are not ranked, so nothing can be filtered",
    compared ? undefined : "no record is compared against a threshold",
    configurable ? undefined : "the threshold is fixed in source: the factory takes nothing, no caller passes one, and nothing reads it from the environment",
  ].filter(Boolean);
  return lib.verdict(
    problems.length === 0,
    problems.length === 0 ? `${lib.rel(file)}: severity filtered against a threshold set for the deploy` : `${lib.rel(file)}: ${problems.join("; ")}`,
  );
};

// 13. "Request correlation — include a trace or request identifier on
//     request-scoped records where correlation is available".
exports.logRecordsCarryCorrelation = () => {
  const handlers = appCode().filter((file) => /RequestHandler|request\.path|request\.headers|ServerRequest/.test(lib.read(file)));
  if (handlers.length === 0) return lib.verdict(false, "no production file handles requests");
  const correlated = handlers.filter((file) =>
    /(request|req|trace|correlation|span)[_-]?id\b|requestId|traceId|reqId|correlationId|x-request-id/i.test(lib.read(file)),
  );
  return lib.verdict(
    correlated.length > 0,
    correlated.length > 0 ? `request-scoped records carry correlation in ${list(correlated)}` : `no request identifier on request-scoped records (${list(handlers)})`,
  );
};

// ---------------------------------------------------------------------------
// Concurrency and admin processes (Factors VIII, XII)
// ---------------------------------------------------------------------------

const adminTypes = () => processTypes().filter((type) => type.name !== "web");

// 14. "Separate entry points for each process type (web, worker, scheduler)" /
//     "Declare process types in the platform's existing configuration
//     (`Procfile` is one example)".
exports.separateProcessTypeDeclared = () => {
  const types = processTypes();
  if (types.length === 0) return lib.verdict(false, "Procfile declares no process types");
  const web = types.find((type) => type.name === "web");
  const webEntry = web ? entryFileOf(web) : undefined;
  const others = adminTypes().map((type) => ({ type, entry: entryFileOf(type) }));
  if (others.length === 0) return lib.verdict(false, `Procfile declares only ${types.map((type) => type.name).join(", ")}`);
  const problems = others
    .filter(({ entry }) => entry === undefined || (webEntry !== undefined && entry === webEntry))
    .map(({ type }) => `${type.name}: no entry point of its own (${type.command})`);
  return lib.verdict(
    problems.length === 0,
    problems.length === 0 ? `process types: ${types.map((type) => type.name).join(", ")}` : problems.join("; "),
  );
};

// 15. "An in-process scheduler runs once in every replica, causing duplicate
//     jobs unless a separate coordination mechanism intervenes" — the
//     anti-pattern `setInterval(() => sendReport(), 60_000)`.
exports.noInProcessScheduler = () => {
  const web = webPath();
  if (web.length === 0) return lib.verdict(false, "src/index.ts is gone, so the web process cannot be read");
  const hits = hitsIn(web, [
    [/setInterval\s*\(/, "schedules work inside the web process"],
    [/from\s+["'](node-cron|cron|croner|node-schedule|toad-scheduler)["']/, "runs a scheduler inside the web process"],
  ]);
  return lib.verdict(hits.length === 0, hits.length === 0 ? `no scheduler in the web process (${web.length} files)` : hits.join("; "));
};

// 16. "Admin scripts live in the repo alongside application code... Admin
//     processes run in an identical environment to the app — same release,
//     same config, same dependencies."
//
//     Read over everything the declared entry loads, and count a call to the
//     work wherever it is made — including in the entry that also exports it,
//     which is the shape a single-file process entry takes. "Same
//     dependencies" is the app's own pool factory being called somewhere in
//     that closure, so a type-only import of its module is not enough; "same
//     config" is the closure taking its backing service from the setting the
//     app is given rather than one of its own.
const DIVERGENT_BACKING_SETTING = /DATABASE|POSTGRES|(^|_)DB(_|$)/;
exports.adminProcessSharesAppDependencies = () => {
  const entries = adminTypes().map(entryFileOf).filter(Boolean);
  if (entries.length === 0) return lib.verdict(false, "no admin process type with an entry point of its own is declared");
  const defines = (file) => /export\s+(const|let|function|async function)\s+runCleanup\b/.test(lib.read(file));
  const problems = entries.flatMap((entry) => {
    const text = lib.read(entry);
    // "same release, same config, same dependencies" is satisfied whether the
    // entry wires the app's pool itself or shares one composition module with
    // the web process, so read everything the entry loads, not just the entry.
    const loaded = closureOf(entry);
    const usesTheWork = loaded.some((file) => calls(file, "runCleanup"));
    const usesTheAppsPool = loaded.some((file) => calls(file, "createDbPool"));
    const divergent = [
      ...new Set(
        loaded.flatMap((file) =>
          [...codeOf(file).matchAll(/process\.env\s*(?:\.\s*|\[\s*["'])([A-Z][A-Z0-9_]*)/g)].map((match) => match[1]),
        ),
      ),
    ].filter((key) => DIVERGENT_BACKING_SETTING.test(key) && key !== "DATABASE_URL");
    const ownSql = /delete\s+from/i.test(text) && !defines(entry);
    return [
      usesTheWork ? undefined : `${lib.rel(entry)}: does not run the same code as the app (nothing it loads calls runCleanup)`,
      usesTheAppsPool ? undefined : `${lib.rel(entry)}: builds its backing service some other way than the app does (nothing it loads calls createDbPool)`,
      divergent.length > 0 ? `${lib.rel(entry)}: takes its backing service from ${divergent.join(", ")} instead of the setting the app is given` : undefined,
      ownSql ? `${lib.rel(entry)}: re-implements the work instead of sharing it` : undefined,
    ].filter(Boolean);
  });
  return lib.verdict(problems.length === 0, problems.length === 0 ? `admin process shares the app's code and wiring: ${list(entries)}` : problems.join("; "));
};

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "twelve-factor", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
