# team-dashboard

How fast this app feels is a product guarantee we hold ourselves to, so the
repository ships benchmarks (`pnpm bench`) next to its behaviour tests
(`pnpm test`).

- `src/*.tsx` — the components; `src/notes.ts` — the pure helpers they use.
- `src/perf/*.bench.ts` — the benchmarks, run by `pnpm bench`, never imported
  by production code.
