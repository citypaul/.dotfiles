// Hidden acceptance test for the checkout case. The request asks only for
// evidence, so this is a regression guard: it passes on the untouched fixture
// and fails only if the agent changed what the basket does for a customer.
// The transport is stubbed at the outermost edge (globalThis.fetch) so it
// works whatever test setup the agent left behind.
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountCheckout } from "./checkout.js";

type Call = { readonly url: string; readonly body: unknown };

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
  }) as unknown as Response;

const stubFetch = (respond: () => Response | Promise<Response>) => {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (input: unknown, init?: { body?: unknown }) => {
    calls.push({
      url: String(input),
      body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body,
    });
    return respond();
  });
  return calls;
};

const mount = () => {
  document.body.innerHTML = '<section id="host"></section>';
  const host = document.body.firstElementChild as HTMLElement;
  mountCheckout(host);
  return userEvent.setup();
};

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("acceptance: the checkout", () => {
  it("totals the basket as it starts", () => {
    stubFetch(() => jsonResponse(201, { reference: "GS-9001" }));
    mount();

    expect(document.body.textContent).toMatch(/Total:\s*£127\.97/);
  });

  it("retotals when a quantity changes and orders what is on screen", async () => {
    const calls = stubFetch(() => jsonResponse(201, { reference: "GS-9001" }));
    const user = mount();

    const quantity = screen.getByLabelText(/trail runner jacket quantity/i);
    await user.clear(quantity);
    await user.type(quantity, "3");

    expect(document.body.textContent).toMatch(/Total:\s*£307\.95/);

    await user.click(screen.getByRole("button", { name: /place order/i }));

    expect(await screen.findByText(/GS-9001/)).toBeDefined();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toMatch(/\/api\/orders$/);
    expect(calls[0]?.body).toEqual({
      lines: [
        { sku: "GS-JACKET", quantity: 3 },
        { sku: "GS-BOTTLE", quantity: 2 },
      ],
    });
  });
});
