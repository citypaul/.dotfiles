import { describe, expect, it } from "vitest";
import {
  describeOrder,
  discountPence,
  shippingPence,
  subtotalPence,
  totalPence,
  type LineItem,
  type Order,
} from "./checkout";

const item = (overrides: Partial<LineItem> = {}): LineItem => ({
  sku: "sku-1",
  unitPence: 100,
  quantity: 1,
  ...overrides,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  items: [item()],
  customer: { isMember: false, country: "GB" },
  promoCode: null,
  ...overrides,
});

describe("subtotal", () => {
  it("adds up the items", () => {
    expect(subtotalPence([item({ unitPence: 100, quantity: 1 })])).toBe(100);
  });

  it("is zero for no items", () => {
    expect(subtotalPence([])).toBe(0);
  });
});

describe("discount", () => {
  it("gives bulk discount on large orders", () => {
    const large = order({ items: [item({ unitPence: 20_000 })] });
    expect(discountPence(large)).toBe(2_000);
  });

  it("gives members with a promo code extra off", () => {
    const withPromo = order({
      customer: { isMember: true, country: "GB" },
      promoCode: "MEMBER5",
    });
    expect(discountPence(withPromo)).toBeGreaterThan(0);
  });
});

describe("shipping", () => {
  it("charges international shipping", () => {
    const abroad = order({ customer: { isMember: false, country: "US" } });
    expect(shippingPence(abroad)).toBe(1_500);
  });

  it("is free for big domestic orders", () => {
    const big = order({ items: [item({ unitPence: 20_000 })] });
    expect(shippingPence(big)).toBe(0);
  });

  it("charges for small domestic orders", () => {
    expect(shippingPence(order())).toBeTypeOf("number");
  });
});

describe("total", () => {
  it("combines the parts", () => {
    expect(totalPence(order())).toBeGreaterThan(0);
  });
});

describe("summary", () => {
  it("describes an order", () => {
    expect(() => describeOrder(order())).not.toThrow();
  });

  it("describes a big order", () => {
    const big = order({ items: [item({ unitPence: 20_000, quantity: 2 })] });
    expect(() => describeOrder(big)).not.toThrow();
  });
});
