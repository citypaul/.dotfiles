#!/usr/bin/env bash
#
# Guard the delegation landing policy: who may mark a PR ready, how the
# delegator tells its own comments from the human's, and what Land may and may
# not do before it merges.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILL="$REPO_ROOT/claude/.claude/skills/delegating-github-issues/SKILL.md"
FAILURES=0

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

fail() {
  echo -e "${RED}FAIL${NC}: $1"
  FAILURES=$((FAILURES + 1))
}

pass() {
  echo -e "${GREEN}PASS${NC}: $1"
}

require_text() {
  local pattern="$1" label="$2"

  if grep -Fq -- "$pattern" "$SKILL"; then
    pass "$label"
  else
    fail "$label"
  fi
}

reject_regex() {
  local pattern="$1" label="$2"

  if grep -Eiq -- "$pattern" "$SKILL"; then
    fail "$label"
  else
    pass "$label"
  fi
}

# Task 1: parameter, drafts, marker, Never list
require_text '| `land` | off |' "land parameter defaults to off"
require_text 'add `--draft` when `land` is on' "Work opens a draft when land is on"
require_text '<!-- delegator -->' "delegator comments carry the marker"
require_text 'Every comment and thread reply the delegator posts therefore ends with' "every delegator post is marked"
require_text 'does not end in `[bot]`' "bot comments never need an answer"
require_text 'does not contain `<!-- preview-`' "preview stickies never need an answer"
require_text 'issues/<PR>/comments --paginate' "Review reads top-level PR comments"
require_text 'Merge a PR, except through **Land** with `land` on.' "merging is confined to Land"
require_text '`gh pr ready` runs only with `--undo`' "only the human marks a PR ready"
reject_regex 'merge a PR, resolve a review thread' "the unconditional never-merge line is gone"

# Task 2: Watch
require_text '### Watch' "Watch entry point exists"
require_text 'READY_FOR_REVIEW_EVENT' "Ready is read from the PR timeline"
# timelineItems' totalCount ignores itemTypes and counts every timeline item,
# so a gate on it calls every PR ready. filteredCount is the filtered count.
require_text 'ready: timelineItems(itemTypes:[READY_FOR_REVIEW_EVENT]){ filteredCount }' "Ready counts only ready events"
require_text '`ready.filteredCount` is above 0' "Ready gates on the filtered count"
reject_regex 'totalCount' "no gate reads the unfiltered timeline count"
require_text 'never Ready' "a PR opened as non-draft is never landed"
# The watcher may run on a machine that did not open the PR, so Review, not
# just Land, must be able to create the worktree it needs.
require_text 'If none exists (another machine or session opened the PR), `git fetch origin <head branch>`, then `git worktree add <path> <head branch>`' "Review creates a missing worktree"
require_text 'Find or create the branch'"'"'s worktree as in **Review** step 2.' "Land reuses Review's worktree step"
require_text 'holds no state between passes' "Watch keeps no local state"
# A foreground CI wait held the whole watcher for up to 27 minutes in dry run 2.
# Land's long waits run in the background and wake the loop when they finish.
require_text 'the background task that finishes wakes the loop' "a Land waiting in the background wakes the loop itself"
reject_regex '270 seconds' "Watch no longer polls fast to babysit CI"

# Task 3: Land
require_text '### Land `#PR`' "Land entry point exists"
require_text 'If `land` is off, say so and stop.' "Land refuses when land is off"
require_text 'git merge --no-edit origin/<default branch>' "conflicts are resolved by merging main in"
require_text '<!-- delegator land: reviewed <sha> -->' "Land records the SHA it verified"
require_text 'no checks reported' "a docs-only PR with no CI checks can land"
require_text 'Check `isDraft` again' "a PR returned to draft mid-land is not merged"
require_text '--squash --match-head-commit <verified SHA>' "only the verified head is merged"
require_text 'Fix or answer, then mark the PR ready again.' "bail-out hands the PR back to the human"
reject_regex 'git rebase|git push (--force|-f)' "Land never rebases or force-pushes"
require_text 'force-push, or rebase a pushed branch' "the Never list forbids force-push and rebase"
require_text 'If the PR is now a draft, its head is no longer the verified SHA, or a comment needs an answer, stop without merging.' "a PR changed mid-land is not merged"
require_text 'continue only when every changed path is one the project'"'"'s CI ignores' "no checks passes only for CI-ignored paths"

# Review findings: resume, late commits, answers, unattended failures
require_text 'Steps 1–3 always run, including on resume.' "resuming Land still checks eligibility"
require_text 'Bail-out** with the reason `commits after Ready`' "a commit pushed after Ready is not landed"
require_text '<!-- delegator reply-to: <comment id> -->' "a top-level answer names the comment it answers"
require_text 'pulls/<PR>/reviews --paginate' "a review summary body is read as a comment"
require_text 'Never go to **Blocked** from **Watch** or **Land**.' "an unattended run never waits on approval"
require_text 'gh pr checks <PR> --watch --fail-fast` as a background task' "the CI wait runs in the background"
reject_regex 'timeout 540' "no foreground CI wait sized to one tool call"
require_text 'If `gh pr merge` exits non-zero, go to **Bail-out**' "a refused merge hands the PR back"
reject_regex 'search "head:' "Watch filters branches locally, not by fuzzy search"

# Dry run 2 findings (#1708, #1710)
# Land's review took 24 minutes; a foreground subagent froze the watcher.
require_text 'with `subagent_type: general-purpose`, `model: opus`, `run_in_background: true`' "Land's review runs in the background"
require_text 'A review interrupted by a restart leaves staged changes' "a restarted Land discards a dead review's changes"
# Another agent session answered a thread without the marker, and the watcher
# treated its reply as the human's.
require_text 'it does not contain the Claude Code footer' "an unmarked agent reply is not the human's"
# Rich accepted three bail-out findings as follow-ups; the next Land must not
# bail on them again, and must learn that from GitHub, not local state.
require_text 'Findings listed under the PR body'"'"'s `## Found on the way, not fixed here` are accepted' "Land's review skips accepted findings"
require_text 'asks for findings as follow-ups' "Review files follow-ups when the human asks"
require_text 'To accept a finding instead, ask for it as a follow-up.' "bail-out says how to accept a finding"
# A bail-out on findings threw away a verified simplification that the next
# Land then had to redo.
require_text 'keep verified simplifications' "a bail-out on findings keeps verified simplifications"
# A squash merge leaves no ancestry, so reclaim compares head SHAs.
require_text 'equals the PR'"'"'s `headRefOid`' "reclaim matches a squash-merged branch by head SHA"
reject_regex 'and `git log origin/[^`]*` prints nothing' "reclaim never gates on ancestry"

# Skill-graph review: nothing independent checked the acceptance criteria or
# the whole diff before the human saw the PR, and the walkthrough's Fix step
# had the delegator writing production code after tdd-guardian had run.
require_text 'The implementer'"'"'s returns are claims, not evidence.' "the implementer's own report is not the evidence"
require_text 'loads `acceptance-review`' "acceptance criteria are checked independently"
require_text 'The project'"'"'s whole-PR review agent' "the whole diff is reviewed before the PR opens"
require_text 'do **not** run its Fix step' "the delegator never applies walkthrough fixes itself"
require_text 'Then re-run `tdd-guardian` and every check that reported a blocking finding.' "the repair round is re-checked"
require_text 'edit this comment to change them, then react' "derived acceptance criteria wait for the human"
require_text 'including any glossary or vocabulary check' "the gate's glossary step is not dropped"
reject_regex 'gate'"'"'s steps 1–5' "the pre-PR gate is not truncated"

# Second pass on the skill-graph changes: a waiting issue must not be
# re-posted or jam Pick, only the human's own reaction confirms, the repair
# round refreshes the gate evidence, and the verdict words match the checkers.
require_text 'post nothing, and stop' "a waiting issue is never re-posted"
require_text 'Take the first issue that is not waiting on the human' "Pick skips issues waiting on the human"
require_text '`gh api user -q .login`' "only the authenticated login's reaction confirms"
require_text 'does not rate `Covered`' "acceptance verdicts use acceptance-review's statuses"
require_text 'rated Critical or High Priority' "whole-diff severity uses pr-reviewer's scale"
require_text 'returns (a)–(f) afresh' "the repair round refreshes the gate evidence"
require_text 'wait for it to exit' "the implementer waits for the background suite"
require_text 'On every path out of this step except **Blocked**' "the UX walkthrough section is written with or without a repair"
require_text 'the PR already exists, so **Blocked** does not apply' "a human-started Review never opens a second PR"

WALKTHROUGH="$REPO_ROOT/claude/.claude/skills/browser-ux-walkthrough/SKILL.md"
if grep -Fq -- 'A caller that must not write production code' "$WALKTHROUGH"; then
  pass "the walkthrough lets a no-code caller skip its Fix step"
else
  fail "the walkthrough lets a no-code caller skip its Fix step"
fi

echo ""

if [ "$FAILURES" -gt 0 ]; then
  echo -e "${RED}$FAILURES test(s) failed${NC}"
  exit 1
fi

echo -e "${GREEN}All tests passed${NC}"
