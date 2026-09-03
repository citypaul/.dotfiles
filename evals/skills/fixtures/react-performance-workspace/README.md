# team-dashboard

A React 19 + TypeScript app for a team's notes: a search page
(`src/note-search.tsx`) and a live dashboard (`src/dashboard.tsx`). The pure
helpers they share live in `src/notes.ts`.

| Command | What it does |
|---|---|
| `pnpm test` | behaviour tests (`src/**/*.test.tsx`), jsdom |
| `pnpm test:watch` | the same suite, watching |
| `pnpm typecheck` | `tsc --noEmit` |

`src/perf/` holds vitest bench files and the sample data they render, offline
and in jsdom like the tests. Nothing in `src/perf/` is imported by production
code, and nothing outside it imports the sample data.
