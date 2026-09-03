import type { Basket } from "../checkout/basket";
import type { OrderConfirmation } from "../checkout/place-order";

// Stand-in for the orders service we do not own.
export const placeOrderOverHttp = async (
  basket: Basket,
): Promise<OrderConfirmation> => {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ basketId: basket.id, lines: basket.lines }),
  });
  if (!response.ok) {
    throw new Error(`Order rejected (${response.status})`);
  }
  return (await response.json()) as OrderConfirmation;
};
