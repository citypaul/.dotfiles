# checkout-service

This service is observed with OpenTelemetry; the SDK is started by the platform and
application code instruments through `@opentelemetry/api`. The platform ingests metrics
and traces only — nothing collects stdout, so telemetry that is not a span or a
measurement is lost.
