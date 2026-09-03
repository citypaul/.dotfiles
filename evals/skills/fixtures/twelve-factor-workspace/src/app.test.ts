import { describe, expect, it } from "vitest";
import { createApp } from "./app";
import { createDbPool } from "./lib/db-pool";
import type { ServerRequest } from "./lib/http-server";

const request = (overrides: Partial<ServerRequest> = {}): ServerRequest => ({
  method: "GET",
  path: "/health",
  headers: {},
  body: null,
  ...overrides,
});

const anApp = () => createApp({ pool: createDbPool({ connectionString: "postgres://test/sessions" }) });

describe("sessions", () => {
  it("issues a session for a sign-in", async () => {
    const response = await anApp().handle(
      request({ method: "POST", path: "/sessions", body: { email: "ada@example.com" } }),
    );

    expect(response.status).toBe(201);
    expect((response.body as { id: string }).id).toMatch(/[0-9a-f-]{36}/);
  });

  it("reads back a session that was issued", async () => {
    const app = anApp();
    const created = await app.handle(
      request({ method: "POST", path: "/sessions", body: { email: "grace@example.com" } }),
    );
    const id = (created.body as { id: string }).id;

    const response = await app.handle(request({ path: `/sessions/${id}` }));

    expect(response.status).toBe(200);
    expect((response.body as { email: string }).email).toBe("grace@example.com");
  });

  it("turns away a sign-in without an email", async () => {
    const response = await anApp().handle(request({ method: "POST", path: "/sessions", body: {} }));

    expect(response.status).toBe(400);
  });

  it("reports an unknown session as missing", async () => {
    const response = await anApp().handle(request({ path: "/sessions/does-not-exist" }));

    expect(response.status).toBe(404);
  });
});
