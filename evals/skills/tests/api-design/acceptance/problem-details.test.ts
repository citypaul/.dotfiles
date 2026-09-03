// Rule probe (errorsUseProblemDetails): "For public APIs with external
// consumers, use RFC 9457 (Problem Details) ... Use `application/problem+json`
// as the Content-Type", with `status` matching the actual HTTP status, and
// "never expose stack traces, internal paths, or implementation details".
import { describe, expect, it } from "vitest";
import { createApp, createOrderStore } from "./index";

const buildApp = () => {
  let counter = 0;
  return createApp({
    orders: createOrderStore([]),
    newId: () => `ord_${++counter}`,
    now: () => new Date("2026-04-02T10:30:00.000Z"),
  });
};

const headers = {
  authorization: "Bearer partner-a",
  "content-type": "application/json",
};

const expectProblem = async (response: Response) => {
  expect(response.headers.get("content-type") ?? "").toContain("application/problem+json");
  const body = await response.json();
  expect(typeof body.type).toBe("string");
  expect(typeof body.title).toBe("string");
  expect(body.status).toBe(response.status);
  expect(JSON.stringify(body)).not.toMatch(/\/Users\/|node_modules|\.ts:\d+|\bat \w+ \(/);
};

describe("failures are problem documents", () => {
  it("describes an invalid order as one", async () => {
    await expectProblem(
      await buildApp().request("/orders", {
        method: "POST",
        headers,
        body: JSON.stringify({ lines: [] }),
      }),
    );
  });

  it("describes an unknown order as one", async () => {
    await expectProblem(await buildApp().request("/orders/ord_nope", { headers }));
  });

  it("describes a caller with no api key as one", async () => {
    await expectProblem(
      await buildApp().request("/orders", {
        headers: { "content-type": "application/json" },
      }),
    );
  });
});
