---
name: review
description: "Composable multi-agent code review of any change boundary — the working tree mid-development, a branch diff, a stacked layer, or a pull request: one orchestrator fans out sub-agents, each loading exactly one installed skill as a review lens (hexagonal-architecture, domain-driven-design, structure-codebase, typescript-strict, ...), then adversarially verifies findings and synthesizes one ranked report. Invoked as /review with an optional target (defaults to the current branch's work, committed or not) and lens names — sensible defaults plus project-trait auto-detection, add or remove lenses freely. Also owns the PR-readiness evidence gate (change-path classification, mutation-evidence freshness) for when a boundary is heading to a PR. Use when reviewing in-progress work, a branch, a diff, or a PR, before merging, or when the user asks to review through named skills. Built on graph-engineering (the generic machinery); for a cross-provider second opinion on finished work use double-check; for Anthropic's fixed-lens hosted review use /code-review."
---

# Review — Skills as Review Lenses

Review one diff through N lenses, where **every lens is an installed skill** and every lens runs as its own sub-agent with an isolated context. The orchestrator composes the roster, fans the lens nodes out, adversarially verifies every finding against the actual code, and synthesizes one severity-ranked report. No lens is hardcoded: the defaults are conventions, the roster is yours.

The target is any change boundary, at any phase: uncommitted work-in-progress, the current branch's accumulated diff, one stacked layer, or an actual pull request. A PR is one kind of target, not a precondition — reviewing *before* the PR exists is a first-class use. The PR-readiness evidence gate is a lens you get when the boundary is heading to a PR, not a gate on running the review.

This skill is an instance of `graph-engineering` — load that skill for the generic node/topology/runtime machinery. This file owns what is review-specific: the invocation grammar, the lens registry, the PR-readiness gate, and the report.

| Reference | Read when... |
|-----------|--------------|
| [`references/lenses.md`](references/lenses.md) | Composing the roster — default lenses, auto-detection signals, lens brief template |
| [`references/pr-readiness.md`](references/pr-readiness.md) | Judging change-path evidence — TDD/refactor/reduction classification, the mutation-evidence freshness model, the verification gate |
| [`references/workflow-template.md`](references/workflow-template.md) | Executing the graph — the concrete dynamic-workflow script and Agent-tool fallback |

## Invocation Grammar

`/review [target] [modifiers] [lens...]`

| Token | Meaning |
|---|---|
| *(nothing)* | Review the current branch's work — its diff against the merge-base with the default branch, plus uncommitted changes; default + auto-detected lenses |
| `wip` | Review only the uncommitted changes (working tree + staged) against `HEAD` — the mid-development check |
| `#123` or a PR URL | Review that GitHub PR (`gh pr diff` / `gh pr view`) |
| `hexagonal-architecture` (any installed skill name) | Add that skill as a lens |
| `only <names...>` | Use exactly the named lenses — no defaults, no auto-detection |
| `-<name>` | Remove a lens from the roster (e.g. `-functional`) |
| `thorough` | Widen the roster (include all detected conditional lenses) and use multi-vote adversarial verification |
| `post` | After review, post the report to the GitHub PR (requires a PR target) |

Examples: `/review` · `/review #482 thorough` · `/review hexagonal-architecture domain-driven-design structure-codebase` · `/review only xstate react-testing` · `/review -testing post`

Unknown tokens that don't match an installed skill: say so and list near-matches; don't guess.

## Workflow

### 1. Resolve the target diff

- **PR target**: `gh pr view <n> --json title,body,baseRefName,files,additions,deletions` and `gh pr diff <n>`.
- **Branch target**: diff against the merge base — `git diff $(git merge-base <default-branch> HEAD)...HEAD` plus uncommitted changes if present (say whether they're included).
- **`wip` target**: `git diff HEAD` — the uncommitted working-tree and staged changes only.
- **Stacked boundary**: when reliable stack metadata identifies the branch as stacked, review `git diff <immediate-parent>...HEAD`, not the cumulative trunk diff.

No target needs to be a PR. The review runs identically at any phase; only the `readiness` lens cares whether the boundary claims PR readiness (see `references/lenses.md`).

STOP and report instead of reviewing when the diff is empty or the target can't be resolved.

### 2. Scout inline

A few cheap tool calls, no sub-agents: categorize changed files (production / test / config / docs), read the project's CLAUDE.md and key configs for traits, and collect the signals `references/lenses.md` needs for auto-detection. The scout also captures the change's own claim (PR title/body, plan slice, commit messages, or the user's stated intent for in-progress work) — the review judges the diff *against its claim*.

### 3. Compose the roster

Per `references/lenses.md`: built-in lenses (readiness, quality) + core defaults + auto-detected conditional lenses, then apply the user's `only`/add/remove tokens. Show the final roster and rough scale (N lens nodes + verification) in one line before launching; for large rosters (>8 nodes) confirm with the user first unless they said `thorough`.

### 4. Run the graph

Execute per `graph-engineering` runtimes — the Workflow tool with [`references/workflow-template.md`](references/workflow-template.md) when available, Agent-tool fan-out otherwise, sequential degraded mode as the labelled last resort. Every lens node loads exactly one skill, receives the diff scope and the sibling-lens list (to keep boundaries disjoint), reads surrounding code as needed, and returns schema-shaped findings with `file:line` evidence. Lens nodes are read-only.

### 5. Verify and synthesize

Per `graph-engineering`: dedup by file/line/claim (multi-lens agreement is signal — note it), adversarially verify every surviving finding with an independent node mandated to refute, keep `unverifiable` distinct from `refuted`, and surface cross-lens conflicts with both arguments instead of silently picking a winner.

### 6. Report

```markdown
## Review: <target> — <one-line claim>

**Roster:** <lenses run> · **Scale:** <N nodes, M findings verified> · **Runtime:** <workflow | agent fan-out | sequential (degraded)>

| Lens | Verdict | Confirmed findings |
|------|---------|--------------------|
| readiness *(PR-bound targets only)* | ✅/❌/⚠️ | n |
| <skill lens> | ✅/❌/⚠️ | n |

**Recommendation:** APPROVE / REQUEST CHANGES / NEEDS DISCUSSION

### Confirmed findings (ranked)
🔴/⚠️/💡 **[lens] title** — `file:line`
Problem · Why it matters · Suggested fix (with copy-pasteable fix_prompt)

### Conflicts between lenses      ← only when present, both arguments
### Unverifiable claims           ← reported, never silently dropped
### Clean                         ← what was inspected and found sound
### Not covered                   ← lenses not run, scopes not assessable, node failures
```

Recommendation rules: any confirmed `critical` → REQUEST CHANGES; unresolved lens conflict or failed readiness gate → NEEDS DISCUSSION; otherwise APPROVE with the minors listed.

### 7. Post (only when asked)

With the `post` token and a PR target: write the report to a scratch file and post it with `gh pr comment <number> --body-file <file>` (or a formal `gh pr review --comment/--request-changes --body-file <file>`), headed `## 🤖 /review` with the roster named — never interpolate the report body through shell arguments. Never post without the explicit token; never use `--approve` on the user's behalf.

## Boundaries

- **During development**, use the focused agents (`tdd-guardian`, `ts-enforcer`, `refactor-scan`) — this skill is the whole-boundary review at the end.
- **`double-check`** is for a cross-provider second opinion on finished work; it argues, this one fans out. They compose: run `/review`, then `double-check` the contested calls.
- **`/code-review`** (built-in) runs Anthropic's fixed issue-class lenses; this skill exists precisely to compose *your* skills instead.
- The review reads the target repository's own conventions (its CLAUDE.md, glossary, ADRs) as part of the scout; a lens finding that contradicts an explicit local convention is reported as a conflict, not enforced.

## Completion Check

- Was the roster composed (defaults + detection + user tokens) and shown before launch?
- Did every lens node load its one skill and stay inside its boundary?
- Did every reported finding survive independent adversarial verification, with `file:line` evidence?
- Are conflicts, unverifiable claims, clean areas, and coverage gaps all explicit in the report?
- When the readiness lens ran, does its verdict follow `references/pr-readiness.md`, including the mutation-evidence freshness model — and when it was skipped for a mid-development target, is that listed under "Not covered"?
- Was anything posted to GitHub only with the explicit `post` token?
