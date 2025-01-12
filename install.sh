#!/bin/bash

GPG_AGENT_CONF=gnupg/.gnupg/gpg-agent.conf

mkdir -p gnupg/.gnupg

echo "# See: https://samuelsson.dev/sign-git-commits-on-github-with-gpg-in-macos/" >>$GPG_AGENT_CONF
echo pinentry-program $(which pinentry-mac) >>$GPG_AGENT_CONF

# add to fpath and source zellij completion
FPATH=$FPATH:~/.zsh_autocomplete

mkdir -p ~/.zsh_autocomplete
zellij setup --generate-completion zsh >>~/.zsh_autocomplete/_zellij-completion

mv ~/.zshrc ~/.zshrc.old

# Remove store old ghostty config, has to be done because opening the app will create a new config file
# and stow will not allow us to overwrite it.
mv "$HOME"/ghostty/Library/Application\ Support/com.mitchellh.ghostty/config "$HOME"/ghostty/Library/Application\ Support/com.mitchellh.ghostty/config.old

stow zsh tmux gnupg alacritty zellij .oh-my-zsh karabiner ghostty
