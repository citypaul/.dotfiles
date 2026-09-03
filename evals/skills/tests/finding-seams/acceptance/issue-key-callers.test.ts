import { describe, expect, it } from "vitest";
import { Database } from "./lib/database";

// The callers pass only the business arguments; whatever seam the agent added
// must default to the real driver, the real clock and the real environment.
// Environment is set before the modules load so a read at import time or at
// call time both work.
const url = "postgres://acceptance-issue-key/keys";
process.env.DATABASE_URL = url;
process.env.API_KEY_TTL_DAYS = "10";
const DAY_MS = 24 * 60 * 60 * 1000;

describe("acceptance: issueApiKey's callers still work through the defaults", () => {
  it("HTTP handler issues a key with a ten-day expiry from the environment", async () => {
    const { handleCreateApiKey } = await import("./http/api-keys");
    const before = Date.now();

    const response = await handleCreateApiKey({ accountId: "acc-http", label: "  Deploy " });

    expect(response.status).toBe(201);
    const body = response.body as { token: string; expiresAt: number };
    expect(body.token).toMatch(/^ak_\d+_[0-9a-z]+$/);
    expect(body.expiresAt - before).toBeGreaterThanOrEqual(10 * DAY_MS);
    expect(body.expiresAt - before).toBeLessThan(10 * DAY_MS + 60_000);
    const rows = await new Database(url).apiKeysFor("acc-http");
    expect(rows.map((row) => row.label)).toEqual(["deploy"]);
  });

  it("CLI issues a key and reports the expiry", async () => {
    const { runCli } = await import("./cli");

    const output = await runCli(["issue-key", "--account", "acc-cli", "--label", "CI"]);

    expect(output).toMatch(/^ak_\d+_[0-9a-z]+\texpires \d{4}-\d{2}-\d{2}T/);
    const rows = await new Database(url).apiKeysFor("acc-cli");
    expect(rows.map((row) => row.label)).toEqual(["ci"]);
  });

  it("HTTP handler refuses a sixth active key", async () => {
    const { handleCreateApiKey } = await import("./http/api-keys");
    for (let i = 0; i < 5; i += 1) {
      const ok = await handleCreateApiKey({ accountId: "acc-full", label: `k${i}` });
      expect(ok.status).toBe(201);
    }

    const response = await handleCreateApiKey({ accountId: "acc-full", label: "one-too-many" });

    expect(response.status).toBe(409);
  });
});
