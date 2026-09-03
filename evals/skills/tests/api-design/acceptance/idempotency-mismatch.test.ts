// Rule probe (replayWithDifferentBodyRejected): "If parameters differ on retry
// with the same key, return an error." A reused key carrying a different order
// must not silently replay the first one, and must not quietly place a second.
import { describe, expect, it } from "vitest";
import { createApp, createOrderStore, type Order } from "./index";

const buildApp = () => {
  let counter = 0;
  return createApp({
    orders: createOrderStore([]),
    newId: () => `ord_${++counter}`,
    now: () => new Date("2026-04-02T10:30:00.000Z"),
  });
};

const headers = { authorization: "Bearer partner-a", "content-type": "application/json", "idempotency-key": "attempt-9" };

describe("a reused key that carries a different order", () => {
  it("is refused rather than replayed or placed again", async () => {
    const app = buildApp();

    const first = await app.request("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({
        lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
        deliveryFee: 500,
      }),
    });
    expect(first.status).toBe(201);
    const firstBody = await first.json();

    const second = await app.request("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({
        lines: [{ sku: "HAMMER-2", quantity: 30, unitPrice: 1200 }],
        deliveryFee: 500,
      }),
    });

    expect(second.status).toBeGreaterThanOrEqual(400);
    expect(second.status).toBeLessThan(500);

    const list = await app.request("/orders", {
      headers: { authorization: "Bearer partner-a" },
    });
    const orders = (await list.json()).orders as ReadonlyArray<Order>;
    expect(orders).toHaveLength(1);
    expect(orders[0]).toMatchObject({ id: firstBody.id });
  });
});
