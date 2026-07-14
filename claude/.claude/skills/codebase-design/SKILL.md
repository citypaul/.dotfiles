---
name: codebase-design
description: "Design and evaluate deep modules: cohesive responsibility behind a small, stable caller-facing contract, with information hiding, justified seams, explicit effects, dependency strategy, and behavior-focused tests. Use when designing or changing an in-process module or package contract, consolidating shallow pass-through modules, deciding what to hide, comparing alternative interfaces, or asking whether code should be combined or split for leverage and locality. For physical layout use structure-codebase; for public compatibility use api-design; for a repository-wide scan use improve-codebase-architecture. For an already-selected whole-path requirement to support a calibrated net-mechanism-reduction claim, use reduce-system-complexity."
---

# Codebase Design

Design coherent **deep modules**: substantial, related behavior and design decisions hidden behind a small, stable caller-facing contract. Optimize for **leverage** for callers and **locality** for maintainers without creating a god module.

Use this skill for logical responsibility and contract shape. Use `structure-codebase` for physical paths, packages, exports, dependency direction, enforcement, and folder migration. Use `reduce-system-complexity` when the selected objective is an evidence-backed net-reduction claim over whole-path mechanism rather than a deeper contract. Use `evaluate-existing-solutions` for a consequential unresolved library, tool, application, service, framework, or platform choice.

When `improve-codebase-architecture` loads this skill during an unselected audit, use only its vocabulary, principles, evidence tests, and thin-edge safeguards. Do not run the contract-design workflow or propose an exact interface until the user selects a candidate.

Read the relevant reference before proposing a consequential design:

- Read [`references/deepening.md`](references/deepening.md) when consolidating existing modules, classifying dependencies, or planning a safe deepening migration.
- Read [`references/design-it-twice.md`](references/design-it-twice.md) when a new or changed contract is expensive to reverse or several credible shapes exist.
- Read [`references/source-notes.md`](references/source-notes.md) when explaining provenance or comparing this adaptation with its sources.

## Vocabulary

| Term | Meaning |
|------|---------|
| **Module** | A cohesive unit with an implementation and one or more role-shaped caller contracts: a function, object, package, or capability. Scale alone does not make it a module. |
| **Interface / public contract** | Everything a caller must know to use the module correctly: operations, types, invariants, errors, ordering, configuration, lifecycle, effects, and relevant performance characteristics. This is broader than a TypeScript `interface` or a type signature. |
| **Implementation** | The decisions and behavior hidden behind the caller-facing contract. Private functions may be small and numerous without becoming public modules. |
| **Depth** | How much coherent capability and decision-making a caller gains for the contract burden it must learn. Do not measure depth by lines of code. |
| **Leverage** | The caller benefit of depth: one learned contract applies useful behavior consistently across many scenarios. |
| **Locality** | The maintainer benefit of depth: related knowledge, changes, bugs, and verification concentrate in one owner. |
| **Seam** | Per Michael Feathers, a place where behavior can be changed without editing at that place; every seam has an enabling point. Not every module contract is a seam. |
| **Adapter** | A concrete translator or implementation selected at a seam. In hexagonal architecture, retain that skill's driving, driven, and test-interactor distinctions. |

Use these terms to disambiguate, not to erase useful established vocabulary. `API`, `component`, `service`, `signature`, `boundary`, `port`, and `bounded context` remain valid when they name those specific concepts.

## Design Principles

### Hide decisions, not merely code

Place a responsibility behind a module when callers should not each know its policy, sequencing, representation, error recovery, or provider mechanics. A private helper extraction does not deepen a module if the same knowledge still leaks through its parameters and call order.

### Keep depth cohesive

A tiny contract over an incoherent implementation is a god module, not a good deep module. Combine behavior only when it shares meaning, invariants, ownership, lifecycle, or a real axis of change. Preserve separate modules when they evolve, fail, deploy, or authorize independently.

### Apply the behavior-preserving inlining test

Imagine inlining the module into every caller while preserving behavior:

- If policy, sequencing, error handling, or representation knowledge spreads across callers, the module earns its place.
- If callers become simpler because a pass-through disappears and no knowledge is duplicated, the module is shallow or misplaced.

This is the useful form of the deletion test. Do not imagine deleting the behavior itself.

### Pull complexity downward deliberately

Make the common call simple. Accept complexity inside the implementation when doing so removes configuration, ordering, special cases, or provider knowledge from callers. Keep effects, failure modes, resource ownership, and performance costs explicit enough that callers can use the module safely.

### Justify seams with evidence

Create a seam for a concrete need: substitution, independent testing, volatility isolation, ownership, trust, runtime failure, or deployment. Adapter count is evidence, not a rule. A production adapter plus a faithful test interactor may justify a seam; two accidental wrappers do not.

### Test at the stable contract

Make caller-observable behavior the primary test surface. Do not export private helpers or expose internal seams solely to test them. A private subsystem may have focused tests when it is itself a coherent module or when an algorithm needs precise failure localization; those tests must not freeze incidental orchestration.

### Preserve intentionally thin edges

Do not diagnose a route leaf, CLI command, adapter, generated client, or composition root as shallow merely because it is thin. Translation and wiring should often be thin. Judge whether policy is hidden in the correct inside module and whether the edge leaks provider or transport knowledge across its contract.

## Workflow

### 1. Define the job and callers

State the behavior the module owns, its current and expected callers, the common case, and what must remain outside. Read project instructions, architecture decisions, glossary conventions, and relevant tests before naming anything new.

### 2. Inventory the full contract burden

List what each caller must know today:

- operations and data shapes;
- invariants and preconditions;
- call ordering and lifecycle;
- configuration and dependency construction;
- errors, retries, partial failure, and effects;
- latency, throughput, consistency, and transaction expectations.

Do not confuse a short type signature with a small interface.

### 3. Map hidden and leaked knowledge

Trace callers and collaborators. Identify duplicated decisions, pass-through chains, provider types, repeated orchestration, co-changing files, and tests that must reconstruct internals. Record counterevidence: independent ownership, different failure domains, or callers that genuinely need separate policy.

### 4. Choose responsibility before the seam

Write one sentence defining the module's coherent responsibility. Decide what knowledge belongs behind it. Only then place seams and select dependency strategies. Read `references/deepening.md` for existing clusters.

When a material generic dependency or subsystem is not already prescribed, feed this responsibility, caller scenarios, effects, and constraints into `evaluate-existing-solutions` before finalizing a dependency-shaped contract. Keep the chosen provider or library behind local application language when doing so preserves a useful change boundary; do not wrap every stable primitive by reflex or copy a vendor API into the module contract.

### 5. Design the contract from use scenarios

Design from representative caller examples, including invalid input, partial failure, cancellation, retries, and lifecycle where relevant. Specify types, invariants, ordering, errors, effects, and performance expectations—not methods alone.

For consequential choices, read `references/design-it-twice.md` and compare genuinely different designs before recommending one.

### 6. Test the depth claim

Ask:

- Does the common caller learn less and coordinate less?
- Did implementation knowledge move behind the contract, or merely change names?
- Would a policy change concentrate here rather than fan out?
- Are effects and failures still honest?
- Can behavior be tested through the contract with faithful dependencies?
- Did the design avoid speculative flexibility and a generic command-shaped god interface?

### 7. Route delivery to the owning skills

- Use `api-design` for public HTTP, reusable consumer-facing component props, cross-team, or externally versioned contract semantics.
- Use `structure-codebase` for file/package placement and mechanical dependency enforcement.
- Use `reduce-system-complexity` when the accepted outcome must remove total branches, states, dependencies, layers, or operational moving parts rather than only improve caller leverage.
- Use `evaluate-existing-solutions` when a material generic implementation choice remains unresolved after the responsibility and constraints are known.
- Use `hexagonal-architecture` only for an opted-in ports-and-adapters system with purposeful actor conversations.
- Use `finding-seams` when existing hard-coded dependencies block a test harness.
- Use `characterisation-tests` before restructuring untested behavior.
- Use `tdd`, `testing`, `mutation-testing`, and `refactoring` for implementation according to whether behavior changes and whether the safety net is trustworthy.
- Use `ubiquitous-language` when a domain term must be proposed or changed; never coin it silently.

## Design Output

Produce:

1. The module's one-sentence responsibility and explicit exclusions.
2. Callers and representative usage scenarios.
3. The complete proposed contract, including non-type obligations.
4. Knowledge and behavior hidden behind it.
5. Dependencies, seams, adapters or test interactors, and their fidelity strategy.
6. Alternatives considered and why the recommendation wins.
7. Compatibility and incremental migration constraints.
8. Behavior tests that should survive implementation changes.
9. Assumptions, risks, and evidence still needed.

## Completion Check

- Is the contract simpler than the coherent behavior it provides?
- Does it hide decisions rather than expose orchestration knobs?
- Is the common case obvious without making uncommon cases impossible?
- Are cohesion, ownership, failure, and runtime boundaries still honest?
- Are seams justified by real variation or isolation needs?
- Can callers and behavior tests use the same stable contract?
- Are thin edges still thin and policy-free?
- Does every compatibility or migration claim have a verification path?

## Attribution

Adapted from Matt Pocock's MIT-licensed `codebase-design` skill and linked resources, with deep-module and Design It Twice concepts credited to John Ousterhout and seam terminology credited to Michael Feathers. See [`references/source-notes.md`](references/source-notes.md) and [`LICENSE`](LICENSE) for pinned provenance and license terms.
