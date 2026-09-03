import { createOrderView, type OrderRepository } from "../../../../application/orders";
import type {
  EndpointContract,
  HandlerFor,
} from "../../../../composition/registrar";
import { json, problem } from "../../../../http/respond";

export const getOrderContract = {
  method: "get",
  path: "/api/orders/{orderId}",
  access: { kind: "protected-read" },
  summary: "One order",
} as const satisfies EndpointContract;

export const createGetOrderHandler = (
  orders: OrderRepository,
): HandlerFor<typeof getOrderContract> => {
  const view = createOrderView(orders);
  return async ({ principal, params }) => {
    const result = await view.viewOrder({
      principal,
      orderId: params.orderId ?? "",
    });
    if (result.outcome === "not-found") return problem(404, "Not found");
    return json(200, { order: result.order });
  };
};
