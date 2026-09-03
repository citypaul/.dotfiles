import { describe, expect, it } from "vitest";
import { quoteOrder, type Order } from "./index";

const order = (overrides: Partial<Order> = {}): Order => ({
  id: "order-1",
  region: "GB",
  lines: [{ sku: "mug", description: "Mug", unitPricePence: 1000, quantity: 1 }],
  ...overrides,
});

const quote = (input: Order) => {
  const result = quoteOrder(input);
  if (!result.ok) throw new Error(`expected a quote, got: ${result.error}`);
  return result.quote;
};

describe("acceptance: VAT", () => {
  it.each([
    ["IE", 437, 2336],
    ["DE", 361, 2260],
    ["FR", 380, 2279],
  ])("charges %s VAT on goods plus delivery", (region, taxPence, totalPence) => {
    expect(quote(order({ region }))).toMatchObject({ shippingPence: 899, taxPence, totalPence });
  });

  it("accepts a region code in any letter case", () => {
    expect(quote(order({ region: "ie" })).taxPence).toBe(437);
  });

  it("turns away a region it does not ship to", () => {
    expect(quoteOrder(order({ region: "US" }))).toEqual({ ok: false, error: "We do not ship to US" });
  });

  it("rounds VAT to the nearest penny", () => {
    const pennies = (unitPricePence: number) =>
      quote(order({ lines: [{ sku: "p", description: "Penny sweet", unitPricePence, quantity: 1 }] }));
    expect(pennies(3)).toMatchObject({ taxPence: 80, totalPence: 482 });
    expect(pennies(4)).toMatchObject({ taxPence: 81, totalPence: 484 });
  });
});
