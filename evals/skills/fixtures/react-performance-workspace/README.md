# team-dashboard

A React 19 + TypeScript app for a team's notes: a search page (`src/note-search.tsx`)
and a live dashboard (`src/dashboard.tsx`). Pure helpers live in `src/notes.ts`.

Responsiveness is part of what we promise users here, so the repository carries
benchmarks as well as behaviour tests.

| Command | What it does |
|---|---|
| `pnpm test` | behaviour tests (`src/**/*.test.tsx`), jsdom |
| `pnpm test:watch` | the same suite, watching |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm bench` | the benchmarks in `src/perf/*.bench.ts` (vitest bench, jsdom, offline) |

`src/perf/` is the measurement harness: it renders the real components with a
few thousand generated notes from `makeNotes`. Nothing in `src/perf/` is
imported by production code.
