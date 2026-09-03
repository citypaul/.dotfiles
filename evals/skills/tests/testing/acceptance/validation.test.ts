import { describe, expect, it } from "vitest";
import { quoteOrder, type Line, type Order } from "./index";

const line = (overrides: Partial<Line> = {}): Line => ({
  sku: "mug",
  description: "Mug",
  unitPricePence: 100,
  quantity: 1,
  ...overrides,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "order-1",
  region: "GB",
  lines: [line()],
  ...overrides,
});

const quote = (input: Order) => {
  const result = quoteOrder(input);
  if (!result.ok) throw new Error(`expected a quote, got: ${result.error}`);
  return result.quote;
};

describe("acceptance: validation, discounts and delivery", () => {
  it("rejects input that is not an order", () => {
    expect(quoteOrder("nope")).toMatchObject({ ok: false, error: expect.stringMatching(/^Invalid order/) });
    expect(quoteOrder(order({ lines: [] }))).toMatchObject({ ok: false, error: expect.stringMatching(/^Invalid order/) });
    expect(quoteOrder(order({ lines: [line({ unitPricePence: -1 })] }))).toMatchObject({ ok: false, error: expect.stringMatching(/^Invalid order/) });
  });

  it("rejects a repeated SKU", () => {
    expect(quoteOrder(order({ lines: [line(), line({ description: "Another mug" })] }))).toEqual({
      ok: false,
      error: "Duplicate SKU in order",
    });
  });

  it("sends a quantity over fifty to sales but accepts exactly fifty", () => {
    expect(quoteOrder(order({ lines: [line({ quantity: 51 })] }))).toEqual({
      ok: false,
      error: "Quantity over 50 for mug; bulk orders go through sales",
    });
    expect(quote(order({ lines: [line({ quantity: 50 })] }))).toMatchObject({ subtotalPence: 5000, shippingPence: 0, totalPence: 6000 });
  });

  it("applies both discount tiers at their thresholds", () => {
    expect(quote(order({ lines: [line({ unitPricePence: 5000, quantity: 2 })] })).discountPence).toBe(500);
    expect(quote(order({ lines: [line({ unitPricePence: 12500, quantity: 2 })] })).discountPence).toBe(2500);
    expect(quote(order({ lines: [line({ unitPricePence: 12499, quantity: 2 })] })).discountPence).toBe(1250);
  });

  it("never makes international delivery free", () => {
    expect(quote(order({ region: "IE", lines: [line({ unitPricePence: 5000, quantity: 2 })] }))).toMatchObject({
      discountPence: 500,
      shippingPence: 899,
      taxPence: 2392,
      totalPence: 12791,
    });
  });

  it("writes the receipt customers see", () => {
    expect(quote(order({ lines: [line({ unitPricePence: 1200 })] })).receipt).toBe(
      ["1 × Mug @ £12.00", "Subtotal £12.00", "Shipping £3.99", "VAT £3.20", "Total £19.19"].join("\n"),
    );
  });
});
