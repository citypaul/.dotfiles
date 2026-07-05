# Source Notes

Load this when checking the rationale behind the observability guidance. Ranked roughly by how much of the skill each source carries.

## Wide Events and the Pillars Debate

- Stripe (Brandur Leach), "Fast and flexible observability with canonical log lines": https://stripe.com/blog/canonical-log-lines
  - The origin of the one-wide-event-per-request pattern: middleware accumulates fields during the request, one information-dense line at the end, wrapped so it emits even on failure.
  - Field inventory (request, auth, rate limits, performance, business context) → SKILL.md wide-event table.
  - Companion piece: https://brandur.org/canonical-log-lines
- Charity Majors, "There Is Only One Key Difference Between Observability 1.0 and 2.0" (2024): https://charity.wtf/2024/11/19/there-is-only-one-key-difference-between-observability-1-0-and-2-0/
  - The pillars critique: many sources of truth, each request stored several times, cost multiplied per pillar; 2.0 = one source of truth (wide structured events), decisions at read time.
  - Cardinality-driven bill explosions as the economic argument.
- Charity Majors, "Logs vs Structured Events" (2019): https://charity.wtf/2019/02/05/logs-vs-structured-events/
  - "Dribbling little pebbles of log effluvia" vs one accumulated event per request per service; capture any high-cardinality identifier — that's what makes ad-hoc investigation possible.
- Skeptical counterweight: Laban Eilers, "Are we ready for Observability 2.0?": https://labaneilers.com/are-we-ready-for-observability-2.0
  - Read-time aggregation over raw events assumes backend capabilities most stacks don't have → SKILL.md's "honest limit" in Pillars, Honestly.

## OpenTelemetry

- OTel JS getting started (Node.js): https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
  - Minimal package set, NodeSDK shape, `--import` loading before app code, ESM/tsx caveats → `node-patterns.md` SDK section.
- Semantic conventions: https://opentelemetry.io/docs/specs/semconv/
  - Standardized attribute names enable correlation across teams and tools → "never invent an attribute name semconv defines" rule + cheat sheet.
- Context propagation: https://opentelemetry.io/docs/concepts/context-propagation/
  - W3C TraceContext / `traceparent` as the default propagator; propagation is what makes distributed traces exist.
- Sampling: https://opentelemetry.io/docs/concepts/sampling/
  - Head vs tail definitions and honest downsides (tail = stateful, complex, possible lock-in) → the sampling ladder.
- Collector: https://opentelemetry.io/docs/collector/
  - Receivers → processors → exporters; direct export fine in dev, Collector recommended in production → Collector section in SKILL.md and `node-patterns.md`.

## SRE Practice

- Google SRE book, "Service Level Objectives" (ch. 4): https://sre.google/sre-book/service-level-objectives/
  - SLI/SLO/SLA definitions; error budget as the innovation/reliability contract; percentiles over averages; don't overachieve → SLO section + `slo-alerting.md` worksheet.
- Google SRE Workbook, "Alerting on SLOs": https://sre.google/workbook/alerting-on-slos/
  - The six-step derivation ending in multiwindow multi-burn-rate alerts; the 14.4×/6×/1× parameter table; precision/recall/detection/reset framework → alerting section + `slo-alerting.md`.
- Google SRE book, "Monitoring Distributed Systems" (ch. 6): https://sre.google/sre-book/monitoring-distributed-systems/
  - Four golden signals with the dropped nuances (latency of failed requests separately; histograms because averages hide the tail); symptoms over causes.
- Rob Ewaschuk, "My Philosophy on Alerting": https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/mobilebasic
  - "Do your users care if your MySQL servers are down?"; pages must be urgent, actionable, user-visible, intelligence-requiring; ~90% precision review bar; basis of SRE book ch. 6. Prometheus endorses it: https://prometheus.io/docs/practices/alerting/
- Tom Wilkie, "The RED Method": https://grafana.com/blog/the-red-method-how-to-instrument-your-services/
  - Rate/Errors/Duration for request-driven services, framed explicitly as a user-experience proxy against Gregg's infrastructure-focused USE method.

## Cost, Cardinality, Logging Craft

- Grafana Labs, "How to manage high cardinality metrics in Prometheus and Kubernetes": https://grafana.com/blog/how-to-manage-high-cardinality-metrics-in-prometheus-and-kubernetes/
  - Series-count math (label combinations multiply), per-series memory cost, unbounded-label causes → the cardinality routing rule.
- Dave Cheney, "Let's talk about logging" (2015): https://dave.cheney.net/2015/11/05/lets-talk-about-logging
  - "Nobody reads warnings"; a logged-and-handled error is not an error — adopted as a per-line discipline on top of twelve-factor's four levels, not as a level ban.
- OneUptime, "Keep PII Out of Your Telemetry": https://oneuptime.com/blog/post/2025-11-13-keep-pii-out-of-observability-telemetry/view
  - Allowlist-based redaction at source; serializers dump whole objects including auth headers; compliance weight of PII in logs → hygiene rules + the substring-sweep test.

## Testing Observability

- OneUptime, "How to Test Your OpenTelemetry Instrumentation with In-Memory Exporters": https://oneuptime.com/blog/post/2026-02-06-test-opentelemetry-instrumentation-in-memory-exporters/view
  - In-memory exporters as the foundation of testable instrumentation; why network-backed telemetry tests are slow/flaky → `testing-telemetry.md`.
- Observability-driven development framing: https://opensource.com/article/22/10/observability-driven-development-opentelemetry
  - Telemetry as a first-class, specified-before-implementation output — the natural extension of this repo's TDD stance.
- OTel trace-based testing (demo write-up): https://opentelemetry.io/blog/2023/testing-otel-demo/
  - Driving the system and asserting on emitted traces — the integration-level complement noted in `testing-telemetry.md`'s limits.

## Architecture Placement

- Pete Hodgson, "Domain-Oriented Observability" (martinfowler.com): https://martinfowler.com/articles/domain-oriented-observability.html
  - Domain Probe and announcement/event models, testing instrumentation through the probe — the deep treatment lives in the `hexagonal-architecture` skill; this skill carries only the four-tier summary.

## Frontend (deferred from v1)

- web.dev, "Web Vitals": https://web.dev/articles/vitals
  - LCP/INP/CLS thresholds at p75 of field data; lab measurement "is not a substitute for field measurement" → the one-paragraph frontend note.
