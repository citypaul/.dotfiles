// Deterministic graders for the cli-design quality suite.
//
// The fixture (fixtures/cli-design-workspace) is a Unix tool whose one
// command prints everything — data, progress and errors — with console.log
// on stdout and exits 1 for every failure. Nothing here assumes a folder
// layout beyond what README.md fixes: the published entry point is
// src/cli.ts. Every grader either runs the CLI as a script would (both
// streams pipes, neither a TTY) and reads stdout, stderr and the exit status
// separately, or reads the lines the agent added (git diff against the
// committed fixture, plus files git reports as new), so untouched fixture
// code is never graded. Every rule below is one the skill states as a rule.

const { spawnSync, execSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const lib = require("./quality-lib");

const ANSI = new RegExp("\\u001b\\[[0-9;]*[A-Za-z]");
const BOX_DRAWING = new RegExp("[\\u2500-\\u257f]");
const ASCII_RULE = /^[ \t]*[-=+|_]{6,}[ \t]*$/m;
const STATUS_LINE = new RegExp("scanning|loading|processing|working|^done\\b|\u2713|\u2714|[\\u2800-\\u28ff]", "i");
const ENTRY_POINT = "src/cli.ts";

const command = (context) => String(context?.vars?.command ?? "list");

const runCli = (args, env = {}) => {
  const result = spawnSync(lib.resolve(lib.workspace(), "node_modules/.bin/tsx"), [lib.resolve(lib.workspace(), "src/cli.ts"), ...args], {
    cwd: lib.workspace(),
    encoding: "utf8",
    timeout: 60_000,
    env: { ...process.env, ...env },
  });
  return {
    args: args.join(" "),
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? -1,
  };
};

const lines = (text) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

// The two failures every command can be asked for without inventing a flag:
// an argument the CLI cannot know, and a config file that is not there.
const usageFailures = (context) => [
  runCli([command(context), "--not-a-real-flag"]),
  runCli([command(context), "--config", "./no-such-config.json"]),
];

const gitOut = (args) => {
  try {
    return execSync(`git --no-pager -c core.pager=cat -c color.ui=false ${args}`, {
      cwd: lib.workspace(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
};

// Lines the agent added: '+' lines of the diff against the committed fixture,
// plus every line of a file git reports as new.
const addedLines = () => {
  const added = [];
  const removed = new Set();
  let file = "";
  for (const line of gitOut("diff HEAD -U0 --no-color --no-ext-diff -- src").split("\n")) {
    if (line.startsWith("+++ b/")) {
      file = line.slice(6);
      continue;
    }
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("-")) removed.add(`${file}\u0000${line.slice(1).trim()}`);
    if (line.startsWith("+")) added.push({ file, text: line.slice(1) });
  }
  const netNew = added.filter(({ file: inFile, text }) => !removed.has(`${inFile}\u0000${text.trim()}`));
  added.length = 0;
  added.push(...netNew);
  const untracked = gitOut("status --porcelain --untracked-files=all -- src")
    .split("\n")
    .filter((line) => line.startsWith("?? "))
    .map((line) => line.slice(3).trim());
  for (const path of untracked) {
    const full = lib.resolve(lib.workspace(), path);
    if (!existsSync(full)) continue;
    for (const text of lib.read(full).split("\n")) added.push({ file: path, text });
  }
  return added;
};

const productionFiles = () =>
  lib.sourceFiles(lib.resolve(lib.workspace(), "src")).filter((file) => !lib.isTestPath(file));

const finalStderrLine = (stderr) => lines(stderr).at(-1) ?? "";

const describeRun = (run) => `\`${run.args}\` exited ${run.code}`;

// 1. "Progress bars, spinners, status → stderr — Not data — must not corrupt
//    pipes" / anti-pattern 1, "Mixing data and diagnostics on stdout: breaks
//    every pipe".
exports.progressOffStdout = (output, context) => {
  const run = runCli([command(context)]);
  if (run.code !== 0) return lib.verdict(false, `${describeRun(run)}: ${finalStderrLine(run.stderr) || "no stderr"}`);
  const noise = [
    [ANSI.test(run.stdout), "terminal control sequences on stdout"],
    [lines(run.stdout).some((line) => STATUS_LINE.test(line)), `status line on stdout: ${lines(run.stdout).filter((line) => STATUS_LINE.test(line))[0]}`],
  ]
    .filter(([hit]) => hit)
    .map(([, label]) => label);
  return lib.verdict(noise.length === 0, noise.length === 0 ? `\`${command(context)}\` puts only data on stdout` : noise.join("; "));
};

// 2. "On success, stdout contains ONLY valid JSON — no spinners, no color, no
//    progress" and the success envelope `{ "ok": true, "data": { ... } }`.
exports.jsonSuccessEnvelope = (output, context) => {
  const run = runCli([command(context), "--json"]);
  if (run.code !== 0) return lib.verdict(false, `${describeRun(run)}: ${finalStderrLine(run.stderr) || "no stderr"}`);
  if (ANSI.test(run.stdout)) return lib.verdict(false, "terminal control sequences in --json output");
  let parsed;
  try {
    parsed = JSON.parse(run.stdout);
  } catch (error) {
    return lib.verdict(false, `stdout is not one JSON document (${(error && error.message) || "parse error"}): ${run.stdout.slice(0, 120)}`);
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return lib.verdict(false, "the JSON document is not an envelope object");
  const missing = [parsed.ok === true ? null : "no `ok: true`", "data" in parsed ? null : "no `data`"].filter(Boolean);
  return lib.verdict(missing.length === 0, missing.length === 0 ? "success envelope { ok: true, data } on stdout" : missing.join("; "));
};

// 3. Anti-pattern 10, "Non-zero exit without stderr explanation: scripts need
//    both the code and the reason".
exports.nonZeroExitExplainsOnStderr = (output, context) => {
  const runs = usageFailures(context);
  const failed = runs.filter((run) => run.code !== 0);
  if (failed.length === 0) return lib.verdict(false, `neither a bogus flag nor a missing config file made \`${command(context)}\` fail`);
  const silent = failed.filter((run) => run.stderr.trim() === "").map((run) => `${describeRun(run)} with nothing on stderr`);
  return lib.verdict(silent.length === 0, silent.length === 0 ? `every failure explains itself on stderr (${failed.length})` : silent.join("; "));
};

// 4. "stdout is for DATA only" and "On failure, stdout stays empty" — a usage
//    or configuration failure produces no data, so nothing may reach the pipe.
exports.failuresKeepStdoutClean = (output, context) => {
  const runs = usageFailures(context).filter((run) => run.code !== 0);
  if (runs.length === 0) return lib.verdict(false, `neither a bogus flag nor a missing config file made \`${command(context)}\` fail`);
  const dirty = runs.filter((run) => run.stdout.trim() !== "").map((run) => `${describeRun(run)} and wrote to stdout: ${lines(run.stdout)[0]}`);
  return lib.verdict(dirty.length === 0, dirty.length === 0 ? `stdout stays empty on failure (${runs.length} runs)` : dirty.join("; "));
};

// 5. Anti-pattern 8, "console.log anywhere except the CLI adapter — handlers
//    must return data; only the presentation layer writes to streams", and
//    anti-pattern 9, "Handlers that exit the process directly — let the entry
//    point decide". Graded on the lines the agent added, outside src/cli.ts.
exports.handlersDoNotPrintOrExit = () => {
  const offenders = addedLines()
    .filter(({ file }) => /^src\/.*\.tsx?$/.test(file) && !lib.isTestPath(file) && file !== ENTRY_POINT && !/acceptance-/.test(file))
    .flatMap(({ file, text }) =>
      [
        [/console\.(log|info|table)\s*\(/, "console.log"],
        [/process\.exit\s*\(/, "process.exit"],
      ]
        .filter(([pattern]) => pattern.test(text))
        .map(([, label]) => `${file}: ${label} — ${text.trim().slice(0, 60)}`),
    );
  return lib.verdict(offenders.length === 0, offenders.length === 0 ? `nothing outside ${ENTRY_POINT} prints or exits` : [...new Set(offenders)].slice(0, 4).join("; "));
};

// 6. "Human output is grep-parseable (flat rows, no table borders)" /
//    "--plain: Flat table rows, no borders, no grouped sections".
exports.humanOutputIsFlatRows = (output, context) => {
  const run = runCli([command(context)]);
  if (run.code !== 0) return lib.verdict(false, `${describeRun(run)}: ${finalStderrLine(run.stderr) || "no stderr"}`);
  const borders = [
    [BOX_DRAWING.test(run.stdout), "box-drawing table borders"],
    [ASCII_RULE.test(run.stdout), "a rule line separating the rows"],
  ]
    .filter(([hit]) => hit)
    .map(([, label]) => label);
  return lib.verdict(borders.length === 0, borders.length === 0 ? "flat rows a grep can read" : borders.join("; "));
};

// 7. The exit-code table: "0 Success", "1 Domain failure — tool-specific
//    failure (e.g. quality threshold not met)", "2 Invalid usage — bad flags,
//    missing required args, validation error", "78 Configuration error —
//    invalid config file, missing required config".
exports.exitCodesSemantic = (output, context) => {
  const expected = [
    [[command(context)], 0, "success"],
    [[command(context), "--fail-under", "90"], 1, "the gate not being met"],
    [[command(context), "--not-a-real-flag"], 2, "an unknown flag"],
    [[command(context), "--config", "./no-such-config.json"], 78, "an unreadable config file"],
  ];
  const wrong = expected
    .map(([args, code, label]) => ({ run: runCli(args), code, label }))
    .filter(({ run, code }) => run.code !== code)
    .map(({ run, code, label }) => `${label}: expected ${code}, got ${run.code}`);
  return lib.verdict(wrong.length === 0, wrong.length === 0 ? "0 / 1 / 2 / 78 as the table says" : wrong.join("; "));
};

// 8. "Document exit codes in `--help`."
exports.exitCodesDocumentedInHelp = (output, context) => {
  const help = [runCli(["--help"]), runCli([command(context), "--help"])].map((run) => run.stdout).join("\n");
  const missing = [
    [/exit\s*(code|status)/i, "no exit-code section"],
    [/\b78\b/, "78 not documented"],
    [/\b2\b/, "2 not documented"],
    [/\b1\b/, "1 not documented"],
    [/\b0\b/, "0 not documented"],
  ]
    .filter(([pattern]) => !pattern.test(help))
    .map(([, label]) => label);
  return lib.verdict(missing.length === 0, missing.length === 0 ? "--help documents the exit codes" : missing.join("; "));
};

// 9. "On failure, stdout stays empty and the final non-empty stderr line is
//    the structured JSON error envelope" — `{ "ok": false, "error": { "code",
//    "message", "fix" } }`, the code UPPER_SNAKE_CASE.
exports.jsonErrorEnvelopeOnStderr = (output, context) => {
  const runs = [
    runCli([command(context), "--json", "--fail-under", "90"]),
    runCli([command(context), "--json", "--config", "./no-such-config.json"]),
  ];
  const faults = runs.flatMap((run) => {
    if (run.code === 0) return [`${describeRun(run)} — the failure was not reported`];
    if (run.stdout.trim() !== "") return [`${describeRun(run)} and wrote to stdout: ${lines(run.stdout)[0]}`];
    let envelope;
    try {
      envelope = JSON.parse(finalStderrLine(run.stderr));
    } catch {
      return [`${describeRun(run)}: last stderr line is not JSON: ${finalStderrLine(run.stderr).slice(0, 80) || "(empty)"}`];
    }
    const error = envelope && typeof envelope === "object" ? envelope.error : undefined;
    return [
      [envelope && envelope.ok === false, "no `ok: false`"],
      [error && typeof error === "object", "no `error` object"],
      [error && typeof error.code === "string" && /^[A-Z][A-Z0-9_]*$/.test(error.code), "no UPPER_SNAKE_CASE `error.code`"],
      [error && typeof error.message === "string" && error.message.trim() !== "", "no `error.message`"],
      [error && typeof error.fix === "string" && error.fix.trim() !== "", "no `error.fix` telling the user how to fix it"],
    ]
      .filter(([ok]) => !ok)
      .map(([, label]) => `${describeRun(run)}: ${label}`);
  });
  return lib.verdict(faults.length === 0, faults.length === 0 ? "structured error envelope on the final stderr line" : faults.slice(0, 3).join("; "));
};

// 10. TTY detection: "`NO_COLOR` (non-empty) … Disable color", "stdout is not
//     a TTY (`!isatty(stdout)`) → Plain output, no animations", "Check stdout
//     and stderr independently".
exports.ttyAndColorAware = () => {
  const source = productionFiles().map(lib.read).join("\n");
  const missing = [
    [/isTTY/, "nothing checks isTTY"],
    [/NO_COLOR/, "NO_COLOR is not respected"],
  ]
    .filter(([pattern]) => !pattern.test(source))
    .map(([, label]) => label);
  return lib.verdict(missing.length === 0, missing.length === 0 ? "output adapts to the terminal (isTTY, NO_COLOR)" : missing.join("; "));
};

exports.behaviourDelivered = (output, context) =>
  lib.runAcceptance({ suite: "cli-design", name: context?.vars?.acceptance, targetDir: "src" });

exports.suiteGreen = lib.suiteGreen;
exports.typecheckClean = lib.typecheckClean;

module.exports = lib.withWorkspace(module.exports);
