import type { AuthenticatedPrincipal } from "./principal";

export type Order = {
  readonly id: string;
  readonly tenantId: string;
  readonly placedBy: string;
  readonly reference: string;
  readonly totalPence: number;
  readonly status: "placed" | "shipped" | "cancelled";
};

export type OrderRepository = {
  readonly findById: (orderId: string) => Promise<Order | undefined>;
  readonly listForTenant: (tenantId: string) => Promise<readonly Order[]>;
  readonly save: (order: Order) => Promise<void>;
};

export type ViewOrderResult =
  | { readonly outcome: "found"; readonly order: Order }
  | { readonly outcome: "not-found" };

export const createOrderView = (orders: OrderRepository) => ({
  viewOrder: async ({
    principal,
    orderId,
  }: {
    readonly principal: AuthenticatedPrincipal;
    readonly orderId: string;
  }): Promise<ViewOrderResult> => {
    const order = await orders.findById(orderId);
    if (!order) return { outcome: "not-found" };
    return { outcome: "found", order };
  },
});
