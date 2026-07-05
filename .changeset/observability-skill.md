---
"@paulhammond/dotfiles": minor
---

Add an `observability` skill and a four-tier observability-placement model across the portfolio.

The new skill teaches wide events / canonical log lines as the default instrumentation primitive (with the pillars-vs-events debate handled honestly), the OpenTelemetry substrate for TypeScript services, a cardinality routing rule, the head/tail sampling ladder, SLO/error-budget discipline with multiwindow burn-rate alerting, symptom-based paging with mandatory runbooks, and telemetry as test-driven behavior via in-memory exporters. The hexagonal-architecture skill's Logging section becomes a four-tier model organized by GOOS's "logging is a feature" test: technical telemetry stays in adapters, domain-significant observations flow through a Domain Probe driven port or a domain-event subscriber (a generic `Logger` port is banned), correlation and wide-event assembly live at the edges, and instrumentation is tested with recording fakes. Canonical events are guaranteed on every terminal outcome — clean finish, exception, and client abort. Small cross-references land in twelve-factor, ci-debugging, api-design (trace ID as the RFC 9457 correlation key), and domain-driven-design.
