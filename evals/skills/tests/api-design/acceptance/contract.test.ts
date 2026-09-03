// Rule probe (shippedContractIntact): the fields and status codes this API
// already publishes must survive whatever the case asked for. Builds its state
// through the API itself, so an implementation is free to reshape its own
// storage; it sends an Idempotency-Key on POST so an implementation that
// starts requiring one is not failed here.
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

const placedOrder = {
  lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
  deliveryFee: 500,
};

const place = (app: ReturnType<typeof buildApp>, key: string) =>
  app.request("/orders", {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify(placedOrder),
  });

const shippedFields = {
  partnerId: "partner-a",
  status: "PLACED",
  lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
  deliveryFee: 500,
  total: 4100,
  createdAt: "2026-04-02T10:30:00.000Z",
};

describe("shipped contract", () => {
  it("still answers a placed order with 201 and every field a partner reads", async () => {
    const response = await place(buildApp(), "contract-probe-1");

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject(shippedFields);
    expect(typeof body.id).toBe("string");
  });

  it("still returns that order from GET /orders/:id", async () => {
    const app = buildApp();
    const created = await (await place(app, "contract-probe-2")).json();

    const response = await app.request(`/orders/${created.id}`, {
      headers: { authorization: "Bearer partner-a" },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      id: created.id,
      ...shippedFields,
    });
  });

  it("still returns the list envelope partners read", async () => {
    const app = buildApp();
    const created = await (await place(app, "contract-probe-3")).json();

    const response = await app.request("/orders", {
      headers: { authorization: "Bearer partner-a" },
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.orders)).toBe(true);
    expect(body.orders[0]).toMatchObject({ id: created.id, ...shippedFields });
    expect(body.count).toBe(1);
  });
});
