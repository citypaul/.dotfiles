// Hidden acceptance test: GET /api/me and POST /api/orders.
//
// Tolerant on purpose. The refusal status for an unauthenticated mutation may be
// 401 or a request-policy refusal, and a mutation with a valid session may be
// refused outright (a missing CSRF token, a body that fails validation) — what is
// pinned is that a caller with no session causes no effect, that the reads answer
// the signed-in caller, that a tenant named in the body never becomes the order's
// tenant, and that both new entry points show up in the app's catalog with the
// public set unchanged.
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

const session = {
  sessionId: "sess-a",
  userId: "user-1",
  tenantId: "tenant-a",
  email: "ada@example.com",
  accessToken: "provider-access-token",
  groups: ["orders-staff"],
  expiresAt: Date.now() + 3_600_000,
};

const createFixture = () => {
  const stored: Order[] = [
    {
      id: "order-1",
      tenantId: "tenant-a",
      placedBy: "user-1",
      reference: "REF-A-1",
      totalPence: 1200,
      status: "placed",
    },
  ];
  const saved: Order[] = [];
  return {
    stored,
    saved,
    deps: {
      sessions: {
        find: async (sessionId: string) =>
          sessionId === session.sessionId ? session : undefined,
      },
      orders: {
        findById: async (orderId: string) =>
          stored.find((order) => order.id === orderId),
        listForTenant: async (tenantId: string) =>
          stored.filter((order) => order.tenantId === tenantId),
        save: async (order: Order) => {
          stored.push(order);
          saved.push(order);
        },
      },
    },
  };
};

const entriesOf = (catalog: unknown): ReadonlyArray<Record<string, string>> => {
  const value = typeof catalog === "function" ? catalog() : catalog;
  return Array.isArray(value) ? value : [];
};

const orderBody = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({ items: [{ sku: "SKU-1", quantity: 2 }], ...extra });

describe("acceptance: the web app's own endpoints", () => {
  it("tells a signed-in caller who they are", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/api/me", {
      headers: { cookie: "__Host-session=sess-a" },
    });

    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain("user-1");
    expect(body).toContain("tenant-a");
  });

  it("refuses to say who a caller with no session is", async () => {
    const { app } = createApp(createFixture().deps);

    const response = await app.request("/api/me");

    expect(response.status).toBe(401);
  });

  it("places no order for a caller with no session", async () => {
    const fixture = createFixture();
    const { app } = createApp(fixture.deps);

    const response = await app.request("/api/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost",
        "sec-fetch-site": "same-origin",
      },
      body: orderBody(),
    });

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
    expect(fixture.saved).toEqual([]);
  });

  it("never places an order for a tenant named in the request body", async () => {
    const fixture = createFixture();
    const { app } = createApp(fixture.deps);

    await app.request("/api/orders", {
      method: "POST",
      headers: {
        cookie: "__Host-session=sess-a",
        "content-type": "application/json",
        origin: "http://localhost",
        "sec-fetch-site": "same-origin",
      },
      body: orderBody({ tenantId: "tenant-b", userId: "user-9" }),
    });

    const forged = fixture.saved.filter((order) =>
      JSON.stringify(order).includes("tenant-b"),
    );
    expect(forged).toEqual([]);
  });

  it("lists both new entry points, neither of them callable without signing in", async () => {
    const { catalog } = createApp(createFixture().deps);
    const entries = entriesOf(catalog);

    const withoutSigningIn = entries
      .filter((entry) => String(entry.access) === "public")
      .map((entry) => `${String(entry.method).toUpperCase()} ${entry.path}`);
    expect(withoutSigningIn).toEqual(["GET /api/config"]);

    expect(entries.map((entry) => entry.path)).toContain("/api/me");
    expect(
      entries.filter(
        (entry) =>
          entry.path === "/api/orders" &&
          String(entry.method).toUpperCase() === "POST",
      ),
    ).toHaveLength(1);
  });
});
