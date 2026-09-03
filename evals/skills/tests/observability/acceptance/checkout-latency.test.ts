import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  type ReadableSpan,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { describe, expect, it } from "vitest";
import { createApp } from "./index";
import type { Charge, PaymentsClient } from "./lib/payments";

const exporter = new InMemorySpanExporter();
new NodeTracerProvider({
  spanProcessors: [new SimpleSpanProcessor(exporter)],
}).register();

const captures: PaymentsClient = {
  charge: async (charge: Charge) => ({
    paymentId: "pay_5150",
    capturedPence: charge.amountPence,
  }),
};

const basket = (customerId: string) => ({
  customerId,
  email: `${customerId}@example.com`,
  cardToken: "tok_live_1111",
  lines: [{ sku: "MUG-1", quantity: 3, unitPricePence: 500 }],
});

const app = () =>
  createApp({ payments: captures, newOrderId: () => "ord_5150" });

const rootSpans = (): ReadableSpan[] =>
  exporter
    .getFinishedSpans()
    .filter((span) => span.parentSpanContext === undefined);

const values = (span: ReadableSpan | undefined) =>
  JSON.stringify(Object.values(span?.attributes ?? {}));

describe("acceptance: checkout timing is attributable to a customer", () => {
  it("carries the paying customer on each request's own event", async () => {
    exporter.reset();
    const { router } = app();

    await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket("cus_alpha"),
    });
    await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket("cus_beta"),
    });

    const roots = rootSpans();
    expect(roots).toHaveLength(2);
    expect(values(roots[0])).toContain("cus_alpha");
    expect(values(roots[1])).toContain("cus_beta");
  });

  it("still answers the checkout and the unknown path the way it did before", async () => {
    exporter.reset();
    const { router } = app();

    const checkout = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket("cus_gamma"),
    });
    const unknown = await router.handle({
      method: "POST",
      path: "/checkout/9f2b1c/retry",
      params: {},
      body: basket("cus_gamma"),
    });

    expect(checkout).toEqual({
      status: 201,
      body: { orderId: "ord_5150", totalPence: 1500, paymentId: "pay_5150" },
    });
    expect(unknown.status).toBe(404);
  });
});
