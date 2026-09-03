export type OrderLine = {
  readonly sku: string;
  readonly quantity: number;
  readonly unitPrice: number;
};

export type Order = {
  readonly id: string;
  readonly partnerId: string;
  readonly status: string;
  readonly lines: ReadonlyArray<OrderLine>;
  readonly deliveryFee: number;
  readonly total: number;
  readonly createdAt: string;
};

export type OrderStore = {
  readonly listForPartner: (partnerId: string) => ReadonlyArray<Order>;
  readonly findForPartner: (partnerId: string, id: string) => Order | undefined;
  readonly save: (order: Order) => Order;
};

export const createOrderStore = (
  seed: ReadonlyArray<Order> = [],
): OrderStore => {
  const orders: Order[] = [...seed];
  return {
    listForPartner: (partnerId) =>
      orders.filter((order) => order.partnerId === partnerId),
    findForPartner: (partnerId, id) =>
      orders.find((order) => order.partnerId === partnerId && order.id === id),
    save: (order) => {
      orders.push(order);
      return order;
    },
  };
};
