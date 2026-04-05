# Stream Contracts: Buffering, Signals, and Process Lifecycle

Deep-dive on stream behavior, NDJSON, signal handling, crash-only design, and pager integration for Node.js CLI tools. See the main `cli-design` skill for the Unix stream contract, format flags, and exit code conventions. See `output-architecture.md` for TypeScript output ports and formatters. See `testing-cli.md` for testing stream behavior.

---

## 1. Buffering Behavior

Based on Orhun Parmaksiz's research in "Why stdout is faster than stderr": **stdout is approximately 2x faster than stderr** when output is piped. The performance difference is entirely due to userspace buffering -- specifically the difference in write() syscall count -- not the kernel.

### Three Buffering Modes

| Mode | Buffer size | Flush trigger | Typical use |
|------|------------|---------------|-------------|
| Fully buffered (block) | ~4-8 KB | Buffer full | stdout when piped |
| Line-buffered | ~1 KB | Newline character | stdout when connected to a TTY |
| Unbuffered | 0 | Every write | stderr always |

### How the Mode Is Chosen

The C runtime calls `isatty()` on each file descriptor at program startup to determine the buffering strategy:

- **stdout on a TTY**: line-buffered. Each `\n` triggers a flush. Interactive output appears immediately line-by-line.
- **stdout on a pipe**: block-buffered (~4-8 KB). Data accumulates in a userspace buffer and flushes only when the buffer is full. This batches many small writes into fewer, larger `write()` syscalls.
- **stderr**: always unbuffered, regardless of whether it is connected to a TTY or a pipe. Error messages must appear immediately -- even if the process crashes mid-write, the diagnostic output is already on the wire.

The 2x speed difference comes from this: when stdout is block-buffered, a program producing many small lines (e.g., `echo` in a loop) makes far fewer `write()` syscalls than the same output sent to unbuffered stderr. Each syscall has fixed overhead (context switch to kernel), so fewer syscalls means faster throughput.

### Node.js Specifics

`process.stdout` and `process.stderr` are `Writable` streams with platform-dependent behavior:

```typescript
// TTY detection per stream -- check each independently
const stdoutIsTTY = process.stdout.isTTY === true;
const stderrIsTTY = process.stderr.isTTY === true;

// stdout piped but stderr still on TTY is common:
//   mycli run 2>/dev/tty | jq .
// In this case, show spinners on stderr, clean data on stdout.
```

When `process.stdout` is connected to a pipe, Node.js uses an internal `highWaterMark` (default 16 KB) that governs backpressure. If `.write()` returns `false`, the internal buffer has exceeded the high-water mark -- the caller should pause and wait for the `'drain'` event before writing more.

When `process.stdout` is connected to a TTY, Node.js writes synchronously in a blocking fashion, so backpressure does not apply in the same way.

---

## 2. Node.js Stream Specifics

### Backpressure for High-Volume Output

For CLI tools that produce large volumes of output (log streaming, data export, test result enumeration), ignoring backpressure causes unbounded memory growth. Always check the return value of `.write()`:

```typescript
type DrainableWrite = (
  stream: NodeJS.WritableStream,
  data: string,
) => Promise<void>;

const drainableWrite: DrainableWrite = (stream, data) => {
  const canContinue = stream.write(data);
  if (canContinue) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    stream.once('drain', resolve);
  });
};

// Usage in a streaming loop
const streamResults = async (
  results: ReadonlyArray<string>,
  stream: NodeJS.WritableStream,
): Promise<void> => {
  for (const line of results) {
    await drainableWrite(stream, line + '\n');
  }
};
```

### Terminal Dimensions

When stdout is a TTY, you can read the terminal size and react to resize events:

```typescript
type TerminalSize = {
  readonly columns: number;
  readonly rows: number;
};

const getTerminalSize = (): TerminalSize | undefined =>
  process.stdout.isTTY
    ? { columns: process.stdout.columns, rows: process.stdout.rows }
    : undefined;

// React to terminal resize
const onResize = (callback: (size: TerminalSize) => void): (() => void) => {
  const handler = () => {
    callback({
      columns: process.stdout.columns,
      rows: process.stdout.rows,
    });
  };
  process.stdout.on('resize', handler);
  return () => {
    process.stdout.off('resize', handler);
  };
};
```

Use terminal dimensions to:
- Truncate table columns to fit the viewport
- Wrap long text at the correct column boundary
- Decide whether content fits on one screen (for pager integration)

---

## 3. NDJSON Specification

Newline-Delimited JSON (NDJSON) is the streaming format for CLI tools that produce structured output over time. Each line is one complete, valid JSON object. Lines are separated by `\n` (not `\r\n`). Each line is independently parseable -- consumers never need to buffer the entire stream.

### Rules

1. Each line is a self-contained JSON value (typically an object)
2. Lines are separated by `\n` (U+000A)
3. Empty lines are ignored by consumers
4. Include a `type` field per record to multiplex different event types over one stream
5. The final line can be a summary record with `type: "summary"`
6. Be conservative in what you send, liberal in what you accept (Postel's Law)

### TypeScript Types

```typescript
type NdjsonRecord =
  | { readonly type: 'result'; readonly file: string; readonly status: 'pass' | 'fail' }
  | { readonly type: 'warning'; readonly message: string }
  | {
      readonly type: 'summary';
      readonly total: number;
      readonly passed: number;
      readonly failed: number;
    };
```

### NDJSON Writer

```typescript
type NdjsonWriter = {
  readonly write: (record: NdjsonRecord) => Promise<void>;
  readonly end: () => void;
};

const createNdjsonWriter = (stream: NodeJS.WritableStream): NdjsonWriter => {
  const write = (record: NdjsonRecord): Promise<void> => {
    const line = JSON.stringify(record) + '\n';
    return drainableWrite(stream, line);
  };

  const end = (): void => {
    stream.end();
  };

  return { write, end };
};

// Usage
const writer = createNdjsonWriter(process.stdout);
await writer.write({ type: 'result', file: 'src/app.ts', status: 'pass' });
await writer.write({ type: 'result', file: 'src/lib.ts', status: 'fail' });
await writer.write({ type: 'summary', total: 2, passed: 1, failed: 1 });
writer.end();
```

### NDJSON Reader

```typescript
import { createInterface } from 'node:readline';

type NdjsonParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string; readonly line: string };

const parseNdjsonLine = <T>(line: string): NdjsonParseResult<T> => {
  const trimmed = line.trim();
  if (trimmed === '') {
    return { ok: true, value: undefined as T };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as T };
  } catch {
    return { ok: false, error: 'Invalid JSON', line: trimmed };
  }
};

const readNdjson = async function* <T>(
  input: NodeJS.ReadableStream,
): AsyncGenerator<T> {
  const rl = createInterface({ input, crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim() === '') continue;
    const result = parseNdjsonLine<T>(line);
    if (result.ok && result.value !== undefined) {
      yield result.value;
    }
  }
};

// Usage
// cat results.ndjson | mycli summarize
for await (const record of readNdjson<NdjsonRecord>(process.stdin)) {
  if (record.type === 'summary') {
    process.stderr.write(`Total: ${record.total}, Failed: ${record.failed}\n`);
  }
}
```

---

## 4. Signal Handling

### SIGINT (Ctrl-C)

The user pressed Ctrl-C. Acknowledge immediately on stderr, start cleanup with a bounded timeout, and exit with code 130 (128 + 2).

```typescript
type CleanupFn = () => Promise<void>;

const createSignalHandler = (
  cleanupFns: ReadonlyArray<CleanupFn>,
): void => {
  let shuttingDown = false;
  const CLEANUP_TIMEOUT_MS = 5_000;

  const handleSigint = (): void => {
    if (shuttingDown) {
      // Second Ctrl-C: force exit immediately
      process.stderr.write('\nForce quit. Cleanup skipped.\n');
      process.exit(130);
      return;
    }

    shuttingDown = true;
    process.stderr.write('\nShutting down...\n');

    const timeout = setTimeout(() => {
      process.stderr.write('Cleanup timed out. Exiting.\n');
      process.exit(130);
    }, CLEANUP_TIMEOUT_MS);

    // Unref so the timer alone doesn't keep the process alive
    timeout.unref();

    Promise.allSettled(cleanupFns.map((fn) => fn()))
      .then(() => {
        clearTimeout(timeout);
        process.exit(130);
      })
      .catch(() => {
        clearTimeout(timeout);
        process.exit(130);
      });
  };

  process.on('SIGINT', handleSigint);
};
```

Design decisions:

- **Acknowledge immediately.** The user needs to know their Ctrl-C was received. A program that appears to ignore Ctrl-C will get a `kill -9`.
- **Bounded cleanup.** Five seconds is a generous upper bound. Cleanup that takes longer than this is likely stuck.
- **Second Ctrl-C forces exit.** Tell the user what it does ("Force quit. Cleanup skipped.") so they can make an informed choice.
- **Exit code 130.** Convention: 128 + signal number. SIGINT is signal 2.

### SIGTERM

Graceful shutdown -- the same cleanup logic as SIGINT. This is the signal sent by process managers, container runtimes, and `docker stop`. If cleanup does not finish in time, the orchestrator sends SIGKILL (which cannot be caught).

```typescript
const handleSigterm = (): void => {
  process.stderr.write('Received SIGTERM. Shutting down...\n');

  const timeout = setTimeout(() => {
    process.stderr.write('Cleanup timed out. Exiting.\n');
    process.exit(143);
  }, CLEANUP_TIMEOUT_MS);

  timeout.unref();

  Promise.allSettled(cleanupFns.map((fn) => fn()))
    .then(() => {
      clearTimeout(timeout);
      process.exit(143);
    })
    .catch(() => {
      clearTimeout(timeout);
      process.exit(143);
    });
};

process.on('SIGTERM', handleSigterm);
```

Exit code 143: 128 + 15 (SIGTERM is signal 15). This is critical for Docker and Kubernetes, where the container runtime interprets the exit code to determine whether the shutdown was graceful.

### SIGPIPE

SIGPIPE is sent when the pipe consumer exits early:

```bash
mycli run | head -5
```

`head` reads 5 lines and exits. The next write from `mycli` to the now-broken pipe triggers SIGPIPE. The correct response is to exit immediately and silently with code 141 (128 + 13). Never treat SIGPIPE as an error -- the user got exactly what they asked for.

**Node.js caveat:** Node.js ignores SIGPIPE by default (it does not terminate the process). Instead, the broken pipe surfaces as an `EPIPE` error on the write call. You must handle this explicitly:

```typescript
const handleEpipe = (stream: NodeJS.WritableStream): void => {
  stream.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
      // Pipe consumer closed -- this is not an error.
      // Exit silently with the conventional SIGPIPE code.
      process.exit(141);
    }
    // Re-throw non-EPIPE errors
    throw err;
  });
};

// Apply to stdout early in program startup
handleEpipe(process.stdout);
```

Without this handler, `mycli run | head -5` throws an unhandled error and exits with code 1, which is incorrect -- the operation succeeded from the user's perspective.

### Combined Signal Setup

Bringing it all together as a single setup function:

```typescript
type GracefulShutdownConfig = {
  readonly cleanupFns: ReadonlyArray<CleanupFn>;
  readonly cleanupTimeoutMs?: number;
};

const setupGracefulShutdown = (config: GracefulShutdownConfig): void => {
  const { cleanupFns, cleanupTimeoutMs = 5_000 } = config;
  let shuttingDown = false;

  const shutdown = (signal: string, exitCode: number): void => {
    if (shuttingDown) {
      process.stderr.write(`\nForce quit. Cleanup skipped.\n`);
      process.exit(exitCode);
      return;
    }

    shuttingDown = true;
    process.stderr.write(`\nReceived ${signal}. Shutting down...\n`);

    const timeout = setTimeout(() => {
      process.stderr.write('Cleanup timed out. Exiting.\n');
      process.exit(exitCode);
    }, cleanupTimeoutMs);
    timeout.unref();

    Promise.allSettled(cleanupFns.map((fn) => fn()))
      .then(() => {
        clearTimeout(timeout);
        process.exit(exitCode);
      })
      .catch(() => {
        clearTimeout(timeout);
        process.exit(exitCode);
      });
  };

  process.on('SIGINT', () => shutdown('SIGINT', 130));
  process.on('SIGTERM', () => shutdown('SIGTERM', 143));

  // Handle EPIPE (Node.js ignores SIGPIPE)
  handleEpipe(process.stdout);
  handleEpipe(process.stderr);
};
```

---

## 5. Crash-Only Design

Based on clig.dev's guidance: your program should expect to be started in a state where previous cleanup has not run. SIGKILL, power loss, OOM kills, and kernel panics do not give your process a chance to clean up. Design accordingly.

### Principles

1. **Don't rely on cleanup handlers.** They may not run. Every persistent side effect (temp files, lock files, partial writes) must be recoverable on the next startup.
2. **Check for stale state on startup.** If a lock file exists, check whether the PID is still alive. If not, remove it and continue. Don't just fail with "another instance is running."
3. **Use atomic writes.** Write to a temporary file in the same directory, then rename. `rename()` is atomic on POSIX -- the file is either the old version or the new version, never a half-written state.
4. **Make operations idempotent.** Running the same command twice should produce the same result. If a previous run completed partially, the next run should pick up where it left off.
5. **Design for "hit up-arrow and enter."** The user's recovery path should be: run the same command again.

### Atomic File Writes

```typescript
import { writeFile, rename, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const atomicWrite = async (filePath: string, content: string): Promise<void> => {
  // Write to a temp file in the same directory (same filesystem = atomic rename)
  const tempPath = join(dirname(filePath), `.${randomUUID()}.tmp`);
  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, filePath);
  } catch (error) {
    // Clean up the temp file on failure (best effort)
    await unlink(tempPath).catch(() => {});
    throw error;
  }
};
```

The temp file must be in the same directory as the target because `rename()` is only atomic within the same filesystem mount.

### Stale Lock File Recovery

```typescript
import { readFile, unlink, writeFile } from 'node:fs/promises';

type LockResult =
  | { readonly acquired: true; readonly release: () => Promise<void> }
  | { readonly acquired: false; readonly reason: string };

const acquireLock = async (lockPath: string): Promise<LockResult> => {
  try {
    const existing = await readFile(lockPath, 'utf-8').catch(() => null);

    if (existing !== null) {
      const pid = parseInt(existing.trim(), 10);
      if (isProcessAlive(pid)) {
        return {
          acquired: false,
          reason: `Another instance is running (PID ${pid})`,
        };
      }
      // Stale lock -- previous process did not clean up
      process.stderr.write(`Removing stale lock file (PID ${pid} is not running)\n`);
      await unlink(lockPath).catch(() => {});
    }

    await writeFile(lockPath, String(process.pid), 'utf-8');

    const release = async (): Promise<void> => {
      await unlink(lockPath).catch(() => {});
    };

    return { acquired: true, release };
  } catch {
    return { acquired: false, reason: 'Failed to acquire lock' };
  }
};

const isProcessAlive = (pid: number): boolean => {
  try {
    // Signal 0 does not kill -- it checks existence
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};
```

### Idempotent Operations

Structure mutating operations so that re-running them after a partial failure produces the correct result:

```typescript
// Each step checks whether it has already been completed
type MigrationStep = {
  readonly name: string;
  readonly isCompleted: () => Promise<boolean>;
  readonly execute: () => Promise<void>;
};

const runMigration = async (
  steps: ReadonlyArray<MigrationStep>,
): Promise<void> => {
  for (const step of steps) {
    const done = await step.isCompleted();
    if (done) {
      process.stderr.write(`  Skipping ${step.name} (already completed)\n`);
      continue;
    }
    process.stderr.write(`  Running ${step.name}...\n`);
    await step.execute();
  }
};
```

---

## 6. Pager Integration

A pager (`less`, `more`) is appropriate when:

- stdout is an interactive TTY (`process.stdout.isTTY === true`)
- The output is large enough that it won't fit on one screen
- No pipe or redirect is active

Never page when stdout is piped -- the pipe consumer is the "pager."

### Recommended Pager Flags

Use `less -FIRX` as the default:

| Flag | Effect |
|------|--------|
| `-F` | Quit immediately if content fits on one screen (no paging for short output) |
| `-I` | Case-insensitive search |
| `-R` | Pass-through ANSI color/style escape sequences |
| `-X` | Leave content on screen when less quits (don't clear the terminal) |

### Respecting User Preferences

Check the `PAGER` environment variable. If the user has set it, they want that pager. Fall back to `less -FIRX` if unset.

### Node.js Implementation

Spawn the pager as a child process and pipe your output to its stdin:

```typescript
import { spawn } from 'node:child_process';

type PagerConfig = {
  readonly content: string;
  readonly fallback?: () => void;
};

const throughPager = (config: PagerConfig): void => {
  if (!process.stdout.isTTY) {
    // Not a TTY -- write directly, no pager
    process.stdout.write(config.content);
    return;
  }

  const terminalRows = process.stdout.rows ?? 24;
  const lineCount = config.content.split('\n').length;

  if (lineCount <= terminalRows) {
    // Content fits on one screen -- no pager needed
    process.stdout.write(config.content);
    return;
  }

  const pagerCommand = process.env['PAGER'] ?? 'less -FIRX';
  const [command, ...args] = pagerCommand.split(' ');

  const pager = spawn(command, args, {
    stdio: ['pipe', process.stdout, process.stderr],
  });

  pager.stdin.write(config.content);
  pager.stdin.end();

  pager.on('error', () => {
    // Pager not available -- fall back to direct output
    process.stdout.write(config.content);
  });

  pager.on('close', (code) => {
    // Exit with the pager's exit code if it failed
    if (code !== null && code !== 0) {
      process.exit(code);
    }
  });
};
```

### Streaming Pager

For output that is generated incrementally (not available all at once), pipe directly to the pager's stdin:

```typescript
import { spawn } from 'node:child_process';

type StreamingPager = {
  readonly write: (data: string) => void;
  readonly end: () => Promise<number>;
};

const createStreamingPager = (): StreamingPager => {
  if (!process.stdout.isTTY) {
    // Not a TTY -- write directly
    return {
      write: (data) => process.stdout.write(data),
      end: () => Promise.resolve(0),
    };
  }

  const pagerCommand = process.env['PAGER'] ?? 'less -FIRX';
  const [command, ...args] = pagerCommand.split(' ');

  const pager = spawn(command, args, {
    stdio: ['pipe', process.stdout, process.stderr],
  });

  return {
    write: (data) => pager.stdin.write(data),
    end: () =>
      new Promise((resolve) => {
        pager.stdin.end();
        pager.on('close', (code) => resolve(code ?? 0));
        pager.on('error', () => resolve(1));
      }),
  };
};
```

---

## Summary of Exit Codes for Signals

| Signal | Trigger | Correct behavior | Exit code |
|--------|---------|-----------------|-----------|
| SIGINT | Ctrl-C | Acknowledge on stderr, bounded cleanup, exit | 130 |
| SIGTERM | `kill`, Docker stop | Graceful shutdown, same as SIGINT | 143 |
| SIGPIPE | Pipe consumer closed | Exit silently and immediately | 141 |
| SIGKILL | `kill -9` | Cannot be caught. This is why crash-only design matters. | 137 |

## Key Takeaways

1. **stdout is 2x faster than stderr when piped** because block buffering reduces write() syscall count. Route high-volume data to stdout, low-volume diagnostics to stderr.
2. **Always handle backpressure** on stdout for high-volume output. Check `.write()` return value and wait for `'drain'`.
3. **NDJSON enables streaming structured data** without buffering everything in memory. Include a `type` field for multiplexing.
4. **Signal handling is not optional.** Acknowledge SIGINT immediately, clean up with a bounded timeout, handle EPIPE for Node.js SIGPIPE.
5. **Design for crash-only.** Atomic writes, stale lock recovery, idempotent operations. Your cleanup handler is a best-effort optimization, not a guarantee.
6. **Use a pager for large TTY output.** Respect `PAGER`, fall back to `less -FIRX`, never page when piped.
