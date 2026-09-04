import { describe, expect, it } from "vitest";
import { createApp } from "./composition/app";

const deps = {
  sessions: { find: async () => undefined },
  orders: {
    findById: async () => undefined,
    listForTenant: async () => [],
    save: async () => {},
  },
};

describe("the entry catalog", () => {
  // Reviewed allowlist: changing this list is a security review.
  it("lists exactly one entry point callable without signing in", () => {
    const { catalog } = createApp(deps);

    const callableWithoutSigningIn = catalog
      .filter((entry) => entry.access === "public")
      .map((entry) => `${entry.method} ${entry.path}`);

    expect(callableWithoutSigningIn).toEqual(["GET /api/config"]);
  });
});
