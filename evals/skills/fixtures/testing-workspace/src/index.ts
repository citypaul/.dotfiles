import { discountFor } from "./discounts";
import { formatReceipt } from "./format-receipt";
import { shippingFor } from "./shipping";
import { taxFor } from "./tax";
import { validateOrder } from "./validate-order";

export { LineSchema, OrderSchema, type Line, type Order } from "./order-schema";

export type Quote = {
  readonly orderId: string;
  readonly subtotalPence: number;
  readonly discountPence: number;
  readonly shippingPence: number;
  readonly taxPence: number;
  readonly totalPence: number;
  readonly receipt: string;
};

export type QuoteResult =
  | { readonly ok: true; readonly quote: Quote }
  | { readonly ok: false; readonly error: string };

export const quoteOrder = (input: unknown): QuoteResult => {
  const validated = validateOrder(input);
  if (!validated.ok) return validated;
  const { order } = validated;

  const subtotalPence = order.lines.reduce((sum, line) => sum + line.unitPricePence * line.quantity, 0);
  const discount = discountFor({ subtotalPence, promoCode: order.promoCode });
  if (!discount.ok) return discount;

  const goodsPence = subtotalPence - discount.discountPence;
  const shippingPence = shippingFor({ region: order.region, goodsPence });
  const tax = taxFor({ region: order.region, taxablePence: goodsPence + shippingPence });
  if (!tax.ok) return tax;

  const totalPence = goodsPence + shippingPence + tax.taxPence;
  return {
    ok: true,
    quote: {
      orderId: order.id,
      subtotalPence,
      discountPence: discount.discountPence,
      shippingPence,
      taxPence: tax.taxPence,
      totalPence,
      receipt: formatReceipt({
        lines: order.lines,
        subtotalPence,
        discountPence: discount.discountPence,
        shippingPence,
        taxPence: tax.taxPence,
        totalPence,
      }),
    },
  };
};
