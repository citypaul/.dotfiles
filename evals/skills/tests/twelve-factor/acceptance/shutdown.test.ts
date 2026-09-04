// Hidden acceptance test for the shutdown case. Copied into the workspace as
// src/acceptance-shutdown.test.ts at grade time.
//
// It starts the server with fakes, sends the signal the platform sends, and
// requires the in-flight work to be drained before the backing service is
// closed. Nothing here assumes how the drain is implemented.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startServer } from "./server";
import type { DbPool } from "./lib/db-pool";
import type { HttpServer } from "./lib/http-server";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const createFakes = () => {
  const events: string[] = [];
  const server: HttpServer = {
    listen: () => {
      events.push("listening");
    },
    close: async () => {
      await tick();
      events.push("server closed");
    },
    inject: async () => ({ status: 200 }),
  };
  const pool: DbPool = {
    query: async () => ({ rows: [] }),
    end: async () => {
      events.push("pool closed");
    },
  };
  return { events, server, pool };
};

const waitFor = async (settled: () => boolean) => {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    if (settled()) return;
    await tick();
  }
};

// How a drained process ends is not what this test grades. Setting
// `process.exitCode` and calling `process.exit(0)` once everything is closed
// are both correct endings, and a forced exit is what a drain timeout is for —
// but a real exit would take the test runner down with it. Stand in for it for
// the duration of the run so either ending is scored on the drain alone.
const exitCalls: number[] = [];
const realExit = process.exit;

beforeAll(() => {
  process.exit = ((code?: number) => {
    exitCalls.push(Number(code ?? 0));
  }) as unknown as typeof process.exit;
});

afterAll(() => {
  process.exit = realExit;
});

describe("acceptance: the platform stops the container", () => {
  it("drains the server before closing the pool when asked to stop", async () => {
    const fakes = createFakes();
    startServer({ server: fakes.server, pool: fakes.pool, port: 3000 });

    process.emit("SIGTERM", "SIGTERM");
    await waitFor(() => fakes.events.includes("pool closed"));

    expect(fakes.events).toEqual(["listening", "server closed", "pool closed"]);
  });

  it("does the same when the run is interrupted", async () => {
    const fakes = createFakes();
    startServer({ server: fakes.server, pool: fakes.pool, port: 3001 });

    process.emit("SIGINT", "SIGINT");
    await waitFor(() => fakes.events.includes("pool closed"));

    expect(fakes.events).toEqual(["listening", "server closed", "pool closed"]);
  });
});
