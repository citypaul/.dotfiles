import type { Line } from "./order-schema";

export type ReceiptInput = {
  readonly lines: ReadonlyArray<Line>;
  readonly subtotalPence: number;
  readonly discountPence: number;
  readonly shippingPence: number;
  readonly taxPence: number;
  readonly totalPence: number;
};

export const pounds = (pence: number): string => `£${(pence / 100).toFixed(2)}`;

export const formatReceipt = (input: ReceiptInput): string => {
  const itemLines = input.lines.map((line) => `${line.quantity} × ${line.description} @ ${pounds(line.unitPricePence)}`);
  const discountLine = input.discountPence > 0 ? [`Discount -${pounds(input.discountPence)}`] : [];
  const shippingLine = input.shippingPence === 0 ? "Shipping FREE" : `Shipping ${pounds(input.shippingPence)}`;
  return [
    ...itemLines,
    `Subtotal ${pounds(input.subtotalPence)}`,
    ...discountLine,
    shippingLine,
    `VAT ${pounds(input.taxPence)}`,
    `Total ${pounds(input.totalPence)}`,
  ].join("\n");
};
