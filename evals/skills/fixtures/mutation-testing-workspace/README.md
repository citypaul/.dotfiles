# checkout-core

Pure pricing rules for the shop's checkout: subtotal, discounts, shipping and the
order summary. No UI, no IO.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm test:coverage` prints line coverage (currently 100%).
- `pnpm typecheck` runs `tsc --noEmit`.
- Tests live next to the code as `*.test.ts` and exercise the public API only.

Test effectiveness is proven with mutation testing at the PR-readiness gate.
