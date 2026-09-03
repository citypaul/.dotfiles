import { describe, expect, it } from "vitest";
import {
  deliveryPence,
  discountPence,
  qualifiesForBulkDiscount,
  qualifiesForFreeDelivery,
  quoteOrder,
  subtotalPence,
  type Order,
  type OrderLine,
} from "./quote";

const line = (overrides: Partial<OrderLine> = {}): OrderLine => ({
  sku: "mug",
  unitPence: 1000,
  quantity: 1,
  ...overrides,
});

const order = (overrides: Partial<Order> = {}): Order => ({
  lines: [line()],
  region: "mainland",
  loyaltyYears: 0,
  ...overrides,
});

describe("subtotal", () => {
  it("adds unit price times quantity over every line", () => {
    const o = order({ lines: [line({ unitPence: 250, quantity: 3 }), line({ unitPence: 1999, quantity: 1 })] });
    expect(subtotalPence(o)).toBe(2749);
  });

  it("is zero for an empty basket", () => {
    expect(subtotalPence(order({ lines: [] }))).toBe(0);
  });
});

describe("free delivery", () => {
  it("starts at £50 exactly", () => {
    expect(qualifiesForFreeDelivery(order({ lines: [line({ unitPence: 5000 })] }))).toBe(true);
    expect(qualifiesForFreeDelivery(order({ lines: [line({ unitPence: 4999 })] }))).toBe(false);
  });
});

describe("bulk discount", () => {
  it("starts at £50 exactly", () => {
    expect(qualifiesForBulkDiscount(order({ lines: [line({ unitPence: 5000 })] }))).toBe(true);
    expect(qualifiesForBulkDiscount(order({ lines: [line({ unitPence: 4999 })] }))).toBe(false);
  });
});

describe("discount", () => {
  it("gives nothing to new customers on a small basket", () => {
    expect(discountPence(order({ loyaltyYears: 0 }))).toBe(0);
  });

  it("gives 5% after more than two years and 10% after more than five", () => {
    expect(discountPence(order({ loyaltyYears: 2 }))).toBe(0);
    expect(discountPence(order({ loyaltyYears: 3 }))).toBe(50);
    expect(discountPence(order({ loyaltyYears: 5 }))).toBe(50);
    expect(discountPence(order({ loyaltyYears: 6 }))).toBe(100);
  });

  it("adds 3% on a bulk basket", () => {
    expect(discountPence(order({ lines: [line({ unitPence: 5000 })], loyaltyYears: 3 }))).toBe(400);
  });

  it("adds 10% for WELCOME10, matched exactly", () => {
    expect(discountPence(order({ promoCode: "WELCOME10" }))).toBe(100);
    expect(discountPence(order({ promoCode: "welcome10" }))).toBe(0);
    expect(discountPence(order({ promoCode: "SUMMER" }))).toBe(0);
  });

  it("never exceeds 20%", () => {
    expect(discountPence(order({ lines: [line({ unitPence: 10000 })], loyaltyYears: 9, promoCode: "WELCOME10" }))).toBe(2000);
  });

  it("rounds down to the penny", () => {
    expect(discountPence(order({ lines: [line({ unitPence: 1999 })], loyaltyYears: 3 }))).toBe(99);
  });
});

describe("delivery", () => {
  it("is £3.99 to the mainland and free from £50", () => {
    expect(deliveryPence(order({ region: "mainland" }))).toBe(399);
    expect(deliveryPence(order({ region: "mainland", lines: [line({ unitPence: 5000 })] }))).toBe(0);
  });

  it("is £8.99 to the highlands, reduced to £4.99 from £50", () => {
    expect(deliveryPence(order({ region: "highlands" }))).toBe(899);
    expect(deliveryPence(order({ region: "highlands", lines: [line({ unitPence: 5000 })] }))).toBe(499);
  });

  it("is £12.99 to the islands whatever the basket", () => {
    expect(deliveryPence(order({ region: "islands" }))).toBe(1299);
    expect(deliveryPence(order({ region: "islands", lines: [line({ unitPence: 9000 })] }))).toBe(1299);
  });
});

describe("quote", () => {
  it("totals subtotal minus discount plus delivery", () => {
    const o = order({ lines: [line({ unitPence: 2000, quantity: 3 })], region: "highlands", loyaltyYears: 4 });
    expect(quoteOrder(o)).toEqual({ subtotalPence: 6000, discountPence: 480, deliveryPence: 499, totalPence: 6019 });
  });

  it("still charges delivery on an empty basket", () => {
    expect(quoteOrder(order({ lines: [] }))).toEqual({ subtotalPence: 0, discountPence: 0, deliveryPence: 399, totalPence: 399 });
  });
});
