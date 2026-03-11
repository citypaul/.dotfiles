---
"@paulhammond/dotfiles": patch
---

fix: strip incompatible frontmatter when copying agents/commands to OpenCode

OpenCode validates agent frontmatter strictly — `tools` must be an object (not a string), `color` must be hex (not a named color), and `allowed-tools` is not a recognised field. The installer now copies files with `sed` to strip these Claude Code-specific fields instead of symlinking, fixing the "Configuration is invalid" error on startup.
