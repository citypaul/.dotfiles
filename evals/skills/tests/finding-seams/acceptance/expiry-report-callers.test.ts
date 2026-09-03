import { describe, expect, it } from "vitest";
import { Database } from "./lib/database";

const url = "postgres://acceptance-expiry-report/keys";
process.env.DATABASE_URL = url;
process.env.EXPIRY_WARNING_DAYS = "10";
const DAY_MS = 24 * 60 * 60 * 1000;

const seed = async (accountId: string, label: string, expiresInDays: number, revokedAt: number | null = null) =>
  new Database(url).insertApiKey({
    account_id: accountId,
    label,
    issued_at: Date.now(),
    expires_at: Date.now() + expiresInDays * DAY_MS + 1_000,
    revoked_at: revokedAt,
  });

describe("acceptance: expiringKeysReport's callers still work through the defaults", () => {
  it("HTTP handler lists keys expiring inside the ten-day window from the environment, soonest first", async () => {
    const { handleExpiringKeys } = await import("./http/api-keys");
    await seed("acc-http", "later", 5);
    await seed("acc-http", "soon", 2);
    await seed("acc-http", "mid", 9);
    await seed("acc-http", "far", 20);
    await seed("acc-http", "gone", 3, 1);

    const response = await handleExpiringKeys({ accountId: "acc-http" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ warnings: ["soon: expires in 3 days", "later: expires in 6 days", "mid: expires in 10 days"] });
  });

  it("CLI prints the same report, or a notice when nothing is due", async () => {
    const { runCli } = await import("./cli");
    await seed("acc-cli", "soon", 1);

    expect(await runCli(["expiring", "--account", "acc-cli"])).toBe("soon: expires in 2 days");
    expect(await runCli(["expiring", "--account", "acc-empty"])).toBe("no keys expiring soon");
  });
});
