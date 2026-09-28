---
"@conjurer-rich/dotfiles": minor
---

`/delegate` ships as a global command. It carries no project's settings: it reads them from the project's `.claude/delegation.md`, takes owner and repo from the repository, and stops in a project without that file. Its startup lines no longer fail when `gh` is missing.
