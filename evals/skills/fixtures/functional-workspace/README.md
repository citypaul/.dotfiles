# basket-core

Pricing and line handling for a shop basket. No UI, no IO. **This module is written in a functional style: pure transformations over immutable data.**

`src/basket.ts` predates that decision and has not been brought in line yet.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
- Tests live next to the code as `*.test.ts` and exercise the public API only.
