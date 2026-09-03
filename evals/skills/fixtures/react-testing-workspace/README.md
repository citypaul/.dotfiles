# task-board-ui

The task board and the subscribe form from our React app. Plain React 19 + TypeScript,
no router and no data layer: components take their data as props.

- `src/components/` holds the components, `src/hooks/` the custom hooks, `src/tasks.ts`
  the task types and shared text helpers.
- Two Vitest projects are configured in `vitest.config.ts`: `unit` runs `*.test.ts(x)`
  under jsdom, and `browser` runs `*.browser.test.tsx` in a real Chromium through
  Playwright. `pnpm test` runs both.
- `pnpm install` also installs that Chromium (`playwright install chromium`), so the
  `browser` project works on a fresh machine. It needs the network once; after that
  the build is cached and the tests run offline.
- `pnpm test:watch` keeps them running; `pnpm typecheck` runs `tsc --noEmit`.
- Only `src/tasks.ts` has a test so far.
