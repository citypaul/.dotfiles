import { beforeEach, describe, expect, it } from "vitest";
import { quoteOrder, type Order } from "./index";

let order: Order;

beforeEach(() => {
  order = {
    id: "order-1",
    region: "GB",
    lines: [{ sku: "mug", description: "Mug", unitPricePence: 1200, quantity: 1 }],
  };
});

describe("quoteOrder", () => {
  it("quotes an order", () => {
    const result = quoteOrder(order);
    expect(result.ok).toBe(true);
  });
});
