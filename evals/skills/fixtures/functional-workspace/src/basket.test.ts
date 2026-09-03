import { describe, expect, it } from "vitest";
import {
  addLine,
  basketTotal,
  changeQuantity,
  createBasket,
  lineCount,
  removeLine,
} from "./basket";

const groceries = () =>
  addLine(addLine(createBasket("GBP"), "apple", "Apple", 30, 4), "milk", "Milk", 120, 1);

describe("adding lines", () => {
  it("starts a line for a new sku", () => {
    const basket = addLine(createBasket("GBP"), "apple", "Apple", 30, 4);

    expect(basket.lines).toEqual([{ sku: "apple", name: "Apple", unitPence: 30, quantity: 4 }]);
  });

  it("adds to the quantity of a sku already in the basket", () => {
    const basket = addLine(groceries(), "apple", "Apple", 30, 2);

    expect(basket.lines.map((line) => [line.sku, line.quantity])).toEqual([
      ["apple", 6],
      ["milk", 1],
    ]);
  });
});

describe("removing lines", () => {
  it("drops the line for that sku", () => {
    expect(removeLine(groceries(), "apple").lines.map((line) => line.sku)).toEqual(["milk"]);
  });

  it("leaves the basket as it was for an unknown sku", () => {
    expect(removeLine(groceries(), "bread")).toEqual(groceries());
  });
});

describe("changing a quantity", () => {
  it("sets the quantity of that line", () => {
    const basket = changeQuantity(groceries(), "apple", 1);

    expect(basket.lines.map((line) => [line.sku, line.quantity])).toEqual([
      ["apple", 1],
      ["milk", 1],
    ]);
  });

  it("drops the line when the quantity reaches zero", () => {
    expect(changeQuantity(groceries(), "milk", 0).lines.map((line) => line.sku)).toEqual(["apple"]);
  });
});

describe("totals", () => {
  it("sums unit price times quantity across lines", () => {
    expect(basketTotal(groceries())).toBe(240);
  });

  it("counts every unit in the basket", () => {
    expect(lineCount(groceries())).toBe(5);
  });

  it("is zero for an empty basket", () => {
    expect(basketTotal(createBasket("GBP"))).toBe(0);
  });
});
