---
"@citypaul/dotfiles": minor
---

Add Herdr terminal workspace support

Herdr (https://herdr.dev) is a tmux-style terminal workspace manager that tracks
each coding agent's state — working, blocked, idle — in a sidebar, which is what
makes several concurrent agents legible at a glance.

Two additions:

- **New `herdr` stow package** holding `~/.config/herdr/config.toml`, so the
  hand-authored Herdr configuration is captured rather than living only on one
  machine. Currently sorts the agent sidebar as an attention queue.
- **The `herdr` skill** from [herdrdev/herdr](https://skills.sh/herdrdev/herdr)
  is now installed for every target agent alongside the other external sources.
  It lets an agent drive the workspace it is running inside: split a pane, run a
  command in it, read the output back, and wait on a sibling agent without
  stealing focus. `--no-external` opts out along with the other community skills.

The per-agent state integrations that feed the sidebar are installed separately
by mac-dev-machine-setup (`make herdr`), because the hook scripts are versioned
with the herdr binary rather than checked in here.
