#!/usr/bin/env bash
# Personal macOS/Linux setup. Skills are installed separately by install-claude.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
install_deps=true
packages=()
for arg in "$@"; do
  case "$arg" in
    --skip-deps) install_deps=false ;;
    --help|-h)
      cat <<'EOF'
Usage: ./setup-dotfiles.sh [--skip-deps] [PACKAGE ...]

Install personal dotfiles on Apple Silicon macOS or Ubuntu/Debian. Homebrew
must already be installed on macOS; Linux uses sudo when needed.
Default packages: zsh tmux gnupg alacritty zellij ghostty herdr
--skip-deps links configuration using tools you have already installed.

Existing conflicting files are left untouched. Move them to a backup location
and rerun. Desktop applications, Node runtimes and AI skills are installed separately.
EOF
      exit 0 ;;
    zsh|tmux|gnupg|alacritty|zellij|ghostty|herdr) packages+=("$arg") ;;
    *) printf 'Unknown option or package: %s\n' "$arg" >&2; exit 1 ;;
  esac
done
if [[ ${#packages[@]} -eq 0 ]]; then
  packages=(zsh tmux gnupg alacritty zellij ghostty herdr)
fi

platform="$(uname -s)"
case "$platform" in
  Darwin) ;;
  Linux)
    if [[ ! -r /etc/os-release ]]; then
      echo 'Cannot identify this Linux distribution: /etc/os-release is missing.' >&2
      exit 1
    fi
    # shellcheck source=/dev/null
    . /etc/os-release
    case "${ID:-}" in
      ubuntu|debian) ;;
      *) echo "Unsupported Linux distribution: ${ID:-unknown}. Expected Ubuntu or Debian." >&2; exit 1 ;;
    esac ;;
  *) echo "Unsupported platform: $platform. Expected macOS or Linux." >&2; exit 1 ;;
esac

if [[ "$install_deps" == true ]]; then
  if [[ "$platform" == Darwin ]]; then
    if ! command -v brew >/dev/null 2>&1; then
      for brew_path in /opt/homebrew/bin/brew /usr/local/bin/brew; do
        if [[ -x "$brew_path" ]]; then
          eval "$("$brew_path" shellenv)"
          break
        fi
      done
    fi
    if ! command -v brew >/dev/null 2>&1; then
      echo 'Install Homebrew from https://brew.sh, then rerun setup.' >&2
      exit 1
    fi
    HOMEBREW_NO_INSTALL_UPGRADE=1 brew install git stow zsh tmux gnupg pinentry fzf jq bat python3 \
      zsh-autosuggestions zsh-syntax-highlighting
  else
    as_root=()
    if [[ "$EUID" -ne 0 ]]; then as_root=(sudo); fi
    "${as_root[@]}" apt-get update
    "${as_root[@]}" apt-get install -y git stow zsh tmux gnupg pinentry-curses \
      fzf jq bat python3 python3-venv zsh-autosuggestions zsh-syntax-highlighting
  fi
fi

for required in stow zsh; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "Missing $required. Rerun without --skip-deps to install dependencies." >&2
    exit 1
  fi
done

config_home="${XDG_CONFIG_HOME:-$HOME/.config}"
if [[ "$config_home" != /* ]]; then
  echo 'XDG_CONFIG_HOME must be an absolute path.' >&2
  exit 1
fi

# Install the vendored plugin only into an existing Oh My Zsh installation.
if [[ " ${packages[*]} " == *' zsh '* && -f "$HOME/.oh-my-zsh/oh-my-zsh.sh" ]]; then
  packages+=(.oh-my-zsh)
fi

stow_package() {
  local package="$1" mode="$2"
  if [[ -d "$SCRIPT_DIR/$package/.config" ]]; then
    mkdir -p "$config_home" || return
    stow --dir="$SCRIPT_DIR/$package" --target="$config_home" --no-folding --restow "$mode" .config || return
    if [[ "$package" == ghostty && "$platform" == Darwin ]]; then
      stow --dir="$SCRIPT_DIR" --target="$HOME" --ignore='^[.]config$' --no-folding --restow "$mode" ghostty || return
    fi
  else
    stow --dir="$SCRIPT_DIR" --target="$HOME" --no-folding --restow "$mode" "$package"
  fi
}

# Check every package before linking any files. Never adopt or move user files.
for package in "${packages[@]}"; do
  if ! stow_package "$package" --simulate; then
    echo 'Dotfile conflict: back up the conflicting files shown above, then rerun. No dotfiles were replaced.' >&2
    exit 1
  fi
done
for package in "${packages[@]}"; do
  stow_package "$package" --verbose
done

if [[ " ${packages[*]} " == *' gnupg '* && ! -L "$HOME/.gnupg" ]]; then
  chmod 700 "$HOME/.gnupg"
fi

if [[ " ${packages[*]} " == *' zsh '* ]]; then
  mkdir -p "$HOME/.zsh_autocomplete"
  # Generate into a temporary file so a failed command preserves old completions.
  completion_tmp="$(mktemp "$HOME/.zsh_autocomplete/.completion.XXXXXXXX")"
  trap 'rm -f "$completion_tmp"' EXIT
  if command -v zellij >/dev/null 2>&1 && zellij setup --generate-completion zsh > "$completion_tmp"; then
    mv "$completion_tmp" "$HOME/.zsh_autocomplete/_zellij-completion"
  fi
  if command -v git-gtr >/dev/null 2>&1 && git gtr completion zsh > "$completion_tmp"; then
    mv "$completion_tmp" "$HOME/.zsh_autocomplete/_git-gtr"
  fi
fi

echo 'Dotfiles installed. Start a new shell with: exec zsh'
