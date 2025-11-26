---
"@paulhammond/dotfiles": minor
---

Add use-case-data-patterns agent for architectural analysis

Added a new agent that analyzes how user-facing use cases map to underlying data access patterns and architectural implementation in the codebase. This agent helps developers understand existing patterns before implementing new features.

This agent is adapted from [Kieran O'Hara's dotfiles](https://github.com/kieran-ohara/dotfiles/blob/main/config/claude/agents/analyse-use-case-to-data-patterns.md). Thank you to Kieran O'Hara for creating and sharing this excellent agent specification.

Key features:
- Creates comprehensive analytical reports mapping use cases to data patterns
- Traces through architecture layers (endpoints, middleware, business logic, data access)
- Identifies database patterns, caching strategies, and external integrations
- Highlights gaps and provides recommendations
- Does NOT edit files - purely analytical
