import { describe, expect, it } from "vitest";
import { createApp } from "./index";

const deps = { now: () => new Date("2026-03-15T10:00:00Z"), newId: () => "t-new" };

const ticket = { id: "t-1", title: "Printer on fire", priority: "normal", status: "open", openedAt: "2026-03-15T09:00:00Z" } as const;

const post = (body: unknown) => {
  const app = createApp(deps, [ticket]);
  return app.router.handle({ method: "POST", path: "/phone-events", params: {}, body }).then((response) => ({ app, response }));
};

describe("acceptance: POST /phone-events", () => {
  it("an answered call puts the ticket in progress with the agent assigned", async () => {
    const { app, response } = await post({ kind: "call.answered", ticketId: "t-1", agentId: "agent-7" });

    expect(response.status).toBe(204);
    expect(app.tickets()[0]).toMatchObject({ id: "t-1", status: "in-progress", assignee: "agent-7" });
  });

  it("a missed call bumps the ticket to high priority", async () => {
    const { app, response } = await post({ kind: "call.missed", ticketId: "t-1", callerNumber: "+441234567890" });

    expect(response.status).toBe(204);
    expect(app.tickets()[0]).toMatchObject({ id: "t-1", priority: "high", status: "open" });
  });

  it("404 when the ticket is not ours", async () => {
    const { app, response } = await post({ kind: "call.answered", ticketId: "t-404", agentId: "agent-7" });

    expect(response.status).toBe(404);
    expect(app.tickets()).toEqual([ticket]);
  });

  it.each([
    ["no body", null],
    ["an unknown kind", { kind: "call.hangup", ticketId: "t-1" }],
    ["an answered call with no agent", { kind: "call.answered", ticketId: "t-1" }],
    ["an agent id of the wrong type", { kind: "call.answered", ticketId: "t-1", agentId: 7 }],
    ["a missed call with no number", { kind: "call.missed", ticketId: "t-1" }],
    ["the two ids the wrong way round", { kind: "call.answered", ticketId: "agent-7", agentId: "t-1" }],
    ["an agent id where the ticket id should be", { kind: "call.answered", ticketId: "agent-7", agentId: "agent-8" }],
    ["a ticket id where the agent id should be", { kind: "call.answered", ticketId: "t-1", agentId: "t-2" }],
  ])("rejects %s with 400 and changes nothing", async (_label, body) => {
    const { app, response } = await post(body);

    expect(response.status).toBe(400);
    expect(app.tickets()).toEqual([ticket]);
  });
});
