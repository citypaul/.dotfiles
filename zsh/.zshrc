# Homebrew is optional; discover its location on Apple Silicon, Intel or Linux.
for brew_command in brew "${HOMEBREW_PREFIX:-}/bin/brew" /opt/homebrew/bin/brew /usr/local/bin/brew /home/linuxbrew/.linuxbrew/bin/brew; do
  if command -v "$brew_command" >/dev/null 2>&1; then
    eval "$("$brew_command" shellenv)"
    break
  fi
done
unset brew_command

typeset -U path fpath
path=("$HOME/.local/bin" $path)
fpath=("$HOME/.zsh_autocomplete" $fpath)
if [[ -n "$HOMEBREW_PREFIX" ]]; then
  fpath=("$HOMEBREW_PREFIX/share/zsh/site-functions" $fpath)
fi

export ZSH="${ZSH:-$HOME/.oh-my-zsh}"
DISABLE_AUTO_UPDATE=true
DISABLE_MAGIC_FUNCTIONS=true
plugins=(git)
for plugin in zsh-you-should-use zsh-autosuggestions; do
  if [[ -f "${ZSH_CUSTOM:-$ZSH/custom}/plugins/$plugin/$plugin.plugin.zsh" ]]; then
    plugins+=("$plugin")
  fi
done
unset plugin

if [[ -f "$ZSH/oh-my-zsh.sh" ]]; then
  source "$ZSH/oh-my-zsh.sh"
else
  autoload -Uz compinit
  # Ignore unsafe completion directories instead of prompting during startup.
  compinit -i
  HISTFILE="$HOME/.zsh_history"
  HISTSIZE=10000
  SAVEHIST=10000
  setopt appendhistory
fi

if [[ -t 0 ]]; then export GPG_TTY="$(tty)"; fi
[[ -f "$HOME/.fzf.zsh" ]] && source "$HOME/.fzf.zsh"
source "$HOME/.zsh_profile"
[[ -f "$HOME/.zshrc.local" ]] && source "$HOME/.zshrc.local"

# Use packaged plugins without requiring Oh My Zsh. Highlighting loads last.
for plugin in zsh-autosuggestions zsh-syntax-highlighting; do
  [[ "$plugin" == zsh-autosuggestions ]] && (( $+functions[_zsh_autosuggest_start] )) && continue
  for plugin_root in "${HOMEBREW_PREFIX:-}/share" /usr/share; do
    if [[ -f "$plugin_root/$plugin/$plugin.zsh" ]]; then
      source "$plugin_root/$plugin/$plugin.zsh"
      break
    fi
  done
done
unset plugin plugin_root
