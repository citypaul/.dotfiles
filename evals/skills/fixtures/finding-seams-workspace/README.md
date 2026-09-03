# api-keys-service

Issues, revokes and reports on the API keys an account holds. **Legacy code here is
put under test by introducing seams, not by rewriting it.**

`src/issue-key.ts`, `src/revoke-key.ts` and `src/expiry-report.ts` predate that
decision: each talks to the database driver in `src/lib/database.ts` directly and
is called from both the HTTP handlers in `src/http/api-keys.ts` and the CLI in
`src/cli.ts`. `src/format.ts` holds the pure helpers.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
- Tests live next to the code as `*.test.ts`.
