# orders-bff

Backend for the orders web app: it owns the browser-facing HTTP boundary and calls the
order operations on behalf of one signed-in user. **Production entry points are
registered through the prepared registrar in `src/composition/registrar.ts`, and every
one of them declares whether it is public or protected.**

- `src/composition/app.ts` is the production composition. `createApp(deps)` returns the
  Hono app and the catalog of the entry points it serves; tests drive it with
  `app.request(path, init)`.
- `src/endpoints/` holds one contract plus handler per entry point.
- `src/application/` holds the order operations. They take an `AuthenticatedPrincipal`.
- `src/sessions.ts` turns the session cookie into that principal.
- `GET /api/orders` predates the registrar and is still mounted straight onto the app.
- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
