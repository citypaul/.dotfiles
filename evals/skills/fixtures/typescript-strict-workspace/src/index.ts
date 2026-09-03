import { createRouter } from "./lib/router";
import { closeTicket, findTicket, openCount, type Ticket } from "./tickets";

export type AppDeps = {
  readonly now: () => Date;
  readonly newId: () => string;
};

export const createApp = (deps: AppDeps, initial: ReadonlyArray<Ticket> = []) => {
  const store = { tickets: initial };
  const router = createRouter();

  router.get("/tickets/open-count", async () => ({ status: 200, body: { open: openCount(store.tickets) } }));

  router.post("/tickets/:id/close", async (request) => {
    const id = request.params.id ?? "";
    if (findTicket(store.tickets, id) === undefined) return { status: 404 };
    store.tickets = closeTicket(store.tickets, id);
    return { status: 200, body: { closedAt: deps.now().toISOString() } };
  });

  return { router, tickets: () => store.tickets };
};
