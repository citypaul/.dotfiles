# Testing CLI Behavior

TDD patterns for verifying CLI contracts: stream separation, exit codes, pipe behavior, and output stability. See the main `cli-design` skill for core principles (stream contract, exit codes, format flags). For hexagonal testing patterns (fakes over mocks, use case testing), see the hexagonal-architecture skill's `resources/testing-hex-arch.md`.

---

## 1. Testing stdout/stderr Separation

The most important CLI test. A single spinner character on stdout breaks every downstream pipe.

Spawn the CLI as a subprocess and capture both streams independently. Assert that JSON mode produces valid JSON on stdout with zero non-JSON content.

### Integration Test Helper

```typescript
import { execFile } from 'node:child_process';

type CliResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
};

const createCliRunner = (binPath: string) => {
  const run = (args: readonly string[], options?: {
    readonly env?: Readonly<Record<string, string>>;
    readonly stdin?: string;
    readonly timeoutMs?: number;
  }): Promise<CliResult> =>
    new Promise((resolve, reject) => {
      const proc = execFile(
        process.execPath,
        [binPath, ...args],
        {
          env: {
            ...process.env,
            NO_COLOR: '1',
            TERM: 'dumb',
            ...options?.env,
          },
          timeout: options?.timeoutMs ?? 10_000,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          resolve({
            stdout,
            stderr,
            exitCode: error?.code
              ? (typeof error.code === 'number' ? error.code : 1)
              : 0,
          });
        },
      );

      if (options?.stdin !== undefined) {
        proc.stdin?.end(options.stdin);
      }
    });

  return { run } as const;
};
```

### Stream Separation Tests

```typescript
describe('stream separation', () => {
  const cli = createCliRunner('./dist/mycli.js');

  it('produces valid JSON on stdout with zero non-JSON content', async () => {
    const result = await cli.run(['analyze', '--json', 'input.txt']);

    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('ok', true);
    expect(parsed).toHaveProperty('data');
  });

  it('routes diagnostics to stderr only', async () => {
    const result = await cli.run(['analyze', '--json', '--verbose', 'input.txt']);

    JSON.parse(result.stdout);
    expect(result.stderr).toContain('analyzing');
    expect(result.stdout).not.toContain('analyzing');
  });

  it('routes warnings to stderr even in JSON mode', async () => {
    const result = await cli.run(['analyze', '--json', 'deprecated-format.txt']);

    const parsed = JSON.parse(result.stdout);
    expect(parsed.ok).toBe(true);
    expect(result.stderr).toContain('deprecated');
  });

  it('keeps progress indicators off stdout', async () => {
    const result = await cli.run(['analyze', '--json', 'large-input.txt']);

    expect(result.stdout).not.toMatch(/⠋|⠙|⠹|⠸|⠼|⠴|⠦|⠧|⠇|⠏/);
    expect(result.stdout).not.toMatch(/\.\.\./);
    JSON.parse(result.stdout);
  });
});
```

---

## 2. Testing Exit Codes

Test every documented exit code. The exit code is a contract — downstream scripts depend on it.

### Scenario Factory

```typescript
type CliScenario = {
  readonly name: string;
  readonly args: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly stdin?: string;
  readonly expectedExitCode: number;
  readonly expectedStderr?: string | RegExp;
};

const createCliScenarios = (overrides?: Partial<CliScenario>): CliScenario => ({
  name: 'default success',
  args: ['analyze', 'valid-input.txt'],
  expectedExitCode: 0,
  ...overrides,
});

const exitCodeScenarios: readonly CliScenario[] = [
  createCliScenarios({
    name: 'success on valid input',
    args: ['analyze', 'valid-input.txt'],
    expectedExitCode: 0,
  }),
  createCliScenarios({
    name: 'domain failure when threshold not met',
    args: ['analyze', '--threshold', '95', 'low-quality.txt'],
    expectedExitCode: 1,
    expectedStderr: /threshold not met/i,
  }),
  createCliScenarios({
    name: 'invalid usage on unknown flag',
    args: ['analyze', '--nonexistent-flag'],
    expectedExitCode: 2,
    expectedStderr: /unknown.*flag|unrecognized.*option/i,
  }),
  createCliScenarios({
    name: 'invalid usage on missing required argument',
    args: ['analyze'],
    expectedExitCode: 2,
    expectedStderr: /required|missing/i,
  }),
  createCliScenarios({
    name: 'config error on invalid config file',
    args: ['analyze', 'input.txt'],
    env: { MYCLI_CONFIG: '/nonexistent/config.json' },
    expectedExitCode: 78,
    expectedStderr: /config.*not found|configuration/i,
  }),
];
```

### Exit Code Tests

```typescript
describe('exit codes', () => {
  const cli = createCliRunner('./dist/mycli.js');

  it.each(exitCodeScenarios)('returns exit $expectedExitCode for $name', async (scenario) => {
    const result = await cli.run(scenario.args, {
      env: scenario.env,
      stdin: scenario.stdin,
    });

    expect(result.exitCode).toBe(scenario.expectedExitCode);
  });

  it('accompanies every non-zero exit with a stderr explanation', async () => {
    const failureScenarios = exitCodeScenarios.filter(
      (s) => s.expectedExitCode !== 0,
    );

    for (const scenario of failureScenarios) {
      const result = await cli.run(scenario.args, { env: scenario.env });

      expect(result.stderr.trim().length).toBeGreaterThan(0);

      if (scenario.expectedStderr instanceof RegExp) {
        expect(result.stderr).toMatch(scenario.expectedStderr);
      } else if (scenario.expectedStderr !== undefined) {
        expect(result.stderr).toContain(scenario.expectedStderr);
      }
    }
  });

  it('includes error code in JSON mode failures', async () => {
    const result = await cli.run([
      'analyze', '--json', '--threshold', '95', 'low-quality.txt',
    ]);

    expect(result.exitCode).toBe(1);
    const parsed = JSON.parse(result.stdout);
    expect(parsed).toHaveProperty('ok', false);
    expect(parsed.error).toHaveProperty('code');
    expect(typeof parsed.error.code).toBe('string');
  });
});
```

---

## 3. Testing Pipe Behavior

Simulate non-TTY stdout (when piped). The subprocess inherits `pipe` for both streams, so it sees `isTTY === undefined` on stdout — matching real pipe behavior.

```typescript
describe('pipe behavior', () => {
  const cli = createCliRunner('./dist/mycli.js');

  it('produces no ANSI escape codes in piped output', async () => {
    const result = await cli.run(['analyze', 'input.txt'], {
      env: { NO_COLOR: '1', TERM: 'dumb' },
    });

    const ansiPattern = /\x1b\[[0-9;]*[a-zA-Z]/;
    expect(result.stdout).not.toMatch(ansiPattern);
  });

  it('produces no spinner characters in piped output', async () => {
    const result = await cli.run(['analyze', 'input.txt'], {
      env: { NO_COLOR: '1' },
    });

    const spinnerChars = /[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/;
    expect(result.stdout).not.toMatch(spinnerChars);
  });

  it('does not prompt interactively when stdout is piped', async () => {
    const result = await cli.run(['init'], {
      env: { CI: 'true' },
    });

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toMatch(/non-interactive|use --force|no tty/i);
  });

  it('produces output parseable by line-oriented tools', async () => {
    const result = await cli.run(['list', '--plain']);

    const lines = result.stdout.trim().split('\n');
    for (const line of lines) {
      expect(line).not.toContain('\t\t');
      expect(line.length).toBeGreaterThan(0);
    }
  });

  it('produces valid JSON when piped with --json', async () => {
    const result = await cli.run(['analyze', '--json', 'input.txt']);

    expect(() => JSON.parse(result.stdout)).not.toThrow();
  });
});
```

---

## 4. Testing Handlers in Isolation

Handlers are pure functions: `(input, ports) => Result<T, E>`. No I/O, no process concerns, no streams. Test with in-memory fakes, not mocks.

### Fake Ports

```typescript
type LogEntry = {
  readonly level: 'info' | 'warn' | 'error' | 'debug';
  readonly message: string;
};

type FakeLogger = {
  readonly info: (msg: string) => void;
  readonly warn: (msg: string) => void;
  readonly error: (msg: string) => void;
  readonly debug: (msg: string) => void;
  readonly entries: readonly LogEntry[];
};

const createFakeLogger = (): FakeLogger => {
  const entries: LogEntry[] = [];
  return {
    info: (message) => { entries.push({ level: 'info', message }); },
    warn: (message) => { entries.push({ level: 'warn', message }); },
    error: (message) => { entries.push({ level: 'error', message }); },
    debug: (message) => { entries.push({ level: 'debug', message }); },
    get entries() { return entries; },
  };
};

type FakeFileSystem = {
  readonly readFile: (path: string) => Promise<string | undefined>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly written: ReadonlyMap<string, string>;
};

const createFakeFileSystem = (
  files?: Readonly<Record<string, string>>,
): FakeFileSystem => {
  const store = new Map(Object.entries(files ?? {}));
  return {
    readFile: async (path) => store.get(path),
    writeFile: async (path, content) => { store.set(path, content); },
    get written() { return store; },
  };
};
```

### Handler Tests

```typescript
describe('analyze handler', () => {
  const createTestInput = (overrides?: Partial<AnalyzeInput>): AnalyzeInput => ({
    filePath: 'input.txt',
    threshold: 80,
    format: 'json' as const,
    ...overrides,
  });

  it('returns success when quality exceeds threshold', async () => {
    const fs = createFakeFileSystem({ 'input.txt': 'high quality content' });
    const logger = createFakeLogger();

    const result = await analyzeHandler(
      createTestInput({ threshold: 50 }),
      { fs, logger },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.score).toBeGreaterThanOrEqual(50);
    }
  });

  it('returns domain error when quality below threshold', async () => {
    const fs = createFakeFileSystem({ 'input.txt': 'low quality' });
    const logger = createFakeLogger();

    const result = await analyzeHandler(
      createTestInput({ threshold: 99 }),
      { fs, logger },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('THRESHOLD_NOT_MET');
    }
  });

  it('returns error when file not found', async () => {
    const fs = createFakeFileSystem({});
    const logger = createFakeLogger();

    const result = await analyzeHandler(
      createTestInput({ filePath: 'missing.txt' }),
      { fs, logger },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('FILE_NOT_FOUND');
    }
  });

  it('logs diagnostic messages without affecting result', async () => {
    const fs = createFakeFileSystem({ 'input.txt': 'content' });
    const logger = createFakeLogger();

    await analyzeHandler(createTestInput(), { fs, logger });

    expect(logger.entries.some((e) => e.level === 'info')).toBe(true);
  });
});
```

**Key points:**

- The handler never touches `process.stdout`, `process.stderr`, or `process.exit`
- Fakes maintain state and implement real interfaces (not `vi.fn()` stubs)
- The same handler can serve a CLI adapter, HTTP adapter, or MCP adapter
- Mutable state in fakes is a deliberate testing-only exception to the immutability rule

---

## 5. Contract Tests for JSON Output

Zod schema validation ensures the JSON output contract does not break between versions. Run in CI to detect breaking changes.

### Output Schema

```typescript
import { z } from 'zod';

const analyzeSuccessSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    score: z.number(),
    file: z.string(),
    findings: z.array(z.object({
      rule: z.string(),
      severity: z.enum(['error', 'warning', 'info']),
      message: z.string(),
      line: z.number().optional(),
    })),
  }),
});

const analyzeErrorSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
    fix: z.string().optional(),
    transient: z.boolean().optional(),
  }),
});

const analyzeOutputSchema = z.discriminatedUnion('ok', [
  analyzeSuccessSchema,
  analyzeErrorSchema,
]);
```

### Contract Tests

```typescript
describe('JSON output contract', () => {
  const cli = createCliRunner('./dist/mycli.js');

  it('success output conforms to documented schema', async () => {
    const result = await cli.run(['analyze', '--json', 'valid-input.txt']);

    expect(result.exitCode).toBe(0);

    const parsed = analyzeOutputSchema.parse(JSON.parse(result.stdout));
    expect(parsed.ok).toBe(true);
  });

  it('error output conforms to documented schema', async () => {
    const result = await cli.run([
      'analyze', '--json', '--threshold', '99', 'low-quality.txt',
    ]);

    expect(result.exitCode).toBe(1);

    const parsed = analyzeOutputSchema.parse(JSON.parse(result.stdout));
    expect(parsed.ok).toBe(false);
  });

  it('includes all required fields in success response', async () => {
    const result = await cli.run(['analyze', '--json', 'valid-input.txt']);
    const parsed = JSON.parse(result.stdout);

    expect(parsed).toHaveProperty('ok');
    expect(parsed).toHaveProperty('data.score');
    expect(parsed).toHaveProperty('data.file');
    expect(parsed).toHaveProperty('data.findings');
  });

  it('includes error code and message in error response', async () => {
    const result = await cli.run(['analyze', '--json', 'missing.txt']);
    const parsed = JSON.parse(result.stdout);

    expect(parsed.ok).toBe(false);
    expect(parsed.error.code).toMatch(/^[A-Z][A-Z_]+$/);
    expect(typeof parsed.error.message).toBe('string');
    expect(parsed.error.message.length).toBeGreaterThan(0);
  });

  it('new fields are additive only (regression guard)', async () => {
    const result = await cli.run(['analyze', '--json', 'valid-input.txt']);
    const parsed = JSON.parse(result.stdout);

    const requiredTopLevel = ['ok', 'data'];
    const requiredData = ['score', 'file', 'findings'];

    for (const key of requiredTopLevel) {
      expect(parsed).toHaveProperty(key);
    }
    for (const key of requiredData) {
      expect(parsed.data).toHaveProperty(key);
    }
  });
});
```

**Workflow for contract testing:**

1. Define the output schema in a shared module (same Zod schema used by the formatter)
2. Contract tests parse real CLI output against that schema
3. CI runs contract tests on every PR
4. If a required field is removed or renamed, the Zod parse fails and CI blocks the merge
5. Adding new optional fields passes — the schema accepts additional properties by default

---

## 6. Snapshot Tests for Help Text

Snapshot the help output for regression detection. Always run with `NO_COLOR=1` to avoid ANSI codes in snapshots.

```typescript
describe('help text', () => {
  const cli = createCliRunner('./dist/mycli.js');

  it('renders top-level help', async () => {
    const result = await cli.run(['--help'], {
      env: { NO_COLOR: '1' },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatchSnapshot();
  });

  it('renders subcommand help', async () => {
    const result = await cli.run(['analyze', '--help'], {
      env: { NO_COLOR: '1' },
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatchSnapshot();
  });

  it('includes examples in help output', async () => {
    const result = await cli.run(['analyze', '--help'], {
      env: { NO_COLOR: '1' },
    });

    expect(result.stdout).toContain('Examples:');
    expect(result.stdout).toContain('mycli analyze');
  });

  it('shows concise guidance when required args are missing', async () => {
    const result = await cli.run(['analyze'], {
      env: { NO_COLOR: '1' },
    });

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain('--help');
  });
});
```

**Snapshot hygiene:**

- Always set `NO_COLOR=1` and `TERM=dumb` so snapshots are deterministic
- Do not snapshot dynamic values (timestamps, durations, absolute paths)
- If help includes a version number, strip it before snapshotting or use `toContain` assertions instead
- Review snapshot diffs carefully on every update — each diff is a potential breaking change to the help contract

---

## 7. Integration Test Helpers

The `createCliRunner` factory from section 1 is the foundation. Here it is expanded with additional capabilities for comprehensive integration testing.

```typescript
import { execFile } from 'node:child_process';

type CliResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly timedOut: boolean;
};

type RunOptions = {
  readonly env?: Readonly<Record<string, string>>;
  readonly stdin?: string;
  readonly timeoutMs?: number;
  readonly cwd?: string;
};

type CliRunner = {
  readonly run: (args: readonly string[], options?: RunOptions) => Promise<CliResult>;
  readonly runJson: (args: readonly string[], options?: RunOptions) => Promise<{
    readonly parsed: unknown;
    readonly stderr: string;
    readonly exitCode: number;
  }>;
};

const createCliRunner = (binPath: string, defaults?: RunOptions): CliRunner => {
  const mergedEnv = (options?: RunOptions): Record<string, string | undefined> => ({
    ...process.env,
    NO_COLOR: '1',
    TERM: 'dumb',
    CI: 'true',
    ...defaults?.env,
    ...options?.env,
  });

  const run = (args: readonly string[], options?: RunOptions): Promise<CliResult> =>
    new Promise((resolve) => {
      const timeout = options?.timeoutMs ?? defaults?.timeoutMs ?? 10_000;

      const proc = execFile(
        process.execPath,
        [binPath, ...args],
        {
          env: mergedEnv(options),
          timeout,
          cwd: options?.cwd ?? defaults?.cwd,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          const timedOut = error !== null
            && 'killed' in error
            && error.killed === true;

          resolve({
            stdout,
            stderr,
            exitCode: error?.code
              ? (typeof error.code === 'number' ? error.code : 1)
              : 0,
            timedOut,
          });
        },
      );

      if (options?.stdin !== undefined) {
        proc.stdin?.end(options.stdin);
      }
    });

  const runJson = async (
    args: readonly string[],
    options?: RunOptions,
  ) => {
    const result = await run(
      [...args, '--json'],
      options,
    );

    return {
      parsed: JSON.parse(result.stdout),
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  };

  return { run, runJson } as const;
};
```

### Usage in Tests

```typescript
describe('mycli integration', () => {
  const cli = createCliRunner('./dist/mycli.js', {
    timeoutMs: 15_000,
    env: { MYCLI_CONFIG: './fixtures/test-config.json' },
  });

  it('processes stdin input', async () => {
    const result = await cli.run(['analyze', '-'], {
      stdin: 'content from stdin',
    });

    expect(result.exitCode).toBe(0);
  });

  it('handles timeouts gracefully', async () => {
    const result = await cli.run(['analyze', 'enormous-file.txt'], {
      timeoutMs: 100,
    });

    expect(result.timedOut).toBe(true);
  });

  it('respects environment variable configuration', async () => {
    const result = await cli.runJson(['config', 'show'], {
      env: { MYCLI_THRESHOLD: '90' },
    });

    expect(result.exitCode).toBe(0);
    expect(result.parsed).toHaveProperty('data.threshold', 90);
  });

  it('combines JSON parsing with stderr diagnostics', async () => {
    const { parsed, stderr, exitCode } = await cli.runJson(
      ['analyze', '--verbose', 'input.txt'],
    );

    expect(exitCode).toBe(0);
    expect(parsed).toHaveProperty('ok', true);
    expect(stderr).toContain('analyzing');
  });
});
```

---

## Summary

| Test category | What it proves | Layer |
|---------------|---------------|-------|
| **Stream separation** | stdout has only data, stderr has only diagnostics | Integration (subprocess) |
| **Exit codes** | Every exit code is semantic and documented | Integration (subprocess) |
| **Pipe behavior** | Output is clean when piped (no ANSI, no spinners) | Integration (subprocess) |
| **Handler isolation** | Business logic works with no I/O (fakes, not mocks) | Unit (pure function) |
| **JSON contract** | Output schema is stable across versions (Zod validation) | Contract (CI) |
| **Help snapshots** | Help text does not regress unintentionally | Snapshot (deterministic) |
| **Integration helpers** | Controlled subprocess with env, stdin, timeouts | Test infrastructure |

**Key principle:** The subprocess tests (sections 1-3, 5-6) prove the CLI works from the user's perspective — what they see on stdout, stderr, and the exit code. The handler tests (section 4) prove the business logic works in isolation. Both are needed. Neither replaces the other.
