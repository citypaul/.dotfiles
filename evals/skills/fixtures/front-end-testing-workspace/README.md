# gearshop-web

The Gearshop storefront: plain DOM and TypeScript, no framework. **The UI here is covered
by behaviour-driven front-end tests.**

Where things are:

- `src/` is the app. `src/signup.ts` mounts the sign-up form, `src/checkout.ts` mounts the
  basket and the order button, and `src/api.ts` is the only module that calls `fetch`.
- `public/index.html` and `scripts/serve.mjs` are the served page and the small JSON API
  behind it (`POST /api/signups`, `POST /api/orders`). `pnpm build && pnpm serve` puts the
  real app on http://127.0.0.1:4317.
- `pnpm test` runs Vitest once over `src/**/*.test.ts` in jsdom; `pnpm test:watch` keeps it
  running.
- `pnpm test:e2e` runs Playwright over `e2e/**/*.spec.ts`; `playwright.config.ts` builds the
  app and starts that server first.
- `pnpm typecheck` runs `tsc --noEmit`.

This machine has no network. Everything you can use is already in `package.json` and
installed in `node_modules`.
