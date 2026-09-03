import { describe, expect, it } from "vitest";
import { addLine, basketTotal, createBasket, mergeBaskets } from "./basket";

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const saved = () =>
  deepFreeze(
    addLine(addLine(createBasket("GBP"), "milk", "Milk", 120, 1), "apple", "Apple", 30, 4),
  );

const guest = () =>
  deepFreeze(
    addLine(addLine(createBasket("GBP"), "bread", "Loaf", 95, 2), "apple", "Apples", 32, 3),
  );

describe("acceptance: mergeBaskets", () => {
  it("joins every line, adds quantities for shared skus, keeps the first basket's name and price, and orders by sku", () => {
    const merged = mergeBaskets(saved(), guest());

    expect(merged.currency).toBe("GBP");
    expect(merged.lines).toEqual([
      { sku: "apple", name: "Apple", unitPence: 30, quantity: 7 },
      { sku: "bread", name: "Loaf", unitPence: 95, quantity: 2 },
      { sku: "milk", name: "Milk", unitPence: 120, quantity: 1 },
    ]);
    expect(basketTotal(merged)).toBe(30 * 7 + 95 * 2 + 120);
  });

  it("returns the first basket's lines, ordered, when the second is empty", () => {
    expect(mergeBaskets(saved(), deepFreeze(createBasket("GBP"))).lines.map((line) => line.sku)).toEqual([
      "apple",
      "milk",
    ]);
  });

  it("does not write into either basket it was given", () => {
    const first = saved();
    const second = guest();
    const firstSnapshot = JSON.stringify(first);
    const secondSnapshot = JSON.stringify(second);

    mergeBaskets(first, second);

    expect(JSON.stringify(first)).toBe(firstSnapshot);
    expect(JSON.stringify(second)).toBe(secondSnapshot);
  });
});
