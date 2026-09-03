# checkout-pricing

Turns a basket into a priced quote: validation, discount tiers, shipping, VAT and
the receipt text customers see. Pure TypeScript, no IO.

- `src/index.ts` is the package's public interface (`quoteOrder`, the order
  schema and the quote types). Everything else under `src/` is internal and may be
  reorganised without notice.
- Tests are behaviour tests and live next to the code as `*.test.ts`. The one test
  file that exists was a placeholder written before that decision.
- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
