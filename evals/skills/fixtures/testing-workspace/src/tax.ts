const VAT_PERCENT_BY_REGION: Readonly<Record<string, number>> = {
  GB: 20,
  IE: 23,
  FR: 20,
  DE: 19,
};

export type TaxResult =
  | { readonly ok: true; readonly taxPence: number }
  | { readonly ok: false; readonly error: string };

export const taxFor = (input: { readonly region: string; readonly taxablePence: number }): TaxResult => {
  const percent = VAT_PERCENT_BY_REGION[input.region.toUpperCase()];
  if (percent === undefined) return { ok: false, error: `We do not ship to ${input.region}` };
  return { ok: true, taxPence: Math.round((input.taxablePence * percent) / 100) };
};
