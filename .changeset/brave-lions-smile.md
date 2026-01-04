---
"@paulhammond/dotfiles": minor
---

Add PR reviewer agent and project-specific generator command

New features:
- `pr-reviewer` agent: Comprehensive pull request review for TDD compliance, TypeScript strictness, testing quality, functional patterns, and general code quality
- `/generate-pr-review` command: Creates project-specific PR review automation combining global rules with project conventions

The pr-reviewer agent reviews PRs across five categories:
1. TDD Compliance - Was test-first development followed?
2. Testing Quality - Are tests behavior-focused?
3. TypeScript Strictness - No `any`, proper types?
4. Functional Patterns - Immutability, pure functions?
5. General Quality - Clean code, security, scope?

For project-specific customization, use `/generate-pr-review` in any project to analyze its tech stack and create a tailored review configuration that extends global rules.
