---
"@paulhammond/dotfiles": minor
---

Add twelve-factor app skill and audit agent

- New `twelve-factor` skill with actionable TypeScript patterns for 12-factor compliant services
- New `twelve-factor-audit` agent for auditing existing codebases against the methodology
- Greenfield projects must follow all factors; brownfield projects adopt incrementally
- Covers config, dependencies, backing services, stateless processes, disposability, logging
- Integrated with `/setup` command for automatic detection of 12-factor patterns
