---
"@citypaul/dotfiles": patch
---

Stow the herdr package from install.sh, backing up any existing config first

The `herdr` package was added to the repo but `install.sh` never stowed it, so
the standalone install path silently skipped it while the Ansible path picked it
up. Add it to the stow list.

It also needs the same `move_with_backup` treatment as `.zshrc`, the ghostty
config, and the opencode config. GNU stow refuses to overwrite a real file and
aborts the entire invocation rather than skipping the one package, so a
pre-existing `~/.config/herdr/config.toml` would have stopped every other package
from stowing too.
