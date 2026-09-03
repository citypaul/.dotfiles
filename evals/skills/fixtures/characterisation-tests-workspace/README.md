# billing-core

Billing rules for the subscriptions product: proration, late fees and the plain-text
statement. In production since 2024 — the nightly billing job and the statement PDFs
depend on exactly what these functions return today.

`src/money.ts` is tested. `src/proration.ts`, `src/late-fee.ts` and `src/statement.ts`
predate the test suite and have no tests.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
- Tests live next to the code as `*.test.ts`.
