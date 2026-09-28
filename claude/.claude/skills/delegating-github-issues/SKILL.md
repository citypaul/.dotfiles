---
name: delegating-github-issues
description: Take a triaged GitHub issue end-to-end to a reviewable pull request in an isolated worktree, then address review comments on request. With the land parameter on, also watch delegated PRs and review, simplify and merge one the human marked Ready for review. Use when a project command such as /delegate asks to pick up an issue, work a specific issue number, address review comments on a PR the delegator opened, watch delegated PRs, or land one. Not for triage, merging PRs the delegator did not open, or writing production code in the calling session.
---

# Delegating GitHub issues

You are the delegator. You do not write production code. You check eligibility and budget, create the worktree, hand implementation to a subagent, verify the result, open the PR, and stop. A human reviews. With `land` on, the delegator also merges, but only a PR the human marked Ready for review, only through **Land**.

## Parameters

The calling command supplies these; defaults apply when it does not.

| Parameter | Default | Meaning |
|---|---|---|
| `label` | `agent-ready` | Only issues carrying this label are eligible |
| `rank_labels` | `p1`, `p2` | Higher rank first; unranked last |
| `max_worktrees` | 2 | Active worktrees whose branch starts with `delegated/` |
| `max_open_prs` | 6 | Open PRs in the repository, all authors |
| `branch_prefix` | `delegated/` | Branch name prefix for every delegated worktree |
| `pre_pr_gate` | the project's `/pr` command | The gate the implementer must pass before the PR opens |
| `walkthrough` | off | When on, run the `browser-ux-walkthrough` skill for diffs that touch the UI path the project names |
| `oracle` | off | When on, apply the Preview oracle rule below |
| `land` | off | When on, Work opens PRs as drafts, and **Land** may merge a PR the human marked Ready for review |

## Delegator marker

The delegator posts through the human's `gh` auth, so a comment's author cannot tell the two apart. Every comment and thread reply the delegator posts therefore ends with this line:

    <!-- delegator -->

Other agent sessions post through the same auth without the marker. The footer Claude Code adds (`[Claude Code](https://claude.`) identifies their posts.

A comment **needs an answer** when all five hold:

- it does not contain `<!-- delegator`;
- it does not contain the Claude Code footer: another agent posted it, not the human;
- its author login does not end in `[bot]`;
- it does not contain `<!-- preview-`;
- it has not been answered. An inline comment is answered when a comment containing `<!-- delegator` or the Claude Code footer follows it in the same review thread. A top-level comment or review body is answered when a PR comment contains `<!-- delegator reply-to: <comment id> -->` with its id; Land's own status comments answer nothing.

## Entry points

### Pick

1. `gh issue list --label <label> --state open --json number,title,labels,createdAt --limit 100`.
2. Sort: issues with the first rank label, then the second, then unranked; oldest `createdAt` first within each group.
3. Take the first issue that is not waiting on the human, as **Work** step 3 defines it. The list carries no comments, so read each candidate's with `gh issue view <n> --json body,comments` in sort order and stop at the first one that is not waiting. Continue at **Work** with that number.
4. If the list is empty, or every issue is waiting, say so and stop. Do not widen the search.

### Work `#N`

1. **Eligibility.** `gh issue view N --json labels,body,title,state -q .` The issue must be open and carry `<label>`. If not, reply in chat "Issue #N is not labelled `<label>`; add the label to make it eligible" and stop.
2. **Budget.** Reclaim finished worktrees first, then count.

   **Reclaim.** For each worktree whose branch starts with `<branch_prefix>` (`git worktree list --porcelain`), read its PR: `gh pr list --head <branch> --state all --limit 1 --json number,state,headRefOid`. Reclaim it only when all three hold: the PR state is `MERGED`, `git -C <path> status --porcelain` prints nothing, and `git rev-parse <branch>` equals the PR's `headRefOid`. Do not test `git log origin/<default branch>..<branch>`: a squash merge leaves the branch's commits off the default branch, so that test never passes. Reclaim means `git worktree remove <path>`, then `git branch -d <branch>` (`-d`, never `-D`: it refuses anything unmerged and is the last safety net), then `git worktree prune`. If `-d` refuses because the squash merge left no ancestry, keep the branch and name it in the report. If the directory survives because another process holds it open (Windows: *"being used by another process"*; the usual culprit is a terminal parked inside it), the registration is already gone and the slot is free — delete what the platform's recursive delete will take, and name the leftover path in the run's report so the human can close whatever sits in it. Do not retry in a loop and do not kill processes to free it. Leave alone, and name in the report, any worktree whose PR is open, closed without merging, or missing, or which holds uncommitted or unpushed work.

   **Count.** Delegated worktrees: `git worktree list --porcelain | grep -c 'branch refs/heads/<branch_prefix>'`. Open PRs: `gh pr list --state open --limit 100 --json number -q 'length'`. If either count is at its limit, post this issue comment and stop:

   > Delegation paused: <k> delegated worktrees active (limit <max_worktrees>) and <m> open PRs (limit <max_open_prs>). Retry when one closes.

3. **Acceptance criteria.** Read the body. Acceptance criteria are present if the body has a heading matching `/acceptance criteria/i` followed by a numbered or bulleted list. Use them for the rest of the run.

   If absent, read the issue's comments (`gh issue view N --json comments`). Only a reaction from the authenticated login (`gh api user -q .login`) counts, because anyone can react on a public repository. Read a comment's reactions with `gh api repos/<owner>/<repo>/issues/comments/<id>/reactions --jq '[.[] | select(.content == "+1") | .user.login]'`. The delegator never reacts, so that login's 👍 is the human's.
   - **Confirmed.** A derived-criteria comment (it starts with `**Acceptance criteria (derived by the delegator`) carries that login's 👍. Use its current text, including any edits, for the rest of the run.
   - **Waiting on the human.** A derived-criteria comment without that 👍, or a delegator question (it starts with `**Question before delegation**`) with no later comment from the human (one containing neither `<!-- delegator` nor the Claude Code footer). Say in chat that issue #N is waiting on the human, post nothing, and stop.

   Otherwise derive the criteria and stop. First load `find-gaps` on the issue body and every human comment, including answers to earlier questions. If the intent has two plausible readings, or the gaps leave no observable outcome, post one question as a comment that starts with `**Question before delegation**`, names the readings or gaps, and ends with the delegator marker, then stop. Otherwise derive 2–6 criteria, each observable and testable, and post them as a comment ending with the delegator marker:

   > **Acceptance criteria (derived by the delegator; edit this comment to change them, then react 👍 to confirm)**
   > 1. …

   Say in chat that issue #N awaits criteria confirmation, and stop. The run that follows the 👍 starts again at step 1.
4. **Size check.** If the criteria cannot be met by one PR of the project's usual size (read two recent merged PRs with `gh pr list --state merged --limit 2 --json additions,deletions,changedFiles` for the norm), load `story-splitting`, post the split as an issue comment, work the first child, and file each remaining child as its own issue with the `follow-up` label and no `<label>`. Say so in the PR body under **Found on the way**.
5. **Worktree.** `EnterWorktree` with a name derived from `N-<slug>`, based on `origin/<default branch>`. Rename the branch: `git branch -m <branch_prefix>N-<slug>`. Bootstrap the project the way its root CLAUDE.md says (for a pnpm monorepo: `pnpm install` then `pnpm build`). Keep the worktree until its PR merges; the **Reclaim** sub-step of the next run's budget check removes it then. Never remove a worktree whose PR has not merged.
6. **Handoff.** Dispatch one subagent with `subagent_type: general-purpose`, `model: opus`, `run_in_background: false`. The brief must contain, verbatim from the sources: the issue title and body, the acceptance criteria, the worktree absolute path, the project's root and `.claude/` CLAUDE.md pointers to skills, and these instructions:

   > Work only inside `<worktree path>`. Load the `tdd` and `testing` skills before any code change; RED before GREEN for every behaviour change. Run the project's pre-push self-check and every quality-gate step of `<pre_pr_gate>` yourself, including any glossary or vocabulary check; stop short of its PR-creation steps. Do **not** open the PR and do **not** commit; leave the changes staged. Use `VITEST_MAX_WORKERS=2` for every test run. While working, run only the affected package's or file's tests. Where the self-check or gate requires the complete test suite, run it once, at the end, as a background task. Then wait for it to exit (Monitor or a polling loop, never a fixed sleep) and read its exit code and summary; do not return before it exits. Never run it in the foreground or pipe it through `tail`. If the previous test run in this worktree was killed, run `pnpm test:db:clean` before the next one. Return: (a) the list of files changed, (b) for each acceptance criterion the test name that proves it, (c) the RED-before-GREEN evidence per the gate, (d) the mutation gate outcome or `N/A` with alternate evidence, (e) the exact commands you ran for verification and their last ten lines, (f) anything you noticed but did not fix.

   If the subagent reports it cannot make the gate pass, go to **Blocked**.
7. **Independent checks.** The implementer's returns are claims, not evidence. Dispatch these three read-only checks in parallel on the staged diff, each at its default model. None of them edits files.
   - **Process.** The project's `tdd-guardian` agent.
   - **Acceptance.** A `general-purpose` subagent that loads `acceptance-review`. It takes the step 3 criteria as the contract and the staged diff with its tests as the evidence, and returns a verdict for each criterion. The implementer's criterion-to-test mapping goes in as a claim to check, not as the evidence.
   - **Whole diff.** The project's whole-PR review agent (`pr-reviewer` when the project defines it). Otherwise, a `general-purpose` subagent that runs `/code-review` at medium effort on the staged diff and returns its findings without applying them.
8. **Walkthrough.** If `walkthrough` is on and `git diff --cached --name-only` contains a path under the project's UI root, load `browser-ux-walkthrough` with the project's stack skill. Grade the surfaces, but do **not** run its Fix step: you do not write production code. Stop the stack, and keep the grades and each `finding` for step 9. If it reports the stack could not boot, file a `follow-up` issue titled `Walkthrough blocked for #N: <reason>` and use `Walkthrough blocked: <reason> (see #<follow-up>)` as the section body.
9. **Repair round.** Collect every blocking finding from steps 7 and 8:
   - any `tdd-guardian` finding;
   - any criterion that `acceptance-review` does not rate `Covered` (`Partial`, `Missing`, `Regressed` and `Unverified` all block);
   - any `pr-reviewer` finding rated Critical or High Priority, or any `/code-review` correctness finding;
   - any walkthrough `finding`.

   Lesser review findings (`pr-reviewer` Suggestions, `/code-review` cleanups) go to the PR body's **Found on the way** section. If nothing blocks, skip to the last paragraph of this step.

   Otherwise send the implementer subagent one message listing every blocking finding, and wait. It fixes them, re-runs the project's pre-push self-check and the gate's test and mutation steps for the files its fix touched, and returns (a)–(f) afresh; the PR body uses those returns, not the first ones. It may propose deferring a walkthrough or whole-diff finding with a one-line reason. You decide: accept a deferral only when the finding lies outside the acceptance criteria, and file each accepted one as a `follow-up` issue. Unmet criteria and `tdd-guardian` findings cannot be deferred.

   Then re-run `tdd-guardian` and every check that reported a blocking finding. If the walkthrough had findings, boot and sign in per the Recipe, re-walk the affected surfaces in both themes for the `-after.png` shots, and stop the stack.

   One round only. Any blocking finding that remains goes to **Blocked**, with the findings in the **Verification** section.

   On every path out of this step except **Blocked**, write the `## UX walkthrough` section from the final grades, or `Not applicable: no UI files changed` when the walkthrough did not run.
10. **Commit.** Ask the human for commit approval with the proposed message shown. On approval, `git commit -F <file>` with a conventional-commit subject that names the issue (`fix(web): … (#N)`) and the project's co-author trailer.
11. **Evidence.** If there are screenshots, push them per the project's evidence rule (for Flow Canvas: the `ux-evidence` orphan branch, path `<pr-number>/<surface>-<theme>-<before|after>.png`; the PR number is known only after step 12, so push evidence after the PR is created and then edit the body with `gh pr edit --body-file`).
12. **PR.** `git push -u origin <branch>` then `gh pr create --title "<subject>" --body-file <file>`; add `--draft` when `land` is on, so that the human's Ready-for-review click is the landing signal. The body follows the contract below. Then comment `Opened <PR URL> for this issue.` on the issue, ending with the delegator marker: `gh issue comment N --body-file <file>`.
13. **Oracle.** If `oracle` is on, wait up to 20 minutes polling every 2 minutes for the sticky comment and apply the Preview oracle rule. Otherwise say the check will run on the next `Review`.
14. Report the PR URL and stop.

### Review `#PR`

1. Confirm the PR head branch starts with `<branch_prefix>`; otherwise say this PR was not opened by a delegated run and stop.
2. Find its worktree: `git worktree list --porcelain | grep -B2 'branch refs/heads/<head branch>'`. If none exists (another machine or session opened the PR), `git fetch origin <head branch>`, then `git worktree add <path> <head branch>`, then bootstrap it the way the project's root CLAUDE.md says. Enter it.
3. Fetch unresolved threads and top-level comments:

   ```bash
   gh api graphql -F owner=<owner> -F repo=<repo> -F pr=<PR> -f query='
   query($owner:String!,$repo:String!,$pr:Int!){
     repository(owner:$owner,name:$repo){ pullRequest(number:$pr){
       reviewThreads(first:50){ nodes{ id isResolved path line
         comments(first:20){ nodes{ body createdAt author{login} } } } } } } }'
   gh api repos/<owner>/<repo>/issues/<PR>/comments --paginate \
     --jq '.[] | {id, created_at, login: .user.login, body}'
   gh api repos/<owner>/<repo>/pulls/<PR>/reviews --paginate \
     --jq '.[] | select(.body != "") | {id, submitted_at, login: .user.login, body}'
   ```
   Keep unresolved threads whose last comment needs an answer, and top-level comments and review bodies that need an answer (see **Delegator marker**).
4. For each thread, classify the last human comment: **actionable** (names a change, a file, or a behaviour) or **ambiguous** (a question with two readings, or a preference without a target). Post one reply on each ambiguous thread with exactly one question and stop after handling the actionable ones. Every reply ends with the delegator marker. For a top-level comment or review body, reply with `gh pr comment <PR> --body-file <file>`, whose body starts by quoting the comment's first line (`> …`) and ends with `<!-- delegator reply-to: <comment id> -->` in place of the plain marker.

   ```bash
   gh api graphql -F t=<thread id> -F b="<text>" -f query='
   mutation($t:ID!,$b:String!){ addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t, body:$b}){ comment{ id } } }'
   ```

   A comment that asks for findings as follow-ups needs no code. File each finding as its own issue with the `follow-up` label and no `<label>`, with acceptance criteria. Add each issue to the PR body's `## Found on the way, not fixed here` section (`gh pr edit <PR> --body-file <file>`), then reply naming the issues. The body is where **Land** learns which findings are accepted.
5. Hand the actionable threads to the implementer subagent (same brief shape as **Work** step 6, with the thread bodies and paths in place of the issue), then run **Work** steps 7–9. For the acceptance check, the contract is the actionable thread requests plus the PR body's acceptance criteria, which the fix must not break. Run the walkthrough only if `walkthrough` is on and UI files changed.
   When **Watch** or **Land** started this Review and the implementer cannot pass the gate, or a blocking finding survives the repair round, discard the staged changes (`git restore --staged --worktree .`), reply on each actionable thread or comment with the failure in one sentence, and stop; under Land, go to **Bail-out**. Never go to **Blocked** from **Watch** or **Land**. When the human started this Review, the PR already exists, so **Blocked** does not apply: keep the staged changes, post the remaining findings as one PR comment ending with the delegator marker, and stop.
6. Commit after approval; when **Watch** or **Land** started this Review, commit without asking. Push, then reply on each actionable thread or top-level comment with one sentence naming the commit and what changed, ending with the delegator marker (the `reply-to` form for a top-level comment). Do not resolve threads; the reviewer resolves.
7. Apply the Preview oracle rule if `oracle` is on. Report and stop.

### Watch

One pass over every open delegated PR, built to run under `/loop`. Watch holds no state between passes; everything it needs is on GitHub, so a restarted loop loses nothing.

1. **Reclaim** as in **Work** step 2.
2. `gh pr list --state open --limit 100 --json number,isDraft,headRefName,headRefOid,createdAt --jq '[.[] | select(.headRefName | startswith("<branch_prefix>"))]'`.
3. Classify each PR:
   - **Needs review**: at least one review thread, top-level comment or review body needs an answer (see **Delegator marker**), and the PR is a draft or `land` is off.
   - **Ready**: `land` is on and, from this query, `isDraft` is false and `ready.filteredCount` is above 0:

     ```bash
     gh api graphql -F owner=<owner> -F repo=<repo> -F pr=<PR> -f query='
     query($owner:String!,$repo:String!,$pr:Int!){
       repository(owner:$owner,name:$repo){ pullRequest(number:$pr){ isDraft headRefOid
         ready: timelineItems(itemTypes:[READY_FOR_REVIEW_EVENT]){ filteredCount }
         latest: timelineItems(itemTypes:[READY_FOR_REVIEW_EVENT, PULL_REQUEST_COMMIT], last:1){ nodes{ __typename } } } } }'
     ```

     That is: the human marked it ready at least once and has not returned it to draft. A PR opened as non-draft has no ready event and is never Ready. `latest` tells Land whether a commit arrived after the last Ready.
   - **Idle**: everything else. Never touched.
4. Run **Review** on each Needs-review PR, committing without asking. Then run **Land** on each Ready PR. Work oldest `createdAt` first, one PR at a time.
5. Report one line per PR: number, state, and the action taken or `idle`. Name idle non-draft PRs so the human sees them.
6. Under `/loop`, schedule the next pass 1200–1800 seconds out. Land's review and CI wait run in the background, and the background task that finishes wakes the loop, so a pass never polls to babysit them. To notice a Ready click or a new comment sooner, leave a background poll running between passes. It checks each delegated PR's draft state and unanswered comments, plus any new delegated PR, about once a minute, and exits on the first change.

### Land `#PR`

Review, simplify and merge a PR the human marked Ready for review. Land may merge only what the human approved plus changes that preserve behaviour. Anything else goes to **Bail-out**.

Land can resume. Steps 1–3 always run, including on resume. The latest land marker says how far a previous Land got:

```bash
gh api repos/<owner>/<repo>/issues/<PR>/comments --paginate \
  --jq '[.[] | select(.body | contains("<!-- delegator land: reviewed ")) | .body] | last'
```

When the SHA in it equals the PR's current `headRefOid`, Land already verified this head: after step 3, go to step 7.

1. **Eligibility.** If `land` is off, say so and stop. The head branch must start with `<branch_prefix>`, and the PR must be **Ready** as **Watch** step 3 defines it; if not, say so and stop. Unless the land marker names the current head, `latest` in that query must be a `ReadyForReviewEvent`. A commit after the human's last Ready was not approved, so go to **Bail-out** with the reason `commits after Ready`.
2. **Worktree.** Find or create the branch's worktree as in **Review** step 2.
3. **Open review first.** If any thread or top-level comment needs an answer, run **Review** steps 4–6, committing without asking. The human marked the PR ready with it open, so a clear request is a request to address. An ambiguous comment gets its single question and then **Bail-out** with the reason `question pending`.
4. **Bring up to date.** `git fetch origin`, then `git merge --no-edit origin/<default branch>`. Resolve a conflict in place only when it is one of these textual kinds:
   - import order;
   - a migration-prefix collision (renumber to the next free prefix);
   - a generated file that the project regenerates (for Flow Canvas, `openapi.json` via `pnpm openapi:generate`);
   - lockfile churn (re-run the install);
   - edits to adjacent lines that do not overlap in what they do.

   Any other conflict is semantic: `git merge --abort`, then **Bail-out** naming the conflicting files.
5. **Review and simplify.** A review interrupted by a restart leaves staged changes. Discard them (`git restore --staged --worktree .`) before dispatching again. Dispatch one subagent with `subagent_type: general-purpose`, `model: opus`, `run_in_background: true`, with the Work step 6 brief shape, the PR title, body and diff (`git diff origin/<default branch>...HEAD`), and these instructions. A review can take half an hour. Its completion notice resumes this Land, and other PRs are free to move in the meantime.

   > Work only inside `<worktree path>`. Run `/code-review` at medium effort and `/simplify` on the diff against `origin/<default branch>`. Apply only changes that preserve behaviour; do not change any test's assertions. Do not fix anything that needs a behaviour change: return it instead. Findings listed under the PR body's `## Found on the way, not fixed here` are accepted: name them as accepted, with their issue numbers, and do not return them. Run the project's pre-push self-check. If you changed production files, run the project's mutation gate scoped to those files and revert any simplification that lowers the covered score. Do not commit; leave the changes staged. Return: (a) the files changed, (b) every finding that needs a behaviour change, with file and line, (c) the verification commands and their last ten lines, (d) the mutation outcome or `N/A` with the reason.

   If (b) is not empty, or the pre-push self-check fails, go to **Bail-out** and list the findings. If test files changed, run the project's `tdd-guardian` agent on the staged diff; any finding goes to **Bail-out**.
6. **Commit and push.** Commit without asking. Step 4's merge is one commit: git made it already when there was no conflict; after resolving a conflict, commit it with the project's co-author trailer. Commit step 5's changes, when there are any, as `refactor: simplify after review (#PR)` with the trailer. Then `git push`, with no force flag. Post a PR comment whose body is `Reviewed <sha> for landing.`, followed by the line `<!-- delegator land: reviewed <sha> -->` and the delegator marker, where `<sha>` is the new `headRefOid`.
7. **Wait for CI.** Run `timeout 2400 gh pr checks <PR> --watch --fail-fast` as a background task. Its exit resumes this Land; then read `gh pr checks <PR>`.
   - A failing check: **Bail-out**, naming the check and the last lines of `gh run view <run> --log-failed`.
   - Still pending when the wait times out, or the session restarted mid-wait: leave the PR as it is. The next Watch pass resumes at this step through the land marker.
   - `no checks reported`: continue only when every changed path is one the project's CI ignores (for Flow Canvas, `docs/**`, `**/*.md`, `.claude/**`); otherwise wait as for pending.
   - Preview E2E is a merge gate only when `oracle` is on, and then by the Preview oracle rule.
8. **Merge.** Check `isDraft` again (`gh pr view <PR> --json isDraft,headRefOid`) and re-read the comments as in **Review** step 3. If the PR is now a draft, its head is no longer the verified SHA, or a comment needs an answer, stop without merging. The next Watch pass picks it up. Otherwise run `gh pr merge <PR> --squash --match-head-commit <verified SHA>`. If `gh pr merge` exits non-zero, go to **Bail-out** with its error output.
9. **After merge.** Reclaim this worktree at once under **Work** step 2's Reclaim rules. Comment `Merged in <merge sha> via Land.` on the PR and `Landed in <PR URL>.` on the issue, each ending with the delegator marker. Report the merge SHA and stop.

#### Bail-out

1. `gh pr ready --undo <PR>`.
2. Clean up the worktree. Before step 6, abort any in-progress merge (`git merge --abort`). A merge commit that step 4 completed stays: removing it would rewrite history. At step 7, the pushed commits stay.

   A bail-out at step 5 on findings alone should keep verified simplifications. It qualifies when the pre-push self-check passed and `tdd-guardian`, when it ran, found nothing. Commit the staged changes as `refactor: simplify after review (#PR)` with the trailer, then `git push` with no force flag. The PR is a draft by now, so this approves nothing, and the next Land does not redo the work. Otherwise discard staged and unstaged Land changes (`git restore --staged --worktree .`) and push nothing new.
3. Post one PR comment, ending with the delegator marker, containing:
   - the Land step that stopped;
   - the reason, in one sentence;
   - any findings, as a list;
   - any commits that stay pushed;
   - `Fix or answer, then mark the PR ready again.`
   - `To accept a finding instead, ask for it as a follow-up.`
4. Stop Land for this PR. The next Watch pass sees a draft. A new Ready click makes a new ready event and a new Land.

### Blocked

Push whatever is staged as a draft PR: commit with subject `[blocked] <issue title> (#N)` after approval, `gh pr create --draft --title "[blocked] …" --body-file <file>` with the gate output in the **Verification** section, comment the PR URL on the issue with the one-line reason, and stop.

## Preview oracle rule

Read the sticky: `gh api repos/<owner>/<repo>/issues/<PR>/comments --jq '.[] | select(.body | contains("<!-- preview-e2e -->")) | .body'`.

- Contains `preview-e2e: pass` → note it in the PR body's **Preview E2E** section.
- Contains `preview-e2e: network-boundary` → leave the PR alone; the auto-retry owns it.
- Contains `preview-e2e: playwright-failure` → `gh pr ready --undo <PR>`, then comment on the PR naming the failing spec from the sticky and the most likely cause from the diff.
- Sticky absent after the wait → say so and stop.

## PR body contract

Use these eight headings, in this order, every time. A section that does not apply says why in one line; it is never omitted.

```markdown
## Summary
## Acceptance criteria
## TDD evidence
## Mutation gate
## Verification
## UX walkthrough
## Found on the way, not fixed here
## Preview E2E
```

`Summary` links the issue (`Closes #N`). `Acceptance criteria` lists each criterion with the test name that proves it. `TDD evidence` and `Mutation gate` carry what the implementer returned. `Verification` carries the exact commands and their last lines. `UX walkthrough` carries the walkthrough skill's output, `Walkthrough blocked: …`, or `Not applicable: no UI files changed`. `Found on the way` lists observations and any `follow-up` issues filed. `Preview E2E` carries the oracle state or `Oracle off: informational until #<oracle issue> merges`. End with the project's PR footer.

## Never

- Add `<label>` to an issue, resolve a review thread, force-push, or rebase a pushed branch.
- Merge a PR, except through **Land** with `land` on.
- Mark a PR ready for review. `gh pr ready` runs only with `--undo`; only the human marks a PR ready.
- Remove a worktree whose PR has not merged, or delete any branch other than the local `<branch_prefix>` branch of a worktree being reclaimed — and that one only with `git branch -d`.
- Kill a process to free a worktree directory; report the leftover path instead.
- Run the full test suite at the repository root in the foreground, or to check a single change.
- Point a browser at a deployed preview URL.
- Continue after an ambiguous review comment without the human's answer.
