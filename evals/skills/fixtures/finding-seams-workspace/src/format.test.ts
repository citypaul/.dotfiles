import { describe, expect, it } from "vitest";
import { formatRelativeDays, sortByExpiry } from "./format";
import type { ApiKeyRow } from "./lib/database";

const DAY_MS = 24 * 60 * 60 * 1000;

const row = (overrides: Partial<ApiKeyRow>): ApiKeyRow => ({
  id: 1,
  account_id: "acc-1",
  label: "ci",
  issued_at: 0,
  expires_at: 10 * DAY_MS,
  revoked_at: null,
  ...overrides,
});

describe("formatRelativeDays", () => {
  it("rounds up to whole days", () => {
    expect(formatRelativeDays(0)).toBe("today");
    expect(formatRelativeDays(DAY_MS / 2)).toBe("in 1 day");
    expect(formatRelativeDays(2.5 * DAY_MS)).toBe("in 3 days");
  });
});

describe("sortByExpiry", () => {
  it("orders soonest first and breaks ties by id", () => {
    const sorted = sortByExpiry([
      row({ id: 3, expires_at: 5 * DAY_MS }),
      row({ id: 1, expires_at: 2 * DAY_MS }),
      row({ id: 2, expires_at: 2 * DAY_MS }),
    ]);
    expect(sorted.map((r) => r.id)).toEqual([1, 2, 3]);
  });
});
