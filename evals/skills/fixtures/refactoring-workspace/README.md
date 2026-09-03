# order-quotes

Pure pricing for the shop's checkout: subtotal, discounts, delivery, total. No UI, no IO.

**Any restructuring of this code is behaviour-preserving refactoring backed by the existing tests.**

- `src/quote.ts` prices an order; it grew by accretion and is due a tidy.
- `src/money.ts` formats and parses amounts in pence.
- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
- Tests live next to the code as `*.test.ts` and exercise the public API only.
