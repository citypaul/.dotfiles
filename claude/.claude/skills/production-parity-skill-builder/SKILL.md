---
name: production-parity-skill-builder
description: Create an application-specific production parity skill by inspecting an app's docs, source, tests, CI, deployment, infrastructure, config, auth, and environment setup, then asking targeted harness questions only for source-unanswerable decisions. Use when local, CI, PR, preview, staging, or other non-production environments may drift from production behavior; when production-only auth, config, identity-provider groups, feature flags, infrastructure, backing services, or policy differences caused bugs; or when a team wants a reusable skill that detects, documents, tests, and helps fix parity drift for one specific application.
---

# Production Parity Skill Builder

Build a skill for one application. The generated skill's job is to keep local and non-production environments behaviorally aligned with production, while making every intentional difference explicit and tested.

Idea credit: GitHub user [@dm](https://github.com/dm).

Production is the reference contract. Local, CI, PR, preview, and staging may use lighter infrastructure, but they must either emulate production behavior or document the divergence with compensating tests. A production authentik group restriction that is absent locally is a parity bug, not a harmless convenience.

## Workflow

### 1. Inspect Before Asking

First build evidence from the repository. Do not ask the user to explain what can be discovered from files.

Inspect, as applicable:

- docs: `README*`, `docs/`, ADRs, runbooks, onboarding, local setup, deployment notes
- app code: config loading, auth/authz, tenancy, feature flags, service clients, scheduled jobs, webhooks
- tests: unit, integration, E2E, smoke, contract, auth fixtures, seed data, factories
- local setup: Dockerfile, compose files, devcontainers, scripts, seeders, Makefiles, package scripts
- CI and previews: GitHub Actions, GitLab CI, Buildkite, preview deployment config, test matrices
- infra: Terraform, Pulumi, CDK, Helm, Kustomize, Kubernetes manifests, Cloudflare/Vercel/Netlify/Fly/Render config
- production descriptors: env schemas, secret names, IdP/OIDC/SAML settings, ingress, network policy, runtime versions, database extensions, queues, object storage, cron, external provider config

Use `rg --files` and targeted `rg` searches. Search for environment names and parity-sensitive terms:

```text
prod|production|staging|preview|pr|local|dev|ci|docker|compose|k8s|helm|terraform|pulumi|auth|oidc|saml|jwt|group|role|claim|permission|feature flag|secret|env|webhook|cron|queue|seed|fixture|migration
```

### 2. Build The Parity Map

Create a working parity map before writing the generated skill. For each surface, record:

- production truth source: file, manifest, doc, dashboard export, or user answer
- non-production representation: local, CI, PR/preview, staging
- drift risk: what user-visible or security behavior changes if this differs
- current guard: test, schema check, smoke test, contract test, policy check, or none
- fix pattern: emulate, seed, contract-test, validate config, parse infra, or document explicit divergence
- owner or escalation path when the repo cannot answer it

Load `resources/parity-surface-catalog.md` when choosing surfaces and checks. Use the catalog as a checklist, not as a claim that every app needs every surface.

### 3. Ask Targeted Questions

Use the harness's available ask-question facility when it exists: `AskUserQuestion`, `request_user_input`, `ask_question`, or the equivalent in the active agent harness. If no structured question tool is available, ask a concise plain-text question.

Ask only after inspection. Ask only questions that change the generated skill or required fixes.

Question rules:

- Ask one decision at a time unless two options are tightly coupled.
- Prefer structured options when the answer space is enumerable.
- Include the evidence that triggered the question.
- Recommend the safest option first, but name the tradeoff.
- Capture each answer into the generated skill; do not leave decisions only in chat.

Load `resources/question-patterns.md` for reusable question shapes.

Example:

```markdown
Production appears to require authentik group `app-users` for login, but local and PR setup seed no equivalent restriction.
How should non-production enforce this?

1. Mirror production with seeded IdP group membership. Recommended: catches auth drift while keeping local deterministic.
2. Use a lightweight OIDC/authentik emulator with the same required claim. Good when running real authentik locally is too heavy.
3. Keep local unrestricted, but add contract/E2E tests that fail unless prod-only group enforcement is represented. Faster local login, higher residual drift risk.
```

### 4. Generate The App-Specific Skill

Write a new skill for the specific app, normally named `<app-name>-production-parity` unless the user or repo naming convention suggests otherwise.

Store the generated skill directly in the target application's repository. Never create the generated app-specific skill in a user/global folder such as `~/.agents/skills`, `~/.codex/skills`, `~/.claude/skills`, or `$CODEX_HOME/skills`.

Choose the project-local location by inspecting the app repo:

- If the app already has a project-local skills directory, use that convention.
- Prefer `.claude/skills/<app-name>-production-parity/SKILL.md` when the repo uses Claude project config.
- Prefer `.codex/skills/<app-name>-production-parity/SKILL.md` when the repo uses Codex project config.
- If no project-local skill convention exists, ask one concise harness question before creating a new convention.
- If the only available skill directories are global/user folders, do not use them; ask where in the project repo the skill should live.

The generated skill must include:

- frontmatter whose description triggers on parity, drift, local/prod mismatch, auth/config/infra differences, and environment setup for that app
- an "App Parity Contract" that names production as the reference and lists intentional non-prod divergences
- "Production Truth Sources" with exact file paths, manifests, docs, commands, or user-confirmed sources
- "Inspection Workflow" with repo-specific commands and files to read
- "Parity Surfaces" tailored to the app, not a generic checklist dump
- "Drift Checks" with concrete tests, scripts, schemas, or manual checks the agent should run
- "Fix Patterns" that explain how to close drift in this app's architecture
- "Question Protocol" instructing the agent to use the active harness's ask-question facility for source-unanswerable decisions
- "Output Contract" for every future run: inspected files, risks found, fixes made, tests run, remaining explicit divergences

Start from `resources/generated-skill-template.md`, but remove irrelevant sections and replace placeholders with app-specific evidence.

### 5. Add Safeguards Where The Repo Supports Them

If the user asked for fixes, or if the generated skill would be weak without a guard, add narrowly scoped checks in the target app:

- config parity: schema validation for required env vars and production-only restrictions
- auth parity: tests for required IdP groups, roles, claims, redirect URIs, cookies, and session policies
- fixture parity: seeded users, tenants, feature flags, roles, plans, quotas, and data lifecycle states
- infra parity: parse or diff deployment manifests against local/preview manifests for security-relevant settings
- provider parity: contract tests or recorded fixtures for external APIs, webhooks, email, storage, queues, and payment providers
- runtime parity: pinned versions for language runtime, database, extensions, image tags, and build commands
- smoke parity: a preview/staging smoke test that proves the app starts with production-equivalent restrictions before merge

When a difference is intentional, require a named reason and compensating guard. "Local is easier" is not enough.

### 6. Validate The Generated Skill

Before finishing:

1. Re-read the generated skill as if invoked on a fresh thread.
2. Confirm every app-specific claim cites a repo source or a captured user answer.
3. Confirm no generic checklist item remains unless it applies to the app.
4. Confirm the generated skill path is inside the target app repository and not in a user/global skills folder.
5. Run the skill validation command available in the harness or repository if one exists.
6. If validation cannot be run, say exactly why.

## Output

Return:

- generated skill path
- confirmation that the generated skill is stored inside the target project repo
- files and directories inspected
- highest-risk parity gaps found during creation
- questions asked and captured decisions
- tests or validation run
- recommended next fixes if drift was found but not fixed

Do not present a generic parity report as the final product. The primary deliverable is the reusable app-specific skill.
