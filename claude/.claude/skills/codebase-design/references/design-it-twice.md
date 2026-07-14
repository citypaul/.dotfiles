# Design It Twice

Use this process for a consequential module contract when the first plausible design may anchor the decision. Generate genuinely different shapes, exercise them with the same scenarios, and recommend one.

## 1. Frame the Decision

Write a short problem brief containing:

- the behavior and decisions that need one owner;
- current callers and their common and difficult scenarios;
- the full interface burden today;
- compatibility, runtime, ownership, trust, transaction, and performance constraints;
- dependencies and fidelity gaps from [`deepening.md`](deepening.md);
- behavior that must remain outside the module;
- project vocabulary and architecture decisions that designs must respect.

Include a small usage sketch only to make constraints concrete. Do not smuggle the preferred solution into the brief.

## 2. Generate Independent Alternatives

Use parallel sub-agents when isolated contexts are available and the decision justifies the cost. Give each the same evidence and a different optimization constraint. Do not give them the author's preferred answer.

Useful design constraints are:

1. **Minimum caller burden** — make the common case require the least knowledge and coordination.
2. **Policy locality** — concentrate the changing decisions and invariants in one coherent owner.
3. **Failure honesty** — make partial failure, cancellation, retries, and effects explicit without leaking the collaborator graph.
4. **Compatibility-first migration** — preserve existing callers while creating a clear path to remove the old contract.
5. **Role-shaped contracts** — when several actors have different purposes, keep each role narrow without building a generic god interface.

Select two or three constraints that produce meaningfully different designs. Add another only when it explores a real architecture choice. “More flexible” is not a useful constraint unless current requirements name the needed variation.

Each alternative must provide:

1. The full contract: types, operations, invariants, ordering, errors, effects, lifecycle, and relevant performance obligations.
2. Usage examples for the same common, failure, and edge scenarios.
3. Decisions and implementation details hidden from callers.
4. Dependencies, seams, enabling points, adapters or test interactors, and fidelity strategy.
5. Compatibility and migration approach.
6. Behavior test surface.
7. Where leverage and locality improve, and where interface burden remains.
8. The strongest argument against the design.

## 3. Compare Against the Same Scenarios

Use one comparison table. Do not compare one design's happy path with another's hardest case.

| Dimension | Questions |
|-----------|-----------|
| Caller burden | What must the common caller know, construct, order, and recover from? |
| Depth | How much coherent behavior sits behind that burden? |
| Locality | Where will the next policy or provider change land? |
| Cohesion | Does the implementation own one responsibility, or merely hide unrelated work? |
| Failure honesty | Are effects, partial failure, retries, and cancellation explicit at the right level? |
| Dependency fidelity | What do fast tests prove, and what needs contract or integration evidence? |
| Compatibility | Which callers break, which adapter/facade is temporary, and when can it be removed? |
| Evolvability | Does the design support named current variation without exposing speculative knobs? |
| Enforceability | Can exports, imports, types, and architecture tests protect the intended ownership? |

Reject a design that wins by hiding important failure or performance costs. Reject a design that turns every operation into a generic command or an enormous options object.

## 4. Recommend, Do Not Average

Choose the strongest design and explain why it wins for the evidence at hand. Combine elements only when their responsibilities are compatible; do not average several contracts into a wider hybrid.

State:

- the recommendation;
- the decisive evidence;
- the trade-off deliberately accepted;
- the runner-up and when it would become preferable;
- the next uncertainty to test with a spike, characterization test, or caller prototype.

For a genuinely unresolved trade-off, present the competing arguments and request a human decision. Do not disguise uncertainty as consensus.
