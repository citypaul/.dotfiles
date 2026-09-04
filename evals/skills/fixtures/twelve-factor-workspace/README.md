# sessions-service

Sign-in sessions for the notes app. **It is deployed as a twelve-factor service on our
container platform.**

The platform builds one image, runs the process types listed in `Procfile`, and replaces
containers on every deploy.

`src/lib/` holds stand-ins for third-party SDKs we do not own. `src/index.ts` starts the
web process.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
