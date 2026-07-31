# Stack Pull Requests Source Notes

Load this resource for source provenance, teaching, or updating preview-specific guidance. Do not load it for ordinary stack decisions.

## Primary Source Map

| Source | Guidance used |
|---|---|
| [Stack AI-generated code in pull requests](https://docs.github.com/en/copilot/tutorials/stack-ai-generated-code-in-pull-requests) | Design the stack before code generation; use small coherent dependency-ordered layers; build and self-review bottom first; keep fixes in the owning layer; rebase upward; review and merge bottom-up |
| [Review AI-generated code](https://docs.github.com/en/copilot/tutorials/review-ai-generated-code) | Run automated checks; verify context and intent; assess maintainability and dependencies; look for hallucinated APIs, ignored constraints, deleted tests, and plausible-looking wrong logic; combine human and automated review |
| [Managing stacked pull requests](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/managing-stacked-pull-requests) | Make lower-layer changes on their owning branch; cascade rebases; preserve a linear history; restructure stacks deliberately; sync after merges |
| [Reviewing stacked pull requests](https://docs.github.com/en/pull-requests/how-tos/review-pull-requests/reviewing-stacked-pull-requests) | Review each layer's focused diff; update the owning branch; rebase and retest upstack |
| [Merging stacked pull requests](https://docs.github.com/en/pull-requests/how-tos/merge-and-close-pull-requests/merging-stacked-pull-requests) | Merge bottom-up; only merge contiguous groups from the lowest unmerged PR; require lower approvals/checks and linear history |
| [Stacked pull requests CLI commands](https://docs.github.com/en/pull-requests/reference/stacked-prs-cli-commands) | Current `gh stack` command model, safe lease pushes, stack modification prerequisites, draft submission behavior, and cumulative rebase/sync semantics |
| [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows) | `pull_request.branches` filters match the PR base, so main-only filters can skip upstack PRs; merge queues need `merge_group` triggers for required checks |
| [Graphite: How to structure a stack](https://graphite.com/docs/how-to-structure-your-stacks) | Useful candidate boundaries: functional components, iterative improvements, refactor-then-change, risk isolation, and dependency-aware ordering |
| [Graphite: Best practices for reviewing stacks](https://graphite.com/docs/best-practices-for-reviewing-stacks) | Make each PR atomic enough to understand, submit ready layers early, mark work-in-progress layers draft, choose focused reviewers, and review bottom-up |
| [Graphite: CI optimizations](https://graphite.com/docs/stacking-and-ci) | Stacks multiply CI and rebase runs; use existing caching or affected-test mechanisms when scale justifies it, without weakening required merge checks |

## Reconciliation With This Skill Set

GitHub's tutorial uses an authentication example ordered as data model, CRUD endpoints, JWT middleware, then integration and unit tests. That illustrates dependency-ordered review layers, but copying it literally would conflict with this repository's `story-splitting`, `planning`, `tdd`, and `testing` contracts.

This skill therefore makes these synthesis decisions:

- Keep backlog stories vertical and valuable. Treat PR layers as delivery boundaries, not child stories.
- Default to one vertical PR. Stacking is optional and must earn its coordination cost.
- Prefer testable path increments within a fixed vertical slice; do not add acceptance scope by calling a new behavior a PR layer.
- Permit a horizontal lower layer only when it is coherent, directly required, independently verified, and safe or dormant.
- Keep tests with the earliest behavior they protect. Never create a final "all tests" layer.
- Use the repository's fast RED-GREEN-REFACTOR loop inside a layer and its mutation-or-alternate-evidence gate once when that layer is PR-ready.
- Require the top branch to prove the complete selected implementation slice without expanding its story scope.
- Distinguish independently reviewable from independently mergeable or releasable.
- Treat a backlog story, vertical implementation slice, and dependent PR layer as three different units; choose delivery per slice, not once per plan.
- Require a CI-topology check before stacking because an apparently valid stack is unsafe when required workflows never run on dependent bases.

## Preview Caveat

GitHub labels stacked pull requests and `gh stack` as public preview. The tutorial currently recommends auto-merge or a merge queue, while the dedicated merging page says auto-merge is not supported for stacked pull requests. Treat the dedicated current management/reference pages and live CLI help as operational authority, and verify rather than encoding either statement as permanent behavior.

Do not hardcode a minimum GitHub CLI version in the main skill. The tutorial and command reference currently state different minimum versions. Verify the installed extension and current official prerequisites when execution matters.

## Updating The Skill

When GitHub changes the preview:

1. Re-read the official tutorial, management, review, merge, and CLI reference pages.
2. Check live `gh stack --help`.
3. Update operational wording, not the durable story/PR distinction.
4. Preserve the local verification cadence and vertical-slice contracts even if external examples defer tests or split strictly by components.
