// Hidden acceptance test for the logging case. Copied into the workspace as
// src/acceptance-logging.test.ts at grade time.
//
// It captures everything the process prints (console methods and the streams
// themselves) while one record is logged, and requires a single machine
// readable record carrying the level, the message, the timestamp and the
// caller's fields. Field names are read tolerantly.
import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

const capture = (run: () => void): ReadonlyArray<string> => {
  const chunks: string[] = [];
  const collect = (...parts: ReadonlyArray<unknown>) => {
    chunks.push(parts.map((part) => String(part)).join(" "));
  };
  const streams = { out: process.stdout.write, err: process.stderr.write };
  const methods = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
  const intercept = ((chunk: unknown) => {
    collect(chunk);
    return true;
  }) as typeof process.stdout.write;

  process.stdout.write = intercept;
  process.stderr.write = intercept;
  console.log = collect;
  console.info = collect;
  console.warn = collect;
  console.error = collect;
  console.debug = collect;
  try {
    run();
  } finally {
    process.stdout.write = streams.out;
    process.stderr.write = streams.err;
    Object.assign(console, methods);
  }
  return chunks;
};

const recordsIn = (chunks: ReadonlyArray<string>): ReadonlyArray<Record<string, unknown>> =>
  chunks
    .flatMap((chunk) => chunk.split("\n"))
    .map((line) => line.trim())
    .filter((line) => line !== "")
    .flatMap((line) => {
      try {
        const parsed: unknown = JSON.parse(line);
        return typeof parsed === "object" && parsed !== null ? [parsed as Record<string, unknown>] : [];
      } catch {
        return [];
      }
    });

const field = (record: Record<string, unknown>, names: ReadonlyArray<string>): unknown =>
  names.map((name) => record[name]).find((value) => value !== undefined);

// The request pins a `createLogger()` that works with no arguments at all.
// Some implementations still declare a required options object (the skill's
// own resources/node-patterns.md shows `createLogger({ config })`), which would
// throw here for a reason this suite does not grade — what is graded is the
// record. Construct through this helper so a required options object costs the
// run nothing: try the pinned call, and on a throw hand over a superset of the
// option names such an implementation destructures.
const construct = createLogger as unknown as (options?: unknown) => ReturnType<typeof createLogger>;

const aLogger = (): ReturnType<typeof createLogger> => {
  try {
    return construct();
  } catch {
    return construct({
      config: { LOG_LEVEL: "debug" },
      level: "debug",
      logLevel: "debug",
      env: process.env,
    });
  }
};

describe("acceptance: logs the platform can collect", () => {
  it("prints one machine readable record for an entry", () => {
    const records = recordsIn(capture(() => aLogger().info("session created", { session_id: "s-1" })));

    expect(records).toHaveLength(1);
    const record = records[0] ?? {};
    expect(field(record, ["message", "msg", "event"])).toBe("session created");
    expect(String(field(record, ["level", "severity"]))).toMatch(/info|30/i);
    expect(field(record, ["session_id", "sessionId"])).toBe("s-1");
    expect(String(field(record, ["timestamp", "time", "ts", "@timestamp"]))).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("prints a failure the same way", () => {
    const records = recordsIn(capture(() => aLogger().error("database unreachable", { attempt: 3 })));

    expect(records.length).toBeGreaterThan(0);
    const record = records[0] ?? {};
    expect(field(record, ["message", "msg", "event"])).toBe("database unreachable");
    expect(String(field(record, ["level", "severity"]))).toMatch(/error|50/i);
    expect(Number(field(record, ["attempt"]))).toBe(3);
  });
});
