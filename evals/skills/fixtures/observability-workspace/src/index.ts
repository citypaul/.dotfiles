import { checkout, type CheckoutDeps, type CheckoutRequest } from "./checkout";
import { createRouter } from "./lib/router";

export type AppDeps = CheckoutDeps;

const isBasketLine = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.sku === "string" &&
    typeof line.quantity === "number" &&
    typeof line.unitPricePence === "number"
  );
};

const asCheckoutRequest = (body: unknown): CheckoutRequest | undefined => {
  if (typeof body !== "object" || body === null) return undefined;
  const candidate = body as Record<string, unknown>;
  if (
    typeof candidate.customerId !== "string" ||
    candidate.customerId.trim() === ""
  )
    return undefined;
  if (typeof candidate.email !== "string") return undefined;
  if (typeof candidate.cardToken !== "string") return undefined;
  if (!Array.isArray(candidate.lines) || candidate.lines.length === 0)
    return undefined;
  if (!candidate.lines.every(isBasketLine)) return undefined;
  return body as CheckoutRequest;
};

export const createApp = (deps: AppDeps) => {
  const router = createRouter();

  router.post("/checkout", async (request) => {
    const parsed = asCheckoutRequest(request.body);
    if (parsed === undefined) {
      console.log("checkout: bad request", JSON.stringify(request.body));
      return { status: 400, body: { error: "invalid_basket" } };
    }

    try {
      const result = await checkout(deps, parsed);
      console.log("checkout: done", result.orderId, 201);
      return { status: 201, body: result };
    } catch (error) {
      console.error("checkout: failed", parsed.customerId, error);
      return { status: 502, body: { error: "payment_failed" } };
    }
  });

  return { router };
};
