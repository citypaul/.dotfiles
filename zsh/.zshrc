# Path to oh-my-zsh installation
export ZSH=$HOME/.oh-my-zsh

# Performance optimizations
DISABLE_AUTO_UPDATE=true
DISABLE_MAGIC_FUNCTIONS=true
ZSH_DISABLE_COMPFIX=true

# Plugins (loaded by oh-my-zsh)
plugins=(
  git
  zsh-you-should-use
  zsh-autosuggestions
)

source $ZSH/oh-my-zsh.sh

# Cache brew prefix (avoid repeated subprocess calls)
export HOMEBREW_PREFIX="${HOMEBREW_PREFIX:-/opt/homebrew}"

# GPG configuration for terminal-based signing
export GPG_TTY=$(tty)

# Source configurations
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh
eval "$($HOMEBREW_PREFIX/bin/brew shellenv)"
source $HOMEBREW_PREFIX/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source $HOME/.zsh_profile

# Machine-specific configuration (not version controlled)
[ -f ~/.zshrc.local ] && source ~/.zshrc.local
