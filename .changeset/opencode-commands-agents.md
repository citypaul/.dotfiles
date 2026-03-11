---
"@paulhammond/dotfiles": minor
---

feat: add full OpenCode compatibility for commands and agents

OpenCode uses different directory paths for discovering slash commands and agents:
- Commands: `~/.config/opencode/command/` (singular) vs Claude Code's `~/.claude/commands/`
- Agents: `~/.config/opencode/agent/` (singular) vs Claude Code's `~/.claude/agents/`

The installer now creates symlinks from OpenCode's expected directories to the Claude Code
source files when using `--with-opencode` or `--opencode-only`, so all 5 slash commands
and 9 agents work identically in both tools with zero duplication.

Also updated `opencode.json` to include agent instructions in the `instructions` array.
