#!/usr/bin/env python3
"""Offline smoke checks: real Stow/Zsh, temporary homes, stubbed package managers."""
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

SOURCE = Path(__file__).resolve().parents[1]
PACKAGES = "zsh tmux gnupg alacritty zellij ghostty herdr .oh-my-zsh".split()
STOW = shutil.which("stow")
ZSH = shutil.which("zsh")
assert STOW and ZSH, "Install stow and zsh before running this test"
PLATFORM = subprocess.check_output(["uname", "-s"], text=True).strip()



def verify_installation(home, repo, platform, config_home=None):
    """Assert the installed contract, using paths independent of the installer."""
    home = Path(home).resolve()
    repo = Path(repo).resolve()
    config_home = Path(config_home or home / ".config")
    expected = {
        home / ".zshrc": repo / "zsh/.zshrc",
        home / ".zsh_profile": repo / "zsh/.zsh_profile",
        home / ".nvm_setup": repo / "zsh/.nvm_setup",
        home / ".pyenv_setup.sh": repo / "zsh/.pyenv_setup.sh",
        home / ".tmux.conf": repo / "tmux/.tmux.conf",
        home / ".tmux.conf.local": repo / "tmux/.tmux.conf.local",
        home / ".gnupg/gpg.conf": repo / "gnupg/.gnupg/gpg.conf",
        home / ".gnupg/gpg-agent.conf": repo / "gnupg/.gnupg/gpg-agent.conf",
        home / ".alacritty.toml": repo / "alacritty/.alacritty.toml",
        config_home / "zellij/config.kdl": repo / "zellij/.config/zellij/config.kdl",
        config_home / "ghostty/config": repo / "ghostty/.config/ghostty/config",
        config_home / "herdr/config.toml": repo / "herdr/.config/herdr/config.toml",
    }
    mac_config = Path("Library/Application Support/com.mitchellh.ghostty/config")
    if platform == "Darwin":
        expected[home / mac_config] = repo / "ghostty" / mac_config
    elif platform == "Linux":
        assert not (home / "Library").exists(), "Linux received a macOS Library directory"
    else:
        raise AssertionError("Unexpected test platform: " + platform)
    for installed, source in expected.items():
        assert installed.is_symlink(), f"Missing config symlink: {installed}"
        assert installed.exists(), f"Broken config symlink: {installed}"
        assert installed.resolve() == source.resolve(), f"Wrong config target: {installed}"
    # Runtime data must stay in the home, not inside a folded repository directory.
    for directory in [home / ".gnupg", config_home, config_home / "ghostty",
                      config_home / "zellij", config_home / "herdr"]:
        assert directory.is_dir() and not directory.is_symlink(), f"Folded directory: {directory}"
    assert (home / ".gnupg").stat().st_mode & 0o777 == 0o700, "GnuPG directory is not private"
    assert not (home / "pyenv").exists(), "Setup eagerly created a Python environment"
    for directory in [home / ".claude", home / ".codex", home / ".agents", config_home / "opencode"]:
        assert not directory.exists(), f"Personal setup created AI configuration: {directory}"
    print(f"PASS: {platform}: {len(expected)} config links point to the checkout; permissions and platform isolation are correct")


if len(sys.argv) == 3 and sys.argv[1] == "--verify-installed":
    verify_installation(sys.argv[2], SOURCE, PLATFORM)
    raise SystemExit(0)
if len(sys.argv) != 1:
    raise SystemExit("Usage: python3 test/setup-dotfiles.py [--verify-installed HOME_DIRECTORY]")


def run(args, env, cwd, ok=True):
    result = subprocess.run(args, env=env, cwd=cwd, text=True, capture_output=True, timeout=30)
    if ok:
        assert result.returncode == 0, result.stdout + result.stderr
    else:
        assert result.returncode != 0, "Expected failure: " + result.stdout
    return result


def snapshot(root):
    return {str(p.relative_to(root)): (p.stat().st_mode, hashlib.sha256(p.read_bytes()).hexdigest())
            for p in root.rglob("*") if p.is_file()}


with tempfile.TemporaryDirectory(prefix="dotfiles-smoke-") as temporary:
    root = Path(temporary).resolve()
    repo = root / "checkout with spaces"
    repo.mkdir()
    for package in PACKAGES:
        shutil.copytree(SOURCE / package, repo / package)
    shutil.copy2(SOURCE / "setup-dotfiles.sh", repo / "setup-dotfiles.sh")
    before = snapshot(repo)
    bins = root / "bin"
    bins.mkdir()
    (bins / "stow").symlink_to(STOW)
    (bins / "zsh").symlink_to(ZSH)

    def stub(name, body):
        path = bins / name
        path.write_text("#!/bin/sh\n" + body + "\n")
        path.chmod(0o755)

    stub("uname", 'printf "%s\\n" "$TEST_PLATFORM"')
    stub("brew", """if [ "$1" = shellenv ]; then
  printf 'export HOMEBREW_PREFIX="%s"\\n' "$TEST_BREW_PREFIX"
else
  printf 'brew %s\\n' "$*" >> "$TEST_LOG"
  [ "${HOMEBREW_NO_INSTALL_UPGRADE:-}" = 1 ] || { echo 'Unexpected upgrade of installed tools' >&2; exit 1; }
  exit "${TEST_PACKAGE_FAILURE:-0}"
fi""")
    stub("apt-get", 'printf "apt-get %s\\n" "$*" >> "$TEST_LOG"; exit "${TEST_PACKAGE_FAILURE:-0}"')
    stub("sudo", 'exec "$@"')
    stub("zellij", 'printf "#compdef zellij\\n"; exit "${TEST_COMPLETION_FAILURE:-0}"')
    stub("git-gtr", 'exit 0')
    stub("git", 'printf "#compdef git-gtr\\n"; exit "${TEST_COMPLETION_FAILURE:-0}"')
    # Detect any accidental eager Python environment creation.
    stub("python3", 'echo "Unexpected Python startup invocation" >&2; exit 1')

    def environment(name):
        home = root / name
        home.mkdir()
        return {"HOME": str(home), "PATH": f"{bins}:/usr/bin:/bin", "TERM": "dumb",
                "TMPDIR": str(root), "TEST_PLATFORM": PLATFORM,
                "TEST_BREW_PREFIX": str(root / "brew prefix"), "TEST_LOG": str(root / "packages.log")}

    def setup(env, *args, ok=True):
        return run(["/bin/bash", str(repo / "setup-dotfiles.sh"), *args], env, root, ok)

    mac_env = dict(environment("mac dependencies"), TEST_PLATFORM="Darwin")
    setup(mac_env, "tmux")
    assert (Path(mac_env["HOME"]) / ".tmux.conf").resolve() == repo / "tmux/.tmux.conf"
    print("PASS: macOS dependency installation preserves installed versions")

    env = environment("fresh home")
    home = Path(env["HOME"])
    setup(env)
    verify_installation(home, repo, PLATFORM)
    assert (home / ".zshrc").resolve() == repo / "zsh/.zshrc"
    assert (home / ".config/ghostty/config").resolve() == repo / "ghostty/.config/ghostty/config"
    assert (home / ".gnupg").is_dir() and not (home / ".gnupg").is_symlink()
    assert (home / ".gnupg").stat().st_mode & 0o777 == 0o700
    assert (home / "Library").exists() == (PLATFORM == "Darwin")
    assert not any((home / p).exists() for p in [".claude", ".agents", ".config/opencode", ".oh-my-zsh"])
    log = (root / "packages.log").read_text()
    assert ("brew install" if PLATFORM == "Darwin" else "apt-get install") in log
    setup(env, "--skip-deps")
    verify_installation(home, repo, PLATFORM)
    assert (root / "packages.log").read_text() == log
    assert (home / ".zsh_autocomplete/_zellij-completion").read_text() == "#compdef zellij\n"
    assert (home / ".zsh_autocomplete/_git-gtr").read_text() == "#compdef git-gtr\n"
    setup(dict(env, TEST_COMPLETION_FAILURE="1"), "--skip-deps")
    assert (home / ".zsh_autocomplete/_zellij-completion").read_text() == "#compdef zellij\n"
    assert not list((home / ".zsh_autocomplete").glob(".completion.*"))
    (home / ".tmux.conf").unlink()
    (home / ".tmux.conf").symlink_to(repo / "tmux/.tmux.conf.local")
    try:
        verify_installation(home, repo, PLATFORM)
    except AssertionError as error:
        assert "Wrong config target" in str(error)
    else:
        raise AssertionError("Verifier accepted an incorrect config target")
    (home / ".tmux.conf").unlink()
    (home / ".tmux.conf").symlink_to(repo / "tmux/.tmux.conf")
    print("PASS: fresh/repeated install, explicit targets, permissions, completions and skills isolation")

    shell = run([ZSH, "-dfc", 'source "$HOME/.zshrc"; print -r -- "${_comps[zellij]}"; '
                 '(( ! $+functions[node] )); [[ ! -d "$HOME/pyenv" ]]'], env, home)
    assert not shell.stderr, shell.stderr
    assert "_zellij" in shell.stdout, shell.stdout
    assert not (home / "pyenv").exists()
    print("PASS: shell starts without Oh My Zsh, NVM or optional prompt tools; completions are registered")

    unsafe = root / "unsafe completions"
    unsafe.mkdir()
    unsafe.chmod(0o777)
    (unsafe / "_unsafe").write_text("#compdef unsafe\n")
    shell = run([ZSH, "-dfc", 'fpath=("$UNSAFE_COMPLETIONS" $fpath); source "$HOME/.zshrc"; '
                 '[[ -n "${_comps[git]}" && -z "${_comps[unsafe]}" ]]'],
                dict(env, UNSAFE_COMPLETIONS=str(unsafe)), home)
    assert not shell.stderr, shell.stderr
    print("PASS: shell skips unsafe completions while retaining safe system completions")

    # A late XDG conflict must not leave earlier packages installed.
    conflict_env = environment("conflicts")
    conflict_home = Path(conflict_env["HOME"])
    conflict = conflict_home / ".config/herdr/config.toml"
    conflict.parent.mkdir(parents=True)
    conflict.write_text("original settings\n")
    setup(conflict_env, "--skip-deps", ok=False)
    assert conflict.read_text() == "original settings\n"
    assert not (conflict_home / ".zshrc").exists()
    assert not (conflict_home / ".tmux.conf").exists()
    assert not (conflict_home / ".config/ghostty/config").exists()
    (conflict_home / ".zshrc").write_text("original shell\n")
    setup(conflict_env, "--skip-deps", ok=False)
    assert (conflict_home / ".zshrc").read_text() == "original shell\n"
    assert not (conflict_home / ".zshrc.old").exists()
    print("PASS: conflicts preserve user files and prevent partial dotfile installation")

    selected_env = environment("selected")
    selected_home = Path(selected_env["HOME"])
    selected_env["XDG_CONFIG_HOME"] = str(root / "custom config")
    setup(selected_env, "--skip-deps", "ghostty")
    assert (Path(selected_env["XDG_CONFIG_HOME"]) / "ghostty/config").is_symlink()
    assert not (selected_home / ".zshrc").exists()
    assert not (selected_home / ".config").exists()
    setup(selected_env, "--skip-deps", "ghostty")
    print("PASS: package selection and custom XDG location")

    failure_env = environment("failure")
    setup(dict(failure_env, TEST_PLATFORM="FreeBSD"), ok=False)
    setup(dict(failure_env, TEST_PACKAGE_FAILURE="1"), ok=False)
    setup(failure_env, "claude", ok=False)
    assert not list(Path(failure_env["HOME"]).iterdir())
    print("PASS: unsupported platforms, failed dependency installs and unknown packages fail before linking")

    # Upgrade a folded Stow directory without changing source permissions.
    migrated_env = environment("old stow")
    migrated_home = Path(migrated_env["HOME"])
    run([STOW, "--dir=" + str(repo), "--target=" + str(migrated_home), *PACKAGES[:-1]], migrated_env, root)
    assert (migrated_home / ".gnupg").is_symlink()
    setup(migrated_env, "--skip-deps")
    assert not (migrated_home / ".gnupg").is_symlink()
    assert (migrated_home / ".gnupg").stat().st_mode & 0o777 == 0o700
    assert (migrated_home / ".config/zellij/config.kdl").is_symlink()
    assert not (migrated_home / ".config/zellij").is_symlink()
    print("PASS: existing Stow installation migrates without changing source permissions")

    existing_env = environment("existing ai settings")
    existing_home = Path(existing_env["HOME"])
    for relative in [".claude/settings.json", ".codex/config.toml", ".agents/skills/custom/SKILL.md",
                     ".config/opencode/opencode.json"]:
        file = existing_home / relative
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text("user-owned settings\n")
    ai_before = snapshot(existing_home)
    setup(existing_env, "--skip-deps")
    ai_after = snapshot(existing_home)
    assert all(ai_after.get(path) == content for path, content in ai_before.items())
    print("PASS: pre-existing AI configuration and skills remain unchanged")

    # Standard NVM takes precedence over Homebrew and respects a custom NVM_DIR.
    nvm_dir = root / "custom nvm"
    nvm_dir.mkdir()
    (nvm_dir / "nvm.sh").write_text('nvm() { print v22.0.0; }\nnvm_find_nvmrc() { return 0; }\n')
    (nvm_dir / "bash_completion").write_text("NVM_COMPLETION_LOADED=yes\n")
    nvm_env = dict(env, NVM_DIR=str(nvm_dir), PNPM_HOME=str(root / "custom pnpm"))
    result = run([ZSH, "-dfc", 'source "$HOME/.zshrc"; nvm; print -r -- "$PNPM_HOME"; [[ "$NVM_COMPLETION_LOADED" == yes ]]'], nvm_env, home)
    assert not result.stderr, result.stderr
    assert "v22.0.0" in result.stdout and nvm_env["PNPM_HOME"] in result.stdout
    brew_nvm = Path(env["TEST_BREW_PREFIX"]) / "opt/nvm"
    brew_nvm.mkdir(parents=True)
    shutil.copy2(nvm_dir / "nvm.sh", brew_nvm / "nvm.sh")
    result = run([ZSH, "-dfc", 'source "$HOME/.zshrc"; nvm'], env, home)
    assert not result.stderr and "v22.0.0" in result.stdout, result.stderr

    # Existing Oh My Zsh remains supported; the bundled plugin is linked only then.
    omz_env = environment("existing omz")
    omz_home = Path(omz_env["HOME"])
    (omz_home / ".oh-my-zsh").mkdir()
    (omz_home / ".oh-my-zsh/oh-my-zsh.sh").write_text("OMZ_LOADED=yes\n")
    setup(omz_env, "--skip-deps", "zsh")
    assert (omz_home / ".oh-my-zsh/custom/plugins/zsh-you-should-use/zsh-you-should-use.plugin.zsh").is_symlink()
    result = run([ZSH, "-dfc", 'source "$HOME/.zshrc"; [[ "$OMZ_LOADED" == yes ]]'], omz_env, omz_home)
    assert not result.stderr, result.stderr

    # Python failures do not source a nonexistent activation script.
    result = run([ZSH, "-dfc", 'source "$HOME/.pyenv_setup.sh"; pyenv-activate'], env, home, ok=False)
    assert "Unexpected Python startup invocation" in result.stderr
    assert "no such file" not in result.stderr
    assert snapshot(repo) == before, "Setup changed the checkout"
    print("PASS: optional runtime loading, failure handling and unchanged checkout")
