---
"@paulhammond/dotfiles": minor
---

feat(install): install skills via the skills.sh CLI

Replace the three direct-`curl` skill install blocks (own, web-quality-skills, impeccable) in `install-claude.sh` with `npx skills add -g -a claude-code -s '*' -y` calls against [skills.sh](https://skills.sh). The installer shrinks from ~700 to ~370 lines and skills can now be managed with `npx skills list/update/find/remove` after install instead of re-running the installer.

**Why it matters:**
- **Multi-agent portability** — the same skills are now installable against [40+ coding agents](https://github.com/vercel-labs/skills) (Claude Code, Cursor, Codex, Copilot, OpenCode, Gemini CLI, Cline, Continue, Windsurf, …) via the `-a <agent>` flag. `--with-opencode` is now just an extra `-a opencode` on the existing install rather than a duplicated tree.
- **Lifecycle management** — `npx skills update -g` propagates upstream changes instead of requiring a full reinstall, and `npx skills find <query>` surfaces skills beyond this repo from the open ecosystem.
- **Installer no longer grows with the skill list** — three `curl` loops with hard-coded file lists (including every `resources/*.md` and `references/*.md`) collapsed into three `npx skills add` calls; adding a new skill to `claude/.claude/skills/` no longer requires a matching installer edit.

**Trade-offs (documented in the README):**
- `--skills-only` now requires Node.js for `npx`. The script preflights and errors clearly if Node is missing; `--claude-only` and `--agents-only` still work without it.
- The skills CLI doesn't surface ref pinning yet, so skills always install from the latest upstream commit. `--version` still pins `CLAUDE.md`, commands, and agents.
- On an existing install that used the old `curl` mechanism, re-running backs up and replaces existing skill directories with CLI-managed symlinks — expected, but worth flagging before first run.

`CLAUDE.md`, slash commands, and agents continue to download directly from this repo — they aren't skills and aren't part of the skills.sh ecosystem.
