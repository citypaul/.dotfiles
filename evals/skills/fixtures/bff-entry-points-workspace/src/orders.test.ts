import { describe, expect, it } from "vitest";
import type { Order } from "./application/orders";
import { createApp } from "./composition/app";
import type { SessionRecord } from "./sessions";

const anOrder = (overrides: Partial<Order> = {}): Order => ({
  id: "order-1",
  tenantId: "tenant-a",
  placedBy: "user-1",
  reference: "REF-A-1",
  totalPence: 1200,
  status: "placed",
  ...overrides,
});

const aSession = (overrides: Partial<SessionRecord> = {}): SessionRecord => ({
  sessionId: "sess-a",
  userId: "user-1",
  tenantId: "tenant-a",
  email: "ada@example.com",
  accessToken: "provider-access-token",
  groups: ["orders-staff"],
  expiresAt: Date.now() + 3_600_000,
  ...overrides,
});

const createDeps = (
  orders: readonly Order[] = [anOrder()],
  sessions: readonly SessionRecord[] = [aSession()],
) => {
  const stored = [...orders];
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

describe("orders over HTTP", () => {
  it("gives a signed-in caller the order they asked for", async () => {
    const { app } = createApp(createDeps().deps);

    const response = await app.request("/api/orders/order-1", {
      headers: { cookie: "__Host-session=sess-a" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      order: { reference: "REF-A-1" },
    });
  });

  it("turns away a caller with no session", async () => {
    const { app } = createApp(createDeps().deps);

    const response = await app.request("/api/orders/order-1");

    expect(response.status).toBe(401);
  });

  it("says an unknown order is not there", async () => {
    const { app } = createApp(createDeps().deps);

    const response = await app.request("/api/orders/order-404", {
      headers: { cookie: "__Host-session=sess-a" },
    });

    expect(response.status).toBe(404);
  });
});
