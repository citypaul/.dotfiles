# Stream Contracts: Buffering, Signals, and Process Lifecycle

Deep-dive on stream behavior, NDJSON, signal handling, crash-only design, and pager integration for Node.js CLI tools. See the main `cli-design` skill for the Unix stream contract, format flags, and exit code conventions. See `output-architecture.md` for TypeScript output ports and formatters. See `testing-cli.md` for testing stream behavior.

---

## 1. Process Stream Behavior

C stdio commonly line-buffers a TTY, block-buffers a pipe, and leaves stderr unbuffered, but that is not a portable contract for every language runtime. Do not assume a fixed buffer size, syscall ratio, or throughput advantage when designing a CLI. Measure the actual runtime and destination when performance matters.

### Node.js Specifics

Node's process streams deliberately preserve compatibility with the underlying platform. Writes have this sync/async matrix:

| Destination | POSIX | Windows |
|-------------|-------|---------|
| Regular file | synchronous | synchronous |
| TTY | synchronous | asynchronous |
| Pipe or socket | asynchronous | synchronous |

Synchronous writes can block the event loop. Asynchronous writes can accumulate in memory if the consumer is slow, so high-volume producers must honor backpressure. Do not infer stream behavior from TTY status alone.

`process.stdout` and `process.stderr` are `Writable` streams with platform-dependent behavior:

```typescript
// TTY detection per stream -- check each independently
const stdoutIsTTY = process.stdout.isTTY === true;
const stderrIsTTY = process.stderr.isTTY === true;

// stdout piped but stderr still on TTY is common:
//   mycli run 2>/dev/tty | jq .
// In this case, show spinners on stderr, clean data on stdout.
```

If `.write()` returns `false`, pause before producing more. Do not wait only for
`'drain'`: a closed consumer can emit an error without ever draining. Use an
error-aware completion helper and treat the configured high-water mark as
runtime- and stream-dependent rather than relying on a hard-coded default.

---

## 2. Node.js Stream Specifics

### Backpressure for High-Volume Output

For CLI tools that produce large volumes of output (log streaming, data export,
test result enumeration), ignoring backpressure causes unbounded memory growth.
Use the shared error-aware write helper from `output-architecture.md`; its
explicit outcome lets each caller apply the correct stream policy:

```typescript
import { writeOutput, type WriteOutcome } from './streams.js';

// Usage in a streaming loop
const streamResults = async (
  results: ReadonlyArray<string>,
  stream: NodeJS.WritableStream,
): Promise<WriteOutcome> => {
  for (const line of results) {
    const outcome = await writeOutput(stream, line + '\n');
    if (outcome === 'epipe') return outcome;
  }
  return 'written';
};
```

For stdout, stop producing records and map `epipe` to the command's documented
pipe exit policy (commonly 141). For stderr, stop that diagnostic producer but
continue primary stdout work. Never turn a closed diagnostics consumer into a
process-wide exit, and do not use fire-and-forget write loops.

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

## 3. NDJSON Syntax And An Optional Event Profile

Newline-Delimited JSON (NDJSON) is useful when a CLI produces structured
values over time. The format itself is deliberately small: each record is one
complete JSON text followed by `\n`; parsers accept both `\n` and `\r\n`.
Any JSON value is valid. Ignoring empty lines is an optional parser behavior
that must be documented.

This skill's examples also use an **optional local event profile**: object
records carry a `type` discriminator, and a producer may end with a
`type: "summary"` record. Those are application-contract choices, not NDJSON
syntax requirements. A caller's decoder owns the accepted record shape.

### Rules

1. Each non-empty record is one self-contained JSON value
2. Writers terminate records with `\n`; readers accept `\n` and `\r\n`
3. State explicitly whether empty lines are ignored or rejected
4. When using the local multiplexed-event profile, require a `type` field
5. A summary record is optional and belongs to that local profile
6. Validate every non-empty line with the caller's decoder and report invalid input with its physical line number

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
  readonly write: (record: NdjsonRecord) => Promise<WriteOutcome>;
};

const createNdjsonWriter = (stream: NodeJS.WritableStream): NdjsonWriter => {
  const write = (record: NdjsonRecord): Promise<WriteOutcome> => {
    const line = JSON.stringify(record) + '\n';
    return writeOutput(stream, line);
  };

  return { write };
};

// Usage
const writer = createNdjsonWriter(process.stdout);
const records: readonly NdjsonRecord[] = [
  { type: 'result', file: 'src/app.ts', status: 'pass' },
  { type: 'result', file: 'src/lib.ts', status: 'fail' },
  { type: 'summary', total: 2, passed: 1, failed: 1 },
];

for (const record of records) {
  if ((await writer.write(record)) === 'epipe') {
    process.exitCode = 141;
    break;
  }
}
```

### NDJSON Reader

```typescript
import { createInterface } from 'node:readline';

type NdjsonDecoder<T> = (value: unknown) => T;

const parseNdjsonLine = <T>(
  line: string,
  lineNumber: number,
  decode: NdjsonDecoder<T>,
): T => {
  try {
    const value: unknown = JSON.parse(line);
    return decode(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid NDJSON at line ${lineNumber}: ${message}`);
  }
};

const readNdjson = async function* <T>(
  input: NodeJS.ReadableStream,
  decode: NdjsonDecoder<T>,
): AsyncGenerator<T> {
  const rl = createInterface({ input, crlfDelay: Infinity });
  let lineNumber = 0;
  for await (const line of rl) {
    lineNumber += 1;
    if (line.trim() === '') continue;
    yield parseNdjsonLine(line, lineNumber, decode);
  }
};

// Usage
// cat results.ndjson | mycli summarize
for await (
  const record of readNdjson(
    process.stdin,
    (value) => ndjsonRecordSchema.parse(value),
  )
) {
  if (record.type === 'summary') {
    process.stderr.write(`Total: ${record.total}, Failed: ${record.failed}\n`);
  }
}
```

`ndjsonRecordSchema` is caller-owned and validates the expected record shape.
Empty lines remain the only ignored input; malformed JSON and schema failures
stop consumption with the original physical line number.

---

## 4. Signal Handling

### SIGINT (Ctrl-C)

The user pressed Ctrl-C. Acknowledge immediately on stderr, start cleanup with a bounded timeout, and exit with code 130 (128 + 2).

```typescript
type CleanupFn = () => void | Promise<void>;

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

    void Promise.allSettled(
      cleanupFns.map((fn) => Promise.resolve().then(fn)),
    )
      .then((results) => {
        clearTimeout(timeout);
        const cleanupFailed = results.some((result) => result.status === 'rejected');
        if (cleanupFailed) process.stderr.write('One or more cleanup tasks failed.\n');
        process.removeListener('SIGINT', handleSigint);
        process.exitCode = 130;
      });
  };

  process.on('SIGINT', handleSigint);
};
```

Design decisions:

- **Acknowledge immediately.** The user needs to know their Ctrl-C was received. A program that appears to ignore Ctrl-C will get a `kill -9`.
- **Bounded cleanup.** Five seconds is a generous upper bound. Cleanup that takes longer than this is likely stuck.
- **Keep the bound alive.** Do not `unref()` the cleanup timer. It must remain a
  referenced handle until cleanup settles, including when a pending cleanup
  promise owns no event-loop handles of its own.
- **Settle every cleanup.** `Promise.resolve().then(fn)` turns a synchronous throw into a rejected promise inside the `allSettled` boundary.
- **Inspect every result.** A rejected cleanup is reported and must not receive a
  successful graceful status.
- **Second Ctrl-C forces exit.** Tell the user what it does ("Force quit. Cleanup skipped.") so they can make an informed choice.
- **Exit code 130.** Convention: 128 + signal number. SIGINT is signal 2.
- **Let settled output drain.** Successful cleanup sets `process.exitCode` and
  removes the signal listener; only the force and timeout paths call
  `process.exit()`, so pending stdout/stderr writes are not truncated.

### SIGTERM

Graceful shutdown -- the same cleanup logic as SIGINT. This is the signal sent by process managers, container runtimes, and `docker stop`. If cleanup does not finish in time, the orchestrator sends SIGKILL (which cannot be caught).

```typescript
const handleSigterm = (): void => {
  // A handled, graceful SIGTERM may use 0. Choose and document 143 instead if
  // this CLI intentionally preserves signal-style termination status.
  const gracefulExitCode = 0;
  const cleanupTimeoutExitCode = 1;
  process.stderr.write('Received SIGTERM. Shutting down...\n');

  const timeout = setTimeout(() => {
    process.stderr.write('Cleanup timed out. Exiting.\n');
    process.exit(cleanupTimeoutExitCode);
  }, CLEANUP_TIMEOUT_MS);

  void Promise.allSettled(
    cleanupFns.map((fn) => Promise.resolve().then(fn)),
  )
    .then((results) => {
      clearTimeout(timeout);
      const cleanupFailed = results.some((result) => result.status === 'rejected');
      if (cleanupFailed) process.stderr.write('One or more cleanup tasks failed.\n');
      process.removeListener('SIGTERM', handleSigterm);
      process.exitCode = cleanupFailed ? cleanupTimeoutExitCode : gracefulExitCode;
    });
};

process.on('SIGTERM', handleSigterm);
```

A handled SIGTERM is an application-controlled graceful shutdown. It may return
0 after successful cleanup or a documented status such as 143 when preserving
signal-style termination. Docker and Kubernetes do not require 143; choose one
contract and test it. The timeout path may use a different documented failure
status if incomplete cleanup is significant to callers.

### SIGPIPE

SIGPIPE is sent when the pipe consumer exits early:

```bash
mycli run | head -5
```

`head` reads 5 lines and exits. The next write from `mycli` to the now-broken pipe triggers SIGPIPE. The correct response is to exit immediately and silently with code 141 (128 + 13). Never treat SIGPIPE as an error -- the user got exactly what they asked for.

**Node.js caveat:** Node.js ignores SIGPIPE by default (it does not terminate the process). Instead, the broken pipe surfaces as an `EPIPE` error on the write call. You must handle this explicitly:

```typescript
const handleEpipe = (
  stream: NodeJS.WritableStream,
  onEpipe: () => void,
): void => {
  stream.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EPIPE') {
      onEpipe();
      return;
    }
    // Re-throw non-EPIPE errors
    throw err;
  });
};

// A closed data consumer ends the command; a closed diagnostics consumer does not.
handleEpipe(process.stdout, () => process.exit(141));
handleEpipe(process.stderr, () => {});
```

Without this handler, `mycli run | head -5` throws an unhandled error and exits with code 1, which is incorrect -- the operation succeeded from the user's perspective.
An independently closed stderr must only stop diagnostics; terminating there
would discard stdout that its consumer may still be reading.

### Combined Signal Setup

Bringing it all together as a single setup function:

```typescript
type GracefulShutdownConfig = {
  readonly cleanupFns: ReadonlyArray<CleanupFn>;
  readonly cleanupTimeoutMs?: number;
  readonly sigtermExitCode?: number;
  readonly sigtermTimeoutExitCode?: number;
};

const setupGracefulShutdown = (config: GracefulShutdownConfig): void => {
  const {
    cleanupFns,
    cleanupTimeoutMs = 5_000,
    sigtermExitCode = 0,
    sigtermTimeoutExitCode = 1,
  } = config;
  let shuttingDown = false;

  const shutdown = (
    signal: string,
    settledExitCode: number,
    timeoutExitCode: number,
  ): void => {
    if (shuttingDown) {
      process.stderr.write(`\nForce quit. Cleanup skipped.\n`);
      process.exit(timeoutExitCode);
      return;
    }

    shuttingDown = true;
    process.stderr.write(`\nReceived ${signal}. Shutting down...\n`);

    const timeout = setTimeout(() => {
      process.stderr.write('Cleanup timed out. Exiting.\n');
      process.exit(timeoutExitCode);
    }, cleanupTimeoutMs);

    void Promise.allSettled(
      cleanupFns.map((fn) => Promise.resolve().then(fn)),
    )
      .then((results) => {
        clearTimeout(timeout);
        const cleanupFailed = results.some((result) => result.status === 'rejected');
        if (cleanupFailed) process.stderr.write('One or more cleanup tasks failed.\n');
        process.removeListener('SIGINT', onSigint);
        process.removeListener('SIGTERM', onSigterm);
        process.exitCode = cleanupFailed ? timeoutExitCode : settledExitCode;
      });
  };

  const onSigint = (): void => shutdown('SIGINT', 130, 130);
  const onSigterm = (): void =>
    shutdown('SIGTERM', sigtermExitCode, sigtermTimeoutExitCode);

  process.on('SIGINT', onSigint);
  process.on('SIGTERM', onSigterm);

  // Handle EPIPE independently (Node.js ignores SIGPIPE).
  handleEpipe(process.stdout, () => process.exit(141));
  handleEpipe(process.stderr, () => {});
};
```

---

## 5. Crash-Only Design

Based on clig.dev's guidance: your program should expect to be started in a state where previous cleanup has not run. SIGKILL, power loss, OOM kills, and kernel panics do not give your process a chance to clean up. Design accordingly.

### Principles

1. **Don't rely on cleanup handlers.** They may not run. Every persistent side effect (temp files, lock files, partial writes) must be recoverable on the next startup.
2. **Use ownership-safe locks.** Let a reviewed advisory-lock implementation handle owner death, or recover only leases with atomic ownership and expiry. Never unlink a lock from a PID check alone.
3. **Choose the required persistence contract.** Same-filesystem rename can make
   the new name visible atomically, but visibility atomicity is not crash
   durability. When data must survive power loss, use a reviewed durable writer
   that handles file and directory sync, metadata, cleanup, and platform policy.
4. **Make advertised retries idempotent.** A command may invite re-running only
   when duplicate dispatch is prevented or reconciliation proves the result.
5. **Separate retry from reconciliation.** "Hit up-arrow and enter" is appropriate
   only for documented retry-safe operations. If a mutation may have been accepted,
   direct the user to `status` or an explicit reconciliation command.

### Visibility-Atomic File Replacement

```typescript
import { writeFile, rename, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const replaceVisibleAtomically = async (
  filePath: string,
  content: string,
): Promise<void> => {
  // Same-directory placement permits a same-filesystem rename.
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

The temp file must share the target filesystem for atomic name replacement. This
example prevents readers from observing a partially written replacement; it does
**not** prove that content or the directory entry survives a crash or power loss,
and it does not preserve existing mode, ownership, ACLs, or extended attributes.

For crash-durable configuration or state, prefer a reviewed durable-file writer
with an explicit platform contract. It should write and sync the temporary file,
apply required metadata, rename it, sync the containing directory where the
platform supports that guarantee, and define Windows replacement behavior. Do
not improvise an `fsync` sequence and call it portable durability.

### Process Locks

`open(path, 'wx')` makes file creation atomic, but it does not provide an
ownership-safe lifecycle. A token read followed by `unlink` is a time-of-check /
time-of-use race: another owner can replace the path between those operations.
PID liveness checks also face reuse, permissions, and concurrent recovery.

Use an operating-system advisory lock or a reviewed locking library whose
release is tied to the acquired handle. Use a lease with atomic ownership and
expiry when crash recovery is required. State whether the mechanism is
single-host or distributed, and test contention plus owner death. Do not claim
safe automatic recovery for a hand-rolled PID/token file protocol.

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

Treat `PAGER` as one executable name or path and always spawn with `shell: false`.
An empty value disables paging. Do not call a shell or split the value on spaces;
users can configure `less` flags through `LESS`. If the application promises a
full command line, parse it with a reviewed shell-word parser and still avoid a
shell. Fall back to argument-vector form `less -FIRX` when `PAGER` is unset.

### Node.js Implementation

Spawn the pager as a child process and pipe your output to its stdin:

```typescript
import { spawn, type ChildProcess } from 'node:child_process';

type PagerConfig = {
  readonly content: string;
};

type PagerSpec = {
  readonly command: string;
  readonly args: readonly string[];
};

const resolvePager = (value: string | undefined): PagerSpec | undefined => {
  if (value === '') return undefined;
  if (value !== undefined) return { command: value, args: [] };
  return { command: 'less', args: ['-F', '-I', '-R', '-X'] };
};

const directWrite = async (content: string): Promise<number> =>
  (await writeOutput(process.stdout, content)) === 'epipe' ? 141 : 0;

const waitForSpawn = (child: ChildProcess): Promise<boolean> =>
  new Promise((resolve) => {
    child.once('spawn', () => resolve(true));
    child.once('error', () => resolve(false));
  });

const waitForClose = (child: ChildProcess): Promise<number> =>
  new Promise((resolve) => {
    child.once('close', (code) => resolve(code ?? 1));
    child.once('error', () => resolve(1));
  });

const throughPager = async (config: PagerConfig): Promise<number> => {
  if (!process.stdout.isTTY) {
    return directWrite(config.content);
  }

  const terminalRows = process.stdout.rows ?? 24;
  const lineCount = config.content.split('\n').length;

  if (lineCount <= terminalRows) {
    return directWrite(config.content);
  }

  const spec = resolvePager(process.env['PAGER']);
  if (spec === undefined) return directWrite(config.content);

  const pager = spawn(spec.command, [...spec.args], {
    shell: false,
    stdio: ['pipe', process.stdout, process.stderr],
  });
  const closed = waitForClose(pager);

  if (!(await waitForSpawn(pager))) {
    // Spawn failed before any content was delivered, so replay is safe.
    return directWrite(config.content);
  }

  const outcome = await writeOutput(pager.stdin, config.content);
  if (outcome === 'written') pager.stdin.end();

  // A pager that exits normally before consuming everything is not an error.
  return closed;
};
```

After delivery starts, never replay the buffer as a fallback: doing so can
duplicate output. Return the adapter status to the entry point; do not call
`process.exit()` inside the pager adapter.

### Streaming Pager

For output that is generated incrementally (not available all at once), pipe directly to the pager's stdin:

```typescript
import { spawn } from 'node:child_process';

type StreamingPager = {
  readonly write: (data: string) => Promise<WriteOutcome>;
  readonly end: () => Promise<number>;
};

const createStreamingPager = async (): Promise<StreamingPager> => {
  if (!process.stdout.isTTY) {
    return {
      write: (data) => writeOutput(process.stdout, data),
      end: () => Promise.resolve(0),
    };
  }

  const spec = resolvePager(process.env['PAGER']);
  if (spec === undefined) {
    return {
      write: (data) => writeOutput(process.stdout, data),
      end: () => Promise.resolve(0),
    };
  }

  const pager = spawn(spec.command, [...spec.args], {
    shell: false,
    stdio: ['pipe', process.stdout, process.stderr],
  });
  const closed = waitForClose(pager);

  if (!(await waitForSpawn(pager))) {
    return {
      write: (data) => writeOutput(process.stdout, data),
      end: () => Promise.resolve(0),
    };
  }

  let inputClosed = false;

  return {
    write: async (data) => {
      const outcome = await writeOutput(pager.stdin, data);
      if (outcome === 'epipe') inputClosed = true;
      return outcome;
    },
    end: async () => {
      if (!inputClosed) pager.stdin.end();
      return closed;
    },
  };
};
```

Every streaming caller awaits `write`; on `epipe`, it stops producing and calls
`end` only to observe the pager's status.

---

## Summary of Exit Codes for Signals

| Signal | Trigger | Correct behavior | Exit code |
|--------|---------|-----------------|-----------|
| SIGINT | Ctrl-C | Acknowledge on stderr, bounded cleanup, exit | 130 |
| SIGTERM | `kill`, container stop | Graceful cleanup | 0 or the CLI's documented status (often 143 when preserving signal style) |
| SIGPIPE / stdout EPIPE | Data consumer closed | Exit silently and immediately | 141 |
| stderr EPIPE | Diagnostics consumer closed | Stop diagnostics; let stdout work continue | Command's own code |
| SIGKILL | `kill -9` | Cannot be caught. This is why crash-only design matters. | 137 |

## Key Takeaways

1. **Route by contract, not a fixed speed claim.** Send primary data to stdout and diagnostics to stderr; measure the actual runtime and destination before making buffering or throughput claims.
2. **Always handle backpressure and write errors** on high-volume output. Await
   the shared error-aware write helper; waiting only for `'drain'` can hang after
   a closed consumer.
3. **NDJSON enables streaming structured data** without buffering everything in
   memory. Any JSON value is valid; `type` and summary records belong only to the
   optional local event profile.
4. **Signal handling is not optional.** Acknowledge SIGINT immediately, clean up with a bounded timeout, and handle stdout and stderr EPIPE independently.
5. **Design for crash-only.** Visibility-atomic replacement, reviewed durable
   writers where required, handle-owned locks or leases, and idempotent operations
   make cleanup a best-effort optimization rather than a guarantee.
6. **Use a pager for large TTY output.** Treat `PAGER` as untrusted configuration,
   avoid a shell, await writes, handle EPIPE, and never page when piped.
