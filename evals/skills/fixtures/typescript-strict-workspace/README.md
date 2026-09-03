# ticket-desk

Backend for the support-desk app. **This service is written in strict TypeScript and
treats type safety as a requirement, not a style preference.**

`src/tickets.ts` holds the ticket rules, `src/index.ts` builds the app, and `src/lib/`
holds stand-ins for third-party SDKs we do not own.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
