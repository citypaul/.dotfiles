---
"@paulhammond/dotfiles": minor
---

Add automated PR review with GitHub integration

New features:
- `pr-reviewer` agent: Comprehensive pull request review for TDD compliance, TypeScript strictness, testing quality, functional patterns, and general code quality
- `/generate-pr-review` command: Creates project-specific PR review automation combining global rules with project conventions
- GitHub Actions workflow: Automatically reviews PRs on push and posts feedback as comments
- Direct PR commenting: Agent can post reviews directly to GitHub PRs using MCP tools

The pr-reviewer agent reviews PRs across five categories:
1. TDD Compliance - Was test-first development followed?
2. Testing Quality - Are tests behavior-focused?
3. TypeScript Strictness - No `any`, proper types?
4. Functional Patterns - Immutability, pure functions?
5. General Quality - Clean code, security, scope?

Automation:
- PRs are automatically reviewed when opened or pushed to
- Reviews are posted directly as PR comments
- Supports line-specific review comments for detailed feedback

For project-specific customization, use `/generate-pr-review` in any project to analyze its tech stack and create a tailored review configuration that extends global rules.
