# gearshop-web

The UI in this project is covered by behaviour-driven front-end tests.

Vitest (jsdom) covers `src/**/*.test.ts`; Playwright covers `e2e/**/*.spec.ts` against the
app served by `scripts/serve.mjs`. There is no network: use the dependencies already
installed.
