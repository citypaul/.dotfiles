import { describe, expect, it } from "vitest";
import { createApp, createOrderStore, type Order } from "./index";

const seededOrder: Order = {
  id: "ord_1",
  partnerId: "partner-a",
  status: "PLACED",
  lines: [{ sku: "SPANNER-8", quantity: 2, unitPrice: 450 }],
  deliveryFee: 299,
  total: 1199,
  createdAt: "2026-04-01T09:00:00.000Z",
};

const buildApp = () => {
  let counter = 0;
  return createApp({
    orders: createOrderStore([seededOrder]),
    newId: () => `ord_${++counter + 1}`,
    now: () => new Date("2026-04-02T10:30:00.000Z"),
  });
};

const partnerA = { authorization: "Bearer partner-a" };

describe("orders", () => {
  it("lists the orders belonging to the calling partner", async () => {
    const response = await buildApp().request("/orders", {
      headers: partnerA,
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orders).toHaveLength(1);
    expect(body.orders[0]).toMatchObject(seededOrder);
    expect(body.count).toBe(1);
  });

  it("returns a single order", async () => {
    const response = await buildApp().request("/orders/ord_1", {
      headers: partnerA,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject(seededOrder);
  });

  it("places an order and totals its lines plus delivery", async () => {
    const response = await buildApp().request("/orders", {
      method: "POST",
      headers: {
        ...partnerA,
        "content-type": "application/json",
        "idempotency-key": "app-attempt-7",
      },
      body: JSON.stringify({
        lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
        deliveryFee: 500,
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      id: "ord_2",
      partnerId: "partner-a",
      status: "PLACED",
      deliveryFee: 500,
      total: 4100,
      createdAt: "2026-04-02T10:30:00.000Z",
    });
  });
});
