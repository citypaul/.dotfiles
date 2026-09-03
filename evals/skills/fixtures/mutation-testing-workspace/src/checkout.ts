export type LineItem = {
  readonly sku: string;
  readonly unitPence: number;
  readonly quantity: number;
};

export type Customer = {
  readonly isMember: boolean;
  readonly country: string;
};

export type Order = {
  readonly items: ReadonlyArray<LineItem>;
  readonly customer: Customer;
  readonly promoCode: string | null;
};

const BULK_THRESHOLD_PENCE = 10_000;
const FREE_SHIPPING_FROM_PENCE = 5_000;
const MEMBER_PROMO = "MEMBER5";

export const subtotalPence = (items: ReadonlyArray<LineItem>): number => {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item.unitPence * item.quantity, 0);
};

export const discountPence = (order: Order): number => {
  const subtotal = subtotalPence(order.items);
  const bulk = subtotal >= BULK_THRESHOLD_PENCE ? Math.floor(subtotal / 10) : 0;
  const member = order.customer.isMember && order.promoCode === MEMBER_PROMO ? 500 : 0;
  return Math.min(bulk + member, subtotal);
};

export const shippingPence = (order: Order): number => {
  if (order.customer.country !== "GB") return 1_500;
  const goods = subtotalPence(order.items) - discountPence(order);
  return goods >= FREE_SHIPPING_FROM_PENCE ? 0 : 399;
};

export const totalPence = (order: Order): number =>
  subtotalPence(order.items) - discountPence(order) + shippingPence(order);

export const describeOrder = (order: Order): string => {
  const units = order.items.reduce((count, item) => count + item.quantity, 0);
  const pounds = (totalPence(order) / 100).toFixed(2);
  const shipping = shippingPence(order) === 0 ? "free shipping" : "plus shipping";
  return `${units} item(s), £${pounds} (${shipping})`;
};
