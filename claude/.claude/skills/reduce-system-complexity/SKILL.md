---
name: reduce-system-complexity
description: "Reduce total mechanism in a selected existing system or behavior path while conserving its agreed observable behavior and non-functional guarantees. Use when the user explicitly wants fewer branches, states, dependencies, layers, flags, retries, jobs, adapters, or operational moving parts and needs evidence that complexity was removed rather than relocated. Supports read-only diagnosis and authorized reduction slices. Not for routine cleanup, architecture-investment discovery, module-contract design, physical tree design, new behavior, functionality cuts, speculative rewrites, or Redux/functional reducer functions."
---

# Reduce System Complexity

Conserve behavior. Minimize mechanism.

Use this skill only after a concrete behavior path or subsystem has been selected and the intended result is **net removal of mechanism**. It owns the conservation ledger, whole-path mechanism accounting, first-principles minimum, and separate behavior and mechanism gates.

Keep it distinct from:

- `improve-codebase-architecture`, which discovers and ranks architecture investments;
- `codebase-design`, which designs a selected module's responsibility and complete caller-facing contract;
- `structure-codebase`, which owns physical placement, packages, imports, enforcement, and migrations;
- `refactoring`, which implements ordinary bounded behavior-preserving cleanup without a whole-path reduction claim;
- `functional` reducer functions, Redux reducers, and state-management choices.

Read [`references/ledger-template.md`](references/ledger-template.md) before producing a diagnosis or implementation report. Read [`references/source-notes.md`](references/source-notes.md) when explaining provenance or comparing this adaptation with its upstream source.

## Operating Contract

- Preserve the user's requested scope. Do not widen one path into a repository rewrite.
- Diagnosis is read-only. The report is the only default write; implementation needs explicit authority.
- Follow repository instructions, architecture decisions, glossaries, public contracts, and dirty-worktree constraints. Never destructively reset, checkout, or overwrite user or teammate changes.
- Treat the implementation, tests, traces, history, incidents, and operator knowledge as evidence. Do not inherit the current decomposition as the target, but do not ignore undocumented constraints discovered in it.
- Redact secrets, tokens, personal data, and production payloads from fixtures, traces, snapshots, and reports.
- Scale the ledgers to risk. A local flag removal does not need the ceremony of a distributed migration; a data, authorization, concurrency, compatibility, or external-effect change does.
- Call finite tests and observations **preservation evidence**, never proof of universal equivalence. State confidence and fidelity gaps.
- Default all provider, integration, migration, failover, rollback, publication, and operational checks to read-only or a disposable sandbox. Never write to a live external system without specific authority for that effect.

## Workflow

### 1. Fix scope, mode, and conserved contract

State:

- the selected entry points, outcomes, callers, data, integrations, and operational path;
- diagnosis or authorized implementation mode;
- what “less mechanism” means for this scope;
- excluded behavior and boundaries;
- irreversible effects or published contracts that constrain the work.

Classify observed behavior before promising to conserve it:

| Class | Treatment |
|---|---|
| Documented or accepted contract | Preserve unless the user authorizes a behavior change |
| Relied-upon observable behavior | Treat as compatibility-sensitive, even when undocumented |
| Intended and currently supported or observed behavior with credible evidence | Preserve and strengthen its oracle where needed; aspirational intent is a behavior change and returns to contract resolution plus `tdd` |
| Known bug or disputed behavior | Surface for a product/domain decision; do not silently preserve or fix it |
| Unreachable, obsolete, or speculative internals | Candidate for deletion only after reachability and consumer evidence |

Inventory outputs, effects, errors, ordering, persistence, integrations, authorization, security, privacy, reliability, resource budgets, compatibility, concurrency, retries, migrations, and recovery behavior. Record each in the behavior-and-guarantee ledger with its evidence and gaps.

Characterisation tests reveal what the code does; they do not decide what it ought to do. During diagnosis, record missing oracles without editing. If implementation and test-harness work are separately authorized, load `characterisation-tests` and `finding-seams` when current behavior lacks a usable oracle. Load `testing` for behavior-level oracle design and `mutation-testing` where applicable to check whether affected executable oracles detect relevant regressions.

Mutation testing is not meaningful for every proven-unreachable path, configuration-only change, generated boundary, or operational mechanism. Mark it `N/A` with reachability, configuration, contract, integration, or operational evidence instead. Never invent structural mutants or fake RED to satisfy the workflow.

Implementation remains diagnosis while any material behavior the proposed slice can affect has an unresolved evidence gap.

### 2. Baseline the whole mechanism

Trace each conserved behavior from trigger to outcome and recovery. Inventory applicable mechanism dimensions with the same scope and counting method that will be used afterward:

- **Control** — decisions, conditions, ordering, error, retry, fallback, and recovery paths. Cyclomatic complexity may be one local signal, not a cross-system total.
- **State and time** — states, transitions, mutable owners, caches, queues, tasks, callbacks, locks, synchronization points, and lifecycle phases.
- **Structure** — modules, representations, layers, hops, internal and external dependencies, cycles, adapters, and translations.
- **Variability and operations** — flags, modes, configuration, extension points, deployables, jobs, migrations, monitors, runbooks, and failure handling.

Include tests and operational machinery when they impose ongoing ownership cost. Exclude generated artifacts unless their source, build, or runtime mechanism changes. Mark irrelevant dimensions `N/A`.

Do not combine unlike counts into a synthetic score. A smaller function, directory, or diff is not a reduction when callers, operators, dependencies, or recovery paths inherit the removed burden.

### 3. Derive a minimum from constraints

Answer independently of the current shape:

1. Which outcomes and non-functional guarantees must exist?
2. Which domain decisions and external constraints are irreducible?
3. Which boundaries are fixed, and who must own state, time, failure, and recovery?
4. What is the shortest coherent path from trigger to observable outcome?

Sketch the minimum plausible mechanism and name the constraint that earns every remaining part. Seek leverage in this order:

1. Delete proven-obsolete paths, options, flags, configuration, fallbacks, and speculative machinery.
2. Unify duplicated policy, representation, state, and ownership.
3. Shrink decision and state spaces.
4. Remove pass-through layers, translation chains, temporal hops, and coordination.
5. Replace custom machinery with an established primitive only when total lifecycle and operational cost fall; use `evaluate-existing-solutions` for a consequential dependency or tool choice.

Reject proposals that merely rename, split, wrap, relocate, or conceal complexity. A deeper module may improve callers while retaining or increasing internal mechanism; that is a valid `codebase-design` outcome but not, by itself, a successful reduction.

### 4. Select a complete reduction

Rank candidates qualitatively:

1. Prefer removal of one complete mechanism over partial hiding.
2. Prefer stronger preservation evidence and fewer fidelity gaps.
3. Use smaller blast radius and easier recovery as tie-breakers.

For the selected candidate, record:

- the exact mechanism and conserved behaviors;
- objective before/target observations per applicable dimension;
- affected callers, data, integrations, operations, and public contracts;
- missing oracles and other proof obligations;
- rollout, observability, compatibility, data migration, and recovery needs;
- the terminal state in which old machinery is gone.
- for a multi-slice program, the plan/ledger identity, terminal slice, and class of each slice: reduction transition or terminal reduction.

Prefer a small reversible slice. When reversal is impossible or unsafe, define a guarded forward-recovery path before implementation. Expand/contract migrations may temporarily add a bridge, flag, dual write, or compatibility shim; give each one an owner, removal condition, and bounded lifetime. Record `N/A` when a transition introduces no temporary bridge. Do not claim reduction until the terminal state removes the superseded mechanism.

Diagnosis stops here and produces the report. If multiple delivery slices are needed, use `planning` after the complete reduction and gates are defined.

### 5. Reduce through the REFACTOR path

Only continue with implementation when authorized.

Classify the authorized slice before editing:

- **Reduction transition** — an independently verifiable program increment that preserves the conserved contract but may temporarily leave or add mechanism. It references the plan/ledger and terminal slice, records owner/removal/bounded-lifetime metadata for any bridge (`N/A` when none), and keeps `mechanism gate: pending — no net-reduction claim`.
- **Terminal reduction** — the slice that removes the superseded mechanism and expired bridges. It references the program/ledger and discharges prior transition obligations, or records `N/A — authorized single terminal slice`. It may claim net reduction only after both gates pass.

A transition can be a safe mergeable increment while the **program** remains unfinished. Do not describe it as a completed reduction or let it lose the reducer ledger merely because its own mechanism gate is pending.

A behavior-preserving reduction begins from passing behavior oracles whose strength is mutation-checked where applicable, or from proportionate reachability, configuration, contract, integration, and operational evidence where mutation testing is not meaningful. It is a REFACTOR path, not a reason to fabricate a failing test that asserts branch, layer, state, or dependency counts. If the desired outcome changes observable behavior or fixes a disputed bug, stop this workflow, resolve the intended contract, and use `tdd` for the behavior change.

For each safe slice:

1. Record the pre-slice state and run affected behavior, type, build, integration, and operational checks.
2. Identify database, queue, deployment, message, authorization, concurrency, and other irreversible effects before editing.
3. Make the smallest coherent change that advances the complete reduction.
4. Preserve behavior-facing tests. Retire implementation-shaped tests only after equivalent behavioral coverage plus mutation evidence where meaningful, or reviewed proportionate alternate evidence when mutation is not meaningful.
5. Run focused checks immediately, then the broader relevant suite and provider/contract checks where mocks cannot establish fidelity. Keep provider checks read-only or sandboxed unless explicit authority covers the exact live effects; never perform live migrations, failover, rollback, publication, or external writes by implication.
6. Remove superseded code, dependencies, flags, state, configuration, tests of discarded internals, and temporary bridges whose removal condition is met.
7. Re-read the full path, including callers, operations, failure, and recovery.

If evidence fails or a new affected behavior appears, stop. Recover only edits and effects owned by this slice, without destroying unrelated work. Never use modified behavior as the pre-change baseline.

### 6. Apply class-specific gates

**Behavior gate**

- Every affected ledger entry has passing preservation evidence at the required fidelity.
- Outcomes, effects, errors, ordering, boundaries, and non-functional constraints remain within the agreed contract.
- Boundary cases implied by each removed decision, state, dependency, or fallback have been exercised where reachable and meaningful; otherwise explicit reachability, configuration, contract, integration, or operational evidence covers the claim.
- Remaining uncertainty and untested provider behavior are explicit.

**Mechanism gate**

- Recount the same dimensions over the same scope and method.
- Map every newly introduced part to the old mechanism it replaces or the essential constraint it serves.
- Inspect callers, adapters, operations, deployment, and recovery for exported burden.
- Confirm the superseded mechanism and expired migration bridges are gone.
- Confirm total lifecycle ownership fell. A net-neutral or merely displaced terminal result fails; a transition-only result keeps this gate pending and means the program, not necessarily the mergeable slice, is unfinished.

For a **reduction transition**, the behavior gate and independent slice verification must pass, while the mechanism gate remains explicitly pending and no net-reduction claim is allowed. For a **terminal reduction**, both gates must pass before claiming realized reduction.

## Report

Write a fresh Markdown report using [`references/ledger-template.md`](references/ledger-template.md). Default to a timestamped file in the OS temporary directory so diagnosis does not dirty the repository. Use a durable project path only when requested or already established by the project.

For diagnosis, report proposed reductions, target deltas, evidence gaps, risks, and the next decision. Claim neither equivalence nor realized reduction.

For a reduction transition, lead with the conserved contract and program/terminal-slice link; show `behavior gate: pass`, independent verification, mutation results or explicit `N/A` alternate evidence, any bridge ownership/removal metadata (`N/A` when none), and `mechanism gate: pending — no net-reduction claim`.

For a terminal reduction, lead with the program/ledger link (or `N/A — authorized single terminal slice`), conserved contract, and removed mechanism; show like-for-like before/after evidence, list all verification performed, confirm prior transition obligations and expired bridges are discharged, and disclose remaining fidelity gaps or essential complexity.

## Completion Check

- Was a concrete system or behavior path selected before this workflow began?
- Are documented, relied-upon, intended, disputed, and obsolete behaviors distinguished?
- Does every affected guarantee have proportionate preservation evidence or an explicit blocking gap?
- Does the baseline include callers and operational machinery, not only edited files?
- Is the minimum derived from real constraints rather than fashionable shape?
- Does the terminal state remove mechanism rather than move or hide it?
- Is every implementation artifact classified as a reduction transition or terminal reduction, with the program and terminal slice linked?
- Are temporary migration mechanisms owned, bounded, and scheduled for removal, or explicitly `N/A` when none exist?
- Were behavior and mechanism gates evaluated separately?
- Does a transition keep the mechanism gate pending without a net-reduction claim, while only a terminal reduction claims both gates passed?
- Are claims calibrated to the evidence?

## Attribution

Adapted from Adam Bulmer's MIT-licensed `reducer` skill. The local version narrows and renames the trigger, replaces false-precision ranking with qualitative evidence, integrates the surrounding testing and architecture skills, and adds implementation, migration, privacy, and dirty-worktree safeguards. See [`references/source-notes.md`](references/source-notes.md) and [`LICENSE`](LICENSE) for pinned provenance and license terms.
