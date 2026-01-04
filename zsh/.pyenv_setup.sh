# Python virtual environment setup
# Creates venv on first use, activates if exists

if [ ! -d "$HOME/pyenv" ]; then
  python3 -m venv "$HOME/pyenv"
fi
source "$HOME/pyenv/bin/activate"

# Alias to manually update pip/setuptools when needed
alias pyenv-update='pip install --upgrade pip setuptools'
