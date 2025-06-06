#!/bin/bash

GPG_AGENT_CONF=gnupg/.gnupg/gpg-agent.conf

mkdir -p gnupg/.gnupg

echo "# See: https://samuelsson.dev/sign-git-commits-on-github-with-gpg-in-macos/" >>$GPG_AGENT_CONF
echo pinentry-program $(which pinentry-mac) >>$GPG_AGENT_CONF

move_with_backup() {
  local src="$1"
  local backup="${src}.old"

  if [ -f "$src" ] && [ ! -f "$backup" ]; then
    mv "$src" "$backup"
  fi
}

FPATH=$FPATH:~/.zsh_autocomplete

mkdir -p ~/.zsh_autocomplete
zellij setup --generate-completion zsh >>~/.zsh_autocomplete/_zellij-completion

move_with_backup ~/.zshrc

move_with_backup "$HOME/Library/Application Support/com.mitchellh.ghostty/config"

stow zsh tmux gnupg alacritty zellij .oh-my-zsh karabiner ghostty claude
