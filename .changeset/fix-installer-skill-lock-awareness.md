---
"@paulhammond/dotfiles": patch
---

Fix `install-claude.sh` mishandling skills installed by skills CLI ≥ 1.5, which copies each skill into `~/.claude/skills/<name>` as a regular directory (tracked in `~/.agents/.skill-lock.json`) instead of symlinking through the universal `~/.agents/skills/` cache. The installer treated every regular directory as a pre-skills.sh leftover, so on each run it moved all CLI-managed skills aside as "legacy" and then warned that the freshly reinstalled copies "won't be visible to non-Claude agents" — an endless move-and-reinstall cycle that could leave skills missing if an install step failed after the move (and made a newly merged skill look like it never installed).

The installer now consults the skills CLI lock file: symlinked entries and lock-tracked directories are both recognised as CLI-managed and left alone; only genuinely unmanaged directories are migrated aside or warned about. Adds `test/install-claude-skill-layout.sh` covering all three layouts.
