// Hidden acceptance test: the cooldown after a rejected order, driven through
// the DOM.
//
// Copied into the workspace as src/acceptance-retry-cooldown.test.ts, so the
// import below resolves to src/checkout/index.ts. Only the fixture's existing
// props are assumed. Nothing is asserted about which control is offered or
// whether it is hidden or disabled during the cooldown: every button that
// could start another attempt is clicked, and the behaviour graded is that no
// second attempt reaches the shop until the cooldown has passed. Real time is
// used, not fake timers, so a cooldown built out of `after`, `setTimeout` or
// anything else counts.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CheckoutForm, type Basket, type OrderConfirmation } from "./checkout";

const basket = (): Basket => ({
  id: "b-3",
  lines: [{ sku: "TEA-500", quantity: 1, unitPricePence: 350 }],
});

const ATTEMPTER = /try again|retry|place order|submit/i;

const clickEveryAttempter = () => {
  screen
    .queryAllByRole("button")
    .filter(
      (button) =>
        ATTEMPTER.test(button.textContent ?? "") &&
        !(button as HTMLButtonElement).disabled,
    )
    .forEach((button) => fireEvent.click(button));
};

describe("acceptance: cooling off after a rejected order", () => {
  it(
    "lets no second attempt through for three seconds and then allows one",
    async () => {
      const attempts: Basket[] = [];
      const placeOrder = async (order: Basket): Promise<OrderConfirmation> => {
        attempts.push(order);
        if (attempts.length === 1) {
          throw new Error("Card declined");
        }
        return { reference: "ORD-77" };
      };

      render(createElement(CheckoutForm, { basket: basket(), placeOrder }));
      clickEveryAttempter();

      await waitFor(() =>
        expect(document.body.textContent).toContain("Card declined"),
      );
      const rejectedAt = Date.now();

      clickEveryAttempter();
      expect(attempts).toHaveLength(1);

      await waitFor(
        () => {
          clickEveryAttempter();
          expect(attempts).toHaveLength(2);
        },
        { timeout: 9_000, interval: 100 },
      );
      expect(Date.now() - rejectedAt).toBeGreaterThanOrEqual(2_500);

      await waitFor(() =>
        expect(document.body.textContent).toContain("ORD-77"),
      );
    },
    20_000,
  );
});
