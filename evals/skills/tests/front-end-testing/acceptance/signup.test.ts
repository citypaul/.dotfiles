// Hidden acceptance test for the sign-up case. The request asks only for
// tests, so this is a regression guard: it passes on the untouched fixture and
// fails only if the agent changed what the form does for a user. It drives the
// form the way a person does and stubs the transport at the outermost edge
// (globalThis.fetch) so it works whatever test setup the agent left behind.
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountSignupForm } from "./signup.js";

type Call = { readonly url: string; readonly body: unknown };

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
  }) as unknown as Response;

const stubFetch = (respond: (call: Call) => Response | Promise<Response>) => {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (input: unknown, init?: { body?: unknown }) => {
    const call = {
      url: String(input),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    };
    calls.push(call);
    return respond(call);
  });
  return calls;
};

const mount = () => {
  document.body.innerHTML = '<section id="host"></section>';
  const host = document.body.firstElementChild as HTMLElement;
  mountSignupForm(host);
  return userEvent.setup();
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("acceptance: the sign-up form", () => {
  it("sends what the person typed and tells them the account was created", async () => {
    const calls = stubFetch(() => jsonResponse(201, { id: "signup-1" }));
    const user = mount();

    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "ada@example.com");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/account created/i)).toHaveProperty(
      "textContent",
      expect.stringMatching(/Ada Lovelace/),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toMatch(/\/api\/signups$/);
    expect(calls[0]?.body).toEqual({
      fullName: "Ada Lovelace",
      email: "ada@example.com",
    });
  });

  it("refuses an address that is not an email without calling the API", async () => {
    const calls = stubFetch(() => jsonResponse(201, { id: "signup-1" }));
    const user = mount();

    await user.type(screen.getByLabelText(/full name/i), "Ada Lovelace");
    await user.type(screen.getByLabelText(/email/i), "ada-at-example");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/valid email/i)).toBeDefined();
    expect(calls).toHaveLength(0);
  });
});
