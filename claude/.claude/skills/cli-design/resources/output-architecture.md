# Output Architecture

TypeScript implementation patterns for building Unix-composable CLI output layers. See the main `cli-design` skill for the principles and format flag hierarchy. See `stream-contracts.md` for buffering, NDJSON, and signal handling. See `testing-cli.md` for testing these patterns.

---

## 1. Result Type

Handlers return a discriminated union -- success or failure -- without side effects. No exceptions for expected domain errors.

```typescript
// types/result.ts

type Ok<T> = {
  readonly ok: true;
  readonly data: T;
};

type Err<E> = {
  readonly ok: false;
  readonly error: E;
};

type Result<T, E> = Ok<T> | Err<E>;

const ok = <T>(data: T): Ok<T> => ({ ok: true, data });

const err = <E>(error: E): Err<E> => ({ ok: false, error });
```

Domain errors are typed explicitly -- not strings, not exception classes:

```typescript
// domain/errors.ts

type DomainError = {
  readonly code: string;
  readonly message: string;
  readonly fix?: string;
  readonly transient: boolean;
};

const domainError = (fields: {
  readonly code: string;
  readonly message: string;
  readonly fix?: string;
  readonly transient?: boolean;
}): DomainError => ({
  code: fields.code,
  message: fields.message,
  fix: fields.fix,
  transient: fields.transient ?? false,
});
```

The `transient` boolean classifies whether the cause might clear. It is not retry
authorization: map to exit 75 only before dispatch or when the operation is
documented and demonstrably retry-safe or idempotent.

---

## 2. CLI Entry Point

The entry point wires everything together: parse args, detect format, call the handler, format the result, write success to stdout or failure to stderr, and set the exit code. No business logic lives here.

All presentation adapters use one write helper. Awaiting the write callback
serializes chunks at the destination's pace, while the temporary error listener
turns `EPIPE` into an explicit outcome instead of an unhandled exception:

```typescript
// lib/streams.ts

type WriteOutcome = 'written' | 'epipe';

const writeOutput = (
  stream: NodeJS.WritableStream,
  data: string,
): Promise<WriteOutcome> =>
  new Promise((resolve, reject) => {
    let settled = false;

    const finish = (error?: NodeJS.ErrnoException): void => {
      if (settled) return;
      settled = true;
      if (error?.code === 'EPIPE') resolve('epipe');
      else if (error) reject(error);
      else resolve('written');
    };

    const onError = (error: NodeJS.ErrnoException): void => {
      stream.off('error', onError);
      finish(error);
    };

    stream.once('error', onError);
    stream.write(data, (error) => {
      if (error) {
        // Node emits the paired 'error' event after this callback; keep the
        // listener installed so that event cannot become unhandled.
        finish(error as NodeJS.ErrnoException);
        return;
      }
      stream.off('error', onError);
      finish();
    });
  });
```

```typescript
// cli.ts

import { parseArgs } from 'node:util';
import { detectOutputConfig } from './lib/tty.js';
import { writeOutput } from './lib/streams.js';
import { createStderrLogger, createNoOpLogger } from './lib/logger.js';
import {
  createJsonFormatter,
  createNdjsonFormatter,
  createPlainFormatter,
  createTextFormatter,
} from './formatters/index.js';
import { createAnalyzer } from './lib/analyzer.js';
import { handleAnalyze } from './handlers/analyze.js';
import { streamAnalysis } from './handlers/stream-analysis.js';

type CliDeps = {
  readonly argv: readonly string[];
  readonly env: Record<string, string | undefined>;
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
};

const parseCliArgs = (argv: readonly string[]) =>
  parseArgs({
    args: argv.slice(2),
    options: {
      json: { type: 'boolean', default: false },
      plain: { type: 'boolean', default: false },
      format: { type: 'string' },
      'no-color': { type: 'boolean', default: false },
      verbose: { type: 'boolean', short: 'v', default: false },
      debug: { type: 'boolean', short: 'd', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

const isParseArgsError = (
  error: unknown,
): error is Error & { readonly code: string } =>
  error instanceof Error &&
  'code' in error &&
  typeof error.code === 'string' &&
  error.code.startsWith('ERR_PARSE_ARGS_');

const requestsStructuredOutput = (argv: readonly string[]): boolean => {
  const args = argv.slice(2);
  return args.some((arg, index) =>
    arg === '--json' ||
    arg === '--format=json' ||
    arg === '--format=ndjson' ||
    (arg === '--format' &&
      (args[index + 1] === 'json' || args[index + 1] === 'ndjson')));
};

const writeBoundaryFailure = async (
  deps: Pick<CliDeps, 'argv' | 'stderr'>,
  error: DomainError,
): Promise<void> => {
  const formatter = requestsStructuredOutput(deps.argv)
    ? createJsonFormatter()
    : createTextFormatter({ color: false });
  await writeOutput(deps.stderr, formatter.formatResult(err(error)));
};

const run = async (deps: CliDeps): Promise<number> => {
  let parsed: ReturnType<typeof parseCliArgs>;
  try {
    parsed = parseCliArgs(deps.argv);
  } catch (error) {
    if (!isParseArgsError(error)) throw error;
    await writeBoundaryFailure(deps, domainError({
      code: 'INVALID_USAGE',
      message: error.message,
      fix: 'Run `mycli analyze --help`',
    }));
    return 2;
  }

  const { values, positionals } = parsed;

  if (
    values.format !== undefined &&
    !['plain', 'json', 'ndjson'].includes(values.format)
  ) {
    await writeBoundaryFailure(deps, domainError({
      code: 'INVALID_FORMAT',
      message: `Unsupported output format: ${values.format}`,
      fix: 'Use plain, json, or ndjson',
    }));
    return 2;
  }

  const outputConfig = detectOutputConfig({
    flags: {
      json: values.json ?? false,
      plain: values.plain ?? false,
      format: values.format,
      noColor: values['no-color'] ?? false,
    },
    env: deps.env,
    stdinIsTTY: deps.stdinIsTTY,
    stdoutIsTTY: deps.stdoutIsTTY,
    stderrIsTTY: deps.stderrIsTTY,
  });

  const logger = values.debug
    ? createStderrLogger({
        stream: deps.stderr,
        levels: ['DEBUG', 'INFO', 'WARN'],
        categories: ['*'],
      })
    : values.verbose
      ? createStderrLogger({
          stream: deps.stderr,
          levels: ['INFO', 'WARN'],
          categories: ['*'],
        })
      : createNoOpLogger();

  const formatter = outputConfig.format === 'json'
    ? createJsonFormatter()
    : outputConfig.format === 'plain'
      ? createPlainFormatter()
      : createTextFormatter({ color: outputConfig.color });

  const [command, target, ...extraPositionals] = positionals;
  if (command !== 'analyze' || !target || extraPositionals.length > 0) {
    const failure = err(domainError({
      code: 'INVALID_USAGE',
      message: 'Expected exactly: mycli analyze <target>',
      fix: 'mycli analyze <target>',
    }));
    const failureFormatter = outputConfig.format === 'ndjson'
      ? createJsonFormatter()
      : formatter;
    await writeOutput(deps.stderr, failureFormatter.formatResult(failure));
    return 2;
  }

  const analyzer = createAnalyzer();
  if (outputConfig.format === 'ndjson') {
    return streamAnalysis(
      { target },
      {
        logger,
        analyzer,
        stdout: deps.stdout,
        stderr: deps.stderr,
        ndjson: createNdjsonFormatter(),
      },
    );
  }

  const result = await handleAnalyze({ target }, { logger, analyzer });

  const rendered = formatter.formatResult(result);
  const stream = result.ok ? deps.stdout : deps.stderr;
  const outcome = await writeOutput(stream, rendered);
  if (result.ok && outcome === 'epipe') return 141;

  return result.ok ? 0 : 1;
};

const main = async (): Promise<void> => {
  const deps: CliDeps = {
    argv: process.argv,
    env: process.env,
    stdout: process.stdout,
    stderr: process.stderr,
    stdinIsTTY: process.stdin.isTTY ?? false,
    stdoutIsTTY: process.stdout.isTTY ?? false,
    stderrIsTTY: process.stderr.isTTY ?? false,
  };

  try {
    process.exitCode = await run(deps);
  } catch {
    process.exitCode = 1;
    try {
      await writeBoundaryFailure(deps, domainError({
        code: 'UNEXPECTED_FAILURE',
        message: 'The command failed unexpectedly',
        fix: 'Re-run with --debug and report the diagnostic',
      }));
    } catch {
      // No safe output channel remains. Keep the non-zero process status.
    }
  }
};

void main();
```

Key design decisions:

- `run` takes all external dependencies as parameters -- fully testable without mocking globals
- Handler returns data; the entry point writes primary data to stdout and error diagnostics to stderr
- Awaited writes bound buffering; stdout `EPIPE` returns 141 while stderr `EPIPE` leaves the command's own failure code intact
- `process.exitCode` instead of `process.exit()` -- allows pending I/O to flush
- Parser and usage failures are rendered for the requested human/structured mode
  and return code 2 before handler invocation
- Text, plain, JSON, and streaming NDJSON are dispatched explicitly; unsupported
  format values are rejected rather than silently falling through
- The outer `main` boundary converts unexpected failures to a stable stderr error
  and non-zero status
- The handler never knows about text, plain, or JSON serialization

---

## 3. Logger Interface

Structured diagnostics that route to stderr. Silent by default -- if no one configures logging, the library produces zero output.

```typescript
// ports/logger.ts

interface Logger {
  readonly debug: (category: string, message: string) => Promise<void>;
  readonly info: (category: string, message: string) => Promise<void>;
  readonly warn: (category: string, message: string) => Promise<void>;
}
```

The real implementation writes to stderr with timestamps and category prefixes:

```typescript
// lib/logger.ts

type LoggerConfig = {
  readonly stream: NodeJS.WritableStream;
  readonly levels: readonly LogLevel[];
  readonly categories: readonly string[];
};

type LogLevel = 'DEBUG' | 'INFO' | 'WARN';

const categoryMatches = (
  pattern: string,
  category: string,
): boolean =>
  pattern === '*' || pattern === category;

const shouldLog = (
  categories: readonly string[],
  category: string,
): boolean =>
  categories.some((pattern) => categoryMatches(pattern, category));

const createStderrLogger = (config: LoggerConfig): Logger => {
  const log = async (
    level: LogLevel,
    category: string,
    message: string,
  ): Promise<void> => {
    if (!config.levels.includes(level)) return;
    if (!shouldLog(config.categories, category)) return;
    const timestamp = new Date().toISOString();
    await writeOutput(
      config.stream,
      `${timestamp} [${level}] [${category}] ${message}\n`,
    );
  };

  return {
    debug: (category, message) => log('DEBUG', category, message),
    info: (category, message) => log('INFO', category, message),
    warn: (category, message) => log('WARN', category, message),
  };
};

const createNoOpLogger = (): Logger => ({
  debug: () => Promise.resolve(),
  info: () => Promise.resolve(),
  warn: () => Promise.resolve(),
});
```

The no-op logger is not a mock -- it is a legitimate implementation used in production when logging is not configured. Libraries default to the no-op logger so they are silent unless the calling application explicitly enables diagnostics.

---

## 4. Example Handler

A function that takes input, returns structured data, and has no knowledge of output format. The injected logger is the only diagnostic side effect and may be a no-op.

```typescript
// handlers/analyze.ts

type AnalyzeInput = {
  readonly target: string;
};

type AnalyzeOutput = {
  readonly target: string;
  readonly issueCount: number;
  readonly issues: readonly Issue[];
};

type Issue = {
  readonly file: string;
  readonly line: number;
  readonly severity: 'error' | 'warning';
  readonly message: string;
};

interface Analyzer {
  readonly discoverFiles: (target: string) => Promise<readonly string[]>;
  readonly analyzeFile: (file: string) => readonly Issue[];
}

const handleAnalyze = async (
  input: AnalyzeInput,
  ctx: { readonly logger: Logger; readonly analyzer: Analyzer },
): Promise<Result<AnalyzeOutput, DomainError>> => {
  await ctx.logger.debug('analyze', `starting analysis of ${input.target}`);

  const files = await ctx.analyzer.discoverFiles(input.target);
  if (files.length === 0) {
    return err(domainError({
      code: 'NO_FILES',
      message: `No files found matching "${input.target}"`,
      fix: 'Check the path exists and contains supported file types',
    }));
  }

  await ctx.logger.info('analyze', `found ${files.length} files`);

  const issues = files.flatMap((file) => ctx.analyzer.analyzeFile(file));

  return ok({
    target: input.target,
    issueCount: issues.length,
    issues,
  });
};
```

The handler never calls `console.log`, never writes to a stream, never formats output. It returns structured data and the entry point decides how to present it. The logger writes to stderr via the infrastructure -- the handler doesn't know or care about that.

---

## 5. Example Formatters

The same `Result` renders differently depending on format. Each formatter is a pure function -- data in, string out.

### Formatter Interface

```typescript
// formatters/types.ts

interface ResultFormatter {
  readonly formatResult: (result: Result<AnalyzeOutput, DomainError>) => string;
}
```

### Human-Readable Text

```typescript
// formatters/text.ts

type TextFormatterConfig = {
  readonly color: boolean;
};

const createTextFormatter = (config: TextFormatterConfig): ResultFormatter => {
  const colorize = config.color
    ? (code: string, text: string): string => `\x1b[${code}m${text}\x1b[0m`
    : (_code: string, text: string): string => text;

  const red = (text: string): string => colorize('31', text);
  const yellow = (text: string): string => colorize('33', text);
  const green = (text: string): string => colorize('32', text);
  const bold = (text: string): string => colorize('1', text);
  const dim = (text: string): string => colorize('2', text);

  const formatIssue = (issue: Issue): string => {
    const severity = issue.severity === 'error'
      ? red('error')
      : yellow('warning');
    return `  ${dim(`${issue.file}:${issue.line}`)}  ${severity}  ${issue.message}`;
  };

  const formatSuccess = (data: AnalyzeOutput): string => {
    const header = bold(`${data.target}: ${data.issueCount} issues found`);
    if (data.issues.length === 0) {
      return `${green('ok')} ${header}\n`;
    }
    const lines = data.issues.map(formatIssue);
    return `${header}\n\n${lines.join('\n')}\n`;
  };

  const formatError = (error: DomainError): string => {
    const header = `Error: ${error.code} — ${error.message}`;
    const fix = error.fix ? `\nFix: ${error.fix}` : '';
    return `${red(header)}${fix}\n`;
  };

  return {
    formatResult: (result) =>
      result.ok ? formatSuccess(result.data) : formatError(result.error),
  };
};
```

### Plain Text

Plain mode keeps one stable, unstyled record per line:

```typescript
// formatters/plain.ts

const createPlainFormatter = (): ResultFormatter => ({
  formatResult: (result) => {
    if (!result.ok) {
      const fix = result.error.fix ? `\t${result.error.fix}` : '';
      return `${result.error.code}\t${result.error.message}${fix}\n`;
    }

    if (result.data.issues.length === 0) {
      return `${result.data.target}\t0\n`;
    }

    return result.data.issues
      .map((issue) =>
        [issue.file, issue.line, issue.severity, issue.message].join('\t'))
      .join('\n') + '\n';
  },
});
```

### JSON

```typescript
// formatters/json.ts

const createJsonFormatter = (): ResultFormatter => ({
  formatResult: (result) =>
    result.ok
      ? JSON.stringify({ ok: true, data: result.data }) + '\n'
      : JSON.stringify({
          ok: false,
          error: {
            code: result.error.code,
            message: result.error.message,
            fix: result.error.fix,
            transient: result.error.transient,
          },
        }) + '\n',
});
```

JSON output is always a single line terminated by `\n`. The envelope shape is consistent -- `ok: true` with `data`, or `ok: false` with `error`. No additional fields leak through.

The entry point writes successful envelopes to stdout and failed envelopes to
stderr. `--json` changes serialization, not stream ownership: on failure stdout
remains empty, diagnostics may precede the error on stderr, and the final non-empty
stderr line is the JSON error envelope. Consumers parse that final line.

### NDJSON (Streaming)

```typescript
// formatters/ndjson.ts

type NdjsonRecord =
  | { readonly type: 'issue'; readonly data: Issue }
  | { readonly type: 'summary'; readonly data: { readonly target: string; readonly issueCount: number } };

const createNdjsonFormatter = (): {
  readonly formatRecord: (record: NdjsonRecord) => string;
  readonly formatError: (error: DomainError) => string;
} => ({
  formatRecord: (record) =>
    JSON.stringify(record) + '\n',
  formatError: (error) =>
    JSON.stringify({ ok: false, error }) + '\n',
});
```

NDJSON formatters differ from JSON formatters -- they emit one record per line as data arrives, rather than buffering the entire result. Each line is independently parseable. The `type` field enables consumers to multiplex different record types in the stream.

Streaming usage in the adapter:

```typescript
const streamAnalysis = async (
  input: AnalyzeInput,
  ctx: {
    readonly logger: Logger;
    readonly analyzer: Analyzer;
    readonly stdout: NodeJS.WritableStream;
    readonly stderr: NodeJS.WritableStream;
    readonly ndjson: ReturnType<typeof createNdjsonFormatter>;
  },
): Promise<number> => {
  const files = await ctx.analyzer.discoverFiles(input.target);
  if (files.length === 0) {
    await writeOutput(
      ctx.stderr,
      ctx.ndjson.formatError(domainError({
        code: 'NO_FILES',
        message: `No files found matching "${input.target}"`,
      })),
    );
    return 1;
  }

  let issueCount = 0;
  for (const file of files) {
    const issues = ctx.analyzer.analyzeFile(file);
    issueCount += issues.length;
    for (const issue of issues) {
      const outcome = await writeOutput(
        ctx.stdout,
        ctx.ndjson.formatRecord({ type: 'issue', data: issue }),
      );
      if (outcome === 'epipe') return 141;
    }
  }

  const outcome = await writeOutput(
    ctx.stdout,
    ctx.ndjson.formatRecord({
      type: 'summary',
      data: { target: input.target, issueCount },
    }),
  );
  if (outcome === 'epipe') return 141;

  return 0;
};
```

---

## 6. TTY Detection Utility

A pure function that takes environment signals and returns output configuration. No side effects, no global reads.

```typescript
// lib/tty.ts

type OutputConfig = {
  readonly format: 'text' | 'json' | 'ndjson' | 'plain';
  readonly color: boolean;
  readonly interactive: boolean;
};

type TtyInput = {
  readonly flags: {
    readonly json: boolean;
    readonly plain: boolean;
    readonly format?: string;
    readonly noColor: boolean;
  };
  readonly env: Record<string, string | undefined>;
  readonly stdinIsTTY: boolean;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
};

const detectOutputConfig = (input: TtyInput): OutputConfig => {
  const format = resolveFormat(input);
  const color = resolveColor(input, format);
  const interactive = resolveInteractive(input, format);
  return { format, color, interactive };
};

const resolveFormat = (input: TtyInput): OutputConfig['format'] => {
  if (input.flags.format === 'ndjson') return 'ndjson';
  if (input.flags.format === 'json' || input.flags.json) return 'json';
  if (input.flags.format === 'plain' || input.flags.plain) return 'plain';
  if (!input.stdoutIsTTY) return 'plain';
  return 'text';
};

const resolveColor = (
  input: TtyInput,
  format: OutputConfig['format'],
): boolean => {
  if (format === 'plain' || format === 'json' || format === 'ndjson') return false;
  if (input.flags.noColor) return false;

  const forceColor = input.env['FORCE_COLOR'];
  if (forceColor !== undefined) {
    return ['', '1', '2', '3', 'true'].includes(forceColor);
  }

  if (input.env['NO_COLOR'] !== undefined && input.env['NO_COLOR'] !== '') return false;
  if (input.env['NODE_DISABLE_COLORS'] !== undefined) return false;
  if (input.env['TERM'] === 'dumb') return false;
  if (!input.stdoutIsTTY) return false;
  return true;
};

const resolveInteractive = (
  input: TtyInput,
  format: OutputConfig['format'],
): boolean => {
  if (format === 'json' || format === 'ndjson') return false;
  if (input.env['CI'] === 'true') return false;
  if (!input.stdinIsTTY || !input.stderrIsTTY) return false;
  return true;
};
```

The priority order follows the check hierarchy from the main skill:

1. Explicit `--format` / `--json` / `--plain` flags (highest priority)
2. `--no-color` flag
3. `FORCE_COLOR`: empty, `1`, `2`, `3`, and `true` enable color; every other
   value, including `0`, disables it. A supported value overrides the two
   disable-color environment variables below.
4. Non-empty `NO_COLOR` or defined `NODE_DISABLE_COLORS`
5. `TERM=dumb`
6. `CI=true`
7. stdout TTY detection for primary-output formatting
8. Default: full interactive with colors

Prompt eligibility is separate from primary-output formatting: it requires both
an interactive stdin and an interactive stderr for the prompt UI. Each resolver
is a separate pure function -- easy to test each priority chain independently.
The `FORCE_COLOR` values and environment-variable precedence follow Node's
documented command-line behavior; the explicit application flag remains higher
priority than environment configuration.

---

## 7. noConsole Lint Rules

Enforce stream discipline through ESLint configuration. `console.log` in a handler is a bug -- it bypasses the output port and breaks stream separation.

```jsonc
// .eslintrc.json (or eslint.config.js equivalent)
{
  "rules": {
    "no-console": "error"
  },
  "overrides": [
    {
      "files": ["src/cli.ts", "src/cli/**/*.ts"],
      "rules": {
        "no-console": "off"
      }
    },
    {
      "files": ["**/*.test.ts", "**/*.spec.ts"],
      "rules": {
        "no-console": "off"
      }
    }
  ]
}
```

Flat config equivalent:

```typescript
// eslint.config.ts

import type { Linter } from 'eslint';

const config: readonly Linter.Config[] = [
  {
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['src/cli.ts', 'src/cli/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      'no-console': 'off',
    },
  },
];

export default config;
```

The three zones:

| Zone | `no-console` | Rationale |
|------|-------------|-----------|
| Handlers and library code | `error` | Must use output port or logger -- transport-agnostic |
| CLI entry point (`cli.ts`) | `off` | This IS the output layer -- it owns the streams |
| Tests | `off` | Test diagnostics are acceptable |

If a handler needs diagnostics, it calls `ctx.logger.info()`. If it needs to produce output, it returns data. Direct `console` usage is never correct outside the CLI entry point.

---

## 8. JSON Envelope Design

Every JSON response from the CLI follows a consistent envelope. Consumers can rely on the top-level shape without knowing the specific command.

### Envelope Types

```typescript
// types/envelope.ts

type JsonOk<T> = {
  readonly ok: true;
  readonly data: T;
};

type JsonError = {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly fix?: string;
    readonly transient: boolean;
  };
};

type JsonEnvelope<T> = JsonOk<T> | JsonError;
```

### Zod Schemas

Use schemas at the trust boundary -- when parsing JSON output in integration tests or when a downstream CLI consumes another CLI's output.

```typescript
// schemas/envelope.ts

import { z } from 'zod';

const jsonErrorDetailSchema = z.object({
  code: z.string(),
  message: z.string(),
  fix: z.string().optional(),
  transient: z.boolean(),
});

const jsonOkSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    ok: z.literal(true),
    data: dataSchema,
  });

const jsonErrorSchema = z.object({
  ok: z.literal(false),
  error: jsonErrorDetailSchema,
});

const jsonEnvelopeSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('ok', [
    jsonOkSchema(dataSchema),
    jsonErrorSchema,
  ]);

type JsonErrorDetail = z.infer<typeof jsonErrorDetailSchema>;
```

### Field Conventions

| Field | Convention | Example |
|-------|-----------|---------|
| Timestamps | ISO 8601 UTC, always with `Z` suffix | `"2025-01-15T09:30:00.000Z"` |
| IDs | Strings, even if numeric internally | `"12345"`, not `12345` |
| Enums | `UPPER_SNAKE_CASE` strings | `"CONFIG_MISSING"` |
| Booleans | Positive names, no double negatives | `"transient"`, not `"nonPermanent"` |
| Optional fields | Omit when absent, do not send `null` | `fix` field absent, not `"fix": null` |
| Arrays | Always present (empty array, not absent) | `"issues": []`, not omitted |
| Counts | Integer, matches array length | `"issueCount": 3` |

### Success Envelope

```json
{
  "ok": true,
  "data": {
    "target": "src/",
    "issueCount": 3,
    "issues": [
      {
        "file": "src/handler.ts",
        "line": 42,
        "severity": "error",
        "message": "Unused variable 'result'"
      }
    ]
  }
}
```

### Error Envelope

```json
{
  "ok": false,
  "error": {
    "code": "CONFIG_MISSING",
    "message": "No configuration file found at ./mycli.config.ts",
    "fix": "Run `mycli init` to create a default configuration file",
    "transient": false
  }
}
```

### Transient Error Envelope

```json
{
  "ok": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "API returned 503 after 3 retries",
    "transient": true
  }
}
```

The `transient` field describes the cause, but callers must not retry from that
field alone. Exit 75 is the CLI's retry authorization and is valid only when the
failure happened before dispatch or the command contract establishes safe,
idempotent retry. If a mutation may have been accepted, return an ambiguous-outcome
error with a `status` or reconciliation instruction instead.

### Schema Validation in Tests

Validate that handler output conforms to the envelope schema:

```typescript
const analyzeOutputSchema = z.object({
  target: z.string(),
  issueCount: z.number().int().nonnegative(),
  issues: z.array(z.object({
    file: z.string(),
    line: z.number().int().positive(),
    severity: z.enum(['error', 'warning']),
    message: z.string(),
  })),
});

const analyzeEnvelopeSchema = jsonEnvelopeSchema(analyzeOutputSchema);

it('produces valid JSON envelope for successful analysis', async () => {
  const result = await handleAnalyze({ target: 'src/' }, ctx);

  const envelope = result.ok
    ? { ok: true as const, data: result.data }
    : { ok: false as const, error: result.error };

  expect(() => analyzeEnvelopeSchema.parse(envelope)).not.toThrow();
});
```

---

## File Map

Where these patterns live in a typical project:

```
src/
  cli.ts                          Entry point — parse, wire, format, write, exit
  types/
    result.ts                     Result<T, E>, ok(), err()
    envelope.ts                   JsonEnvelope<T>, JsonOk<T>, JsonError
    errors.ts                     DomainError type, domainError() constructor
  schemas/
    envelope.ts                   Zod schemas for JSON envelope validation
  lib/
    streams.ts                    awaited, EPIPE-aware stream writes
    tty.ts                        detectOutputConfig — pure TTY detection
    logger.ts                     createStderrLogger, createNoOpLogger
    analyzer.ts                   Production Analyzer implementation
  formatters/
    text.ts                       Human-readable formatter (colors, tables)
    plain.ts                      Stable one-record-per-line formatter
    json.ts                       JSON envelope formatter
    ndjson.ts                     NDJSON streaming formatter
  handlers/
    analyze.ts                    Pure handler — (input) => Result
    stream-analysis.ts            Streaming NDJSON adapter path
```
