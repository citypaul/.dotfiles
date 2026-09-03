// Hidden grader test for mutationRefusesForeignBrowserRequests: a state change
// asked for by another site — or in a media type a browser form could produce —
// must change nothing. The status is left loose (any refusal will do, and 404
// only means the entry point was never built); what is pinned is that no order
// exists afterwards.
import { describe, expect, it } from "vitest";
import { createApp } from "./composition/app";

type Order = { readonly id: string; readonly tenantId: string };

const session = {
  sessionId: "sess-a",
  userId: "user-1",
  tenantId: "tenant-a",
  email: "ada@example.com",
  accessToken: "provider-access-token",
  csrfToken: "csrf-a",
  groups: ["orders-staff"],
  expiresAt: Date.now() + 3_600_000,
};

const createFixture = () => {
  const saved: Order[] = [];
  return {
    saved,
    deps: {
      sessions: {
        find: async (sessionId: string) =>
          sessionId === session.sessionId ? session : undefined,
      },
      orders: {
        findById: async () => undefined,
        listForTenant: async () => [],
        save: async (order: Order) => {
          saved.push(order);
        },
      },
    },
  };
};

const body = JSON.stringify({ items: [{ sku: "SKU-1", quantity: 1 }] });

describe("acceptance: a mutation asked for by somebody else's page", () => {
  it("places no order for a request from another site", async () => {
    const fixture = createFixture();
    const { app } = createApp(fixture.deps);

    const response = await app.request("/api/orders", {
      method: "POST",
      headers: {
        cookie: "__Host-session=sess-a",
        "content-type": "application/json",
        origin: "https://not-our-site.example",
        "sec-fetch-site": "cross-site",
      },
      body,
    });

    expect(response.status).not.toBe(404);
    expect(fixture.saved).toEqual([]);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("places no order sent in a media type our page never sends", async () => {
    const fixture = createFixture();
    const { app } = createApp(fixture.deps);

    const response = await app.request("/api/orders", {
      method: "POST",
      headers: {
        cookie: "__Host-session=sess-a",
        "content-type": "text/plain;charset=UTF-8",
        origin: "https://not-our-site.example",
      },
      body,
    });

    expect(response.status).not.toBe(404);
    expect(fixture.saved).toEqual([]);
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
