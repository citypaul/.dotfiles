import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { Charge, PaymentsClient } from "./lib/payments";

const createPayments = (
  onCharge: (
    charge: Charge,
  ) => Promise<{ paymentId: string; capturedPence: number }>,
): PaymentsClient => ({ charge: onCharge });

const basket = () => ({
  customerId: "cus_101",
  email: "ada@example.com",
  cardToken: "tok_live_4242",
  lines: [
    { sku: "MUG-1", quantity: 2, unitPricePence: 899 },
    { sku: "TEA-9", quantity: 1, unitPricePence: 701 },
  ],
});

describe("POST /checkout", () => {
  it("charges the basket total and returns the order", async () => {
    const { router } = createApp({
      payments: createPayments(async (charge) => ({
        paymentId: "pay_1",
        capturedPence: charge.amountPence,
      })),
      newOrderId: () => "ord_1",
    });

    const response = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket(),
    });

    expect(response).toEqual({
      status: 201,
      body: { orderId: "ord_1", totalPence: 2499, paymentId: "pay_1" },
    });
  });

  it("answers 502 when the card is declined", async () => {
    const { router } = createApp({
      payments: createPayments(async () => {
        throw new Error("card_declined");
      }),
      newOrderId: () => "ord_2",
    });

    const response = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket(),
    });

    expect(response).toEqual({
      status: 502,
      body: { error: "payment_failed" },
    });
  });

  it("rejects a basket with no lines", async () => {
    const { router } = createApp({
      payments: createPayments(async () => ({
        paymentId: "pay_3",
        capturedPence: 0,
      })),
      newOrderId: () => "ord_3",
    });

    const response = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: { ...basket(), lines: [] },
    });

    expect(response).toEqual({
      status: 400,
      body: { error: "invalid_basket" },
    });
  });
});
