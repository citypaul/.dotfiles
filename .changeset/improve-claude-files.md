---
"@paulhammond/dotfiles": minor
---

Comprehensive quality pass across all Claude config: skills, agents, commands, settings

**Correctness fixes**

- folder-structure: lint examples now block bare `react`/`next`/`react-dom` imports (minimatch `react/**` only matches subpaths, so the rule as written missed the most common violation)
- front-end-testing/react-testing: MSW guidance now covers `setupWorker` from `msw/browser` for Browser Mode (previously only `setupServer` from `msw/node` was shown, which does not work in a real browser); `act()` guidance scoped correctly for `renderHook`
- functional: fixed example that returned `boolean | undefined` under strict mode
- typescript-strict: branded-type example now uses a validating constructor instead of bare `as` assertions (which violated the skill's own rule); added schemas-at-trust-boundaries and Standard Schema guidance
- expectations: removed "then commit" guidance that contradicted the wait-for-commit-approval rule; added MUTATE/KILL MUTANTS to the cycle
- tdd: added commit-approval STOP to the workflow; added triangulation guidance to GREEN
- mutation-testing: removed non-existent Stryker `testFiles` option, named `@stryker-mutator/vitest-runner` as required, added Browser Mode caveat
- testing: `jest.spyOn` → `vi.spyOn`; documented the callback-prop exception to the spy anti-pattern
- api-design: rate limiting updated to current IETF draft fields (`RateLimit`/`RateLimit-Policy`)
- generate-pr-review: removed Go-style string concatenation artifacts that would corrupt generated `/pr` commands
- agents: added missing `Write` tool to progress-guardian, twelve-factor-audit, docs-guardian (their jobs require creating files); pr-reviewer greps now cover Vitest

**Progressive disclosure restructures** (lean SKILL.md + on-demand resources)

- front-end-testing: 1061 → 360 lines + 3 new resources (async-patterns, msw, dom-testing-library-legacy); universal query-priority/philosophy content un-mislabeled from "Legacy"
- react-testing: 590 → 319 lines + testing-library-react-legacy resource; forms/error-boundaries/portals/Suspense ported to Browser Mode dialect; RSC note added
- functional: 732 → 273 lines + immutability-catalog and composition-patterns resources
- twelve-factor: 413 → 237 lines + node-patterns resource
- api-design: RFC 9457 deep detail extracted to problem-details resource
- cli-design: intra-file duplicate tables removed; composability examples extracted

**Deduplication and consistency**

- domain-driven-design: branded types and illegal-states sections now defer to typescript-strict, keeping only DDD-specific guidance; testing-priority table deduplicated with hexagonal-architecture; use-case placement reconciled with folder-structure across both architecture skills; broken `../REFERENCES.md` link fixed for standalone installs
- CLAUDE.md: added missing folder-structure and production-parity-skill-builder routing (previously undiscoverable); seo-audit added to external skills list
- Sharper trigger descriptions for tdd, refactoring, mutation-testing, ci-debugging, expectations, find-gaps; mutually exclusive scopes for the four review agents (tdd-guardian/ts-enforcer/refactor-scan/pr-reviewer)
- ci-debugging: added "Getting the data" (gh run commands) and TDD handoff sections
- expectations: rewritten around a learning-destination matrix (CLAUDE.md vs ADR vs plans vs memory) with routing to learn/adr agents
- commands: /pr gets main-branch guard + package-manager permissions for its quality gate; /continue gets dirty-worktree and merge-state checks; /plan and /pr get argument hints
- settings.json: hook uses `npx --no-install` (no silent registry installs), runs eslint even when prettier fails, 30s timeout, NotebookEdit matcher
- README: stale counts corrected (27 skills, ~160-line CLAUDE.md, 5 api-design resources)
