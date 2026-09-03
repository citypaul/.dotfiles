import { OrderSchema, type Order } from "./order-schema";

const MAX_QUANTITY_PER_LINE = 50;

export type ValidationResult =
  | { readonly ok: true; readonly order: Order }
  | { readonly ok: false; readonly error: string };

export const validateOrder = (input: unknown): ValidationResult => {
  const parsed = OrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: `Invalid order: ${parsed.error.issues[0]?.message ?? "unknown"}` };
  const order = parsed.data;
  const skus = order.lines.map((line) => line.sku);
  if (new Set(skus).size !== skus.length) return { ok: false, error: "Duplicate SKU in order" };
  const bulk = order.lines.find((line) => line.quantity > MAX_QUANTITY_PER_LINE);
  if (bulk) return { ok: false, error: `Quantity over ${MAX_QUANTITY_PER_LINE} for ${bulk.sku}; bulk orders go through sales` };
  return { ok: true, order };
};
