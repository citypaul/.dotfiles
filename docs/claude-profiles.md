# Claude Code profiles

Use this when one machine needs two separate Claude Code setups, for example a
client's skills for paid work and your own skills for everything else. Each
profile is its own config directory, so skills, plugins, `CLAUDE.md`, settings,
MCP servers, memory and session history never mix.

This is part of the personal `zsh` package installed by `setup-dotfiles.sh`. It
is not part of the skills installer, and it changes nothing until you opt in:
without the steps below, `claude` keeps using `~/.claude`.

## Commands

| Command | Config directory it runs Claude Code with |
| --- | --- |
| `claude` | The machine default: `~/.claude`, or the profile you chose in `~/.zshrc.local` |
| `claude-profile NAME [arguments]` | `~/.claude-NAME` |
| `claude-personal [arguments]` | `~/.claude`, whatever the machine default is |

Arguments pass straight through, so `claude-profile work plugin list` and
`claude-personal --resume` both work. `claude-profile` with no name prints its
usage and exits with status 2 without starting Claude Code.

The mechanism is Claude Code's own `CLAUDE_CONFIG_DIR` environment variable.
`claude-profile` sets it for one command, and `claude-personal` clears it for
one command. Neither changes the variable in your shell.

## Create a profile

The examples use a profile called `work`. Pick any name.

1. Sign in. The directory is created on first use, and a new profile is not
   signed in:

   ```sh
   claude-profile work auth login
   ```

2. Install what that profile needs. Plugin commands act on the profile they run
   in:

   ```sh
   claude-profile work plugin marketplace add <marketplace source>
   claude-profile work plugin install <plugin>@<marketplace>
   ```

3. Check the result:

   ```sh
   claude-profile work plugin list
   claude-profile work auth status
   ```

   `auth status` prints the `configDirectory` it used, which should end in
   `.claude-work`.

A new profile starts empty. Nothing is copied from `~/.claude`, so add again
any MCP servers (`claude-profile work mcp add ...`), permissions and hooks you
want there.

## Make a profile the default

To make plain `claude` open the `work` profile on this machine, add one line to
`~/.zshrc.local`, the file this repository reserves for machine-specific
settings:

```sh
export CLAUDE_CONFIG_DIR="$HOME/.claude-work"
```

Open a new terminal, or run `source ~/.zshrc`. From then on:

```sh
claude            # the work profile
claude-personal   # your own ~/.claude
```

To go back, delete that line.

The default lives in `~/.zshrc.local` and not in this repository, because the
tracked shell files are shared: a default set there would give everyone who
installs them an empty profile.

## Limits

- **Only shells see the default.** Applications that are not started from a
  terminal, such as the desktop app or an editor extension opened from the Dock,
  do not read `~/.zshrc.local` and keep using `~/.claude`.
- **Open terminals keep their old default** until you open a new one or run
  `source ~/.zshrc`.
- **Memory and history are per profile.** A project opened in a new profile
  does not see the memories or past sessions saved under another one.
- **Only Claude Code is covered.** Codex and other agents have their own
  config locations and are not switched by these commands.

## Tests

`python3 test/setup-dotfiles.py` checks the three commands against a stub
`claude` in a temporary home: the default is untouched, `claude-profile` and a
`~/.zshrc.local` default each reach Claude Code, and `claude-personal`
overrides that default for one command.
