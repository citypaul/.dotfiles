---
name: stack-pull-requests
description: Decide whether a planned vertical implementation slice should ship as one pull request or as a stack of small dependent pull requests, then plan, build, review, update, and merge the stack safely. Use when work is too large for one effective review, when AI-generated code volume needs deliberate review boundaries, when the user mentions stacked PRs, PR stacks, dependent PRs, gh-stack, bottom-up review, or splitting an implementation across branches. Do not use this skill to split epics or invent horizontal backlog stories; use story-splitting first.
---

# Stack Pull Requests

Use stacked pull requests as an optional **review and integration tactic**, not as a substitute for vertical story splitting.

Default to one vertical PR. Stack only when smaller dependent diffs materially improve review quality or flow without weakening testing, deployability, or comprehension.

GitHub's stacked PR support is in public preview. Load `references/source-notes.md` when exact GitHub behavior, command provenance, or the rationale behind these rules matters. Verify current official docs and `gh stack --help` before relying on preview-specific commands.

## Keep The Three Units Separate

| Unit | Question | Owner | Rule |
|---|---|---|---|
| Backlog story | What bounded capability delivers value or learning? | `story-splitting` | Keep it vertical and fix its acceptance scope before delivery planning |
| Implementation slice | What smallest vertical increment advances that story and leaves a known-good state? | `planning` | Merge and release it independently; use one PR by default |
| PR layer | How should one implementation slice be packaged for review? | This skill | Use only inside a deliberate stack; it may be technical and dependent |

A plan may contain several implementation slices. Those are sequential independent vertical PRs, not a stack: after one merges, the next starts from trunk. Apply the single-PR-versus-stack decision to **each slice**, never to the plan as a whole.

A PR layer is not a child story or implementation slice. It must not add acceptance scope. The selected slice remains the fixed end-to-end unit delivered by the full stack.

Use this order:

1. Load `story-splitting` if the request still contains multiple customer outcomes, paths, roles, or quality levels.
2. Select one vertical child story.
3. Load `planning` to define its vertical implementation slices, classes, evidence, and terminal obligations.
4. For each slice, use this skill only if its single-PR diff would be hard to review.
5. Use `find-gaps` if acceptance criteria, release constraints, or intermediate safety remain unclear.

Do not turn `database → API → UI → tests` into backlog stories. If those boundaries help review one selected implementation slice, describe them as dependent PR layers and keep their release state explicit.

## Decide: One PR Or A Stack

Choose a stack for one implementation slice only when all of these hold:

- The slice has fixed acceptance scope inside one cohesive vertical story or a fixed conserved contract inside an approved reduction program.
- The slice's combined diff would be slow, risky, or cognitively expensive to review.
- The work has a real one-way dependency order.
- Each proposed layer is one coherent change that can be understood from its own diff plus the layers below.
- Each layer can leave its cumulative branch known-good: buildable, verified, and safe to deploy or explicitly dormant.
- The expected cascade/rebase cost is lower than the review benefit of smaller diffs.
- The repository and team can support dependent branches, rebases, and bottom-up merging.
- CI and repository rules can run the required checks on PRs whose base is another feature branch.

Prefer one vertical PR when any of these hold:

- The whole change is already a quick, coherent review.
- Splitting would separate tests or evidence from the behavior or contract they protect.
- Reviewers must understand the full stack to judge every layer.
- Intermediate merges would expose an unsafe schema, contract, bridge, or half-feature.
- The change is cross-cutting enough that every layer would repeatedly touch the same code.
- The only proposed boundaries are files, architectural tiers, work phases, or team ownership.
- Rebase and CI churn would cost more than the smaller diffs save.

Do not stack by reflex. Record the decision in one sentence:

```text
Delivery: single PR — the end-to-end change is already one focused review.
```

or:

```text
Delivery: 3-PR stack — the dormant migration, tested repository adapter, and
fixed sign-in slice form one-way dependencies with meaningful verification.
```

## Design The Stack Before Writing Code

### 1. Fix The Story And Slice Scope

Write the selected story's actor and outcome, then the selected implementation slice's:

- trigger
- observable outcome or conserved contract
- production path: entry point → domain behavior → state/external effects → output → observability
- acceptance examples or preservation evidence
- class and any reduction-program/terminal obligations from `planning`
- release constraint

If the story still describes more than one customer capability, return to `story-splitting`. If the slice contains several independently mergeable vertical outcomes or reduction transitions, keep them as sequential slices in `planning`. Freeze the selected slice's scope before drawing PR layers.

For a reduction slice, PR layers do not replace its ledger or gates. A lower layer cannot claim net reduction while superseded machinery or an added bridge remains; only the top of a terminal-reduction slice may satisfy the mechanism gate and claim the fixed terminal state.

### 2. Draw The Dependency Graph

Identify what genuinely must exist before something else. Separate logical dependency from habitual build order. "We usually build the backend first" is not evidence.

Prefer boundaries in this order:

1. **Testable path increments** — each PR advances the same fixed slice without adding a new acceptance case that belongs in another slice.
2. **Behavior-preserving preparation** — a focused refactor or safety characterization that makes the later change reviewable.
3. **Backward-compatible enablement** — a migration, contract, or infrastructure change that is verified, dormant, and directly used by the next PR.
4. **Risk isolation** — a security-, data-, or performance-sensitive change that deserves focused expert review.
5. **Reviewer expertise** — a subsystem boundary, only when the PR still makes sense without an essay about the rest of the stack.

Avoid:

- all tests in the top PR
- speculative foundations or abstractions
- layers whose only claim is "files in the same folder"
- a lower layer that requires an upper layer to compile, migrate safely, pass CI, or discharge an unowned bridge
- duplicate fixups in upper layers instead of fixing the owning lower layer
- a long stack where cascade and review overhead dominate

There is no universal layer count or line limit. Keep the smallest stack whose PRs are quick reads with one concept each. If two adjacent layers need the same explanation or evidence, fold them together.

### 3. Route Verification By Layer Type

GitHub's tutorial illustrates tests as a final layer; do not copy that ordering into this workflow.

For a behavior-changing production layer:

- Load `tdd`, `testing`, and applicable `refactoring` guidance before code changes.
- Follow fast RED-GREEN-REFACTOR increments for the behavior owned by that layer.
- Put contract, migration, unit, integration, or UI tests in the earliest layer that owns the behavior.
- When the layer is otherwise PR-ready, load `mutation-testing` and run its accumulated-scope gate once against the layer's parent where meaningful, or record its proportionate alternate-evidence `N/A`.

For a behavior-preserving layer:

- Load applicable testing and `refactoring` guidance; if protection is inadequate, load `finding-seams` and `characterisation-tests`.
- Establish passing preservation evidence for the touched consumer paths.
- Refactor without changing behavior, keeping the applicable focused/affected tests green.
- At PR readiness, run the same once-per-layer mutation-or-alternate-evidence gate; do not fabricate structural mutants.

For reduction-transition or terminal-reduction layers, also preserve the selected slice's `reduce-system-complexity` ledger, conserved contract, bridge ownership/removal obligations, and behavior/mechanism gate status.

For documentation, release metadata, configuration, or non-production mechanical changes, use the smallest executable verification that can fail if the layer is wrong and record mutation `N/A` when appropriate.

For every layer, run the repository's required build, lint, type, security, and complete non-watch test checks and verify the cumulative branch, because an upstack PR contains every lower layer.

The top layer must prove the selected slice's acceptance examples or terminal gates. It may add stack-level tests, but it must not be the first place lower-layer behavior is tested.

### 4. Verify CI Topology Before Stacking

Inspect the repository's workflows, rulesets, required status contexts, and merge queue:

- Confirm `pull_request` workflows run when an upper PR targets a lower feature branch. Branch filters evaluate the PR's base branch; a `main`-only filter can skip every upper layer.
- Confirm every required status is produced for every layer that needs it.
- If the repository uses a merge queue, confirm required workflows handle `merge_group`.
- Decide which focused checks run per layer and which cumulative or end-to-end checks run at the top; do not weaken required merge checks to make stacking convenient.
- Account for rebase-triggered reruns and existing affected-test or cache behavior.

Prefer one PR when the repository cannot give dependent PRs trustworthy required checks without risky CI changes.

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

Add this section under the selected implementation slice, not at plan level:

```markdown
#### Delivery Shape

**Mode**: Single PR | Stacked PRs
**Reason**: [Why this shape improves review without weakening delivery]
**Story scope**: [Fixed parent story; PR layers must not expand it]
**Slice class**: [Class from planning]
**Slice done when**: [Fixed observable outcome, conserved contract, or terminal gates]

| # | PR layer | Base | Owns | Depends on | Verification | Release state |
|---|---|---|---|---|---|---|
| 1 | [focused title] | [repository default branch] | [one coherent change] | — | [tests/evidence/checks] | [deployable/dormant/etc.] |
| 2 | [focused title] | layer 1 | [one coherent change] | [specific contract] | [tests/evidence/checks] | [...] |

### Whole-stack gate

- [ ] Slice acceptance examples, conserved contract, and applicable terminal gates pass at the top
- [ ] Every layer's focused and cumulative checks pass
- [ ] No behavior waits until a later PR for its first test
- [ ] Every PR-ready layer has current mutation or alternate evidence for its focused review boundary
- [ ] Intermediate merge and release states are explicit and safe
- [ ] Reduction ledger, bridge, and mechanism-gate obligations remain accurate when applicable
- [ ] CI runs required statuses for dependent-base PRs and `merge_group` when applicable
- [ ] Review sequence is bottom-up for dependency-sensitive layers; independent specialist reviews may run in parallel
- [ ] Merge order is bottom to top
```

For each layer, also record:

- focused review question
- included and excluded scope
- likely files or subsystem, without prescribing unnecessary implementation
- required specialist reviewer, if any
- acceptance criteria and verification route for the behavior, conserved contract, or mechanical change it owns

Use repository branch naming conventions. Do not create branches, commit, push, submit PRs, rebase shared branches, or merge unless the user has authorized that action.

## Build Bottom To Top

For each layer:

1. Start from the topmost completed branch.
2. Confirm the layer's acceptance criteria or conserved contract with the user before code.
3. Complete the applicable implementation route and keep focused/affected checks green.
4. When the layer is otherwise PR-ready, complete its mutation-or-alternate-evidence gate and repository checks.
5. Self-review the diff against its parent, not against trunk.
6. Remove work that belongs upstack.
7. Present the focused diff and verification evidence.
8. Wait for commit approval.
9. Create the next branch only after the current layer is committed and known-good; review approval is not required to extend the stack.

Prefer the official `gh stack` command when it is available and matches current repository policy. Use current help rather than memorized preview syntax. If it is unavailable, either manage dependent branches and PR bases with existing Git/GitHub tooling or ask before installing anything.

Open unfinished upper layers as drafts. Give each PR a focused title and concise description containing:

- selected story, fixed implementation slice, and this layer's purpose
- parent/base PR and next layer, when known
- what to review in this diff
- verification performed
- release state
- intentional deferrals

## Review And Revise

Self-review every layer before requesting review. Check function, intent, code quality, dependencies, AI-specific mistakes, and test integrity.

Request review from the bottom upward when later layers depend strongly on earlier decisions. Different specialists may review and approve layers in parallel when each focused diff is understandable. Merge readiness and merge order still flow bottom to top.

When feedback changes a lower layer:

1. Move to the branch that owns the change.
2. Fix and test it there.
3. Rebase or restack every branch above it.
4. Re-evaluate whether existing mutation/alternate evidence remains current under repository policy, then rerun affected focused and cumulative checks as required.
5. Re-review upstack diffs for accidental duplication or semantic drift.
6. Push only with safe lease protection and authorization.

Do not add an upstack workaround for a downstack defect.

Reshape the stack when evidence changes. Fold adjacent PRs that cannot be reviewed separately; split a layer that acquired a second concept; reorder only when dependencies allow it. A clean working tree and recoverable rebase path are prerequisites for structural changes.

## Merge And Finish

Before merge:

- require passing checks and required approvals for the layer and every layer below it
- require linear stack history
- verify the top branch still satisfies the fixed slice acceptance criteria or terminal gates
- verify any partially merged state remains safe
- resolve documentation conflicts using current GitHub guidance because stacked PR behavior is preview

Merge from the bottom upward, individually or as a contiguous group supported by the repository. Never treat a mid-stack PR as independently mergeable when it depends on unmerged layers below.

After lower layers merge, sync or rebase the remaining stack, rerun affected checks, and verify each PR still shows only its intended focused diff. Mark the implementation slice complete only when its top lands. Delete the plan when every selected implementation slice lands, following `planning`.

## Example: Preserve The Vertical Slice

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
