# Generated Skill Template

Replace placeholders with app-specific evidence. Remove sections that do not apply.

````markdown
---
name: <app-name>-production-parity
description: Detect, document, test, and fix drift between production and local, CI, PR, preview, staging, or other non-production environments for <app-name>. Use when working on <app-name> auth, config, deployment, infrastructure, tests, local setup, fixtures, feature flags, backing services, or any issue where behavior may differ from production.
---

# <App Name> Production Parity

Production is the reference contract for <app-name>. Non-production environments may be lighter, but every difference must be explicit, justified, and covered by a guard.

This skill is project-local. Keep it inside the <app-name> repository and do not move it to `~/.agents/skills`, `~/.codex/skills`, `~/.claude/skills`, `$CODEX_HOME/skills`, or any other user/global skill directory.

## App Parity Contract

- Production environments: <prod names/URLs/manifest paths>
- Non-production environments: <local/CI/PR/preview/staging names>
- Skill location: <project-relative path to this SKILL.md>
- Intentional divergences: <link/list, each with reason and compensating guard>
- Blocking rule: unknown production behavior is a parity risk until sourced or answered

## Production Truth Sources

List exact sources:

- <file/path>: <what it proves>
- <deployment manifest or IaC path>: <what it proves>
- <doc/runbook>: <what it proves>
- User-confirmed decision on <date>: <decision>

## Inspection Workflow

1. Read <docs/setup/deployment files>.
2. Inspect <config/auth/infra/test files>.
3. Build or update the parity map for changed surfaces.
4. Ask harness questions only for source-unanswerable decisions.
5. Add or update guards before declaring drift closed.

## Parity Surfaces

### <Surface Name>

- Production behavior: <evidence-backed behavior>
- Local behavior: <evidence-backed behavior>
- CI/PR/preview behavior: <evidence-backed behavior>
- Drift risks: <security/user/data/release impact>
- Guards: <tests/scripts/manual checks>
- Fix pattern: <how to close drift in this app>

Repeat for each app-relevant surface.

## Drift Checks

Run the checks that apply to the changed surface:

```bash
<command>
```

Expected result:

- <what passing proves>
- <what failure usually means>

## Fix Patterns

Use these app-specific patterns:

- <auth group/claim parity pattern>
- <config schema pattern>
- <local seed/fixture pattern>
- <infra manifest check pattern>
- <preview smoke test pattern>

## Question Protocol

Use the active harness's structured ask-question facility when available (`AskUserQuestion`, `request_user_input`, `ask_question`, or equivalent). If unavailable, ask one concise plain-text question.

Ask only when inspection cannot answer a decision that changes parity behavior. Capture every answer into this skill or the source artifact it names.

## Output Contract

Every run must report:

- files inspected
- confirmation that this skill remains project-local
- parity surfaces touched
- drift found
- fixes made
- checks run and results
- explicit divergences left in place
- unanswered questions with owner or next step
```
````
