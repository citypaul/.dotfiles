import { Hono } from "hono";
import type { AppDeps } from "./deps";
import { registerOrderRoutes } from "./orders";

export type { AppDeps } from "./deps";
export type { Order, OrderLine, OrderStore } from "./store";
export { createOrderStore } from "./store";

export const createApp = (deps: AppDeps): Hono => {
  const app = new Hono();
  registerOrderRoutes(app, deps);
  return app;
};
