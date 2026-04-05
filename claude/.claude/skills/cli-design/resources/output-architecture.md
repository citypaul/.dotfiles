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

The `transient` boolean is critical for retry logic -- it tells callers whether the failure might resolve on its own.

---

## 2. CLI Entry Point

The entry point wires everything together: parse args, detect format, call handler, format the result, write to stdout, set exit code. No business logic lives here.

```typescript
// cli.ts

import { parseArgs } from 'node:util';
import { detectOutputConfig } from './lib/tty.js';
import { createStderrLogger, createNoOpLogger } from './lib/logger.js';
import { createJsonFormatter, createTextFormatter } from './formatters/index.js';
import { handleAnalyze } from './handlers/analyze.js';

type CliDeps = {
  readonly argv: readonly string[];
  readonly env: Record<string, string | undefined>;
  readonly stdout: NodeJS.WritableStream;
  readonly stderr: NodeJS.WritableStream;
  readonly stdoutIsTTY: boolean;
  readonly stderrIsTTY: boolean;
};

const run = async (deps: CliDeps): Promise<number> => {
  const { values, positionals } = parseArgs({
    // Node.js types argv as string[] but parseArgs expects mutable array
    args: deps.argv.slice(2) as string[],
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

  const outputConfig = detectOutputConfig({
    flags: {
      json: values.json ?? false,
      plain: values.plain ?? false,
      format: values.format,
      noColor: values['no-color'] ?? false,
    },
    env: deps.env,
    stdoutIsTTY: deps.stdoutIsTTY,
    stderrIsTTY: deps.stderrIsTTY,
  });

  const logger = values.debug
    ? createStderrLogger({ stream: deps.stderr, categories: ['*'] })
    : values.verbose
      ? createStderrLogger({ stream: deps.stderr, categories: ['info'] })
      : createNoOpLogger();

  const formatter = outputConfig.format === 'json'
    ? createJsonFormatter()
    : createTextFormatter({ color: outputConfig.color });

  const target = positionals[0];
  if (!target) {
    deps.stderr.write('Error: MISSING_TARGET — No target specified\n\nFix: mycli analyze <target>\n');
    return 2;
  }

  const result = await handleAnalyze({ target }, { logger });

  deps.stdout.write(formatter.formatResult(result));

  return result.ok ? 0 : 1;
};

const main = async (): Promise<void> => {
  const exitCode = await run({
    argv: process.argv,
    // process.env values are string | undefined; Record type aligns with detectOutputConfig
    env: process.env as Record<string, string | undefined>,
    stdout: process.stdout,
    stderr: process.stderr,
    stdoutIsTTY: process.stdout.isTTY ?? false,
    stderrIsTTY: process.stderr.isTTY ?? false,
  });
  process.exitCode = exitCode;
};

main();
```

Key design decisions:

- `run` takes all external dependencies as parameters -- fully testable without mocking globals
- Handler returns data, entry point writes to stdout -- no intermediary output port needed
- `process.exitCode` instead of `process.exit()` -- allows pending I/O to flush
- Argument validation happens before handler invocation -- exit code 2 for invalid usage
- The handler never knows about JSON vs text -- the entry point picks the formatter

---

## 3. Logger Interface

Structured diagnostics that route to stderr. Silent by default -- if no one configures logging, the library produces zero output.

```typescript
// ports/logger.ts

interface Logger {
  readonly debug: (category: string, message: string) => void;
  readonly info: (category: string, message: string) => void;
  readonly warn: (category: string, message: string) => void;
}
```

The real implementation writes to stderr with timestamps and category prefixes:

```typescript
// lib/logger.ts

type LoggerConfig = {
  readonly stream: NodeJS.WritableStream;
  readonly categories: readonly string[];
};

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
  const log = (level: string, category: string, message: string): void => {
    if (!shouldLog(config.categories, category)) return;
    const timestamp = new Date().toISOString();
    config.stream.write(`${timestamp} [${level}] [${category}] ${message}\n`);
  };

  return {
    debug: (category, message) => log('DEBUG', category, message),
    info: (category, message) => log('INFO', category, message),
    warn: (category, message) => log('WARN', category, message),
  };
};

const createNoOpLogger = (): Logger => ({
  debug: () => {},
  info: () => {},
  warn: () => {},
});
```

The no-op logger is not a mock -- it is a legitimate implementation used in production when logging is not configured. Libraries default to the no-op logger so they are silent unless the calling application explicitly enables diagnostics.

---

## 4. Example Handler

A function that takes input, returns structured data. No I/O, no side effects, no knowledge of output format. The logger parameter is optional -- pass it when you need diagnostics.

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

const handleAnalyze = async (
  input: AnalyzeInput,
  ctx: { readonly logger: Logger },
): Promise<Result<AnalyzeOutput, DomainError>> => {
  ctx.logger.debug('analyze', `starting analysis of ${input.target}`);

  const files = await discoverFiles(input.target);
  if (files.length === 0) {
    return err(domainError({
      code: 'NO_FILES',
      message: `No files found matching "${input.target}"`,
      fix: 'Check the path exists and contains supported file types',
    }));
  }

  ctx.logger.info('analyze', `found ${files.length} files`);

  const issues = files.flatMap((file) => analyzeFile(file));

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
  ctx: AnalyzePorts & { readonly ndjson: ReturnType<typeof createNdjsonFormatter> },
): Promise<number> => {
  const files = await discoverFiles(input.target);
  if (files.length === 0) {
    ctx.output.write(ctx.ndjson.formatError(domainError({
      code: 'NO_FILES',
      message: `No files found matching "${input.target}"`,
    })));
    return 1;
  }

  let issueCount = 0;
  for (const file of files) {
    const issues = analyzeFile(file);
    issueCount += issues.length;
    for (const issue of issues) {
      ctx.output.write(ctx.ndjson.formatRecord({ type: 'issue', data: issue }));
    }
  }

  ctx.output.write(ctx.ndjson.formatRecord({
    type: 'summary',
    data: { target: input.target, issueCount },
  }));

  return issueCount > 0 ? 1 : 0;
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
  if (format === 'json' || format === 'ndjson') return false;
  if (input.flags.noColor) return false;
  if (input.env['NO_COLOR'] !== undefined && input.env['NO_COLOR'] !== '') return false;
  if (input.env['FORCE_COLOR'] !== undefined) return true;
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
  if (!input.stdoutIsTTY) return false;
  return true;
};
```

The priority order follows the check hierarchy from the main skill:

1. Explicit `--format` / `--json` / `--plain` flags (highest priority)
2. `--no-color` flag
3. `NO_COLOR` environment variable
4. `FORCE_COLOR` environment variable
5. `TERM=dumb`
6. `CI=true`
7. TTY detection
8. Default: full interactive with colors

Each resolver is a separate pure function -- easy to test each priority chain independently.

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

The `transient` field enables scripted retry logic:

```bash
result=$(mycli check --json)
if echo "$result" | jq -e '.ok' > /dev/null 2>&1; then
  echo "Success"
elif echo "$result" | jq -e '.error.transient' > /dev/null 2>&1; then
  echo "Transient failure — retrying"
else
  echo "Permanent failure: $(echo "$result" | jq -r '.error.fix')"
fi
```

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
    tty.ts                        detectOutputConfig — pure TTY detection
    logger.ts                     createStderrLogger, createNoOpLogger
  formatters/
    text.ts                       Human-readable formatter (colors, tables)
    json.ts                       JSON envelope formatter
    ndjson.ts                     NDJSON streaming formatter
  handlers/
    analyze.ts                    Pure handler — (input) => Result
```
