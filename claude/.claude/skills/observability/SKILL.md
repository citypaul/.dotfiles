---
name: observability
description: Observability as an engineering discipline — wide events / canonical log lines, OpenTelemetry instrumentation (traces, metrics, context propagation, sampling, Collector), SLIs/SLOs/error budgets, symptom-based alerting with burn rates, telemetry hygiene, and testing instrumentation as behavior. Use when instrumenting a service, designing SLOs or alerts, choosing what to log/trace/measure, investigating production unknowns, or reviewing telemetry cost and cardinality. For log transport and shape (stdout, JSON, levels, timestamps) see twelve-factor; for CI failure diagnosis see ci-debugging; for where instrumentation lives in ports-and-adapters codebases see hexagonal-architecture; for environment drift see production-parity-skill-builder; for HTTP error response shape see api-design.
---

# Observability

**Instrument for the questions you haven't asked yet.** Monitoring verifies failure modes you predicted; observability lets you interrogate the system about failures you never anticipated. Effective telemetry answers two questions — *what's broken* (symptom) and *why* (cause) — and the effort split is lopsided: spend far more on catching symptoms than on enumerating causes ([Google SRE, Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)).

This skill covers what goes *into* telemetry and how it is consumed. The `twelve-factor` skill owns log transport and shape (structured JSON to stdout, levels, timestamps). The `hexagonal-architecture` skill owns where instrumentation code lives in ports-and-adapters codebases.

**Deep-dive resources** are in the `resources/` directory. Load them on demand:

| Resource | Load when... |
|----------|-------------|
| `node-patterns.md` | Wiring OpenTelemetry into a Node/TypeScript service — NodeSDK setup, `--import` loading, wide-event middleware, log-trace correlation, Collector config, semantic-convention cheat sheet |
| `slo-alerting.md` | Defining SLIs/SLOs, computing burn rates, building multiwindow multi-burn-rate alert rules, writing runbooks |
| `testing-telemetry.md` | Writing Vitest tests for instrumentation — in-memory exporters, asserting wide-event fields, fakes for telemetry ports |
| `references.md` | Checking the rationale or original sources behind this guidance |

---

## When to Use

- Instrumenting a new or existing service (backend, worker, API)
- Defining SLIs/SLOs or an error budget policy
- Designing, reviewing, or pruning alerts
- "We can't see what production is doing" — debugging unknown-unknowns
- Reviewing telemetry spend, metric cardinality, or sampling strategy

**Not this skill:** diagnosing a failing CI run (`ci-debugging`), local-vs-production drift (`production-parity-skill-builder`), Core Web Vitals optimization (`core-web-vitals` where installed).

---

## The Wide Event (Canonical Log Line)

**The opinionated default: emit one structured, information-dense event per request per service.** This is Stripe's canonical log line — "one long log line at the end that includes many of their key characteristics" ([Stripe](https://stripe.com/blog/canonical-log-lines)) — and the "arbitrarily-wide structured event" at the heart of modern observability ([Charity Majors](https://charity.wtf/2019/02/05/logs-vs-structured-events/)).

**The mechanics:**

1. Middleware creates a request-scoped accumulator when the request enters the service
2. Business logic and middleware add fields as work happens
3. The event is emitted once, at the end of the request, in `finally`/teardown logic — **it must survive the exception path**, because that is exactly when you need it

**What goes in it:**

| Category | Example fields |
|----------|---------------|
| Request | method, path, status, duration |
| Identity | user/principal ID, auth method, API key ID |
| Rate limiting | allowed, quota, remaining |
| Performance | DB query count, cache hits, external call timings |
| Business context | which rule fired, rejection reason, feature flags |
| Error | error code, error class, retry count |
| Correlation | trace ID, request ID, build/deploy ID |

**High-cardinality identifiers belong here** — user IDs, request IDs, build IDs, "literally anything interesting" (Majors). Events are where high cardinality is a feature; on metrics it is a cost explosion (see Sampling and Cost Economics below).

Why this beats scattered log lines: the data arrives pre-joined. You query complete rows instead of reconstructing a request from fragments with regex and hope. An OpenTelemetry root span with rich attributes is a valid implementation of the same pattern — instrumenting via spans satisfies both the wide-event and the tracing camps at once.

---

## Pillars, Honestly

The industry framing is "three pillars": logs, metrics, traces. The serious critique (Majors, [Observability 1.0 vs 2.0](https://charity.wtf/2024/11/19/there-is-only-one-key-difference-between-observability-1-0-and-2-0/)): three pillars means many sources of truth scattered across tools, each request stored several times, engineers correlating by hand, and cost multiplied per pillar. The alternative: one source of truth — wide structured events — from which metrics, traces, and SLOs are *derived* at read time.

**House position:**

- **Wide events are the instrumentation default.** They cost nothing extra to emit and keep every future question answerable.
- **Metrics still earn their place** for cheap, long-retention aggregates and alerting math — with strictly bounded label sets.
- **Traces are wide events with structure** — parent/child causality across services. Instrument via OTel spans and you get both.

**Honest limit:** deriving everything at read time assumes a backend that can aggregate over raw events at scale. Not every stack has one. Don't cargo-cult either camp — emit wide events regardless (the data is the asset; backends change), and keep a small set of bounded metrics for dashboards and alert rules.

---

## OpenTelemetry: The Substrate

OpenTelemetry (OTel) is the vendor-neutral standard for producing telemetry. Adopting it means the instrumentation outlives any backend choice.

**The pieces:**

- **Signals** — traces, metrics, logs, all exported over OTLP
- **Resource attributes** — `service.name` is mandatory; it identifies the emitting service in every backend
- **Semantic conventions** — standardized attribute names (`http.request.method`, `db.system`) that make telemetry correlatable across teams and tools ([semconv](https://opentelemetry.io/docs/specs/semconv/)). **Never invent an attribute name semconv already defines.**
- **Context propagation** — the W3C `traceparent` header carries trace ID and parent span ID across every service hop, which is what makes distributed traces exist at all ([context propagation](https://opentelemetry.io/docs/concepts/context-propagation/))
- **The Collector** — a receive → process → export pipeline that runs beside your services. Direct SDK-to-backend export is fine in development; production traffic goes through a Collector for batching, retry, redaction, and backend swaps without code changes ([Collector](https://opentelemetry.io/docs/collector/))

**Minimal TypeScript adoption:** `@opentelemetry/sdk-node` + `@opentelemetry/api` + `@opentelemetry/auto-instrumentations-node`, an instrumentation file loaded *before* application code via `node --import ./instrumentation.mjs` (Node 20+: `npx tsx --import ./instrumentation.ts`), OTLP exporters. Auto-instrumentation gives HTTP/framework/DB spans for free; manual attributes add the business meaning that makes traces queryable. Initialization order matters — instrumentation loaded after the app's modules silently captures nothing. See `resources/node-patterns.md`.

---

## Sampling and Cost Economics

### The cardinality routing rule

Every unique label combination on a metric is a separate time series. Add `tenant_id` (10,000 values) to a metric with 1,000 existing series and you have 10 million series, not 11,000; each active series costs memory and most vendors bill per series or per custom metric ([Grafana on high cardinality](https://grafana.com/blog/how-to-manage-high-cardinality-metrics-in-prometheus-and-kubernetes/)).

**The rule: bounded, low-cardinality dimensions go on metrics; unbounded, high-cardinality dimensions go on events/spans.** No metric label may derive from user input, IDs, or raw URLs. When someone asks "can we break this metric down by customer?", the answer is "that question belongs to the event store."

### The sampling ladder

| Stage | When | How |
|-------|------|-----|
| No sampling | Low volume | Keep everything — sampling is a cost tool, not a virtue |
| Head sampling | Volume grows | Decision at trace start (probabilistic on trace ID), propagates consistently, cheap — but cannot guarantee capturing errors |
| Tail sampling | Error/latency retention must be guaranteed | Decision after the full trace arrives; keeps 100% of errors and outliers, but requires a stateful Collector tier — buffering, scaling, operational cost, possible lock-in |

([OTel sampling concepts](https://opentelemetry.io/docs/concepts/sampling/))

**Never silently sample the stream your SLOs are computed from.** If sampling is unavoidable there, account for it in the SLI math and keep error traces at 100% via tail sampling.

---

## SLIs, SLOs, Error Budgets

Definitions from the [Google SRE book](https://sre.google/sre-book/service-level-objectives/): an **SLI** is a carefully defined quantitative measure of service level; an **SLO** is a target value for that SLI; an **SLA** is an SLO plus consequences. The **error budget** is 100% minus the SLO — and its purpose is to *license shipping*: spend the budget on releases instead of chasing a 100% that users can't distinguish anyway.

**SLI menus (mnemonics for shopping, not mandates):**

- **RED** — Rate, Errors, Duration — per request-driven service; explicitly a proxy for user experience ([Tom Wilkie](https://grafana.com/blog/the-red-method-how-to-instrument-your-services/))
- **USE** — Utilization, Saturation, Errors — per hardware resource; infrastructure-focused (Brendan Gregg)
- **Four Golden Signals** — latency, traffic, errors, saturation — with two nuances everyone drops: track latency of *failed* requests separately (a slow 500 is a different pathology from a fast 500), and use histograms because averages hide the tail — at 1,000 rps averaging 100ms, 1% of requests can easily take 5s ([SRE book](https://sre.google/sre-book/monitoring-distributed-systems/))

**SLO discipline:** few SLOs, defined on percentiles (p99, not mean), simple enough to explain in a sentence. Keep internal targets slightly stricter than published ones. Don't overachieve — users come to depend on the reliability you deliver, not the one you promised.

---

## Alerting: Symptoms, Pages, Burn Rates

**Page on symptoms, not causes.** "Do your users care if your MySQL servers are down? No, they care if their queries are failing" ([Rob Ewaschuk, My Philosophy on Alerting](https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic) — the doc that became SRE book chapter 6). Cause-based data belongs on dashboards and in tickets, not pages. The rare exception: imminent, definite causes (quota exhaustion in 4 hours).

**Every page must be:** urgent, actionable, user-visible, and require human intelligence to handle. If the response to a page could be scripted, script it and delete the page. Pages under ~90% precision get reviewed and fixed or removed — false pages are how on-call trust dies.

**The default alert construction is the multiwindow, multi-burn-rate alert** ([SRE Workbook](https://sre.google/workbook/alerting-on-slos/)). Burn rate = how fast you consume error budget relative to the SLO (burn rate 1 = exactly out of budget at period end). For a 99.9% SLO over 30 days:

| Severity | Burn rate | Long window | Short window | Budget consumed |
|----------|-----------|-------------|--------------|-----------------|
| Page | 14.4 | 1 h | 5 m | 2% |
| Page | 6 | 6 h | 30 m | 5% |
| Ticket | 1 | 3 d | 6 h | 10% |

The short window (1/12 of the long) confirms the problem is *still happening*, which fixes the reset-time failure of naive threshold alerts. This is the only construction that scores well on precision, recall, detection time, and reset time simultaneously — the derivation is in `resources/slo-alerting.md`.

**Every page links a runbook** — a concise "what this alert means and current mitigations", not an exhaustive troubleshooting tree.

---

## Structured Logging Craft

The `twelve-factor` skill owns transport and shape (structured JSON to stdout, four levels, ISO timestamps). This section is about *content discipline*.

**The levels test** (from [Dave Cheney](https://dave.cheney.net/2015/11/05/lets-talk-about-logging)): "nobody reads warnings, because by definition nothing went wrong," and "if you choose to handle the error by logging it, by definition it's not an error any more." Keep the standard four levels — but apply Cheney's test to every line: every `warn` needs a named reader; every `error` log must correspond to a genuinely unhandled failure, not a handled one being double-reported.

**Log at boundaries; accumulate in between.** Most in-request `info` chatter should become fields on the wide event, not separate lines. A request that produces 40 log lines produces one canonical event plus a handful of genuinely independent facts.

**Correlation:** every log record carries the active trace ID (W3C trace context), so logs join to traces and to the canonical event for free.

**PII and secret hygiene:**

- Never emit passwords, tokens, API keys, cookies, session IDs, or personal data into any signal
- **Allowlist named fields** — never serialize whole request/user/config objects; a JSON serializer will happily dump auth headers
- Redact at source, in the app — the pipeline is a second line of defense, not the first
- In regulated environments, every log line containing PII becomes a compliance obligation (retention, access control, right-to-erasure)

---

## Where Instrumentation Lives (Architecture Placement)

In ports-and-adapters codebases, observability code has four homes — the four-tier model (full treatment: `hexagonal-architecture` skill, `resources/cross-cutting-concerns.md`):

1. **Technical telemetry → adapters.** Request/response logging, SQL timings, retries, auto-instrumentation. Never in domain code.
2. **Domain-significant observations → an explicit driven port (Domain Probe) or domain events.** When an intermediate business fact matters ("which pricing rule fired") or the observation is a requirement (support logging, business metrics), the observability backend is a driven actor behind a per-capability, severity-free, fire-and-forget port — never a generic `Logger` port. Where domain events already exist, an observability subscriber beats a second channel.
3. **Correlation and wide-event assembly → middleware/adapters only.** The domain never sees a trace ID. Domain dimensions reach the wide event via result types, the probe, or events.
4. **Instrumentation is tested behavior.** A probe is a driven port; every driven port gets a fake (see Testing Observability below).

Even without hexagonal architecture, the same instinct applies: business logic returns data and announces facts; edges translate those into telemetry.

---

## Testing Observability

Instrumentation is behavior, so it is test-driven like behavior (see the `tdd` and `testing` skills).

- **In-memory exporters** — the OTel SDKs ship them — let Vitest assert on every span, attribute, and status without network calls: "this request emits one canonical event containing `pledge.rejection_reason`", "this failure sets span status to error". See `resources/testing-telemetry.md`.
- **Telemetry ports get fakes**, same as any driven port — a recording fake accumulates observations and tests assert on them through the public API. Worked example: `hexagonal-architecture` skill, `resources/testing-hex-arch.md`.
- **Alert rules are code.** Where the stack allows (Prometheus rule unit tests, SLO-as-code tools), test that the burn-rate expression fires on synthetic data.
- **Mutation-testing note:** an unasserted probe/telemetry call is a surviving-mutant farm — which is itself the argument for asserting observations.

**Honest limits:** you cannot meaningfully unit-test sampling percentages, Collector pipelines, or backend retention. Verify those in a staging environment with a real Collector — and note that sampling config is itself a parity surface (staging at 100%, prod at 1% behave differently under debugging).

---

## Frontend Note (Out of Scope for v1)

Browser observability is RUM (real-user monitoring) with Core Web Vitals as the standard SLIs — LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at the 75th percentile of real page loads; lab tools are "not a substitute for field measurement" ([web.dev](https://web.dev/articles/vitals)). This skill covers services; for the user-facing half see the `core-web-vitals` and `performance` skills where installed.

---

## Anti-Patterns

| # | Anti-Pattern | Why It's Wrong |
|---|-------------|----------------|
| 1 | Unbounded label on a metric (user ID, raw URL, container ID) | Cardinality explosion — memory, query time, and bills scale per series |
| 2 | Scattered log lines instead of an accumulated wide event | Context arrives fragmented; investigation becomes regex archaeology |
| 3 | Canonical event skipped on the exception path | The event vanishes exactly when it matters most; emit in `finally` |
| 4 | Paging on causes (CPU, disk, replica lag) | Users don't experience causes; symptom pages catch more with less noise |
| 5 | A page without a runbook or with no possible action | Pages that can't be acted on train people to ignore pages |
| 6 | Serializing whole objects into logs | Auth headers, tokens, and PII ride along; allowlist named fields |
| 7 | Inventing attribute names semconv already defines | Breaks cross-team and cross-tool correlation for zero benefit |
| 8 | Sampling the stream SLOs are computed from, silently | SLI math becomes fiction; retain errors at 100% or adjust the math |
| 9 | `console.log` debugging left behind as "instrumentation" | Unstructured, unqueryable, uncorrelated — remove or promote to a real field |
| 10 | One vendor agent per signal instead of OTel | Locks instrumentation to a backend; OTel makes backends swappable |
| 11 | Alerting on every error the moment it happens | Error budgets exist so that noise below the burn-rate threshold stays out of pagers |

---

## Boundaries

| Concern | Owner |
|---------|-------|
| Log transport, stdout, JSON shape, levels exist, timestamps | `twelve-factor` |
| What goes IN telemetry; wide events, traces, SLOs, alerts | this skill |
| Diagnosing a failing CI run | `ci-debugging` |
| Telemetry ports, Domain Probes, four-tier placement detail | `hexagonal-architecture` |
| Environment drift (works locally, not in prod) | `production-parity-skill-builder` |
| HTTP error response bodies (RFC 9457) | `api-design` |
| CLI usage telemetry consent | `cli-design` |
| Core Web Vitals / frontend RUM | `core-web-vitals` (external, where installed) |

---

## Verification Checklist

- [ ] Every request emits exactly one canonical wide event, including on the exception path
- [ ] High-cardinality identifiers (user, request, build, tenant) live on events/spans, never on metric labels
- [ ] Metric labels are bounded sets; no label value derives from user input
- [ ] `service.name` and resource attributes are set; semantic-convention names used where they exist
- [ ] Trace context (W3C `traceparent`) propagates across every service hop and into every log record
- [ ] OTel SDK initializes before application code loads (`--import`), auto-instrumentation enabled
- [ ] Production telemetry flows through a Collector, not direct from app to vendor
- [ ] Sampling strategy is explicit and documented; error traces are retained (tail sampling or 100%)
- [ ] Each user journey has a handful of SLOs at most, defined on percentiles, with an error budget policy
- [ ] Paging alerts are symptom-based and burn-rate-driven (multiwindow); each links a runbook
- [ ] No page fires for a condition with no immediate human action
- [ ] Telemetry contains no secrets or PII; fields are allowlisted and redacted at source
- [ ] Instrumentation is covered by tests (in-memory exporter or fake-probe assertions)
- [ ] Adding a metric label or new signal triggers a written cardinality/cost estimate
