---
"@citypaul/dotfiles": minor
---

Add opt-in Claude Code profiles to the personal Zsh configuration. `claude-profile NAME` runs Claude Code with its own config directory at `~/.claude-NAME`, and `claude-personal` runs it with the stock `~/.claude` whatever default the machine has chosen, so one machine can keep a client's skills and your own apart. Nothing changes unless a machine sets a default in `~/.zshrc.local`. Documented in `docs/claude-profiles.md`; the skills installer and the README are unchanged.
