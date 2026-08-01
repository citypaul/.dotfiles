---
name: stack-pull-requests
description: Decide whether planned vertical implementation work should ship as independent pull requests or as a stack of small ordered pull requests, then plan, build, review, update, and merge the stack safely. Use when one slice is too large for effective review, when later slices should proceed on the same evolving baseline before earlier pull requests merge, when AI-generated code volume needs deliberate review boundaries, when a plan already defines dependent pull request boundaries or non-trunk bases, or when the user mentions stacked PRs, PR stacks, dependent PRs, gh-stack, bottom-up review, or splitting an implementation across branches. Do not use this skill to split epics or invent horizontal backlog stories; use story-splitting first.
---

# Stack Pull Requests

Use stacked pull requests as an optional **branch, review, and integration topology**, not as a substitute for vertical story splitting.

Default each vertical implementation slice to one PR against trunk. Stack only when ordered branches materially improve review quality or let work continue on the same evolving baseline before lower reviews merge, without weakening testing, deployability, or comprehension.

GitHub's stacked PR support is in public preview. Load `references/source-notes.md` when exact GitHub behavior, command provenance, or the rationale behind these rules matters. Verify current official docs and `gh stack --help` before relying on preview-specific commands.

## Keep The Three Units Separate

| Unit | Question | Owner | Rule |
|---|---|---|---|
| Backlog story | What bounded capability delivers value or learning? | `story-splitting` | Keep it vertical and fix its acceptance scope before delivery planning |
| Implementation slice | What smallest vertical increment advances that story and leaves a known-good state? | `planning` | Merge and release it safely once declared prerequisites land; use one PR by default |
| PR boundary | How should planned implementation work be packaged for review? | This skill | Usually owns one whole slice; may instead be a dependent layer within one slice |

A sequence describes work order; a stack describes branch dependency. A lower PR in a stack may be independently mergeable, while every upper PR targets the branch below it. Several vertical slices are therefore not automatically independent PRs and not automatically a stack.

Use independent PRs when each slice can target trunk and merge in any safe order without blocking or duplicating work, or when the next branch starts only after its predecessor merges. Use a cross-slice stack for either **hard lineage** (an upper slice requires a lower slice) or **flow lineage** (slices remain separately complete, but upper work starts before lower review and merge on the same evolving baseline, and fixed lower-first landing is acceptable). Use an intra-slice stack when one fixed slice is too large for one effective review.

Backtracking is a real stack benefit: a lower-branch correction stays with its owning PR and stack tooling propagates it upward. It is not free insurance. Every changed upper branch must be rebased, pushed, rechecked, and may conflict or lose stale approvals. Treat likely lower-boundary iteration while dependent upper work is already in flight as a benefit; do not manufacture a branch dependency solely because an earlier decision might someday change.

An intra-slice PR layer is not a child story or implementation slice and must not add acceptance scope. A cross-slice stack member may own a complete planned slice and its acceptance criteria; it must not invent scope outside the approved slices.

Use this order:

1. Load `story-splitting` if the request still contains multiple customer outcomes, paths, roles, or quality levels.
2. Select one vertical child story.
3. Load `planning` to define its vertical implementation slices, dependencies, classes, evidence, and terminal obligations.
4. Use this skill when one slice needs review layers or when a contiguous run of hard- or flow-lineage slices should be in flight together.
5. Keep slices as independent trunk-based PRs when no review, lead-time, or correction-routing benefit earns fixed order and cascade cost.
6. Use `find-gaps` if acceptance criteria, release constraints, or intermediate safety remain unclear.

Do not turn `database → API → UI → tests` into backlog stories. If those boundaries help review one selected implementation slice, describe them as dependent PR layers and keep their release state explicit.

## Decide: Independent PRs Or A Stack

Choose a stack only when all of these hold:

- Its scope is one fixed slice or a contiguous deliberately ordered sequence of already planned vertical slices or reduction transitions.
- At least one benefit is concrete: the combined change needs focused diffs, or later ordered work should proceed before lower review and merge complete.
- The branches have deliberate one-way lineage: a hard dependency, or deliberate flow lineage where upper work actually begins before lower merge on the same evolving baseline and fixed lower-first landing is acceptable.
- Each PR owns one whole slice where practical, or one coherent intra-slice layer that can be understood from its own diff plus the layers below.
- Each PR boundary can leave its cumulative branch known-good: buildable, verified, and safe to deploy or explicitly dormant.
- Every lower slice remains useful and safe to merge if all upper work is abandoned.
- The expected cascade/rebase cost is lower than the focused-review, lead-time, and correction-ownership benefit.
- The repository and team can support dependent branches, cascading rebases, and native prefix/group merge or manual bottom-up merge.
- The intended stack mechanism can apply the required CI and repository rules to every PR.

Prefer independent trunk-based PRs when any of these hold:

- The whole change is already a quick, coherent review.
- The proposed slice PRs can target trunk and merge, reorder, or be dropped independently without blocking or duplicating work.
- The next dependent slice can wait until its prerequisite merges without blocking useful work or feedback.
- Splitting would separate tests or evidence from the behavior or contract they protect.
- Reviewers must understand the full stack to judge every layer.
- Intermediate merges would expose an unsafe schema, contract, bridge, or half-feature.
- The change is cross-cutting enough that every layer would repeatedly touch the same code.
- The only proposed boundaries are files, architectural tiers, work phases, or team ownership.
- The only proposed benefit is speculative convenience if an earlier decision changes.
- Rebase and CI churn would cost more than the smaller diffs save.

### Run Two Counterfactuals

1. **Trunk counterfactual:** Could every proposed PR start from current trunk and merge, reorder, or be dropped without incorporating a sibling? If no, use a hard-lineage stack when the other gates pass.
2. **Flow counterfactual:** If yes, will upper work actually start before the lower PR lands on the same evolving path, is fixed lower-first landing acceptable, and will saved wait time or lower-owned correction routing outweigh restacking and re-review? If yes, a flow-lineage stack is valid. Otherwise use independent PRs.

Do not stack by reflex. Record the decision in one sentence:

```text
Delivery: single PR — the end-to-end change is already one focused review.
```

or:

```text
Delivery: 3-PR stack — the dormant migration, tested repository adapter, and
fixed sign-in slice form one-way dependencies with meaningful verification.
```

or:

```text
Delivery: 3-PR flow-lineage stack — each vertical slice is known-good in order,
upper work starts now on the same evolving path, and lower-first landing is acceptable.
```

## Design The Stack Before Writing Code

### 1. Fix The Story And Stack Scope

Write the selected story's actor and outcome, then record:

- whether the stack is inside one slice or spans a contiguous sequence of slices
- every included slice, its trigger, observable outcome or conserved contract, production path, acceptance evidence, class, and release constraint
- the fixed union of approved scope covered by the stack

If the story still describes more than one customer capability, return to `story-splitting`. Keep every vertical outcome or reduction transition as a distinct slice in `planning`, even when several slices share a stack. For a cross-slice stack, each PR may add its own approved acceptance case in dependency order. For an intra-slice stack, freeze the selected slice's scope before drawing PR layers.

For reduction work, stack membership does not replace the ledger or gates. A transition cannot claim net reduction while superseded machinery or an added bridge remains; only the terminal-reduction slice may satisfy the mechanism gate and claim the fixed terminal state.

### 2. Draw The Lineage Graph

Identify hard dependencies and deliberate flow lineage. Separate both from habitual build order. "We usually build the backend first" is not evidence; "the next approved slice starts now on this evolving baseline while review is open" can be.

Prefer boundaries in this order:

1. **Whole vertical slices** — each PR owns one approved known-good slice; upper work has hard or deliberate flow lineage and overlaps lower review.
2. **Testable path increments** — each PR advances the same fixed slice without adding an acceptance case that belongs in another slice.
3. **Behavior-preserving preparation** — a focused refactor or safety characterization that makes the later change reviewable.
4. **Backward-compatible enablement** — a migration, contract, or infrastructure change that is verified, dormant, and directly used by the next PR.
5. **Risk isolation** — a security-, data-, or performance-sensitive change that deserves focused expert review.
6. **Reviewer expertise** — a subsystem boundary, only when the PR still makes sense without an essay about the rest of the stack.

Avoid:

- all tests in the top PR
- speculative foundations or abstractions
- boundaries whose only claim is "files in the same folder"
- a lower boundary that requires an upper boundary to compile, migrate safely, pass CI, or discharge an unowned bridge
- duplicate fixups in upper boundaries instead of fixing the owning lower boundary
- a long stack where cascade and review overhead dominate

There is no universal boundary count or line limit. Keep the smallest stack whose PRs are quick reads with one concept each. If two adjacent boundaries need the same explanation or evidence, fold them together.

### 3. Route Verification By Boundary Type

GitHub's tutorial illustrates tests as a final layer; do not copy that ordering into this workflow.

For a behavior-changing production boundary:

- Load `tdd`, `testing`, and applicable `refactoring` guidance before code changes.
- Follow fast RED-GREEN-REFACTOR increments for the behavior owned by that boundary.
- Put contract, migration, unit, integration, or UI tests in the earliest boundary that owns the behavior.
- When the boundary is otherwise PR-ready, load `mutation-testing` and run its accumulated-scope gate once against its parent where meaningful, or record its proportionate alternate-evidence `N/A`.

For a behavior-preserving production boundary:

- Load applicable testing and `refactoring` guidance; if protection is inadequate, load `finding-seams` and `characterisation-tests`.
- Establish passing preservation evidence for the touched consumer paths.
- Refactor without changing behavior, keeping the applicable focused/affected tests green.
- At PR readiness, run the same once-per-boundary mutation-or-alternate-evidence gate; do not fabricate structural mutants.

For reduction-transition or terminal-reduction boundaries, also preserve the selected slice's `reduce-system-complexity` ledger, conserved contract, bridge ownership/removal obligations, and behavior/mechanism gate status.

For documentation, release metadata, configuration, or non-production mechanical changes, use the smallest executable verification that can fail if the boundary is wrong and record mutation `N/A` when appropriate.

For every PR boundary, run the repository's required build, lint, type, security, and complete non-watch test checks and verify the cumulative branch, because an upstack PR contains every lower boundary.

The top boundary must prove the cumulative acceptance examples or terminal gates for every included slice. It may add stack-level tests, but a behavior's first test belongs in the PR that introduces that behavior, not a later stack member.

### 4. Verify CI Topology Before Stacking

Before creating any PR, record whether the PRs will be linked as a GitHub-native stack or merely form an unlinked dependent branch chain. When the requested outcome is a stack, default to the native mechanism if GitHub and repository policy support it; use an unlinked chain only when the user or repository chooses it explicitly or native support is unavailable. Then inspect workflows, rulesets, required status contexts, and the merge queue:

- For a GitHub-native linked stack, GitHub evaluates Actions, branch protection, required checks, reviews, CODEOWNERS, and code scanning against the stack trunk. A `pull_request` workflow filtered to that trunk runs for every stack PR; do not require a workflow change merely because an upper PR directly targets a feature branch.
- For unlinked dependent PRs or tooling without equivalent stack metadata, ordinary immediate-base semantics apply. Confirm feature-base PRs trigger the required workflows before relying on them.
- Confirm every required status is produced for every PR boundary that needs it.
- If the repository uses a merge queue, confirm required workflows handle `merge_group`.
- Decide which focused checks run per boundary and which cumulative or end-to-end checks run at the top; do not weaken required merge checks to make stacking convenient.
- Account for rebase-triggered reruns and existing affected-test or cache behavior.

Dependent branches and feature-branch PR bases are necessary for either mechanism, but they do not prove that GitHub's remote stack object exists. Do not describe an unlinked chain as a GitHub-native stack.

Prefer one PR when the chosen stack mechanism cannot give every boundary trustworthy required checks without risky CI changes.

### 5. Make Intermediate States Safe

Every lower PR must be one of:

- independently deployable and useful
- behavior-preserving
- backward-compatible and dormant
- hidden behind a flag
- an independently verifiable reduction transition with owned, bounded bridges and no premature net-reduction claim
- intended to merge only as part of a contiguous approved group, with the reason stated

Never merge an intermediate state that breaks callers, requires an unavailable schema, weakens security, or exposes incomplete behavior. Backward-compatible expand/contract changes usually belong in separate stacks because cleanup must wait until all consumers have moved.

## Write The Delivery Plan

For an intra-slice stack, add this section under the selected implementation slice. For a cross-slice stack, place one shared map immediately before the first included slice and reference it from every included slice:

```markdown
#### Delivery Shape

**Mode**: Single PR | Stacked PRs
**Stack scope**: Intra-slice | Cross-slice
**Reason**: [Why this shape improves review without weakening delivery]
**Story scope**: [Fixed parent story; PR boundaries must not expand it]
**Included slices**: [One fixed slice, or the exact contiguous slice sequence]
**Done when**: [Acceptance criteria or terminal gates for all included slices]

| # | Ownership unit | PR boundary | Base | Owns | Depends on | Verification | Release state |
|---|---|---|---|---|---|---|---|
| 1 | [whole slice or intra-slice layer] | [focused title] | [repository default branch] | [one coherent change] | — | [tests/evidence/checks] | [deployable/dormant/etc.] |
| 2 | [whole slice or intra-slice layer] | [focused title] | [boundary 1 branch] | [one coherent change] | [specific contract or deliberate flow lineage] | [tests/evidence/checks] | [...] |

### Whole-stack gate

- [ ] Every included slice's acceptance examples, conserved contract, and applicable terminal gates pass cumulatively at the top
- [ ] Every PR boundary's focused and cumulative checks pass
- [ ] No behavior waits beyond its owning PR for its first test
- [ ] Every PR-ready boundary has current mutation or alternate evidence for its focused review scope
- [ ] Intermediate merge and release states are explicit and safe
- [ ] Reduction ledger, bridge, and mechanism-gate obligations remain accurate when applicable
- [ ] Native stack-trunk or unlinked immediate-base CI semantics are identified; required statuses and `merge_group` run where applicable
- [ ] When native stacking was selected, GitHub's remote stack object exists and its trunk and bottom-to-top entries match this plan; PR base refs alone are not proof
- [ ] Review sequence is bottom-up for lineage-sensitive boundaries; independent specialist reviews may run in parallel
- [ ] Merge includes every required lower PR: native all-or-nothing prefix/group, or manual bottom-up order
```

For each PR boundary, also record:

- focused review question
- included and excluded scope
- likely files or subsystem, without prescribing unnecessary implementation
- required specialist reviewer, if any
- acceptance criteria and verification route for the behavior, conserved contract, or mechanical change it owns

Use repository branch naming conventions. Do not create branches, commit, push, submit PRs, rebase shared branches, or merge unless the user has authorized that action.

## Build Bottom To Top

For each PR boundary:

1. Start from the topmost committed, known-good branch.
2. Confirm the boundary's acceptance criteria or conserved contract with the user before code.
3. Complete the applicable implementation route and keep focused/affected checks green.
4. When the boundary is otherwise PR-ready, complete its mutation-or-alternate-evidence gate and repository checks.
5. Self-review the diff against its parent, not against trunk.
6. Remove work that belongs upstack.
7. Present the focused diff and verification evidence.
8. Wait for commit approval.
9. Create the next branch only after the current boundary is committed and known-good; review approval is not required to extend the stack.

Prefer the official `gh stack` command when it is available and matches current repository policy. Use current help rather than memorized preview syntax. Submit locally tracked native stacks with `gh stack submit`. If the branches or PRs were created with other tooling, link them immediately with `gh stack link <bottom> ... <top>`. If native tooling is unavailable, either manage an explicitly unlinked dependent chain with existing Git/GitHub tooling or ask before installing anything.

Before reporting that a native stack was created or is PR-ready, verify the remote object: `PullRequest.stack` must be non-null and its trunk and ordered entries must match the delivery plan. A correct chain of PR base refs is not sufficient. If remote verification is unavailable, report the PRs as an unverified dependent chain rather than a native stack.

Open unfinished upper boundaries as drafts. Give each PR a focused title and concise description containing:

- selected story, included implementation slice(s), and this PR's purpose
- parent/base PR and next boundary, when known
- what to review in this diff
- verification performed
- release state
- intentional deferrals

## Review And Revise

Self-review every PR boundary before requesting review. Check function, intent, code quality, dependencies, AI-specific mistakes, and test integrity.

Request review from the bottom upward when later boundaries depend strongly on earlier decisions. Different specialists may review and approve boundaries in parallel when each focused diff is understandable. Merge readiness and merge order still flow bottom to top.

When feedback changes a lower boundary:

1. Move to the branch that owns the change.
2. Fix and test it there.
3. Rebase or restack every branch above it.
4. Re-evaluate whether existing mutation/alternate evidence remains current under repository policy, then rerun affected focused and cumulative checks as required.
5. Re-review upstack diffs for accidental duplication or semantic drift.
6. Push only with safe lease protection and authorization.

Do not add an upstack workaround for a downstack defect.

Put a discovery in the boundary that owns it:

- If it repairs behavior or a contract promised by a lower slice, fix that lower branch and restack.
- If it adds acceptance scope owned only by an upper slice, keep it upstack.
- If the owning lower PR already merged, use a focused trunk-based fix; after it lands, sync or rebase and recheck the remaining upper stack before continuing.
- If it invalidates the planned boundaries, reshape the stack and plan instead of smuggling scope downstack.

Reshape the stack when evidence changes. Fold adjacent PRs that cannot be reviewed separately; split a boundary that acquired a second concept; reorder only when dependencies allow it. A clean working tree and recoverable rebase path are prerequisites for structural changes.

## Merge And Finish

Before merge:

- require passing checks and required approvals for the boundary and every boundary below it
- require linear stack history
- verify the top branch satisfies the complete declared stack scope and cumulative acceptance criteria or terminal gates
- verify any partially merged state remains safe
- resolve documentation conflicts using current GitHub guidance because stacked PR behavior is preview

For a GitHub-native linked stack, merge an approved prefix or the full stack with `gh stack merge`; the selected PR and every PR below it land as one all-or-nothing operation unless a merge queue splits processing into groups. For an unlinked dependent chain or other tooling, merge bottom-up and restack after lower merges. Never merge an upper PR without every dependency below it.

After lower boundaries merge, sync or rebase the remaining stack, rerun affected checks, and verify each PR still shows only its intended focused diff. Mark a cross-slice stack's slice complete when its owning PR lands; mark an intra-slice stack's slice complete only when its top lands. The whole stack completes when its top lands. Delete the plan when every selected implementation slice lands, following `planning`.

## Examples

### Use Layers Inside One Vertical Slice

Selected story and fixed implementation slice:

```text
A registered customer can sign in with valid credentials and reach their account.
```

If the end-to-end diff is already reviewable, use one PR containing storage, authentication behavior, entry point, response, and tests.

If it is too large, a responsible stack could be:

1. Add a backward-compatible, dormant credential-storage migration with migration and rollback verification.
2. Add the credential repository adapter behind the existing boundary with contract tests.
3. Add the valid-credential path through the real entry point, domain behavior, storage, response, and observability, with its behavior tests.

The story and slice remain vertical and their scope does not grow. Layers 1 and 2 are enabling tasks, not user stories or implementation slices. Use separate "all endpoints" or "all middleware" PRs only when concrete repository constraints make that safer and every layer still satisfies this skill's gates. Never defer all tests to a final PR.

### Stack Several Vertical Slices

A plan may instead define these approved slices:

1. A registered customer can sign in with valid credentials.
2. A customer with invalid credentials sees a safe rejection.
3. Repeated invalid attempts temporarily lock the account.

Keep them as three implementation slices. If each can target trunk and merge in any order without blocking or duplicating work, use independent PRs. Use a three-PR cross-slice stack if slices 2 and 3 require the lower behavior, or if their work starts before lower reviews merge on the same evolving baseline and fixed lower-first landing is worth the cascade cost. Fix lower-owned feedback in the lower slice and propagate it upward; keep new upper-slice scope upstack.
