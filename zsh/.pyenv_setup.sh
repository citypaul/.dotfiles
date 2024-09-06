if [ ! -d "$HOME/pyenv" ]; then
  python3 -m venv "$HOME/pyenv"
fi
source "$HOME/pyenv/bin/activate"
pip install --upgrade pip setuptools >/dev/null 2>&1
