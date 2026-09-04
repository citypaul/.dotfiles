// Hidden grader test for publicResponseVerdictOnly: the platform probe is public,
// so its body says whether the service is up and nothing else — no dependency
// names, versions, uptime or internals.
import { describe, expect, it } from "vitest";
import { createApp } from "./composition/app";

const createFixture = () => ({
  deps: {
    sessions: { find: async () => undefined },
    orders: {
      findById: async () => undefined,
      listForTenant: async () => [],
      save: async () => {},
    },
  },
});

describe("acceptance: what the platform probe discloses", () => {
  it("answers with a verdict and nothing else", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/healthz");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body.length).toBeLessThan(300);
    expect(body).not.toMatch(
      /version|uptime|postgres|redis|mysql|mongo|database|dependenc|commit|node_modules|heap|memory|hostname|stack|latency|\bdb\b/i,
    );
  });
});
