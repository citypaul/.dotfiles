---
name: find-skills
description: Discover and, with authorization, install agent skills from the open skills ecosystem. Use when the user explicitly asks to find or install a skill from the external skills ecosystem, asks whether an installable agent skill exists for a task, or wants to extend agent capabilities through skills.sh or a skill repository. Not for choosing among already-installed local skills or selecting software libraries, developer tools, applications, services, frameworks, or platform primitives; use evaluate-existing-solutions for technology choices.
---

# Find Skills

This skill helps you discover and install skills from the open agent skills ecosystem.

It does not search for ordinary software dependencies, tools, templates, applications, or services. Route those technology choices to `evaluate-existing-solutions`.

> Sourced from [vercel-labs/skills](https://github.com/vercel-labs/skills/tree/main/skills/find-skills) under the MIT License (see `LICENSE` in this directory). Browse the skills directory at [skills.sh](https://skills.sh/).

## When to Use This Skill

Use this skill when the user:

- Says "find a skill for X" or "is there a skill for X"
- Explicitly asks to search the agent-skills ecosystem
- Expresses interest in extending agent capabilities with an installable skill
- Mentions a recurring agent workflow they want packaged as a skill

## What is the Skills CLI?

The Skills CLI (`npx skills`) is the package manager for the open agent skills ecosystem. Skills are modular packages that extend agent capabilities with specialized knowledge, workflows, and tools.

**Key commands:**

- `npx skills find [query]` - Search for skills interactively or by keyword
- `npx skills add <package>` - Install a skill from GitHub or other sources
- `npx skills update` - Update installed skills to their latest versions (there is no read-only "check" command — `npx skills check` applies updates immediately)

**Browse skills at:** https://skills.sh/

## How to Help Users Find Skills

### Step 1: Understand What They Need

When a user asks for help with something, identify:

1. The domain (e.g., React, testing, design, deployment)
2. The specific task (e.g., writing tests, creating animations, reviewing PRs)
3. Whether this is a common enough task that a skill likely exists

### Step 2: Search the Ecosystem

Use [skills.sh](https://skills.sh/) and the CLI search to discover candidates. Leaderboard position and install count can surface candidates, but they do not establish safety, quality, maintenance, or fit.

Run the find command:

```bash
npx skills find [query]
```

For example:

- User asks "find an agent skill for React performance" → `npx skills find react performance`
- User asks "is there a PR-review skill?" → `npx skills find pr review`
- User asks "find a skill that helps create changelogs" → `npx skills find changelog`

### Step 3: Verify Quality Before Recommending

**Do not recommend a skill based solely on search results.** Always verify:

1. **Inspect the complete bundle** — Read `SKILL.md` and every linked instruction, script, reference, asset, and companion metadata file.
2. **Inspect capabilities and risk** — Identify commands, code execution, network access, external writes, credentials, permissions, installers, and data the skill may send or change.
3. **Verify provenance and license** — Link the exact source and revision, author, full applicable license, and any attribution obligations.
4. **Check maintenance and compatibility** — Review current source activity, releases, issues, host assumptions, and fit with the local skill conventions.
5. **Check overlap and trigger quality** — Prefer a skill with a coherent missing responsibility over a broad duplicate or ambiguous trigger.
6. **Treat popularity as a weak signal** — Installs, stars, and source reputation help discovery but never replace inspection.

### Step 4: Present Options to the User

When you find relevant skills, present them to the user with:

1. The skill name and what it does
2. The exact source, revision/currentness, author, and license
3. Material permissions, scripts, network behavior, host assumptions, or overlaps found
4. Install count or stars only as secondary context
5. The install command and a direct source link

Example response:

```
I found a skill that might help. "react-best-practices" provides React and
Next.js performance guidance. I inspected its complete bundle at <exact source
and revision>; it is <license>, requests <capabilities>, and its main local
overlap is <skill>. Its install count is secondary discovery context, not the
quality verdict.

To install it:
npx skills add vercel-labs/agent-skills@react-best-practices

Learn more: https://skills.sh/vercel-labs/agent-skills/react-best-practices
```

### Step 5: Offer to Install

Installation changes user-level state. Only install after the user explicitly authorizes the selected source and scope:

```bash
npx skills add <owner/repo@skill> -g -y
```

The `-g` flag installs globally (user-level) and `-y` skips confirmation prompts.

## Common Skill Categories

When searching, consider these common categories:

| Category        | Example Queries                          |
| --------------- | ---------------------------------------- |
| Web Development | react, nextjs, typescript, css, tailwind |
| Testing         | testing, jest, playwright, e2e           |
| DevOps          | deploy, docker, kubernetes, ci-cd        |
| Documentation   | docs, readme, changelog, api-docs        |
| Code Quality    | review, lint, refactor, best-practices   |
| Design          | ui, ux, design-system, accessibility     |
| Productivity    | workflow, automation, git                |

## Tips for Effective Searches

1. **Use specific keywords**: "react testing" is better than just "testing"
2. **Try alternative terms**: If "deploy" doesn't work, try "deployment" or "ci-cd"
3. **Inspect canonical sources**: Follow each candidate to its exact repository/revision and search beyond one publisher or leaderboard

## When No Skills Are Found

If no relevant skills exist:

1. Acknowledge that no existing skill was found
2. Offer to help with the task directly using your general capabilities
3. Suggest the user could create their own skill with `npx skills init`

Example:

```
I searched for skills related to "xyz" but didn't find any matches.
I can still help you with this task directly! Would you like me to proceed?

If this is something you do often, you could create your own skill:
npx skills init my-xyz-skill
```
