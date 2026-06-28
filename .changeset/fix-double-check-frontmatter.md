---
"@paulhammond/dotfiles": patch
---

Fix `double-check` skill being silently skipped by the skills.sh installer

The skill's `description` frontmatter contained an inline `": "` (in
`Provider-agnostic: it always picks...`). YAML reads colon-space inside an
unquoted plain scalar as a nested mapping, so `npx skills add` failed to
parse the frontmatter and silently dropped the skill — the installer found
27 of 28 skills and `double-check` never landed in `~/.agents/skills/`.
Replaced the colon with an em dash to match the description's existing style.
