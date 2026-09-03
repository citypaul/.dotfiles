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

describe("acceptance: pricing behaviour is exactly what it was", () => {
  it("subtotal is unit price times quantity over every line, zero when empty", () => {
    expect(subtotalPence(order({ lines: [line({ unitPence: 250, quantity: 3 }), line({ unitPence: 1999, quantity: 2 })] }))).toBe(4748);
    expect(subtotalPence(order({ lines: [line({ quantity: 0 })] }))).toBe(0);
    expect(subtotalPence(order({ lines: [] }))).toBe(0);
  });

  it("free delivery and bulk discount both start at exactly £50", () => {
    const at = order({ lines: [line({ unitPence: 2500, quantity: 2 })] });
    const under = order({ lines: [line({ unitPence: 4999 })] });
    expect(qualifiesForFreeDelivery(at)).toBe(true);
    expect(qualifiesForFreeDelivery(under)).toBe(false);
    expect(qualifiesForBulkDiscount(at)).toBe(true);
    expect(qualifiesForBulkDiscount(under)).toBe(false);
  });

  it("loyalty tiers are strictly more than two and more than five years", () => {
    expect(discountPence(order({ loyaltyYears: 0 }))).toBe(0);
    expect(discountPence(order({ loyaltyYears: 2 }))).toBe(0);
    expect(discountPence(order({ loyaltyYears: 3 }))).toBe(50);
    expect(discountPence(order({ loyaltyYears: 5 }))).toBe(50);
    expect(discountPence(order({ loyaltyYears: 6 }))).toBe(100);
    expect(discountPence(order({ loyaltyYears: 40 }))).toBe(100);
  });

  it("bulk adds three points, WELCOME10 adds ten and is case-sensitive, the rate is capped at twenty", () => {
    expect(discountPence(order({ lines: [line({ unitPence: 5000 })] }))).toBe(150);
    expect(discountPence(order({ promoCode: "WELCOME10" }))).toBe(100);
    expect(discountPence(order({ promoCode: "welcome10" }))).toBe(0);
    expect(discountPence(order({ promoCode: "WELCOME10 " }))).toBe(0);
    expect(discountPence(order({ lines: [line({ unitPence: 10000 })], loyaltyYears: 6, promoCode: "WELCOME10" }))).toBe(2000);
    expect(discountPence(order({ lines: [line({ unitPence: 10000 })], loyaltyYears: 3, promoCode: "WELCOME10" }))).toBe(1800);
  });

  it("discount rounds down to the penny", () => {
    expect(discountPence(order({ lines: [line({ unitPence: 1999 })], loyaltyYears: 3 }))).toBe(99);
    expect(discountPence(order({ lines: [line({ unitPence: 1999 })], loyaltyYears: 6 }))).toBe(199);
    expect(discountPence(order({ lines: [line({ unitPence: 3333 })], promoCode: "WELCOME10" }))).toBe(333);
  });

  it("delivery: mainland £3.99 or free, highlands £8.99 or £4.99, islands always £12.99", () => {
    const big = [line({ unitPence: 5000 })];
    expect(deliveryPence(order({ region: "mainland" }))).toBe(399);
    expect(deliveryPence(order({ region: "mainland", lines: big }))).toBe(0);
    expect(deliveryPence(order({ region: "highlands" }))).toBe(899);
    expect(deliveryPence(order({ region: "highlands", lines: big }))).toBe(499);
    expect(deliveryPence(order({ region: "islands" }))).toBe(1299);
    expect(deliveryPence(order({ region: "islands", lines: big }))).toBe(1299);
  });

  it("quote is subtotal minus discount plus delivery, and an empty basket still pays delivery", () => {
    expect(quoteOrder(order({ lines: [line({ unitPence: 2000, quantity: 3 })], region: "highlands", loyaltyYears: 4 }))).toEqual({
      subtotalPence: 6000,
      discountPence: 480,
      deliveryPence: 499,
      totalPence: 6019,
    });
    expect(quoteOrder(order({ lines: [line({ unitPence: 1999 })], region: "islands", loyaltyYears: 3, promoCode: "WELCOME10" }))).toEqual({
      subtotalPence: 1999,
      discountPence: 299,
      deliveryPence: 1299,
      totalPence: 2999,
    });
    expect(quoteOrder(order({ lines: [], region: "mainland" }))).toEqual({ subtotalPence: 0, discountPence: 0, deliveryPence: 399, totalPence: 399 });
    expect(quoteOrder(order({ lines: [], region: "islands" }))).toEqual({ subtotalPence: 0, discountPence: 0, deliveryPence: 1299, totalPence: 1299 });
  });

  it("does not mutate the order it prices", () => {
    const lines = [line({ unitPence: 700, quantity: 2 })];
    const o = order({ lines, loyaltyYears: 3, promoCode: "WELCOME10" });
    const before = JSON.stringify(o);
    quoteOrder(o);
    expect(JSON.stringify(o)).toBe(before);
  });
});
