---
"@citypaul/dotfiles": minor
---

Add a separate personal dotfiles setup for macOS and Ubuntu/Debian, with explicit Stow targets, conflict checks, package selection and repeatable completion generation. Keep both existing installer scripts unchanged, including the public skills installer.

Make shell startup tolerate missing optional tools, support standard NVM and Linux pnpm locations, and require explicit Python environment activation. Use system Pinentry and share Ghostty configuration across platforms. Document installation and add macOS Apple Silicon/Intel, Ubuntu and Debian CI coverage for both real dependency installation and isolated smoke checks.
