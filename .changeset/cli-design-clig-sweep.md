---
"@paulhammond/dotfiles": minor
---

Improve the `cli-design` skill with a full sweep of the Command Line Interface Guidelines (clig.dev) and a recommended TypeScript stack.

One genuine correction: secrets get a channel hierarchy instead of a flat "files/stdin/env" list — never via flags; OS keychain or a `0600` credential file preferred, then stdin (`--with-token < token.txt`), with env vars acceptable only where the platform injects them (CI secret stores), never as the primary documented path (they leak to child processes and crash reports). New guidance: tiered confirmation by severity (y/N → suggest `--dry-run` → typed resource name for irreversible actions), a "State Changes and Transparency" section (confirm what changed, the `status` pattern, make hidden file/network access explicit, page long output via `$PAGER`), a "Robustness" section (validate early, 100ms responsiveness, configurable network timeouts with exit 75, recover by re-run, expect misuse), the variadic-args exception to the flags-over-args rule, help support-links and typo suggestions, general-purpose env vars (`DEBUG`, `EDITOR`, `PAGER`, proxies), deprecation warnings that stop once users migrate, and a "Naming, Distribution, Telemetry" section (opt-in telemetry only).

Also adds a "Recommended TypeScript Stack" section: Stricli (commands as pure typed functions with injected context — testable without subprocess spawning, introspectable command tree, light startup) plus `@clack/prompts` (interactivity as an optional TTY-gated presentation adapter), with honest trade-offs against commander, oclif, and @effect/cli. All sources credited in `skills/REFERENCES.md`.
