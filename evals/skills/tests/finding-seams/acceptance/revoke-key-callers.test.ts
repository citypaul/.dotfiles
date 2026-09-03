import { describe, expect, it } from "vitest";
import { Database } from "./lib/database";

const url = "postgres://acceptance-revoke-key/keys";
process.env.DATABASE_URL = url;
const DAY_MS = 24 * 60 * 60 * 1000;

const seed = async (accountId: string, label: string, revokedAt: number | null = null) =>
  new Database(url).insertApiKey({
    account_id: accountId,
    label,
    issued_at: Date.now(),
    expires_at: Date.now() + 30 * DAY_MS,
    revoked_at: revokedAt,
  });

describe("acceptance: revokeApiKey's callers still work through the defaults", () => {
  it("HTTP handler revokes an active key and records when", async () => {
    const { handleRevokeApiKey } = await import("./http/api-keys");
    const row = await seed("acc-http", "ci");
    const before = Date.now();

    const response = await handleRevokeApiKey({ accountId: "acc-http", keyId: String(row.id) });

    expect(response.status).toBe(204);
    const [stored] = await new Database(url).apiKeysFor("acc-http");
    expect(stored?.revoked_at).toBeGreaterThanOrEqual(before);
    expect(stored?.revoked_at).toBeLessThanOrEqual(Date.now());
  });

  it("HTTP handler answers 409 for a key already revoked and 404 for an unknown one", async () => {
    const { handleRevokeApiKey } = await import("./http/api-keys");
    const row = await seed("acc-http-2", "old", 5);

    expect((await handleRevokeApiKey({ accountId: "acc-http-2", keyId: String(row.id) })).status).toBe(409);
    expect((await handleRevokeApiKey({ accountId: "acc-http-2", keyId: "9999" })).status).toBe(404);
  });

  it("CLI revokes a key", async () => {
    const { runCli } = await import("./cli");
    const row = await seed("acc-cli", "deploy");

    expect(await runCli(["revoke-key", "--account", "acc-cli", "--key", String(row.id)])).toBe("revoked");
    expect(await runCli(["revoke-key", "--account", "acc-cli", "--key", String(row.id)])).toBe("already-revoked");
  });
});
