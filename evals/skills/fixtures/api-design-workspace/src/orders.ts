import type { Context, Hono } from "hono";
import type { AppDeps } from "./deps";
import type { Order, OrderLine } from "./store";

const partnerIdOf = (c: Context): string | null => {
  const header = c.req.header("authorization");
  if (header === undefined || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token === "" ? null : token;
};

const lineTotal = (line: OrderLine): number => line.quantity * line.unitPrice;

export const registerOrderRoutes = (app: Hono, deps: AppDeps): void => {
  app.get("/orders", (c) => {
    const partnerId = partnerIdOf(c);
    if (partnerId === null) return c.json({ error: "missing api key" }, 401);

    const all = deps.orders.listForPartner(partnerId);
    const offset = Number(c.req.query("offset") ?? "0");
    return c.json({ orders: all.slice(offset), count: all.length });
  });

  app.get("/orders/:id", (c) => {
    const partnerId = partnerIdOf(c);
    if (partnerId === null) return c.json({ error: "missing api key" }, 401);

    const order = deps.orders.findForPartner(partnerId, c.req.param("id"));
    if (order === undefined) return c.json({ error: "not found" }, 404);
    return c.json(order);
  });

  app.post("/orders", async (c) => {
    const partnerId = partnerIdOf(c);
    if (partnerId === null) return c.json({ error: "missing api key" }, 401);

    const body = (await c.req.json()) as Record<string, unknown>;
    const rawLines = body["lines"];
    if (!Array.isArray(rawLines) || rawLines.length === 0) {
      return c.json({ error: "lines required" });
    }
    const lines: OrderLine[] = [];
    for (const raw of rawLines as ReadonlyArray<Record<string, unknown>>) {
      if (typeof raw["sku"] !== "string" || raw["sku"] === "") {
        return c.json({ error: "each line needs a sku" });
      }
      if (typeof raw["quantity"] !== "number" || raw["quantity"] < 1) {
        return c.json({ error: "each line needs a quantity of at least 1" });
      }
      if (typeof raw["unitPrice"] !== "number" || raw["unitPrice"] < 0) {
        return c.json({ error: "each line needs a unitPrice" });
      }
      lines.push({
        sku: raw["sku"],
        quantity: raw["quantity"],
        unitPrice: raw["unitPrice"],
      });
    }
    const rawFee = body["deliveryFee"];
    if (rawFee !== undefined && (typeof rawFee !== "number" || rawFee < 0)) {
      return c.json({ error: "deliveryFee must be a positive number" });
    }
    const deliveryFee = typeof rawFee === "number" ? rawFee : 0;

    const order: Order = {
      id: deps.newId(),
      partnerId,
      status: "PLACED",
      lines,
      deliveryFee,
      total: lines.reduce((sum, line) => sum + lineTotal(line), 0) + deliveryFee,
      createdAt: deps.now().toISOString(),
    };
    return c.json(deps.orders.save(order), 201);
  });
};
