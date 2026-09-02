# notes-core

Pure state transitions for a notes app. No UI, no IO.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
- Tests live next to the code as `*.test.ts` and exercise the public API only.
