import type { Basket } from "./basket";

export type OrderConfirmation = {
  readonly reference: string;
};

export type PlaceOrder = (basket: Basket) => Promise<OrderConfirmation>;
