// Hidden acceptance test for the stuck-spinner case: after a failed order the
// customer must be told, and must be able to try again. It asserts what a
// person can see and do — the busy text is gone, the button works again — and
// leaves the agent free to choose how the busy state is represented. The
// transport is stubbed at the outermost edge (globalThis.fetch) so it works
// whatever test setup the agent left behind.
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mountCheckout } from "./checkout.js";

const jsonResponse = (status: number, body: unknown): Response =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
  }) as unknown as Response;

const stubFetch = (respond: () => Response | Promise<Response>) => {
  vi.stubGlobal("fetch", async () => respond());
};

const mount = () => {
  document.body.innerHTML = '<section id="host"></section>';
  const host = document.body.firstElementChild as HTMLElement;
  mountCheckout(host);
  return userEvent.setup();
};

const orderButton = () =>
  screen.getByRole("button", { name: /place order/i }) as HTMLButtonElement;

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("acceptance: an order that does not go through", () => {
  it("says so and stops waiting when the request fails outright", async () => {
    stubFetch(() => Promise.reject(new Error("network down")));
    const user = mount();

    await user.click(orderButton());

    expect(await screen.findByText(/couldn't place your order/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/placing your order/i);
    expect(orderButton().disabled).toBe(false);
  });

  it("says so when the API answers with an error", async () => {
    stubFetch(() => jsonResponse(500, { message: "boom" }));
    const user = mount();

    await user.click(orderButton());

    expect(await screen.findByText(/couldn't place your order/i)).toBeDefined();
    expect(document.body.textContent).not.toMatch(/placing your order/i);
    expect(orderButton().disabled).toBe(false);
  });

  it("lets the customer try again and succeed", async () => {
    let attempt = 0;
    stubFetch(() => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new Error("network down"))
        : Promise.resolve(jsonResponse(201, { reference: "GS-9002" }));
    });
    const user = mount();

    await user.click(orderButton());
    await screen.findByText(/couldn't place your order/i);
    await user.click(orderButton());

    expect(await screen.findByText(/GS-9002/)).toBeDefined();
    expect(attempt).toBe(2);
  });
});
