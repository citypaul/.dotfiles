# Testing Telemetry

Instrumentation is behavior: someone (an operator, a dashboard, an SLO) depends on it, so it is test-driven like any behavior (see the `tdd` and `testing` skills). Untested instrumentation is the classic silent regression — nothing fails when a refactor drops the one attribute an alert was built on.

## In-Memory Exporters

The OTel JS SDK ships `InMemorySpanExporter`: spans are captured in process memory where assertions can inspect them — no network, no flakiness, no external backend to query.

```typescript
// test/helpers/telemetry.ts
import { NodeTracerProvider, SimpleSpanProcessor, InMemorySpanExporter } from '@opentelemetry/sdk-trace-node';

export const createTestTelemetry = (): {
  readonly exporter: InMemorySpanExporter;
  readonly provider: NodeTracerProvider;
} => {
  const exporter = new InMemorySpanExporter();
  const provider = new NodeTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  return { exporter, provider };
};
```

Use `SimpleSpanProcessor` in tests (synchronous export — no batching delay to await) even though production uses the batching processor.

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('pledge request instrumentation', () => {
  it('records the rejection reason on the request span', async () => {
    const { exporter, provider } = createTestTelemetry();
    const handler = createPledgeHandler({ tracer: provider.getTracer('test'), ...fakePorts() });

    await handler(getMockPledgeRequest({ amount: tooMuch }));

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);
    expect(spans[0]?.attributes).toMatchObject({
      'pledge.rejection_reason': 'insufficient-balance',
    });
  });

  it('marks the span as errored when the repository fails', async () => {
    const { exporter, provider } = createTestTelemetry();
    const handler = createPledgeHandler({
      tracer: provider.getTracer('test'),
      ...fakePorts({ repoFails: true }),
    });

    await handler(getMockPledgeRequest());

    const spans = exporter.getFinishedSpans();
    expect(spans[0]?.status.code).toBe(SpanStatusCode.ERROR);
  });
});
```

Assert through the public API — drive the handler, inspect the exported spans. Do not spy on `span.setAttributes` calls; that tests HOW, not WHAT (see the `testing` skill).

## Testing the Canonical Wide Event

The wide event is a contract with operations: test it like one. Inject a recording logger (the `twelve-factor` skill's logger semantics make this a plain fake) and assert the emitted event's fields:

```typescript
it('emits one canonical event per request, including on failure', async () => {
  const logger = createRecordingLogger();
  const app = createApp({ logger, ...fakePorts({ repoFails: true }) });

  await request(app).post('/pledges').send(validBody);

  const canonical = logger.records.filter((r) => r.message === 'canonical-log-line');
  expect(canonical).toHaveLength(1);
  expect(canonical[0]?.fields).toMatchObject({
    'http.response.status_code': 500,
    'error.type': 'RepositoryUnavailable',
  });
});
```

The "including on failure" case is the one that matters — anti-pattern #3 in SKILL.md is precisely the regression this test pins.

## Fakes for Telemetry Ports

Where domain-significant observations flow through an explicit driven port (a Domain Probe — see the `hexagonal-architecture` skill's four-tier model), the port gets a recording fake like every other driven port. The worked example lives in that skill's `resources/testing-hex-arch.md`; the shape is:

```typescript
const instrumentation = createRecordingPledgeInstrumentation();
// ...drive the use case...
expect(instrumentation.observed).toContainEqual({
  kind: 'pledge-rejected',
  reason: 'funding-closed',
});
```

This keeps domain tests free of OTel imports entirely: the probe's *adapter* — the code translating observations into span attributes or metric increments — is tested separately with the in-memory exporter, as adapter code.

## Testing PII Hygiene

Redaction rules are behavior with a compliance stake. Test them at the emission boundary:

```typescript
it('never emits the authorization header into telemetry', async () => {
  const logger = createRecordingLogger();
  const app = createApp({ logger, ...fakePorts() });

  await request(app).post('/pledges').set('Authorization', 'Bearer secret-token').send(validBody);

  const serialized = JSON.stringify(logger.records);
  expect(serialized).not.toContain('secret-token');
});
```

Crude, and deliberately so — a substring sweep over everything emitted catches the leak no matter which field it rode in on.

## Alert Rules Are Code

Prometheus rule files can be unit-tested with `promtool test rules`: feed synthetic series (an error rate above/below the burn-rate threshold) and assert which alerts fire and with what labels. If SLOs are defined in a code-generation tool, test the generator's output the same way. At minimum, review alert-rule changes with the same rigor as production code — a broken alert fails silently until the outage it was for.

## Honest Limits

Not everything here is unit-testable, and pretending otherwise breeds false confidence:

- **Sampling percentages and tail-sampling policies** run in the Collector — verify in a staging environment with a real Collector, not in Vitest
- **Backend retention, indexing, and query behavior** are the vendor's; a canary query in staging beats any local assertion
- **Context propagation across real network hops** needs at least one integration test with two real processes (or trace-based testing tooling); in-memory tests can't prove header plumbing through proxies
- Sampling and pipeline config are a **parity surface**: staging at 100% sampling and production at 1% behave differently during an incident — see the `production-parity-skill-builder` skill
