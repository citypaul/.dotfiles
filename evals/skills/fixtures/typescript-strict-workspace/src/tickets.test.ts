import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import { closeTicket, openCount, openTicket, type Ticket } from "./tickets";

const ticket = (overrides: Partial<Ticket> = {}): Ticket => ({
  id: "t-1",
  title: "Printer on fire",
  priority: "normal",
  status: "open",
  openedAt: "2026-03-15T09:00:00Z",
  ...overrides,
});

const deps = { now: () => new Date("2026-03-15T10:00:00Z"), newId: () => "t-new" };

describe("tickets", () => {
  it("counts only open tickets", () => {
    const tickets = openTicket([ticket({ id: "a" })], ticket({ id: "b" }));
    expect(openCount(closeTicket(tickets, "a"))).toBe(1);
  });

  it("closing an unknown id changes nothing", () => {
    const tickets = [ticket({ id: "a" })];
    expect(closeTicket(tickets, "zzz")).toEqual(tickets);
  });
});

describe("app", () => {
  it("closes a ticket over HTTP and reports the open count", async () => {
    const app = createApp(deps, [ticket({ id: "a" }), ticket({ id: "b" })]);

    const closed = await app.router.handle({ method: "POST", path: "/tickets/a/close", params: {}, body: null });
    const count = await app.router.handle({ method: "GET", path: "/tickets/open-count", params: {}, body: null });

    expect(closed).toEqual({ status: 200, body: { closedAt: "2026-03-15T10:00:00.000Z" } });
    expect(count).toEqual({ status: 200, body: { open: 1 } });
  });

  it("returns 404 for a ticket that does not exist", async () => {
    const app = createApp(deps, []);
    const response = await app.router.handle({ method: "POST", path: "/tickets/nope/close", params: {}, body: null });
    expect(response.status).toBe(404);
  });
});
