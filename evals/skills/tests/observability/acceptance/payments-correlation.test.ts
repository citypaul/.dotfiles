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

const basket = () => ({
  customerId: "cus_31337",
  email: "grace@example.com",
  cardToken: "tok_live_2222",
  lines: [{ sku: "MUG-1", quantity: 1, unitPricePence: 1250 }],
});

const createRecordingPayments = () => {
  const charges: Charge[] = [];
  const payments: PaymentsClient = {
    charge: async (charge: Charge) => {
      charges.push(charge);
      return { paymentId: "pay_31337", capturedPence: charge.amountPence };
    },
  };
  return { charges, payments };
};

const traceIdsOf = (spans: ReadableSpan[]) =>
  new Set(spans.map((span) => span.spanContext().traceId));

describe("acceptance: the payments provider can correlate our calls", () => {
  it("sends W3C trace context on the charge, alongside the headers we already send", async () => {
    exporter.reset();
    const recording = createRecordingPayments();
    const { router } = createApp({
      payments: recording.payments,
      newOrderId: () => "ord_31337",
    });

    const response = await router.handle({
      method: "POST",
      path: "/checkout",
      params: {},
      body: basket(),
    });

    expect(response.status).toBe(201);
    expect(recording.charges).toHaveLength(1);
    const headers = recording.charges[0]?.headers ?? {};
    expect(headers["idempotency-key"]).toBe("ord_31337");
    const traceparent = headers.traceparent ?? "";
    expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[0-9a-f]$/);

    const traceIds = traceIdsOf(exporter.getFinishedSpans());
    const carried = traceparent.split("-")[1] ?? "";
    expect(traceIds.has(carried)).toBe(true);
  });
});
