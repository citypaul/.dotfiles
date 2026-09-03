import { describe, expect, it } from "vitest";
import { createApp } from "./index";

const deps = { now: () => new Date("2026-03-15T10:00:00Z"), newId: () => "t-new" };

const post = (body: unknown) => {
  const app = createApp(deps, []);
  return app.router.handle({ method: "POST", path: "/tickets", params: {}, body }).then((response) => ({ app, response }));
};

describe("acceptance: POST /tickets", () => {
  it("opens a ticket from the form's JSON", async () => {
    const { app, response } = await post({ title: "Printer on fire", priority: "high" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: "t-new",
      title: "Printer on fire",
      priority: "high",
      status: "open",
      openedAt: "2026-03-15T10:00:00.000Z",
    });
    expect(app.tickets()).toHaveLength(1);
    expect(app.tickets()[0]).toMatchObject({ id: "t-new", title: "Printer on fire", priority: "high" });
  });

  it("defaults the priority to normal", async () => {
    const { response } = await post({ title: "Mouse missing" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ priority: "normal" });
  });

  it.each([
    ["no body", null],
    ["a string body", "title=Printer"],
    ["no title", { priority: "high" }],
    ["a blank title", { title: "", priority: "high" }],
    ["a title of the wrong type", { title: 42 }],
    ["an unknown priority", { title: "Printer", priority: "urgent" }],
  ])("rejects %s with 400 and opens nothing", async (_label, body) => {
    const { app, response } = await post(body);

    expect(response.status).toBe(400);
    expect(app.tickets()).toEqual([]);
  });
});
