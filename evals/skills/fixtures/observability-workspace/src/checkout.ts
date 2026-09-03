import type { PaymentsClient } from "./lib/payments";

export type BasketLine = {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPricePence: number;
};

export type CheckoutRequest = {
  readonly customerId: string;
  readonly email: string;
  readonly cardToken: string;
  readonly lines: ReadonlyArray<BasketLine>;
};

export type CheckoutResult = {
  readonly orderId: string;
  readonly totalPence: number;
  readonly paymentId: string;
};

export type CheckoutDeps = {
  readonly payments: PaymentsClient;
  readonly newOrderId: () => string;
};

export const basketTotalPence = (lines: ReadonlyArray<BasketLine>): number =>
  lines.reduce((total, line) => total + line.quantity * line.unitPricePence, 0);

export const checkout = async (
  deps: CheckoutDeps,
  request: CheckoutRequest,
): Promise<CheckoutResult> => {
  console.log("checkout: start", JSON.stringify(request));
  const orderId = deps.newOrderId();
  const totalPence = basketTotalPence(request.lines);
  console.log("checkout: charging", request.cardToken, totalPence);

  const receipt = await deps.payments.charge({
    amountPence: totalPence,
    currency: "GBP",
    cardToken: request.cardToken,
    headers: { "idempotency-key": orderId },
  });

  console.log("checkout: charged", receipt.paymentId, request.email);
  return { orderId, totalPence, paymentId: receipt.paymentId };
};
