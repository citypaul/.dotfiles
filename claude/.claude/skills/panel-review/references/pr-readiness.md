# PR Readiness — Change-Path Evidence and the Freshness Model

The rulebook for the built-in `readiness` lens. It serves two moments with one standard: **reviewing** a PR (does the boundary show this evidence?) and **preparing** one (agent-led PR creation runs this same gate before `gh pr create`). This distribution deliberately has no `/pr` command — creating the PR is ordinary agent work; this gate is what makes it ready.

## 1. Classify every changed path

Classify each changed path by every applicable type — behavior, refactor, reduction, docs, dependency, generated, configuration, CI, operations; mixed PRs may use several. Each path shows the evidence its claimed types own:

- **Behavior change** — test-first evidence: RED before GREEN for new or changed observable behavior, with behavior-focused tests at the layer the claim names.
- **Pure refactor** — a passing preservation baseline before the restructuring, behaviorally green throughout; no fabricated structural RED tests.
- **Reduction transition** — links its program, terminal slice, and conserved contract; passes the behavior gate and independent verification; records owner/removal/bounded-lifetime metadata for any temporary bridge (`N/A` when none); states `mechanism gate: pending — no net-reduction claim`.
- **Terminal reduction** — links the reducer program/report/ledger (or `N/A — authorized single terminal slice`); passes both gates; discharges transition obligations; removes superseded machinery and expired bridges.
- **Docs, dependency, generated, configuration, CI, operations** — claim-appropriate evidence for that path (build passes, config exercised, dependency rationale) without fabricated mutation runs or structural RED tests.

Path types outside that responsibility omit the field — no ceremonial rows for gates a path type does not own. A path whose claimed type its diff contradicts — a "refactor" that changes observable behavior, a "docs" path touching production logic — fails this lens.

## 2. The end-of-boundary mutation gate

Mutation testing runs **once per review boundary**, not per increment. Once the current review boundary is otherwise PR-ready, one mutation result (or an explicit `N/A` with proportionate alternate evidence) must cover the accumulated scope:

- **The target repository's stricter mutation-evidence invalidation rule takes precedence.** Only when the repository defines no stricter rule does this distribution's default freshness model below apply.
- **Default freshness model:** treat a mutation result as stale only when mutation-relevant production files or applicable tests/evidence changed without being exercised by that result. Documentation- or release-metadata-only commits do not invalidate it, and neither do survivor-fix commits already exercised by the gate's final branch-diff rerun.
- **If a result is current under the applicable target-repository rule, do not rerun it.** If missing or stale, load `mutation-testing` and run it once, scoped to the accumulated branch diff per that skill's **Run and Triage** guidance — against the default branch for one PR, the immediate parent for a stacked boundary. Widen to a full-project run only for that skill's stated triggers. Focused survivor reruns and the final boundary-diff rerun stay inside this one gate.
- **`N/A` is legitimate** for unreachable, configuration, contract, integration, or operational changes — but it must be explicit and paired with proportionate reachability, configuration, contract, integration, or operational evidence, never silent.

When reviewing, the lens checks the PR *records* this: mutation results or an explicit `N/A` rationale, matching the claimed path. Do not demand the harness re-run per commit; the gate is once per boundary.

## 3. Project verification

- Stop every watcher and verify no watcher process remains; watch output is not evidence.
- **Run the repository-defined complete non-watch test gate against the final tree** — in a monorepo, every configured project and required integration/E2E suite, not an affected-only development subset.
- Applicable typecheck, lint, and build checks pass with zero errors; any unavailable check is recorded `N/A` with a reason.
- If the project uses DDD: new/changed types, functions, and test names conform to the project's glossary.

## 4. Boundary and topology

- The review boundary is the actual diff: default branch for an independent PR, the immediate parent for a stacked boundary (`git diff <parent>...HEAD`, never the cumulative trunk diff).
- Never create or review a PR from the repository's default branch itself.
- A dependent slice presented as stacked must actually be linked in the intended stack topology; a claimed-native-stack boundary that is unlinked is a readiness failure, not a footnote. Load `stack-pull-requests` for stack semantics.

## 5. What the PR body must show

Verification notes for every claimed change path — the evidence from §1 plus the boundary's mutation result or explicit `N/A` from §2. A body that asserts readiness without naming its evidence fails the lens with severity `major`; a body whose claims contradict the diff fails with `critical`.
