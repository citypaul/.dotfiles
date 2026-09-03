# checkout-service

Takes the basket, charges the card, returns the order. **This service is observed with
OpenTelemetry**: the platform starts the OTel SDK (with `service.name` and the OTLP
exporter set from the environment) before the process loads any application code, so
application code instruments through `@opentelemetry/api` and never boots the SDK itself.

- `src/index.ts` builds the app and owns the HTTP routes.
- `src/checkout.ts` is the checkout itself.
- `src/lib/` holds stand-ins for third-party SDKs we do not own.
- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.

The platform's OTLP pipeline ingests **metrics and traces only** — there is no log
pipeline, nothing collects this service's stdout, and anything written there is
discarded when the container restarts. Operational documents (alert rules, runbooks)
live in the repository next to the code they cover.
