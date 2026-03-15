---
description: One-shot project onboarding - detect tech stack, create CLAUDE.md, hooks, and commands
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(cat:*), Bash(ls:*), Bash(jq:*), Bash(node:*), Bash(npx:*), Bash(pnpm:*), Bash(npm:*), Bash(yarn:*), Bash(bun:*), Bash(cargo:*), Bash(go:*), Bash(python:*), Bash(pip:*), Bash(git:*)
---

Project root:
!`pwd`

Existing config:
!`ls -la .claude/ 2>/dev/null || echo "No .claude directory"`
!`ls -la CLAUDE.md .claude/CLAUDE.md 2>/dev/null || echo "No CLAUDE.md found"`

Package info:
!`cat package.json 2>/dev/null | head -50 || echo "No package.json"`
!`cat Cargo.toml 2>/dev/null | head -20 || echo "No Cargo.toml"`
!`cat go.mod 2>/dev/null | head -10 || echo "No go.mod"`
!`cat pyproject.toml 2>/dev/null | head -30 || echo "No pyproject.toml"`

TypeScript config:
!`cat tsconfig.json 2>/dev/null | head -30 || echo "No tsconfig.json"`

CI config:
!`ls .github/workflows/ .forgejo/workflows/ .woodpecker/ .circleci/ .gitlab-ci.yml 2>/dev/null || echo "No CI config found"`

Set up this project for Claude Code using the global framework. Analyze the project and create all necessary configuration.

## Analysis Phase

1. **Detect tech stack**: language, framework, package manager, test runner, linter, formatter, build tool
2. **Detect TypeScript strict config**: check for `strict`, `noUncheckedIndexedAccess`, `noImplicitAny` etc.
3. **Detect CI pipeline**: what CI system, what steps run, what commands
4. **Detect existing config**: check for existing CLAUDE.md, .claude/ directory, hooks, commands
5. **Check for DDD**: look for glossary files, domain directories, bounded context structure
6. **Check for hexagonal architecture**: look for ports/, adapters/, domain/ directory structure
7. **Check for 12-factor patterns**: look for Dockerfile, docker-compose.yml, Procfile, .env.example, process.env usage, PORT binding, Kubernetes manifests (k8s/, deployment.yaml)

## Generation Phase

Create the following, skipping any that already exist (ask before overwriting):

### 1. Project CLAUDE.md (`.claude/CLAUDE.md`)

Include sections based on what was detected:
- **Project commands**: exact build, test, lint, typecheck, dev commands from package.json/Makefile
- **Tech stack**: framework, language version, key dependencies
- **TypeScript config**: note strict mode settings, especially `noUncheckedIndexedAccess` if enabled
- **Monorepo structure**: if applicable, map workspaces and their purposes
- **CI pipeline**: CI system, pipeline steps, known environment differences from local
- **DDD glossary location**: if DDD detected, point to glossary file
- **12-factor services**: if 12-factor patterns detected, add `For 12-factor service patterns, load the \`twelve-factor\` skill.` and note the `twelve-factor-audit` agent is available for compliance audits
- **Testing**: test runner, test command, any special setup needed

Keep it concise and actionable — this replaces the need to run `/init`.

### 2. Project hooks (`.claude/settings.json`)

Generate a PostToolUse hook for typecheck after Write/Edit on .ts/.tsx files:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "FILE=$(jq -r '.tool_input.file_path // empty'); if [[ \"$FILE\" == *.ts || \"$FILE\" == *.tsx ]]; then <TYPECHECK_CMD> 2>&1 | tail -20; fi; exit 0"
          }
        ]
      }
    ]
  }
}
```

Use the actual typecheck command detected from the project (e.g., `pnpm typecheck`, `npx tsc --noEmit`, `yarn tsc --noEmit`).

### 3. Project /pr command (`.claude/commands/pr.md`)

Generate a project-specific PR command that runs the detected quality gates before creating a PR:
- Typecheck command
- Lint command
- Test command
- Build command (if applicable)

### 4. Project pr-reviewer agent (`.claude/agents/pr-reviewer.md`)

Run `/generate-pr-review` to create a project-specific PR review agent, OR generate one directly using detected project conventions.

## Constraints

- **Do NOT overwrite existing files** without asking
- **Do NOT install packages** or modify project code
- **Do NOT create skills or agents that duplicate the global ones** — the global framework provides those
- Present a summary of what will be created and ask for approval before writing files
- Keep all generated files concise and project-specific
