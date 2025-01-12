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

stow zsh tmux gnupg alacritty zellij .oh-my-zsh karabiner ghostty

git restore .

# https://www.reddit.com/r/linux4noobs/comments/b5ig2h/is_there_any_way_to_force_gnu_stow_to_overwrite/
# Have the files inside a git repository

# stow --adopt *
# git restore .

# Stow will create a symlink and overwrite the files inside your repository and git will undo the changes and return to the original files but the symlinks will stay there.
