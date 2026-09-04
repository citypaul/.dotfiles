import type { OrderStore } from "./store";

export type AppDeps = {
  readonly orders: OrderStore;
  readonly newId: () => string;
  readonly now: () => Date;
};
