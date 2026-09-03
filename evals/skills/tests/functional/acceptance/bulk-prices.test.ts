import { describe, expect, it } from "vitest";
import { addLine, applyBulkPrices, basketTotal, createBasket } from "./basket";

const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const groceries = () =>
  deepFreeze(
    addLine(
      addLine(addLine(createBasket("GBP"), "apple", "Apple", 30, 12), "milk", "Milk", 120, 2),
      "bread",
      "Loaf",
      95,
      1,
    ),
  );

const rules = () =>
  deepFreeze([
    { sku: "apple", minQuantity: 6, bulkUnitPence: 25 },
    { sku: "apple", minQuantity: 24, bulkUnitPence: 18 },
    { sku: "apple", minQuantity: 10, bulkUnitPence: 22 },
    { sku: "milk", minQuantity: 3, bulkUnitPence: 100 },
    { sku: "cheese", minQuantity: 1, bulkUnitPence: 1 },
  ]);

describe("acceptance: applyBulkPrices", () => {
  it("gives a line the price of the applicable rule with the largest minimum", () => {
    const after = applyBulkPrices(groceries(), rules());

    expect(after.lines.map((line) => [line.sku, line.unitPence, line.quantity])).toEqual([
      ["apple", 22, 12],
      ["milk", 120, 2],
      ["bread", 95, 1],
    ]);
    expect(basketTotal(after)).toBe(22 * 12 + 120 * 2 + 95);
  });

  it("leaves a basket unchanged when there are no rules", () => {
    expect(applyBulkPrices(groceries(), deepFreeze([]))).toEqual(groceries());
  });

  it("does not write into the basket or the rules it was given", () => {
    const basket = groceries();
    const ruleList = rules();
    const basketSnapshot = JSON.stringify(basket);
    const rulesSnapshot = JSON.stringify(ruleList);

    applyBulkPrices(basket, ruleList);

    expect(JSON.stringify(basket)).toBe(basketSnapshot);
    expect(JSON.stringify(ruleList)).toBe(rulesSnapshot);
  });
});
