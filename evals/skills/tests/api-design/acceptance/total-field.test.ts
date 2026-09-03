// Case 3 behaviour: the order total is published under the name partners asked
// for, everywhere an order is returned. State is built through the API, so how
// the service stores an order is its own business.
import { describe, expect, it } from "vitest";
import { createApp, createOrderStore } from "./index";

const buildApp = () => {
  let counter = 0;
  return createApp({
    orders: createOrderStore([]),
    newId: () => `ord_${++counter}`,
    now: () => new Date("2026-04-02T10:30:00.000Z"),
  });
};

const headers = (key: string) => ({
  authorization: "Bearer partner-a",
  "content-type": "application/json",
  "idempotency-key": key,
});

const place = (app: ReturnType<typeof buildApp>, key: string) =>
  app.request("/orders", {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({
      lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
      deliveryFee: 500,
    }),
  });

describe("acceptance: the total says what it includes", () => {
  it("names it on a placed order", async () => {
    const response = await place(buildApp(), "total-probe-1");

    expect(response.status).toBe(201);
    expect((await response.json()).totalIncludingDeliveryPence).toBe(4100);
  });

  it("names it on a single order", async () => {
    const app = buildApp();
    const created = await (await place(app, "total-probe-2")).json();

    const response = await app.request(`/orders/${created.id}`, {
      headers: { authorization: "Bearer partner-a" },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).totalIncludingDeliveryPence).toBe(4100);
  });

  it("names it on the list", async () => {
    const app = buildApp();
    await place(app, "total-probe-3");

    const response = await app.request("/orders", {
      headers: { authorization: "Bearer partner-a" },
    });

    expect(response.status).toBe(200);
    expect((await response.json()).orders[0].totalIncludingDeliveryPence).toBe(
      4100,
    );
  });
});
