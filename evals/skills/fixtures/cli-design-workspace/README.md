# tally

`tally` reports on our CI builds. It is a Unix command-line tool: people run it from
scripts, pipe it into other commands, and branch on its exit code.

Run it with `pnpm exec tsx src/cli.ts <command>` (or `pnpm cli <command>`). `src/cli.ts`
is the published entry point — scripts and the release wrapper point at that path, so
keep it there.

Build records come from the file named by `tally.config.json`; `--config <path>` picks a
different config file. `tally list` is the only command so far.

- `pnpm test` runs the suite once; `pnpm test:watch` keeps it running.
- `pnpm typecheck` runs `tsc --noEmit`.
