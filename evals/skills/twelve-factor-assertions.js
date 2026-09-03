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
// createConfig, the shutdown file is whichever one registers a signal handler.
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

// The platform's process declaration: "web: <command>" lines in Procfile.
const processTypes = () =>
  (readIfExists(wsFile("Procfile")) ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"))
    .map((line) => ({ name: line.slice(0, line.indexOf(":")).trim(), command: line.slice(line.indexOf(":") + 1).trim() }))
    .filter((type) => type.name !== "");
const entryFileOf = (type) => {
  const token = (type.command.match(/[\w./-]+\.(ts|js|mjs)/g) ?? []).map((path) => wsFile(path)).find(isFile);
  return token;
};

const anyOf = (patterns, text) => patterns.some((pattern) => pattern.test(text));
const hitsIn = (files, checks) =>
  withText(files).flatMap(([file, text]) =>
    checks.filter(([pattern]) => pattern.test(text)).map(([, label]) => `${lib.rel(file)}: ${label}`),
  );

// ---------------------------------------------------------------------------
// Config (Factor III)
// ---------------------------------------------------------------------------

// 1. "Validate config at startup with a schema — fail fast (exit non-zero,
//    clear error) if config is invalid".
exports.configSchemaValidated = () => {
  const file = moduleExporting("createConfig");
  if (!file) return lib.verdict(false, "no production module exports createConfig");
  const text = lib.read(file);
  const schema = anyOf([/\bz\.(object|strictObject|looseObject|record)\s*\(/, /\bSchema\s*=/, /\.(safeParse|parse)\s*\(/], text);
  // "at startup" is satisfied wherever in the web process's own import closure
  // the call sits — the entry itself or a composition module it loads — so read
  // the closure, not just src/index.ts.
  const startupUse = webPath().some((loaded) => lib.rel(loaded) !== lib.rel(file) && /\bcreateConfig\s*\(/.test(lib.read(loaded)));
  const reasons = [
    schema ? undefined : `${lib.rel(file)}: config is not parsed through a schema`,
    startupUse ? undefined : "nothing the web process loads builds its config at startup",
  ].filter(Boolean);
  return lib.verdict(reasons.length === 0, reasons.length === 0 ? `config schema in ${lib.rel(file)}, parsed at startup` : reasons.join("; "));
};

// 2. "Never hardcode credentials or environment-specific endpoints" — a
//    deploy-varying backing service gets no in-source default to fall back to.
exports.noSilentDefaultForRequiredConfig = () => {
  const hits = hitsIn(production(), [
    [/postgres:\/\/|redis:\/\//, "a backing service URL is hardcoded in source"],
    [/DATABASE_URL[^\n]{0,80}(\?\?|\|\|)/, "DATABASE_URL falls back to a default"],
    [/DATABASE_URL[^\n]{0,120}\.default\s*\(/, "DATABASE_URL is declared with a default"],
    [/prod-db|\.internal\.example\.com/, "an environment-specific endpoint is in source"],
  ]);
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no in-source fallback for a deploy-varying backing service" : hits.join("; "));
};

// 3. "Environment-name branching creates combinatorial explosion and breaks
//    dev/prod parity" — the config anti-pattern
//    `if (process.env.NODE_ENV === 'production')`.
exports.noEnvironmentNameBranching = () => {
  const hits = hitsIn(production(), [
    [/(NODE_ENV|APP_ENV|ENVIRONMENT)[^\n]{0,60}(===|!==|==\s|!=\s)/, "branches on the environment name"],
    [/(===|!==)[^\n]{0,20}(NODE_ENV|APP_ENV|ENVIRONMENT)\b/, "branches on the environment name"],
    [/(===|!==)\s*["'`](production|staging|development)["'`]/, "branches on the environment name"],
  ]);
  return lib.verdict(hits.length === 0, hits.length === 0 ? "no environment-name branching in src" : hits.join("; "));
};

// 4. "Inject config via options objects — never import `process.env` deep in
//    the call tree" — only the config module and the process entry points may
//    read the environment.
exports.configInjectedNotReadDeep = () => {
  const allowed = new Set(
    [moduleExporting("createConfig"), wsFile("src/index.ts"), ...processTypes().map(entryFileOf)]
      .filter(Boolean)
      .map((file) => lib.rel(file)),
  );
  const offenders = production().filter((file) => !allowed.has(lib.rel(file)) && /process\.env/.test(lib.read(file)));
  return lib.verdict(
    offenders.length === 0,
    offenders.length === 0 ? `process.env read only in ${[...allowed].join(", ") || "(nowhere)"}` : `process.env read deep in the call tree: ${list(offenders)}`,
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
  const required = [...new Set(["PORT", "DATABASE_URL", "SESSION_TTL_MINUTES", ...declared])];
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
  const registered = /process\.(on|once|addListener)\s*\(/.test(text);
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

// 7. "Set a drain timeout — force exit if shutdown hangs".
exports.drainTimeoutSet = () => {
  const files = shutdownFiles();
  if (files.length === 0) return lib.verdict(false, "nothing handles a stop signal, so there is no drain to time out");
  const withTimeout = files.filter((file) => {
    const text = lib.read(file);
    return /setTimeout\s*\(/.test(text) && /process\.exit\s*\(/.test(text);
  });
  return lib.verdict(
    withTimeout.length > 0,
    withTimeout.length > 0 ? `drain timeout forces exit in ${list(withTimeout)}` : `no drain timeout forcing exit in ${list(files)}`,
  );
};

// 8. "Await `server.close()` to drain in-flight connections" — a handler that
//    exits the process the moment the signal arrives drains nothing; the
//    skill's shutdown sets `process.exitCode` and reserves the hard exit for
//    the drain timeout and for failure ("Exit with non-zero code on shutdown
//    failure").
exports.shutdownDrainsBeforeExiting = () => {
  const hits = hitsIn(production(), [[/process\.exit\s*\(\s*0\s*\)/, "exits the process on the spot instead of draining"]]);
  const files = shutdownFiles();
  const drains = files.filter((file) => /(await[^\n]{0,40}close\s*\(|close\s*\(\s*(\(\)|resolve|async))/.test(lib.read(file)));
  const problems = [...hits, ...(files.length > 0 && drains.length === 0 ? [`${list(files)}: nothing waits for the server to close`] : [])];
  if (files.length === 0) return lib.verdict(false, "nothing handles a stop signal");
  return lib.verdict(problems.length === 0, problems.length === 0 ? `shutdown waits for the server to close in ${list(drains)}` : problems.join("; "));
};

// 9. "Close database pools, Redis connections, queue consumers" on shutdown.
exports.backingServicesClosedOnShutdown = () => {
  const files = shutdownFiles();
  if (files.length === 0) return lib.verdict(false, "nothing handles a stop signal");
  const closing = files.filter((file) => /(pool|db|cache|redis|queue)[^\n]{0,20}\.(end|quit|close|disconnect)\s*\(/i.test(lib.read(file)));
  return lib.verdict(
    closing.length > 0,
    closing.length > 0 ? `backing services closed in ${list(closing)}` : `${list(files)}: shutdown closes no backing service`,
  );
};

// ---------------------------------------------------------------------------
// Logs (Factor XI)
// ---------------------------------------------------------------------------

const WRITES_TO_A_FILE = /appendFile(Sync)?\s*\(|writeFile(Sync)?\s*\(|createWriteStream\s*\(|transports\.File/;

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
    ...hitsIn(appCode(), [[/createFileLogger|file-logger/, "still logs through the file transport"]]),
    ...hitsIn(production().filter(touched), [[WRITES_TO_A_FILE, "writes log records to a file"]]),
  ];
  const streamed = production().filter((file) => putsRecordsOnAStream(lib.read(file)));
  if (streamed.length === 0) problems.push("nothing writes log records to stdout or stderr");
  return lib.verdict(problems.length === 0, problems.length === 0 ? `logs go to the process streams from ${list(streamed)}` : problems.join("; "));
};

// 11. "Structured output — logs are machine-parseable (JSON preferred), not
//     free-form strings"; "Unstructured string interpolation produces logs that
//     cannot be parsed or queried".
exports.logRecordsAreStructured = () => {
  const file = moduleExporting("createLogger");
  const serialises = file !== undefined && /JSON\.stringify\s*\(/.test(lib.read(file));
  // The message argument of a log call, not the stream write of a record the
  // logger has already serialised.
  const interpolated = hitsIn(production(), [
    [/(console\.(log|info|warn|error|debug)|\.(info|warn|error|debug)|\blog(ger)?\.write)\s*\(\s*`[^`]*\$\{/, "logs an interpolated sentence instead of fields"],
    [/(console\.(log|info|warn|error|debug)|\.(info|warn|error|debug)|\blog(ger)?\.write)\s*\(\s*["'][^"']*["']\s*\+/, "logs a concatenated sentence instead of fields"],
  ]);
  const problems = [
    ...(file === undefined ? ["no production module exports createLogger"] : []),
    ...(file !== undefined && !serialises ? [`${lib.rel(file)}: records are not serialised as JSON`] : []),
    ...interpolated,
  ];
  return lib.verdict(problems.length === 0, problems.length === 0 ? `structured records from ${lib.rel(file)}` : problems.join("; "));
};

// 12. "Useful severity — follow the platform's recognized levels and make the
//     threshold deploy-time configurable where needed."
exports.logLevelThresholdConfigurable = () => {
  const file = moduleExporting("createLogger");
  if (file === undefined) return lib.verdict(false, "no production module exports createLogger");
  const text = lib.read(file);
  const ranked = /\b(debug|trace)\s*:\s*\d+/.test(text) || /\[\s*["']debug["'][^\]]*\]/.test(text);
  const compared = /[<>]=?/.test(text) && /(threshold|level)/i.test(text);
  const configurable = anyOf(
    [/createLogger\s*=?\s*(:[^=]*)?=?\s*\(\s*(\{|options|config|deps|level)/i, /process\.env\.LOG_LEVEL/],
    text,
  );
  const problems = [
    ranked ? undefined : "levels are not ranked, so nothing can be filtered",
    compared ? undefined : "no record is compared against a threshold",
    configurable ? undefined : "the threshold cannot be set for a deploy",
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
    /request[_-]?id|trace[_-]?id|correlation[_-]?id|x-request-id|requestId|traceId/i.test(lib.read(file)),
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
    const usesTheWork = loaded.some((file) => /\brunCleanup\s*\(/.test(lib.read(file)) && !defines(file));
    const usesTheAppsPool =
      loaded.some((file) => /\bcreateDbPool\s*\(/.test(lib.read(file))) || loaded.some((file) => /lib\/db-pool/.test(file));
    const ownSql = /delete\s+from/i.test(text) && !defines(entry);
    return [
      usesTheWork ? undefined : `${lib.rel(entry)}: does not run the same code as the app (nothing it loads calls runCleanup)`,
      usesTheAppsPool ? undefined : `${lib.rel(entry)}: builds its backing service some other way than the app does`,
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
