# notes-service

Backend for the notes app. **This service uses hexagonal architecture (ports and adapters).**

The weekly digest in `src/digest.ts` was written in a hurry before that decision and does
not follow it yet. `src/lib/` holds stand-ins for third-party SDKs we do not own.
`src/index.ts` builds the app.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
