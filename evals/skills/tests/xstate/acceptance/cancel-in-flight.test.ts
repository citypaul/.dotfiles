// Hidden acceptance test: backing out of an order that is already in flight,
// driven through the DOM.
//
// Copied into the workspace as src/acceptance-cancel-in-flight.test.ts, so
// the import below resolves to src/checkout/index.ts. Only the fixture's
// existing props and the Cancel button the request pins are assumed; how the
// late answer is fenced off is the agent's design.
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CheckoutForm, type Basket, type OrderConfirmation } from "./checkout";

const basket = (): Basket => ({
  id: "b-5",
  lines: [{ sku: "TEA-500", quantity: 3, unitPricePence: 350 }],
});

const buttonNamed = (pattern: RegExp): HTMLButtonElement | null =>
  (screen
    .queryAllByRole("button")
    .find((button) => pattern.test(button.textContent ?? "")) as
    | HTMLButtonElement
    | undefined) ?? null;

describe("acceptance: cancelling an order in flight", () => {
  it("ignores an answer that arrives after the customer backed out", async () => {
    const attempts: Basket[] = [];
    const settlers: ((confirmation: OrderConfirmation) => void)[] = [];
    const placeOrder = (order: Basket) => {
      attempts.push(order);
      return new Promise<OrderConfirmation>((resolve) => {
        settlers.push(resolve);
      });
    };

    render(createElement(CheckoutForm, { basket: basket(), placeOrder }));
    fireEvent.click(buttonNamed(/place order/i) as HTMLButtonElement);
    await waitFor(() => expect(attempts).toHaveLength(1));

    const cancel = await waitFor(() => {
      const button = buttonNamed(/cancel/i);
      expect(button).not.toBeNull();
      return button as HTMLButtonElement;
    });
    fireEvent.click(cancel);

    await act(async () => {
      settlers[0]?.({ reference: "ORD-LATE" });
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(document.body.textContent).not.toContain("ORD-LATE");

    const again = buttonNamed(/place order/i);
    expect(again).not.toBeNull();
    expect((again as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(again as HTMLButtonElement);
    await waitFor(() => expect(attempts).toHaveLength(2));
  });
});
