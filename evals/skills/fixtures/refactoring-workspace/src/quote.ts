export type Region = "mainland" | "highlands" | "islands";

export type OrderLine = {
  readonly sku: string;
  readonly unitPence: number;
  readonly quantity: number;
};

export type Order = {
  readonly lines: ReadonlyArray<OrderLine>;
  readonly region: Region;
  readonly loyaltyYears: number;
  readonly promoCode?: string;
};

export type Quote = {
  readonly subtotalPence: number;
  readonly discountPence: number;
  readonly deliveryPence: number;
  readonly totalPence: number;
};

export function subtotalPence(order: Order): number {
  let total = 0;
  for (let i = 0; i < order.lines.length; i++) {
    const line = order.lines[i];
    if (line) {
      total = total + line.unitPence * line.quantity;
    }
  }
  return total;
}

export function qualifiesForFreeDelivery(order: Order): boolean {
  if (subtotalPence(order) >= 5000) {
    return true;
  } else {
    return false;
  }
}

export function qualifiesForBulkDiscount(order: Order): boolean {
  if (subtotalPence(order) >= 5000) {
    return true;
  } else {
    return false;
  }
}

export function discountPence(order: Order): number {
  const subtotal = subtotalPence(order);
  let rate = 0;
  if (order.loyaltyYears > 5) {
    rate = 10;
  } else {
    if (order.loyaltyYears > 2) {
      rate = 5;
    } else {
      rate = 0;
    }
  }
  if (qualifiesForBulkDiscount(order)) {
    rate = rate + 3;
  }
  if (order.promoCode !== undefined) {
    if (order.promoCode === "WELCOME10") {
      rate = rate + 10;
    }
  }
  if (rate > 20) {
    rate = 20;
  }
  return Math.floor((subtotal * rate) / 100);
}

export function deliveryPence(order: Order): number {
  if (order.region === "mainland") {
    if (qualifiesForFreeDelivery(order)) {
      return 0;
    } else {
      return 399;
    }
  } else if (order.region === "highlands") {
    if (qualifiesForFreeDelivery(order)) {
      return 499;
    } else {
      return 899;
    }
  } else {
    return 1299;
  }
}

export function quoteOrder(order: Order): Quote {
  let subtotal = 0;
  for (let i = 0; i < order.lines.length; i++) {
    const line = order.lines[i];
    if (line) {
      subtotal = subtotal + line.unitPence * line.quantity;
    }
  }
  const discount = discountPence(order);
  const delivery = deliveryPence(order);
  let total = subtotal;
  total = total - discount;
  total = total + delivery;
  return {
    subtotalPence: subtotal,
    discountPence: discount,
    deliveryPence: delivery,
    totalPence: total,
  };
}
