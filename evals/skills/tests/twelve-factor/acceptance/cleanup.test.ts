// Hidden acceptance test for the nightly cleanup case. Copied into the
// workspace as src/acceptance-cleanup.test.ts at grade time.
//
// It calls the work directly with a fake pool and a fixed clock, so the
// schedule is irrelevant here: what is graded is that the work removes expired
// sessions from the backing service and can be run twice.
import { describe, expect, it } from "vitest";
import { runCleanup } from "./cleanup";
import type { DbPool } from "./lib/db-pool";

const midnight = new Date("2026-03-15T02:00:00Z");

const createFakePool = () => {
  const queries: Array<{ readonly sql: string; readonly params: ReadonlyArray<unknown> }> = [];
  const pool: DbPool = {
    query: async (sql, params = []) => {
      queries.push({ sql, params });
      return { rows: [] };
    },
    end: async () => {},
  };
  return { queries, pool };
};

const deletesIn = (queries: ReadonlyArray<{ readonly sql: string; readonly params: ReadonlyArray<unknown> }>) =>
  queries.filter((query) => /delete/i.test(query.sql) && /session/i.test(query.sql));

describe("acceptance: expired sessions are removed", () => {
  it("removes the sessions that expired before the current time", async () => {
    const fake = createFakePool();

    await runCleanup({ pool: fake.pool, now: () => midnight });

    const deletes = deletesIn(fake.queries);
    expect(deletes.length).toBeGreaterThan(0);
    const cutoffFromTheClock = deletes.some(
      (query) => JSON.stringify(query).includes("2026-03-15") || /now\(\)|current_timestamp/i.test(query.sql),
    );
    expect(cutoffFromTheClock).toBe(true);
  });

  it("can be run again without complaint", async () => {
    const fake = createFakePool();

    await runCleanup({ pool: fake.pool, now: () => midnight });
    await runCleanup({ pool: fake.pool, now: () => midnight });

    expect(deletesIn(fake.queries).length).toBeGreaterThan(1);
  });
});
