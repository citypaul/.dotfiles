// Hidden acceptance test: GET /healthz and the order-events stream.
//
// The stream's success path is deliberately never opened (an open stream would
// keep the test process alive); what is pinned is that the platform probe answers
// without a session, that a caller with no session is refused with a protocol
// status and no stream ever starts, and that the catalog shows the probe as the
// only new entry point callable without signing in.
import { describe, expect, it } from "vitest";
import { createApp } from "./composition/app";

const session = {
  sessionId: "sess-a",
  userId: "user-1",
  tenantId: "tenant-a",
  email: "ada@example.com",
  accessToken: "provider-access-token",
  groups: ["orders-staff"],
  expiresAt: Date.now() + 3_600_000,
};

const createFixture = () => ({
  deps: {
    sessions: {
      find: async (sessionId: string) =>
        sessionId === session.sessionId ? session : undefined,
    },
    orders: {
      findById: async () => undefined,
      listForTenant: async () => [],
      save: async () => {},
    },
  },
});

const entriesOf = (catalog: unknown): ReadonlyArray<Record<string, string>> => {
  const value = typeof catalog === "function" ? catalog() : catalog;
  return Array.isArray(value) ? value : [];
};

describe("acceptance: the platform probe and the order stream", () => {
  it("answers the probe without a session", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/healthz");

    expect(response.status).toBe(200);
  });

  it("refuses the stream to a caller with no session, before any stream starts", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/api/order-events", {
      headers: { accept: "text/event-stream" },
    });

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type") ?? "").not.toContain(
      "text/event-stream",
    );
  });

  it("shows the probe as public and the stream as not", async () => {
    const { catalog } = createApp(createFixture().deps);
    const entries = entriesOf(catalog);

    const withoutSigningIn = entries
      .filter((entry) => String(entry.access) === "public")
      .map((entry) => `${String(entry.method).toUpperCase()} ${entry.path}`)
      .sort();
    expect(withoutSigningIn).toEqual(["GET /api/config", "GET /healthz"]);

    const stream = entries.find((entry) => entry.path === "/api/order-events");
    expect(stream).toBeDefined();
    expect(String(stream?.access)).not.toBe("public");
  });
});
