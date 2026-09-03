// Rule probe (validationStatusMapping): "Return 400 when the representation
// itself cannot be parsed (for example malformed JSON). Once parsing succeeds,
// return 422 when the value fails the endpoint schema or business validation.
// Pick and document a different house mapping only when every example, error
// translator, and consumer uses it consistently."
//
// The probe asserts only what every mapping must satisfy — neither failure is
// a success and neither takes the request down — and reports the two statuses
// it saw on stdout. The grader reads those lines: 400 then 422 passes
// outright; any other pair of client errors passes only when the repository's
// own documentation records that house mapping.
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

const isClientError = (status: number) => status >= 400 && status < 500;

describe("bad representation and bad values are told apart", () => {
  it("refuses a body that is not JSON", async () => {
    const response = await buildApp().request("/orders", {
      method: "POST",
      headers,
      body: "{ this is not json",
    });

    console.log(`PARSE_STATUS=${response.status}`);
    expect(isClientError(response.status)).toBe(true);
  });

  it("refuses a well-formed order that breaks the rules", async () => {
    const response = await buildApp().request("/orders", {
      method: "POST",
      headers,
      body: JSON.stringify({
        lines: [{ sku: "", quantity: 0, unitPrice: -5 }],
        deliveryFee: -1,
      }),
    });

    console.log(`VALIDATION_STATUS=${response.status}`);
    expect(isClientError(response.status)).toBe(true);
  });
});
