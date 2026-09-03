import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CheckoutForm, basketTotalPence, type Basket } from ".";

const basket = (): Basket => ({
  id: "b-1",
  lines: [{ sku: "TEA-500", quantity: 2, unitPricePence: 350 }],
});

describe("checkout", () => {
  it("totals every line in the basket", () => {
    expect(basketTotalPence(basket())).toBe(700);
  });

  it("shows the basket total and offers to place the order", () => {
    render(
      <CheckoutForm
        basket={basket()}
        placeOrder={async () => ({ reference: "ORD-1" })}
      />,
    );

    expect(screen.getByText(/700p/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /place order/i }),
    ).toBeInTheDocument();
  });
});
