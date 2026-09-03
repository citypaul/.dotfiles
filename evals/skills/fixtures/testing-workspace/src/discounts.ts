const TIER_ONE_THRESHOLD_PENCE = 10_000;
const TIER_TWO_THRESHOLD_PENCE = 25_000;

const PROMO_CODES: Readonly<Record<string, number>> = {
  WELCOME10: 10,
  SPRING15: 15,
};

export type DiscountResult =
  | { readonly ok: true; readonly discountPence: number }
  | { readonly ok: false; readonly error: string };

const tierPercent = (subtotalPence: number): number => {
  if (subtotalPence >= TIER_TWO_THRESHOLD_PENCE) return 10;
  if (subtotalPence >= TIER_ONE_THRESHOLD_PENCE) return 5;
  return 0;
};

export const discountFor = (input: {
  readonly subtotalPence: number;
  readonly promoCode?: string;
}): DiscountResult => {
  const promoPercent = input.promoCode === undefined ? 0 : PROMO_CODES[input.promoCode.toUpperCase()];
  if (promoPercent === undefined) return { ok: false, error: `Unknown promo code ${input.promoCode}` };
  const percent = Math.max(tierPercent(input.subtotalPence), promoPercent);
  return { ok: true, discountPence: Math.round((input.subtotalPence * percent) / 100) };
};
