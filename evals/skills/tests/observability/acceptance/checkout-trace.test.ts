import { SpanStatusCode } from "@opentelemetry/api";
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

const CARD_TOKEN = "tok_live_secret_4242";
const EMAIL = "ada@example.com";
const CUSTOMER = "cus_77421";

const basket = () => ({
  customerId: CUSTOMER,
  email: EMAIL,
  cardToken: CARD_TOKEN,
  lines: [
    { sku: "MUG-1", quantity: 2, unitPricePence: 899 },
    { sku: "TEA-9", quantity: 1, unitPricePence: 701 },
  ],
});

const captures: PaymentsClient = {
  charge: async (charge: Charge) => ({
    paymentId: "pay_9001",
    capturedPence: charge.amountPence,
  }),
};

const declines: PaymentsClient = {
  charge: async () => {
    throw new Error("card_declined");
  },
};

const post = async (payments: PaymentsClient) => {
  const { router } = createApp({ payments, newOrderId: () => "ord_9001" });
  return router.handle({
    method: "POST",
    path: "/checkout",
    params: {},
    body: basket(),
  });
};

const rootSpans = (): ReadableSpan[] =>
  exporter
    .getFinishedSpans()
    .filter((span) => span.parentSpanContext === undefined);

const everything = (span: ReadableSpan | undefined) =>
  JSON.stringify({
    name: span?.name,
    attributes: span?.attributes,
    events: span?.events,
    status: span?.status,
  });

const values = (span: ReadableSpan | undefined) =>
  JSON.stringify(Object.values(span?.attributes ?? {}));

describe("acceptance: one canonical event per checkout", () => {
  it("records a single request-level event for a successful checkout", async () => {
    exporter.reset();

    const response = await post(captures);

    expect(response.status).toBe(201);
    const roots = rootSpans();
    expect(roots).toHaveLength(1);
    expect(values(roots[0])).toContain(CUSTOMER);
    expect(values(roots[0])).toMatch(/2499|24\.99/);
  });

  it("records a single request-level event when the card is declined", async () => {
    exporter.reset();

    const response = await post(declines);

    expect(response.status).toBe(502);
    const roots = rootSpans();
    expect(roots).toHaveLength(1);
    expect(values(roots[0])).toContain(CUSTOMER);
    const failureIsVisible =
      roots[0]?.status.code === SpanStatusCode.ERROR ||
      /declin|payment|fail|502/i.test(values(roots[0]));
    expect(failureIsVisible).toBe(true);
  });

  it("keeps the card token and the email address out of the telemetry", async () => {
    exporter.reset();

    await post(captures);
    await post(declines);

    const emitted = exporter.getFinishedSpans().map(everything).join("\n");
    expect(emitted).not.toContain(CARD_TOKEN);
    expect(emitted).not.toContain(EMAIL);
  });
});
