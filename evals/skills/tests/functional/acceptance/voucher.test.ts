import { describe, expect, it } from "vitest";
import { addLine, applyVoucher, basketTotal, createBasket } from "./basket";

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const groceries = () =>
  deepFreeze(
    addLine(
      addLine(createBasket("GBP"), "apple", "Apple", 45, 4),
      "milk",
      "Milk",
      120,
      1,
    ),
  );

describe("acceptance: applyVoucher", () => {
  it("halves that sku's unit price, rounding down, and the total follows", () => {
    const after = applyVoucher(groceries(), "HALF-apple");

    expect(basketTotal(after)).toBe(22 * 4 + 120);
    expect(
      after.lines.map((line) => [line.sku, line.unitPence, line.quantity]),
    ).toEqual([
      ["apple", 22, 4],
      ["milk", 120, 1],
    ]);
  });

  it("halves again when the same code is applied twice", () => {
    const after = applyVoucher(
      applyVoucher(groceries(), "HALF-milk"),
      "HALF-milk",
    );

    expect(basketTotal(after)).toBe(45 * 4 + 30);
  });

  it("leaves the basket as it was for a sku not in the basket", () => {
    expect(applyVoucher(groceries(), "HALF-bread")).toEqual(groceries());
  });

  // "a code in any other form" says nothing about case, so `half-apple` is
  // not asserted: an implementation that reads the prefix case-insensitively
  // is a legitimate design choice, not a behaviour failure.
  it("leaves the basket as it was for a code in another form", () => {
    expect(applyVoucher(groceries(), "TENOFF")).toEqual(groceries());
    expect(applyVoucher(groceries(), "HALFapple")).toEqual(groceries());
  });

  it("does not write into the basket it was given", () => {
    const before = groceries();
    const snapshot = JSON.stringify(before);

    applyVoucher(before, "HALF-apple");

    expect(JSON.stringify(before)).toBe(snapshot);
    expect(basketTotal(before)).toBe(45 * 4 + 120);
  });
});
