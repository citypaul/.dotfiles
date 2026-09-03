import { placeOrder } from "./api.js";
import { startingBasket, type BasketLine } from "./basket.js";
import { must, spinner } from "./dom.js";
import { basketTotalPence, formatPence } from "./money.js";

const lineTemplate = (line: BasketLine): string => `
  <li>
    <span class="name">${line.name}</span>
    <span class="price">${formatPence(line.unitPricePence)}</span>
    <label for="qty-${line.sku}">${line.name} quantity</label>
    <input id="qty-${line.sku}" name="${line.sku}" type="number" min="0" step="1" value="${line.quantity}" />
  </li>
`;

const template = (lines: ReadonlyArray<BasketLine>): string => `
  <form class="checkout" novalidate>
    <h2>Your basket</h2>
    <ul class="lines">${lines.map(lineTemplate).join("")}</ul>
    <p class="total">Total: ${formatPence(basketTotalPence(lines))}</p>
    <p class="status" role="status"></p>
    <button type="submit">Place order</button>
  </form>
`;

export const mountCheckout = (container: HTMLElement): void => {
  const basket = startingBasket.map((line) => ({ ...line }));
  container.innerHTML = template(basket);
  const doc = container.ownerDocument;
  const form = must<HTMLFormElement>(container, "form.checkout");
  const total = must<HTMLElement>(container, ".total");
  const status = must<HTMLElement>(container, ".status");
  const submit = must<HTMLButtonElement>(container, "button[type=submit]");

  const redrawTotal = (): void => {
    total.textContent = `Total: ${formatPence(basketTotalPence(basket))}`;
  };

  basket.forEach((line, index) => {
    const field = must<HTMLInputElement>(container, `#qty-${line.sku}`);
    field.addEventListener("input", () => {
      const quantity = Number.parseInt(field.value, 10);
      basket[index] = {
        ...line,
        quantity: Number.isNaN(quantity) ? 0 : quantity,
      };
      redrawTotal();
    });
  });

  const send = async (): Promise<void> => {
    submit.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.replaceChildren(
      spinner(doc),
      doc.createTextNode("Placing your order…"),
    );
    const order = await placeOrder({
      lines: basket.map((line) => ({ sku: line.sku, quantity: line.quantity })),
    });
    status.replaceChildren(
      doc.createTextNode(`Order placed — reference ${order.reference}.`),
    );
    form.setAttribute("aria-busy", "false");
    submit.disabled = false;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    send().catch((error: unknown) => {
      console.error("checkout: placing the order failed", error);
    });
  });
};
