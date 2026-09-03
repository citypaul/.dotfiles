import { Hono } from "hono";
import type { OrderRepository } from "../application/orders";
import { appConfigContract, handleAppConfig } from "../endpoints/api/config/get";
import {
  createGetOrderHandler,
  getOrderContract,
} from "../endpoints/api/orders/by-order-id/get";
import { json, problem } from "../http/respond";
import { createSessionResolver, type SessionStore } from "../sessions";
import { createEndpointRegistrar, type EntryCatalogEntry } from "./registrar";

export type AppDeps = {
  readonly sessions: SessionStore;
  readonly orders: OrderRepository;
};

export type ComposedApp = {
  readonly app: Hono;
  readonly catalog: readonly EntryCatalogEntry[];
};

export const createApp = (deps: AppDeps): ComposedApp => {
  const app = new Hono();
  const resolvePrincipal = createSessionResolver(deps.sessions);
  const endpoints = createEndpointRegistrar({ app, resolvePrincipal });

  endpoints.register(appConfigContract, handleAppConfig);
  endpoints.register(getOrderContract, createGetOrderHandler(deps.orders));

  // Older than the registrar and still mounted straight onto the app.
  app.get("/api/orders", async (c) => {
    const principal = await resolvePrincipal(c.req.raw);
    if (principal === undefined) {
      return problem(401, "Sign in required", { "www-authenticate": "Session" });
    }
    const tenantId = c.req.query("tenantId") ?? principal.tenantId;
    return json(200, { orders: await deps.orders.listForTenant(tenantId) });
  });

  return { app, catalog: endpoints.catalog() };
};
