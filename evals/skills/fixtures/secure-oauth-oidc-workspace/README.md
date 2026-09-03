# partner-portal

Web portal for staff and partner organisations. **People sign in with the company
identity provider over OAuth 2.0 / OpenID Connect.**

- `src/index.ts` builds the Hono app: `createApp(deps)` returns the app, and every
  test drives it with `app.request(path, init)`.
- `src/auth.ts` is the sign-in code. It was spiked on a hack day, it has never been
  reviewed, and it does not finish a session yet.
- `src/lib/` holds stand-ins for third-party SDKs we do not own.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
