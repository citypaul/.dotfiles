import { describe, expect, it } from "vitest";
import { basketTotalPence, formatPence, lineTotalPence } from "./money.js";

describe("money", () => {
  it("formats pence as pounds", () => {
    expect(formatPence(2499)).toBe("£24.99");
  });

  it("multiplies the unit price by the quantity", () => {
    expect(lineTotalPence(2499, 3)).toBe(7497);
  });

  it("adds every line up", () => {
    expect(
      basketTotalPence([
        { unitPricePence: 2499, quantity: 2 },
        { unitPricePence: 899, quantity: 1 },
      ]),
    ).toBe(5897);
  });
});
