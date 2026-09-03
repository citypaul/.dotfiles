import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { Charge, PaymentsClient } from "./lib/payments";

const basket = () => ({
  customerId: "cus_2048",
  email: "linus@example.com",
  cardToken: "tok_live_3333",
  lines: [
    { sku: "MUG-1", quantity: 1, unitPricePence: 899 },
    { sku: "TEA-9", quantity: 2, unitPricePence: 350 },
  ],
});

const app = (payments: PaymentsClient) =>
  createApp({ payments, newOrderId: () => "ord_2048" });

const captures: PaymentsClient = {
  charge: async (charge: Charge) => ({
    paymentId: "pay_2048",
    capturedPence: charge.amountPence,
  }),
};

const declines: PaymentsClient = {
  charge: async () => {
    throw new Error("card_declined");
  },
};

describe("acceptance: checkout still behaves as specified", () => {
  it("charges the basket total and returns the order", async () => {
    const { router } = app(captures);

    const response = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket(),
    });

    expect(response).toEqual({
      status: 201,
      body: { orderId: "ord_2048", totalPence: 1599, paymentId: "pay_2048" },
    });
  });

  it("answers 502 when the card is declined and 400 for an empty basket", async () => {
    const { router } = app(declines);

    const declined = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket(),
    });
    const empty = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: { ...basket(), lines: [] },
    });

    expect(declined).toEqual({
      status: 502,
      body: { error: "payment_failed" },
    });
    expect(empty).toEqual({ status: 400, body: { error: "invalid_basket" } });
  });
});
