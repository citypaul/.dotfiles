# storefront

The customer-facing shop. **Flow logic in this app is modelled as XState v5 statecharts**
(`xstate` and `@xstate/react` are installed).

- `src/checkout/` — the checkout feature. `CheckoutForm.tsx` was written in a hurry
  before that decision and does not follow it yet.
- `src/lib/` — stand-ins for services we do not own.

`pnpm test` runs the suite once, `pnpm test:watch` keeps it running, and
`pnpm typecheck` runs `tsc --noEmit`.
