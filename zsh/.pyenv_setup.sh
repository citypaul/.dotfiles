# Create and activate the personal environment only when explicitly requested.
pyenv-activate() {
  if [[ ! -f "$HOME/pyenv/bin/activate" ]]; then
    python3 -m venv "$HOME/pyenv" || return
  fi
  source "$HOME/pyenv/bin/activate"
}

# Alias to manually update pip/setuptools when needed
alias pyenv-update='pyenv-activate && python3 -m pip install --upgrade pip setuptools'
