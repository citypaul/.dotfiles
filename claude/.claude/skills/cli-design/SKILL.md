---
name: cli-design
description: Unix-composable CLI design patterns. Use when building CLI tools, designing command trees, implementing output layers, or testing CLI behavior. Covers stream separation (stdout/stderr), format flags (--json/--plain), exit codes, TTY detection, composability, and error design. Language-agnostic principles; TypeScript implementation patterns in resources/. For API design (REST, HTTP), see api-design.
---

# CLI Design: Unix-Composable Command-Line Interfaces

This skill covers **language-agnostic** CLI design principles. The rules about stream separation, exit codes, format flags, and composability apply regardless of implementation language.

This bundle adapts the CC BY-SA 4.0 [Command Line Interface Guidelines](https://clig.dev/).
Pinned provenance, modification notes, and license scope are recorded in
[`resources/source-notes.md`](resources/source-notes.md) and [`LICENSE`](LICENSE).

For API contract stability and Hyrum's Law, see the `api-design` skill. For config, env vars, and graceful shutdown, see the `twelve-factor` skill.

**TypeScript implementation patterns** are in the `resources/` directory. Load them on demand when building a CLI in TypeScript:

| Resource | Load when... |
|----------|-------------|
| `output-architecture.md` | Implementing Result types, entry point wiring, formatters, logger, JSON envelope schemas |
| `testing-cli.md` | Writing Vitest tests for CLI behavior (streams, exit codes, pipes, contract tests) |
| `stream-contracts.md` | Understanding Node.js buffering, NDJSON, signal handling, crash-only design |
| `composability.md` | Designing or testing pipe behavior — worked shell examples (jq filtering, NDJSON streaming, stdin, chaining, `--fields`, parallel `xargs`) |

---

## When to Use

- Building any command-line tool (any language)
- Designing command tree, flags, and I/O contracts
- Implementing the output layer (format detection, stream routing)
- Testing CLI behavior (stdout/stderr separation, exit codes)
- Reviewing a CLI for Unix composability

---

## Core Principle

**stdout is for DATA only — the product the user asked for.**
**stderr is for EVERYTHING ELSE — diagnostics, progress, spinners, warnings, errors.**

This separation is what makes `mycli --json | jq ...` work. One spinner character on stdout breaks every downstream pipe.

> "Whatever software you're building, you can be absolutely certain that people will use it in ways you didn't anticipate. Your software will become a part in a larger system — your only choice is over whether it will be a well-behaved part." — clig.dev

---

## The Unix Stream Contract

| Content | Stream | Why |
|---------|--------|-----|
| Primary output (data, results, JSON) | stdout | Pipeable, buffered for throughput |
| Progress bars, spinners, status | stderr | Not data — must not corrupt pipes |
| Warnings, errors, diagnostics | stderr | Visible to user even when stdout is piped |
| Debug/verbose output | stderr | Diagnostic, never data |

**Stream behavior:**

- Check stdout and stderr independently; stdout being piped does not mean stderr is piped
- Do not assume C stdio's line/block/unbuffered rules describe every language runtime
- In Node.js, sync/async process-stream behavior varies by operating system and destination; always respect `.write()` backpressure for high-volume output

When stdout is piped, the user doesn't want your status messages in their data. All non-data output must go to stderr.

For a deep dive on buffering behavior and performance implications, see `resources/stream-contracts.md`.

---

## Keep Handlers Pure

The practical rule: **functions that do the work should return data, not write to stdout.** The CLI entry point handles all I/O.

```
Entry point (CLI main)              Your logic (handlers)
─────────────────────               ─────────────────────
parse args                          (input) → structured result
detect format (json/plain/human)    no printing to stdout
call handler                        no writing to stderr
format the result                   no calling exit
write to correct stream             just returns data
set exit code
```

This isn't an architecture mandate — it's just clean function design. The benefits are concrete:

- **Testable without subprocess spawning** — call the handler, assert on the returned value
- **Format flexibility for free** — same data renders as JSON, plain text, or coloured tables by swapping one function
- **Reusable** — the same handler works from a CLI, MCP server, HTTP API, or programmatic import

For simple CLIs where the "handler" is just calling a library, this separation already exists naturally — your library returns data, your CLI formats it. No extra layers needed.

If your project uses hexagonal architecture, the mapping is direct: the CLI entry point is a **driving adapter**, and the handler is a **use case** that returns a result through a port. See the `hexagonal-architecture` skill — the patterns reinforce each other, but hex arch is not required to benefit from keeping handlers pure.

For TypeScript implementation patterns (Result types, entry point wiring, formatters, logger interfaces), see `resources/output-architecture.md`.

---

## Selecting a TypeScript Stack

Prefer the command and prompt libraries the repository already owns when they can satisfy the contracts in this skill. For a new material dependency, inspect current versions and project constraints and use `evaluate-existing-solutions`; do not select from remembered popularity or stale package characteristics.

Stricli can fit typed, injected command handlers, and `@clack/prompts` can fit optional TTY-gated interactivity. Treat them as candidates, not defaults. Compare them with the existing stack and alternatives on handler testability, type safety, startup cost measured in the target runtime, maintenance, dependency weight, non-interactive behavior, and migration cost.

---

## Format Flag Contract

Three-tier output hierarchy:

### Default: Human-Readable

- Colors, tables, formatted text
- Progress bars and spinners on **stderr**
- Output tailored for terminal width
- May change between versions — this is **not** a contract

### `--plain`: Grep/Awk-Friendly

- One record per line, no formatting, no colors
- Stable between minor versions — this **is** a contract
- Flat table rows, no borders, no grouped sections
- Enables: `mycli list --plain | grep error | wc -l`

> "Encourage your users to use `--plain` or `--json` in scripts to keep output stable." — clig.dev

### `--json`: Structured Data

- On success, stdout contains **ONLY** valid JSON — no spinners, no color, no progress
- On failure, stdout stays empty and the final non-empty stderr line is the
  structured JSON error envelope
- Other diagnostics may precede that final stderr line and never contaminate stdout;
  consumers parse the final non-empty line rather than the entire diagnostic stream
- Schema is versioned — breaking changes to JSON output are breaking changes to the CLI
- `--json` implies non-interactive regardless of TTY

**Consistent envelopes:**

Success on stdout:
```json
{ "ok": true, "data": { ... } }
```

Failure on stderr:
```json
{ "ok": false, "error": { "code": "CONFIG_MISSING", "message": "...", "fix": "..." } }
```

### NDJSON for Streaming

For large datasets, use NDJSON (one JSON text per record, terminated by `\n`):

- Each line is independently parseable
- Any JSON value is valid NDJSON syntax; the application's decoder owns its schema
- The examples in this skill use an optional local event profile with a `type`
  discriminator and an optional final summary record; neither is required by NDJSON
- Document whether readers ignore or reject empty lines
- Enables: `mycli run --format ndjson | while read -r line; do ...; done`

For NDJSON specification details, see `resources/stream-contracts.md`.

---

## Exit Codes

| Code | Meaning | When |
|------|---------|------|
| 0 | Success | Operation completed as expected |
| 1 | Domain failure | Tool-specific failure (e.g. quality threshold not met) |
| 2 | Invalid usage | Bad flags, missing required args, validation error |
| 78 | Configuration error | Invalid config file, missing required config |
| 75 | Temporary, retry-safe failure | Failure occurred before dispatch, or the operation is documented and demonstrably safe to retry |
| 130 | SIGINT | User pressed Ctrl-C (128 + 2) |
| 143 | SIGTERM-style status | Optional documented status when preserving signal termination (128 + 15); a handled graceful shutdown may instead return 0 |

**Rules:**

- Non-zero exit code **MUST** have a stderr explanation
- Document exit codes in `--help`
- Never use codes above 125 for application errors (reserved for signals: 128 + signal number)
- Use exit 75 only when no mutation was dispatched or retry safety is established
  through idempotency/reconciliation; a merely transient cause is not enough
- If a mutating request may have reached its destination, report an ambiguous
  outcome and direct the user to `status`/reconcile instead of inviting a blind retry
- A handled SIGTERM may finish with 0 or a documented application status such as
  143; Docker and Kubernetes do not require 143 for graceful shutdown
- Map non-zero codes to the most important failure modes for your tool

---

## TTY Detection

Check priority order (first match wins):

| Priority | Condition | Effect |
|----------|-----------|--------|
| 1 | `--format json` or `--json` flag | Non-interactive, no color, no animation |
| 2 | `--no-color` flag | Disable color (output may still be interactive) |
| 3 | `FORCE_COLOR` env | Empty, `1`, `2`, `3`, or `true` enables color; every other value (including `0`) disables it. Supported values override `NO_COLOR` and `NODE_DISABLE_COLORS` |
| 4 | `NO_COLOR` (non-empty) or `NODE_DISABLE_COLORS` (defined), with `FORCE_COLOR` unset | Disable color |
| 5 | `TERM=dumb` | Disable color and animations |
| 6 | `CI=true` | No interactive prompts |
| 7 | stdout is not a TTY (`!isatty(stdout)`) | Plain output, no animations on stdout |
| 8 | Default | Full interactive with colors |

**Check stdout and stderr independently.** When stdout is piped but stderr is a TTY, you can still show spinners on stderr while keeping stdout clean for the pipe consumer.

**Gate prompts on stdin independently.** Prompt only when stdin and the prompt's
output stream are TTYs; stdout TTY status controls data formatting, not whether
input is safe to request.

Optionally support `MYCLI_NO_COLOR` for app-specific color override.

---

## Input Design

### Flags Over Arguments

- **1 positional arg**: acceptable (the "main thing")
- **2 positional args**: suspicious — consider flags instead
- **3+ positional args**: prefer named flags unless a familiar command grammar
  makes the positions obvious
- **Exception**: variadic args of the same type are fine (`rm a.txt b.txt c.txt`), as are universal idioms (`cp source dest`)

Flags are self-documenting, order-independent, and future-proof.

```bash
# Bad — which is source, which is destination?
mycli copy myapp backup

# Good — explicit
mycli copy --from myapp --to backup
```

### Standard Flags

Always provide long forms. Short flags only for the most common operations.

| Flag | Meaning |
|------|---------|
| `-h`, `--help` | Show help (this should only mean help) |
| `--version` | Print version to stdout |
| `-q`, `--quiet` | Suppress non-essential output |
| `-v`, `--verbose` | More detail in human output |
| `-d`, `--debug` | Diagnostic output to stderr |
| `-f`, `--force` | Skip confirmation prompts |
| `-n`, `--dry-run` | Show what would happen without doing it |
| `--json` | Structured JSON output |
| `--plain` | Stable, grep-friendly plain text |
| `--no-color` | Disable color output |
| `--no-input` | Disable all prompts/interactivity |
| `-o`, `--output` | Output file |
| `--fields` | Select output columns |

### Prompts and Interactivity

- **All prompts MUST be bypassable** via flags for scriptability
- Confirmation → `--yes` or `--force`
- Selection → `--type=value`
- Text input → `--name=value`
- Passwords → `--password-file=path` or stdin pipe
- If stdin is not a TTY, never prompt — fail with a clear error or use defaults
- **Secrets: never via flag values** (leak to `ps` output and shell history). Prefer, in order: OS keychain or a `0600` credential file (`~/.config/mycli/credentials`), then stdin (`mycli login --with-token < token.txt`), then env vars **only where the platform injects them** (CI secret stores) — env leaks to child processes and crash reports, so never make it the primary documented path
- **Scale confirmation to severity**: mild → `y/N` prompt with `--yes` bypass; moderate → prompt plus suggest `--dry-run` first; severe/irreversible (delete a database, overwrite production) → require typing the resource name to confirm

### Conventions

- Support `--` to stop flag parsing: `mycli run -- --flag-for-child-process`
- Support `-` for stdin/stdout file arguments: `curl ... | mycli process -`
- Accept both `--flag=value` and `--flag value`
- If stdin is expected but is an interactive terminal, display help immediately (don't hang like `cat`)

---

## Config Precedence

Highest to lowest priority:

1. **Flags** — per-invocation overrides
2. **Environment variables** — `MYCLI_*` prefix, per-session
3. **Project config** — `.myclirc`, `mycli.config.ts`, or in `package.json`
4. **User config** — `~/.config/mycli/` (follow XDG spec)
5. **Defaults** — sensible built-in values

**Rules:**

- Follow the [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html) for config file locations
- Env var naming: `MYCLI_*` prefix, uppercase letters + digits + underscores; keep values single-line; don't commandeer POSIX names
- Respect the general-purpose env vars where relevant: `NO_COLOR`, `FORCE_COLOR`, `DEBUG`, `EDITOR`, `PAGER`, `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY`, `TMPDIR`, `TERM`, `LINES`/`COLUMNS`
- Never accept secrets via flags; prefer keychain/credential files or stdin, env vars only when platform-injected (CI) — see "Prompts and Interactivity"
- Read `.env` where appropriate, but don't use it as a substitute for proper config
- If you modify configuration that belongs to another program, ask consent first

---

## Error Design

Every error needs:

1. **Machine-readable code** — `UPPER_SNAKE_CASE` (e.g. `CONFIG_MISSING`, `AUTH_EXPIRED`)
2. **What went wrong** — context: which resource, operation, input
3. **How to fix it** — exact command or action the user should take
4. **Reference** — docs URL or `mycli help <topic>` (optional)

### Human Mode

```
Error: CONFIG_MISSING — Configuration file not found
No configuration file found at ./mycli.config.ts or ~/.config/mycli/config.ts

Fix: Run `mycli init` to create a default configuration file
Docs: https://mycli.dev/docs/configuration
```

- Put the most important information **last** (the eye is drawn to the end)
- Use red sparingly and intentionally
- Suggest corrections for typos ("Did you mean 'deploy'?")
- Group similar errors under one header — don't repeat 50 similar-looking lines
- Write debug logs to a file, not the terminal (unless `--debug`)

### JSON Mode

Errors are structured too — not just success responses:

```json
{
  "ok": false,
  "error": {
    "code": "CONFIG_MISSING",
    "message": "No configuration file found at ./mycli.config.ts",
    "fix": "Run `mycli init` to create a default configuration file",
    "transient": false
  }
}
```

The `transient` boolean says the cause may clear. It does not by itself authorize
a retry: callers also need exit code 75 or an explicit retry-safe contract.

---

## State Changes and Transparency

- **Confirm state changes** — say what changed and show (or point to) the resulting state; traditionally-silent commands look broken to humans
- **Make current state easy to see** — a `status`-style command for anything with complex state (the `git status` pattern)
- **Make hidden actions explicit** — if you read/write files not passed as arguments or talk to remote servers, say so (stderr in human mode)
- **Resolve ambiguous mutations** — if transport fails after dispatch, tell the
  user how to inspect or reconcile state; do not label the result retry-safe
- **Page long output** through `$PAGER` only when stdout is a TTY, never when
  piped; do not execute the value through a shell, and document whether it is an
  executable token or parsed by a reviewed shell-word parser

---

## Robustness

- **Validate input early** — fail before any side effects, with a clear message
- **Responsiveness for ongoing human work** — in interactive human mode, unless
  `--quiet`, show progress on stderr if an operation is still running after roughly
  100ms; keep machine modes quiet unless their protocol explicitly defines progress,
  and include time estimates when interactive progress can stall
- **Timeouts on all network operations** — configurable; use exit 75 only before
  dispatch or when retry safety/idempotency is established
- **Recoverable operations** — re-running may resume only when safe; ambiguous
  mutation outcomes need an explicit status or reconciliation path
- **Crash-only design** — exit fast on failure, defer cleanup to the next run;
  distinguish visibility-atomic replacement from crash-durable persistence, and
  keep bounded-cleanup timers referenced so Ctrl-C cannot bypass the bound — see
  `resources/stream-contracts.md`
- **Expect misuse** — script wrapping, bad connections, concurrent instances, environments you never tested

---

## Composability Patterns

Design for real-world pipes: filtering with `jq`, streaming NDJSON line-by-line, feeding stdin, chaining commands through emitted identifiers, selecting columns with `--fields`, and fanning out with `xargs -P`.

See `resources/composability.md` for the worked shell examples covering each of these patterns.

**Key patterns:**

- Create commands output identifiers so subsequent commands can chain
- List commands support `--fields` for column selection (reduces output size, critical for agent efficiency)
- `--quiet` for CI scripts that only care about the exit code
- NDJSON for streaming large datasets without buffering everything in memory
- `--dry-run` with `--json` outputs planned changes as structured data

---

## Subcommand Design

- **noun verb** pattern is most common: `mycli config set`, `mycli report generate`
- Be consistent across all subcommands — same flag names for same things
- No ambiguous pairs (`update` vs `upgrade` is confusing)
- No catch-all subcommands (you can never add subcommands with conflicting names)
- No arbitrary abbreviations — aliases must be explicit and stable
- With no args: list subcommands (multi-command CLI) or show help (single-command CLI)

### Help

- `mycli --help` — top-level help
- `mycli help <subcommand>` — subcommand help
- `mycli <subcommand> --help` — same as above
- If run with missing required args, show concise help + 1-2 examples + "use --help for more"
- **Examples are the most-read section** — lead with them
- Include flag types, defaults, and allowed values for finite sets
- Include a support/bug-report link in top-level help; pre-populate issue URLs with diagnostics where possible
- Suggest the likely command on obvious typos ("Did you mean 'deploy'?") — ask, never auto-execute

---

## Output Stability Contract

**Stdout is a public API.** Breaking changes to stdout format are breaking changes to the CLI.

| Change | Impact |
|--------|--------|
| Adding new optional JSON fields | Safe (additive) |
| Adding new subcommands | Safe |
| Adding new flags with preserving defaults | Safe |
| Removing or renaming flags | **Breaking** |
| Removing or renaming JSON fields | **Breaking** |
| Changing exit codes | **Breaking** |
| Changing default behavior | **Breaking** |
| Changing human-readable output | Usually OK (not a contract) |

When in doubt, add alongside — don't modify. Deprecate with stderr warnings before removing — and once you can detect that users have migrated, stop warning.

---

## Naming, Distribution, Telemetry

- **Name**: short, memorable, lowercase, easy to type; not so generic it collides with existing commands
- **Distribution**: prefer a single binary; language-ecosystem tools (npm, pip) may reasonably assume their interpreter. Make uninstalling easy and documented
- **Telemetry**: never collect usage/crash data without explicit consent — opt-in, stating what, why, and retention. Instrumented web docs or download counts are usually enough

---

## Anti-Patterns

| # | Anti-Pattern | Why It's Wrong |
|---|-------------|----------------|
| 1 | Mixing data and diagnostics on stdout | Breaks every pipe: `mycli list \| jq .` fails if warnings are on stdout |
| 2 | Colors/ANSI in piped output | ANSI sequences corrupt downstream parsing. Check `isatty(stdout)` + `NO_COLOR` |
| 3 | Interactive prompts with no flag bypass | Agents can't type 'y'. Every prompt needs `--yes`/`--force`. Non-TTY without bypass = hang |
| 4 | Printing nothing on success | Silence is ambiguous — show brief confirmation. Offer `-q` for scripts that want silence |
| 5 | Designing for humans OR machines, not both | Detect context (TTY vs pipe), adapt automatically |
| 6 | Output that doesn't guide the next action | Every output is a signpost: success = next command, failure = fix command |
| 7 | Breaking existing CLI contracts | Flag names, exit codes, output shape are contracts. Add alongside, never modify |
| 8 | `console.log` anywhere except the CLI adapter | Handlers must return data; only the presentation layer writes to streams |
| 9 | Handlers that exit the process directly | Let the entry point decide. Handlers return errors as data |
| 10 | Non-zero exit without stderr explanation | Scripts need both the code and the reason |
| 11 | Verbose default output | A single test run can generate 419KB. Support `--fields`, `--quiet`, `--json` |

---

## Verification Checklist

After designing or reviewing a CLI:

- [ ] stdout has ONLY data; stderr has everything else
- [ ] Every command supports `--json` with success data on stdout and structured failures on stderr
- [ ] Exit codes are semantic and documented in `--help`
- [ ] Every prompt has a `--yes`/`--force`/`--flag` bypass
- [ ] Errors include: code, message, fix suggestion
- [ ] `--dry-run` available for mutating commands
- [ ] Progress/spinners go to stderr, never stdout
- [ ] `NO_COLOR`, `TERM=dumb`, and `--no-color` respected
- [ ] Piped output contains zero ANSI escape codes
- [ ] Success output includes next-action guidance
- [ ] Existing flags, exit codes, output fields never removed or renamed
- [ ] JSON schema is versioned (additions safe, removals breaking)
- [ ] Config follows flags > env > project > user > defaults
- [ ] Secrets never via flags; keychain/credential-file/stdin preferred, env only when platform-injected (CI)
- [ ] Severe destructive actions require typed confirmation (resource name), not just y/N
- [ ] Network operations have configurable timeouts; exit 75 is reserved for
      pre-dispatch or demonstrably retry-safe failures
- [ ] Interactive human operations still running after roughly 100ms show progress
      on stderr unless `--quiet`; machine-mode protocols stay clean
- [ ] Ctrl-C exits fast with bounded cleanup
- [ ] `--help` includes 2-3 realistic examples
- [ ] Human output is grep-parseable (flat rows, no table borders)

---

## Quick Reference

Stream routing, exit codes, and standard flags are tabled in the body — see "The Unix Stream Contract", "Exit Codes", and "Standard Flags" above.

### Format Hierarchy

```
Default (TTY)     → colors, tables, formatted text
--plain           → one record per line, stable, grep-friendly
--json            → structured JSON, versioned schema
--format ndjson   → streaming, one JSON object per line
```

### Config Precedence

```
flags > env vars > project config > user config > defaults
```
