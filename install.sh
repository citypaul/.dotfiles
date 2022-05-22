#!/bin/bash

GPG_AGENT_CONF=gnupg/.gnupg/gpg-agent.conf

mkdir -p gnupg/.gnupg

echo "# See: https://samuelsson.dev/sign-git-commits-on-github-with-gpg-in-macos/" >> $GPG_AGENT_CONF
echo pinentry-program $(which pinentry-mac) >> $GPG_AGENT_CONF

mv ~/.zshrc ~/.zshrc.old

stow zsh tmux gnupg