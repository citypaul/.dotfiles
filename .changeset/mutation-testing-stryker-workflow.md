---
"@paulhammond/dotfiles": patch
---

Rework mutation-testing skill around Stryker, incremental diff-vs-main runs, and a behavior-driven report

The skill now runs in one of two modes — Stryker (preferred) or manual fallback — and both produce the same visual terminal report so the user sees consistent output regardless of mode.

- Stryker mode: detect existing install, offer opt-in setup for Vitest or Jest projects, run incrementally against files changed vs `origin/main...HEAD` via `--mutate`, and parse the JSON reporter output.
- Visual report: prints a header, summary counts/score vs threshold, and one card per surviving mutant with the mutation diff, the **business rule** that is no longer protected, a **suggested behavior-driven test** (named after the rule, non-identity inputs, observable assertion), and why that test kills the mutant. Likely-equivalent mutants are listed separately rather than padded with fake tests.
- CI pipeline: offers to scaffold a nightly GitHub Actions workflow that runs Stryker on full main, uploads the HTML/JSON report artifacts, and opens an issue only on threshold break.
- Manual fallback: retains the existing hand-mutation workflow for non-JS projects or when Stryker is declined, but targets the same report format.
- Reference material (operators, equivalent mutants, strengthening weak tests, branch checklist, quick reference) retained and tightened.
