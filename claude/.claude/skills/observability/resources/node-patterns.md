# Node/TypeScript Observability Patterns

Implementation patterns for the rules in SKILL.md. Everything here is OpenTelemetry-based and backend-neutral — swap the OTLP endpoint, not the instrumentation.

## SDK Initialization

The instrumentation file must run **before** any application module loads — auto-instrumentation works by patching modules at require/import time. Loaded afterwards, it silently captures nothing.

```typescript
// instrumentation.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'occasions-api',
    [ATTR_SERVICE_VERSION]: process.env.BUILD_ID ?? 'dev',
  }),
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

export const shutdownTelemetry = (): Promise<void> => sdk.shutdown();
```

Register `shutdownTelemetry` with the application's single shutdown coordinator; do not install a competing signal listener in instrumentation. One coordinator drains the server, backing services, and telemetry in the required order before the process exits.

Run with the instrumentation loaded first:

```bash
node --import ./dist/instrumentation.mjs dist/app.mjs
# or during development (Node 20+):
./node_modules/.bin/tsx --import ./src/instrumentation.ts src/app.ts
```

Use the repository's existing script when it has one. The direct development
example assumes an already reviewed, locked `tsx` dependency; do not download a
moving executable implicitly just to run it.

Caveats:

- ESM applications may need the loader hook variant (`--experimental-loader=@opentelemetry/instrumentation/hook.mjs`) depending on Node version — check the OTel JS docs for the current matrix
- Don't set conflicting `--import`/`--require` flags in `NODE_OPTIONS`
- Exporter endpoint and headers come from standard env vars (`OTEL_EXPORTER_OTLP_ENDPOINT`, etc.) — config via environment, consistent with the `twelve-factor` skill

## The Wide-Event Middleware

One request-scoped accumulator, enriched during the request, emitted once in teardown. The accumulator is the only mutable object; treat it as edge infrastructure, like a test fake's internal store.

```typescript
type CanonicalEvent = Record<string, string | number | boolean>;

interface EventContext {
  readonly set: (fields: CanonicalEvent) => void;
}

const createEventContext = (): EventContext & { readonly snapshot: () => CanonicalEvent } => {
  let fields: CanonicalEvent = {};
  return {
    set: (added) => {
      fields = { ...fields, ...added };
    },
    snapshot: () => fields,
  };
};
```

```typescript
// Express-style middleware — same shape works in Fastify hooks or Next.js middleware
const canonicalLogLine =
  (logger: Logger) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const ctx = createEventContext();
    const startedAt = performance.now();
    res.locals.eventContext = ctx;

    let emitted = false;
    const emit = (aborted: boolean): void => {
      if (emitted) return;
      emitted = true;
      logger.info('canonical-log-line', {
        ...ctx.snapshot(),
        'http.request.method': req.method,
        ...(typeof res.locals.httpRouteTemplate === 'string'
          ? { 'http.route': res.locals.httpRouteTemplate }
          : {}),
        'http.response.status_code': res.statusCode,
        response_aborted: aborted,
        duration_ms: Math.round(performance.now() - startedAt),
        trace_id: trace.getActiveSpan()?.spanContext().traceId ?? '',
      });
    };

    res.once('finish', () => emit(false));
    res.once('close', () => emit(!res.writableFinished));

    next();
  };
```

`finish` covers normally completed responses, including handled error responses; `close` also catches a connection that terminates before completion. The idempotent emitter prevents the normal `finish` → `close` sequence from producing two events and records premature closure in `response_aborted`. The route adapter sets `res.locals.httpRouteTemplate` only after a route matches, using the framework-normalized full template including any mount prefix. Omit `http.route` when that value is unavailable. Never fall back to `req.path` or a partial router path: raw paths can contain identifiers/secrets, while partial templates merge unrelated mounted routes. Downstream code enriches via `ctx.set({ 'pledge.rejection_reason': 'funding-closed' })`; in a hexagonal codebase those domain dimensions arrive through result types, a Domain Probe adapter, or a domain-event subscriber (see the `hexagonal-architecture` skill) — never by passing the accumulator into domain code.

**Span-based alternative:** skip the separate log line and put the same fields on the root span as attributes (`trace.getActiveSpan()?.setAttributes(...)`). A root span with rich attributes IS the canonical event; choose based on where your querying happens.

## Correlating Logs with Traces

Every log record should carry the active trace ID so logs, traces, and the canonical event join on one key.

```typescript
import { trace } from '@opentelemetry/api';

const withTraceContext = (fields: Record<string, unknown>): Record<string, unknown> => {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (spanContext === undefined) return fields;
  return { ...fields, trace_id: spanContext.traceId, span_id: spanContext.spanId };
};
```

Wire this into the logger factory once (pino mixin, winston format, or the custom logger from the `twelve-factor` skill's `node-patterns.md`) rather than at call sites. Several ecosystems ship this ready-made (e.g. pino's OTel transport); prefer the built-in integration when one exists.

## Manual Spans for Business Meaning

Auto-instrumentation names spans after plumbing (`GET /occasions/:id`). Add manual spans or attributes only where business meaning exists:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('occasions');

const withSpan = async <T>(name: string, fn: () => Promise<T>): Promise<T> =>
  tracer.startActiveSpan(name, async (span) => {
    try {
      return await fn();
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
```

Keep this in adapters and middleware. Domain code never imports `@opentelemetry/api` — see SKILL.md "Where Instrumentation Lives".

## Semantic-Convention Cheat Sheet

Use these names instead of inventing your own ([registry](https://opentelemetry.io/docs/specs/semconv/)):

| Instead of... | Use |
|---------------|-----|
| `method`, `verb` | `http.request.method` |
| `status`, `code` | `http.response.status_code` |
| `url`, `endpoint` | `url.full` / `http.route` |
| `db`, `database` | `db.system.name`, `db.query.text` |
| `host`, `server` | `server.address`, `server.port` |
| `error`, `exception` | `error.type`, `exception.message` |
| `service`, `app` | `service.name`, `service.version` (resource attributes) |

Custom business attributes get a namespace prefix that can't collide with semconv: `pledge.rejection_reason`, `occasion.id`.

## Collector: Recommended Production Setup

A Collector is the recommended production default so the app offloads quickly and batching, retry, redaction, and backend choice live in config rather than application code. A documented direct-export exception is reasonable for a simple deployment only when the SDK/backend path meets the required buffering, retry, backpressure, filtering, and operational guarantees:

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      http:
      grpc:

processors:
  batch: {}
  # redaction/attribute processors go here — second line of defense, not the first

exporters:
  otlphttp:
    endpoint: ${env:TELEMETRY_BACKEND_ENDPOINT}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
```

Tail sampling, if you need it, is a Collector processor (`tail_sampling`) — it requires all spans of a trace to reach the same Collector instance, which is what makes it a stateful tier to operate. Start without it; add it when completed-trace attributes justify preferential retention of selected errors or outliers, then capacity-test the policy because it cannot guarantee retention (see SKILL.md "Sampling and Cost Economics").
