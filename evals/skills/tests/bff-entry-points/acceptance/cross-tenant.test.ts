// Hidden acceptance test: one tenant must learn nothing about another tenant's
// orders, through either the single-order read or the list.
import { describe, expect, it } from "vitest";
import { createApp } from "./composition/app";

type Order = {
  readonly id: string;
  readonly tenantId: string;
  readonly placedBy: string;
  readonly reference: string;
  readonly totalPence: number;
  readonly status: string;
};

const sessions = [
  {
    sessionId: "sess-a",
    userId: "user-1",
    tenantId: "tenant-a",
    email: "ada@example.com",
    accessToken: "provider-access-token",
    groups: ["orders-staff"],
    expiresAt: Date.now() + 3_600_000,
  },
  {
    sessionId: "sess-b",
    userId: "user-2",
    tenantId: "tenant-b",
    email: "bo@partner.example.com",
    accessToken: "provider-access-token-2",
    groups: ["orders-staff"],
    expiresAt: Date.now() + 3_600_000,
  },
];

const createFixture = () => {
  const stored: Order[] = [
    {
      id: "order-a",
      tenantId: "tenant-a",
      placedBy: "user-1",
      reference: "REF-A-1",
      totalPence: 1200,
      status: "placed",
    },
    {
      id: "order-b",
      tenantId: "tenant-b",
      placedBy: "user-2",
      reference: "REF-B-1",
      totalPence: 900,
      status: "placed",
    },
  ];
  return {
    stored,
    deps: {
      sessions: {
        find: async (sessionId: string) =>
          sessions.find((session) => session.sessionId === sessionId),
      },
      orders: {
        findById: async (orderId: string) =>
          stored.find((order) => order.id === orderId),
        listForTenant: async (tenantId: string) =>
          stored.filter((order) => order.tenantId === tenantId),
        save: async (order: Order) => {
          stored.push(order);
        },
      },
    },
  };
};

const as = (sessionId: string) => ({
  headers: { cookie: `__Host-session=${sessionId}` },
});

describe("acceptance: one tenant's orders stay out of another's reach", () => {
  it("still shows a caller their own order", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/api/orders/order-a", as("sess-a"));

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("REF-A-1");
  });

  it("answers a foreign order id exactly as it answers an unknown one", async () => {
    const { app } = createApp(createFixture().deps);

    const foreign = await app.request("/api/orders/order-a", as("sess-b"));
    const unknown = await app.request("/api/orders/order-zzz", as("sess-b"));

    expect(foreign.status).toBe(404);
    expect(foreign.status).toBe(unknown.status);
    const foreignBody = await foreign.text();
    expect(foreignBody).toBe(await unknown.text());
    expect(foreignBody).not.toContain("REF-A-1");
  });

  it("will not point the list at another tenant", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request(
      "/api/orders?tenantId=tenant-a",
      as("sess-b"),
    );

    expect(response.status).toBeLessThan(500);
    expect(await response.text()).not.toContain("REF-A-1");
  });

  it("still lists the caller's own orders", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/api/orders", as("sess-b"));

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("REF-B-1");
    expect(body).not.toContain("REF-A-1");
  });

  it("makes nothing newly callable without signing in", async () => {
    const { catalog } = createApp(createFixture().deps);
    const entries = typeof catalog === "function" ? catalog() : catalog;

    const withoutSigningIn = (Array.isArray(entries) ? entries : [])
      .filter((entry: Record<string, string>) => String(entry.access) === "public")
      .map(
        (entry: Record<string, string>) =>
          `${String(entry.method).toUpperCase()} ${entry.path}`,
      );

    expect(withoutSigningIn).toEqual(["GET /api/config"]);
  });
});
