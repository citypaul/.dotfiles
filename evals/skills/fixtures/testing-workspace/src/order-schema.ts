import { z } from "zod";

export const LineSchema = z.object({
  sku: z.string().min(1),
  description: z.string().min(1),
  unitPricePence: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

export const OrderSchema = z.object({
  id: z.string().min(1),
  region: z.string().length(2),
  lines: z.array(LineSchema).min(1),
  promoCode: z.string().optional(),
});

export type Line = z.infer<typeof LineSchema>;
export type Order = z.infer<typeof OrderSchema>;
