// Hidden acceptance test: the same basket charged twice on a slow connection,
// driven through the DOM.
//
// Copied into the workspace as src/acceptance-double-submit.test.ts, so the
// import below resolves to src/checkout/index.ts. Nothing beyond the
// fixture's own props and its existing "Place order" button is assumed: how
// the second tap is stopped — a machine that does not define the transition,
// a ref, anything — is the agent's design, and is graded by
// xstate-assertions.js, not here.
//
// The taps land in one React batch, which is what a slow connection looks
// like: the screen has not repainted, so nothing the last render captured has
// caught up yet. State read from a closure is still stale on the second tap;
// a synchronous owner of the lifecycle is not.
import { act, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CheckoutForm, type Basket, type OrderConfirmation } from "./checkout";

const basket = (): Basket => ({
  id: "b-9",
  lines: [{ sku: "TEA-500", quantity: 2, unitPricePence: 350 }],
});

const buttonNamed = (pattern: RegExp): HTMLButtonElement | null =>
  (screen
    .queryAllByRole("button")
    .find((button) => pattern.test(button.textContent ?? "")) as
    | HTMLButtonElement
    | undefined) ?? null;

describe("acceptance: placing the order once", () => {
  it("takes one order however many times the customer taps before the screen catches up", async () => {
    const attempts: Basket[] = [];
    const settlers: ((confirmation: OrderConfirmation) => void)[] = [];
    const placeOrder = (order: Basket) => {
      attempts.push(order);
      return new Promise<OrderConfirmation>((resolve) => {
        settlers.push(resolve);
      });
    };

    render(
      createElement(CheckoutForm, { basket: basket(), placeOrder }),
    );

    const place = buttonNamed(/place order/i) as HTMLButtonElement;
    await act(async () => {
      place.click();
      place.click();
      place.click();
    });

    expect(attempts).toHaveLength(1);

    await waitFor(() => expect(settlers).toHaveLength(1));
    await act(async () => {
      settlers[0]?.({ reference: "ORD-4242" });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    await waitFor(() =>
      expect(document.body.textContent).toContain("ORD-4242"),
    );
    expect(attempts).toHaveLength(1);
  });
});
