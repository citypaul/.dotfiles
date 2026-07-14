# Reduction Evidence Template

Use only the sections proportionate to the selected scope and risk. Mark unknowns honestly; do not turn missing evidence into a confident claim.

## Scope and mode

- **Target:**
- **Mode:** diagnosis / authorized implementation
- **Artifact class:** diagnosis / reduction transition / terminal reduction
- **Reduction program or plan:** `N/A` for a single terminal slice; otherwise link/name
- **Terminal slice:** `N/A` for diagnosis without a selected program; otherwise name the slice that removes the old mechanism and expired bridges
- **Entry points and outcomes:**
- **Included callers, data, integrations, and operations:**
- **Excluded scope:**
- **Desired mechanism reduction:**
- **Irreversible effects or fixed contracts:**

## Behavior and guarantee ledger

| Behavior or guarantee | Class | Trigger | Outcome and effects | Boundary | Preservation evidence | Fidelity or gap |
|---|---|---|---|---|---|---|

Classify each entry as documented contract, relied-upon observable behavior, intended and currently supported/observed behavior, known/disputed bug, or obsolete/speculative internal behavior. Aspirational intent belongs to a behavior-change decision, not the preservation baseline.

## Whole-mechanism baseline

| Mechanism | Behavior served | Owner | Dimension | Observable cost | Essential constraint | Evidence | Proposed disposition |
|---|---|---|---|---|---|---|---|

Record like-for-like observations for each applicable dimension:

| Dimension | Before | Target or after | Counting method | Evidence |
|---|---|---|---|---|
| Control | | | | |
| State and time | | | | |
| Structure | | | | |
| Variability and operations | | | | |

Do not aggregate these rows into a single score.

## Minimum-mechanism sketch

- **Required outcomes and guarantees:**
- **Irreducible domain decisions:**
- **Fixed external constraints:**
- **State, time, failure, and recovery owners:**
- **Shortest coherent trigger-to-outcome path:**
- **Why each remaining mechanism is earned:**

## Selected reduction program or terminal result

- **Mechanism targeted for removal:**
- **Terminal removal result:** pending transition / removed terminally, with evidence
- **Affected ledger entries:**
- **Why it is complete rather than displaced:** `N/A — transition pending` until the terminal slice
- **Expected same-scope delta:**
- **Preservation obligations:**
- **Provider or integration fidelity checks:**
- **Rollout and observability:**
- **Rollback or guarded forward recovery:**
- **Terminal state:**

| Temporary bridge | Why needed | Owner | Removal condition | Latest acceptable removal point |
|---|---|---|---|---|

Write `N/A — no temporary bridge` when the program has none.

## Slice evidence

| Slice | Class | Terminal slice | Pre-checks | Change | Independent/focused checks | Broader checks | Bridge owner/removal condition | Gate state | Result |
|---|---|---|---|---|---|---|---|---|---|

For a transition, record `behavior gate: pass` and `mechanism gate: pending — no net-reduction claim`. For the terminal slice, record the final passing behavior and mechanism gate results.

## Gate decision

### Behavior gate

- **Result:** pass / fail / blocked / not yet run
- **Evidence:**
- **Fidelity gaps:**

### Mechanism gate

- **Result:** pass / fail / blocked / pending transition — no net-reduction claim / not yet run
- **Same-scope before/after delta:**
- **Exported burden check:**
- **Old mechanism and bridge removal:**

## Conclusion

For diagnosis, state the recommended next decision without claiming realized reduction or equivalence.

For a reduction transition, state the linked terminal slice, passing behavior gate, independent verification, mutation results or explicit `N/A` alternate evidence, bridge owner/removal/bounded-lifetime metadata (`N/A` when none), and the pending mechanism gate without claiming realized reduction.

For a terminal reduction, claim realized reduction only when both gates pass and superseded machinery plus expired bridges are gone. List essential complexity retained, remaining uncertainty, and separately authorized follow-up work.
