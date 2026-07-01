# Provider Reference — Verifier CLIs

Each provider's CLI can run non-interactively as a verifier. Use the **best model** and the **highest reasoning effort** the provider offers, keep it **read-only** so the verifier reviews without touching your work, and pass the brief on **stdin** (not as an argv string — see *Passing the brief* below).

> **Models go stale fast.** The model IDs below are examples, not gospel. Prefer the provider's *configured default* (the user picked it deliberately and it's usually their strongest), or confirm the current flagship and the available effort levels via the CLI's `--help` before hardcoding a name. Always max out the effort/reasoning flag.

## What "a different provider" actually means

Diversity is about the **underlying model lab**, not the CLI binary. Two CLIs running the same lab's model share the same blind spots — that is not a second opinion.

| CLI | Underlying model lab |
|-----|----------------------|
| `codex` | OpenAI |
| `claude` | Anthropic |
| `gemini` | Google |
| `cursor-agent` | **configurable** — runs OpenAI *or* Anthropic *or* other models depending on `--model` |

So `cursor-agent --model gpt-5` is still OpenAI, and `cursor-agent --model sonnet-4.x` is still Anthropic. Pick a verifier whose *model lab* differs from the host's. If the host is Claude, a Cursor session running Sonnet is **not** an independent check.

## Detecting what's installed

```bash
for cli in codex claude gemini cursor-agent; do
  command -v "$cli" >/dev/null 2>&1 && echo "available: $cli"
done
```

Exclude the host CLI, and exclude any verifier whose model lab would match the host's (see table above), before choosing.

## Passing the brief

Write the brief to a scratch file (e.g. the session scratchpad), then feed it on **stdin**. This avoids shell-argument length limits and keeps the brief out of process listings and shell history. Delete the scratch file when the check is done.

The verifier runs in the repo's working directory, so the brief can reference files by path and the verifier will open them directly — you don't paste large diffs into the brief.

---

## codex — OpenAI Codex CLI

Non-interactive subcommand: `codex exec`. With `-` (or no prompt arg) it reads instructions from stdin.

```bash
codex exec --sandbox read-only -c model_reasoning_effort="xhigh" - < brief.md
```

- **Best effort:** `model_reasoning_effort="xhigh"` (falls back to `"high"` on older builds).
- **Model:** omit `-m` to use the user's configured default (recommended); or `-m <model>` to force one.
- **Read-only:** `--sandbox read-only` — genuinely sandboxed; the verifier can read the repo but not write or run side-effecting commands.
- **Structured output:** add `--output-schema schema.json` to force a JSON findings shape, or just ask for the format in the brief.
- **Multi-round continuity:** `codex exec resume --last - < next-round.md` continues the prior session with its context intact.
- **Quieter output:** `-o last-message.txt` writes just the final message to a file; `--json` emits JSONL events.

## claude — Claude Code CLI

Headless print mode: `claude -p`, brief on stdin.

```bash
claude -p --model opus --effort max --permission-mode plan < brief.md
```

- **Best model:** `--model opus` (strongest tier). Confirm the current best alias via `claude --help`.
- **Best effort:** `--effort max` (levels: `low, medium, high, xhigh, max`).
- **Read-only:** `--permission-mode plan` — plan mode is read-only; it won't edit or run side-effecting tools.
- **Structured output:** `--output-format json` (or `stream-json`) for machine-readable results.
- **Multi-round continuity:** `--resume <session-id>` or `--continue`.

## gemini — Gemini CLI

Headless mode: `gemini -p`, brief on stdin (stdin is appended to the prompt).

```bash
gemini -m gemini-3-pro --approval-mode plan -p "Review per the brief on stdin." < brief.md
```

- **Best model:** the `-pro` tier (e.g. `gemini-3-pro`). Confirm via `gemini --help`.
- **Read-only:** `--approval-mode plan` (read-only); never `--yolo`, which auto-approves everything.

## cursor-agent — Cursor CLI

Print mode: `cursor-agent -p`.

```bash
cursor-agent -p --model "<model from a different lab than the host>" --output-format text < brief.md
```

- ⚠️ **Not sandboxable to read-only via its own flags.** `cursor-agent --print` "has access to all tools, including write and bash," and exposes no plan/approval/read-only mode. Treat it as the **last-choice** verifier. Use it only when (a) no genuinely-sandboxed provider is available and (b) the user explicitly accepts the risk — ideally run it inside an external read-only filesystem sandbox. **Never** pass `-f/--force`, which lets it run commands without prompting.
- **Provider diversity:** Cursor runs a configurable model — make sure `--model` selects a lab *different* from the host (see the table at the top). `cursor-agent --model gpt-5` does not give you independence from a Codex host.
- **Output:** `--output-format text` (also `json`).

---

## Picking the verifier when several are available

Ask the user (via the host's user-input mechanism — `AskUserQuestion` in Claude Code) with a recommendation. The primary axis is **lab diversity from the host**; genuine read-only sandboxing and raw capability are the tiebreakers. A reasonable default ranking, host (and host-lab) excluded:

1. `codex` at `xhigh` — sandboxed, strong reasoning
2. `claude` with `opus` + `--effort max` — sandboxed (plan mode), strong reasoning
3. `gemini` `-pro` — sandboxed (plan mode)
4. `cursor-agent` — **only** if nothing better is available and the user accepts that it isn't read-only

The most important property is **model-lab diversity** from the host — a different lab's model is the whole point. Sandboxing and capability are the tiebreakers, not the primary axis.
