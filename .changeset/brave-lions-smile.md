---
"@paulhammond/dotfiles": minor
---

Add PR reviewer agent with direct GitHub commenting

New features:
- `pr-reviewer` agent: Comprehensive pull request review for TDD compliance, TypeScript strictness, testing quality, functional patterns, and general code quality
- `/generate-pr-review` command: Creates project-specific PR review automation combining global rules with project conventions
- Direct PR commenting: Agent posts reviews directly to GitHub PRs using MCP tools

The pr-reviewer agent reviews PRs across five categories:
1. TDD Compliance - Was test-first development followed?
2. Testing Quality - Are tests behavior-focused?
3. TypeScript Strictness - No `any`, proper types?
4. Functional Patterns - Immutability, pure functions?
5. General Quality - Clean code, security, scope?

Design decisions:
- **Manual invocation only**: Designed for use during Claude Code sessions rather than automated CI/CD pipelines. This saves significant API costs while still providing comprehensive reviews when needed.
- **Direct GitHub integration**: Posts reviews as PR comments using GitHub MCP tools (add_issue_comment, pull_request_review_write, add_comment_to_pending_review)

The `/generate-pr-review` command analyzes multiple sources to create project-specific reviewers:
- AI/LLM config files (`.cursorrules`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.aider.conf.yml`)
- Architecture Decision Records (docs/adr/*.md)
- Project documentation (CONTRIBUTING.md, DEVELOPMENT.md, CODING_STANDARDS.md)
- Tech stack (package.json, tsconfig.json, eslint configs)
- Existing code patterns and conventions
