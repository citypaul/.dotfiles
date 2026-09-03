import { describe, expect, it } from "vitest";
import { quoteOrder, type Order } from "./index";

// Drives the package only through its public interface so any legitimate
// internal reorganisation the agent chose still passes.
const line = (unitPricePence: number, quantity = 1) => ({
  sku: `sku-${unitPricePence}-${quantity}`,
  description: "Item",
  unitPricePence,
  quantity,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "order-1",
  region: "GB",
  lines: [line(1200)],
  ...overrides,
});

const quote = (input: Order) => {
  const result = quoteOrder(input);
  if (!result.ok) throw new Error(`expected a quote, got: ${result.error}`);
  return result.quote;
};

describe("acceptance: pricing a basket", () => {
  it("prices a straightforward GB basket with delivery and VAT", () => {
    expect(quote(order())).toMatchObject({
      subtotalPence: 1200,
      discountPence: 0,
      shippingPence: 399,
      taxPence: 320,
      totalPence: 1919,
    });
  });

  it("gives 5% from exactly £100 of goods and nothing just below", () => {
    expect(quote(order({ lines: [line(5000, 2)] })).discountPence).toBe(500);
    expect(quote(order({ lines: [line(3333, 3)] })).discountPence).toBe(0);
  });

  it("gives 10% from exactly £250 of goods", () => {
    expect(quote(order({ lines: [line(12500, 2)] })).discountPence).toBe(2500);
  });

  it("applies a promo code to a small basket", () => {
    expect(quote(order({ lines: [line(1000)], promoCode: "WELCOME10" }))).toMatchObject({
      discountPence: 100,
      totalPence: 1559,
    });
  });

  it("takes the better of the tier and the promo code, never both", () => {
    expect(quote(order({ lines: [line(12500, 2)], promoCode: "SPRING15" })).discountPence).toBe(3750);
    expect(quote(order({ lines: [line(12500, 2)], promoCode: "WELCOME10" })).discountPence).toBe(2500);
  });

  it("rejects a promo code it does not recognise", () => {
    expect(quoteOrder(order({ promoCode: "BOGUS" }))).toEqual({ ok: false, error: "Unknown promo code BOGUS" });
  });

  it("makes GB delivery free from exactly £50 of goods after discount", () => {
    expect(quote(order({ lines: [line(5000)] })).shippingPence).toBe(0);
    expect(quote(order({ lines: [line(4999)] })).shippingPence).toBe(399);
  });
});
