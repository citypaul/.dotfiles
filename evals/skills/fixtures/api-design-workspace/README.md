# orders-api

The order service behind the Toolbox shop. It is a consumer-facing HTTP API: our
mobile app and our partner integrations call it directly.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
- `createApp(deps)` in `src/index.ts` builds the app. Its deps — `orders`,
  `newId`, `now` — are the only injection point; anything else the API needs is
  constructed inside `createApp`. Tests build the app that way and drive it with
  `app.request(...)`.
- Callers identify themselves with `Authorization: Bearer <partner id>`.
- The mobile app sets an `Idempotency-Key` header on every `POST /orders`:
  the same value on every attempt at one order, a new value for a new order.
  Partner integrations may set it; most do not yet. The service ignores it.
- Tests live next to the code as `*.test.ts`.
