import { afterEach, describe, expect, it, vi } from "vitest";
import { revokeApiKey } from "./revoke-key";

const revokeCalls: Array<[number, number]> = [];

vi.mock("./lib/database", () => ({
  Database: vi.fn().mockImplementation(() => ({
    apiKeysFor: vi.fn().mockResolvedValue([
      { id: 1, account_id: "acc-1", label: "ci", issued_at: 0, expires_at: 99, revoked_at: null },
      { id: 2, account_id: "acc-1", label: "old", issued_at: 0, expires_at: 99, revoked_at: 5 },
    ]),
    revokeApiKey: vi.fn().mockImplementation(async (id: number, at: number) => {
      revokeCalls.push([id, at]);
      return true;
    }),
  })),
}));

vi.stubEnv("DATABASE_URL", "postgres://mocked/keys");

afterEach(() => {
  revokeCalls.length = 0;
});

describe("revokeApiKey", () => {
  it("revokes an active key", async () => {
    expect(await revokeApiKey("acc-1", 1)).toBe("revoked");
    expect(revokeCalls.map(([id]) => id)).toEqual([1]);
  });

  it("reports a key that is already revoked", async () => {
    expect(await revokeApiKey("acc-1", 2)).toBe("already-revoked");
  });

  it("reports an unknown key", async () => {
    expect(await revokeApiKey("acc-1", 9)).toBe("not-found");
  });
});
