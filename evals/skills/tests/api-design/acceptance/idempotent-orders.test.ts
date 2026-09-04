// Case 1 behaviour: a resent order comes back as the order we already made,
// with the response the caller would have got the first time, and no second
// order exists. A fresh key still makes a new order.
import { describe, expect, it } from "vitest";
import { createApp, createOrderStore, type Order } from "./index";

const buildApp = (seed: ReadonlyArray<Order> = []) => {
  let counter = 0;
  return createApp({
    orders: createOrderStore(seed),
    newId: () => `ord_${++counter}`,
    now: () => new Date("2026-04-02T10:30:00.000Z"),
  });
};

const headers = (partner: string, key: string) => ({
  authorization: `Bearer ${partner}`,
  "content-type": "application/json",
  "idempotency-key": key,
});

const order = {
  lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
  deliveryFee: 500,
};

const place = (app: ReturnType<typeof buildApp>, key: string, body: unknown = order) =>
  app.request("/orders", {
    method: "POST",
    headers: headers("partner-a", key),
    body: JSON.stringify(body),
  });

const listOrders = async (app: ReturnType<typeof buildApp>) => {
  const response = await app.request("/orders", {
    headers: { authorization: "Bearer partner-a" },
  });
  return (await response.json()).orders as ReadonlyArray<Order>;
};

describe("acceptance: resending an order", () => {
  it("answers the resend with the order already made and makes no second one", async () => {
    const app = buildApp();

    const first = await place(app, "attempt-1");
    expect(first.status).toBe(201);
    const firstBody = await first.json();

    const resend = await place(app, "attempt-1");

    expect(resend.status).toBe(first.status);
    expect(await resend.json()).toEqual(firstBody);
    expect(await listOrders(app)).toHaveLength(1);
  });

  it("makes a new order when the key is a new one", async () => {
    const app = buildApp();

    const first = await place(app, "attempt-1");
    const second = await place(app, "attempt-2");

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect((await second.json()).id).not.toBe((await first.json()).id);
    expect(await listOrders(app)).toHaveLength(2);
  });
});
