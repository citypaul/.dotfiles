---
"@paulhammond/dotfiles": minor
---

Add cli-design skill for Unix-composable CLI patterns

New skill covering how to build CLI tools that compose well in Unix pipelines. Language-agnostic core principles (stdout/stderr stream separation, format flags, exit codes, TTY detection, composability, error design) with TypeScript implementation patterns in resources/.

- SKILL.md: language-agnostic CLI design principles
- resources/output-architecture.md: TypeScript patterns (Result types, entry point wiring, formatters, JSON envelope)
- resources/testing-cli.md: Vitest testing patterns (stream separation, exit codes, pipe simulation, contract tests)
- resources/stream-contracts.md: buffering behavior, NDJSON, signal handling, crash-only design

Synthesized from 8 authoritative sources: clig.dev, 12 Factor CLI Apps, Heroku CLI Style Guide, galligan's three-layer architecture, yogin16/better-cli, steipete/create-cli, lirantal/nodejs-cli-apps-best-practices, Orhun Parmaksiz stdout vs stderr.
