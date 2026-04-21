---
"@paulhammond/dotfiles": patch
---

fix: install-claude.sh now covers storyboard, teach-me, and diagrams skills

Three skills that had been committed to the repo were never added to the installer's skill list, so they were silently missing from `~/.claude/skills/` for anyone running `install-claude.sh`:

- `storyboard` (added in #128) — multi-surface design audit
- `teach-me` (added in #126) — evidence-based private tutor, plus 4 resource files
- `diagrams` (added in #122) — Mermaid/Graphviz/Vega-Lite/etc., plus `LICENSE`, `examples.md`, and 8 reference files

The installer now creates the missing directories, downloads all three SKILL.md files, and pulls in each skill's resources/references and any vendored LICENSE file.

Also updates `README.md` to reflect the actual catalog:
- Skill count bumped 21 → 23 (summary line and detailed install breakdown)
- **Key Sections** and **Quick Navigation by Problem** tables both now have rows for teach-me and diagrams, with MIT attribution visible inline for diagrams
