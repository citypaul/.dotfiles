const DOMESTIC_REGION = "GB";
const DOMESTIC_SHIPPING_PENCE = 399;
const INTERNATIONAL_SHIPPING_PENCE = 899;
const FREE_DOMESTIC_SHIPPING_FROM_PENCE = 5_000;

export const shippingFor = (input: { readonly region: string; readonly goodsPence: number }): number => {
  if (input.region.toUpperCase() !== DOMESTIC_REGION) return INTERNATIONAL_SHIPPING_PENCE;
  if (input.goodsPence >= FREE_DOMESTIC_SHIPPING_FROM_PENCE) return 0;
  return DOMESTIC_SHIPPING_PENCE;
};
