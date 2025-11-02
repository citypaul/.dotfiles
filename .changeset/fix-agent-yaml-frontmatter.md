---
"@paulhammond/dotfiles": patch
---

Fix YAML frontmatter syntax in all agent files

All custom agent files had malformed YAML in the description field causing
parsing errors on GitHub ("mapping values are not allowed in this context").

**Fixed:**
- Removed embedded examples with 'nn' pseudo-newlines from description fields
- Converted descriptions to YAML folded block scalar (>) format for proper parsing
- All agent files now have valid YAML frontmatter per Claude Code documentation

**Agents Updated:**
- refactor-scan.md
- tdd-guardian.md
- ts-enforcer.md
- docs-guardian.md
- learn.md
- wip-guardian.md
- adr.md

Per Claude Code official docs, the description field should be a concise natural
language description for task matching, not include examples. Examples belong in
the system prompt body, not YAML frontmatter.
