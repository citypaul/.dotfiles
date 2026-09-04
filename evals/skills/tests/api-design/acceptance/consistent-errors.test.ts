// Case 2 behaviour: every failure the mobile app can hit comes back as a
// failure status with a body the app can branch on — one shape shared by all
// of them — and the happy path still works.
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

const headers = {
  authorization: "Bearer partner-a",
  "content-type": "application/json",
};

const isClientError = (status: number) => status >= 400 && status < 500;
const keysOf = (body: unknown) =>
  typeof body === "object" && body !== null
    ? Object.entries(body as Record<string, unknown>)
        .filter(([, value]) => typeof value === "string")
        .map(([key]) => key)
    : [];

describe("acceptance: failures the mobile app can branch on", () => {
  it("refuses an order with no lines instead of answering 200", async () => {
    const response = await buildApp().request("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({ lines: [] }),
    });

    expect(isClientError(response.status)).toBe(true);
  });

  it("does not take the request down when the body is not JSON", async () => {
    const response = await buildApp().request("/orders", {
      method: "POST",
      headers,
      body: "{ this is not json",
    });

    expect(isClientError(response.status)).toBe(true);
  });

  it("answers an unknown order with 404", async () => {
    const response = await buildApp().request("/orders/ord_nope", { headers });

    expect(response.status).toBe(404);
  });

  it("gives every failure the same readable shape", async () => {
    const app = buildApp();
    const failures = await Promise.all([
      app.request("/orders", { method: "POST", headers, body: JSON.stringify({ lines: [] }) }),
      app.request("/orders/ord_nope", { headers }),
      app.request("/orders", { headers: { "content-type": "application/json" } }),
    ]);

    const bodies = await Promise.all(failures.map((response) => response.json()));
    const shared = bodies
      .map(keysOf)
      .reduce((common, keys) => common.filter((key) => keys.includes(key)));

    expect(failures.map((response) => isClientError(response.status))).toEqual([true, true, true]);
    expect(shared.length).toBeGreaterThan(0);
  });

  it("still places a valid order", async () => {
    const response = await buildApp().request("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({
        lines: [{ sku: "HAMMER-2", quantity: 3, unitPrice: 1200 }],
        deliveryFee: 500,
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ total: 4100 });
  });
});
