# Deepening Existing Modules

Use this reference after identifying a coherent cluster of behavior that may deserve a deeper caller-facing contract. Deepening is not synonymous with merging files, adding a facade, or making a package larger.

## Contents

1. Evidence for and against deepening
2. Dependency and fidelity questions
3. Seam strategies
4. Safe migration
5. Verification

## Evidence For and Against Deepening

Strong signals include:

- Several callers repeat the same policy, sequencing, validation, recovery, or mapping.
- Understanding one behavior requires bouncing through a chain of pass-through modules.
- A representation or provider detail appears in otherwise unrelated callers.
- Configuration or call ordering is wide enough that callers routinely get it wrong.
- A change to one business rule causes shotgun edits across several owners.
- Tests reconstruct private orchestration, mock long interaction chains, or expose helpers purely for access.
- Files repeatedly co-change because they implement one responsibility whose ownership is split.

Counter-signals include:

- Similar code represents different knowledge and will evolve independently.
- Separate security, trust, deployment, transaction, latency, or failure boundaries are real.
- An edge module is intentionally translating, wiring, or hosting framework discovery.
- The behavior is small, stable, obvious, and has one caller; another abstraction would add vocabulary without hiding decisions.
- The design serves only a hypothetical future variant.
- Consolidation would create a generic dispatcher, manager, or options object that exposes every internal decision.

Treat source churn as one signal. Filter generated files and combine it with co-change, defects, ownership, caller burden, tests, dependency direction, and runtime risk.

## Dependency and Fidelity Questions

Do not classify a dependency on one axis alone. Record each of these:

| Question | Why it matters |
|----------|----------------|
| In-process or out-of-process? | Determines latency, serialization, cancellation, and partial-failure semantics. |
| Owned, jointly owned, or third-party? | Determines who may change the contract and how quickly. |
| Same or different trust/authorization boundary? | Determines validation and identity obligations. |
| Same transaction and consistency boundary? | Determines whether atomicity is possible or compensation is needed. |
| Stable or volatile mechanism? | Determines whether isolating provider knowledge buys locality. |
| Stateful or resource-owning? | Determines lifecycle, concurrency, shutdown, and composition. |
| What real substitute exists? | Determines the fidelity of fast tests. |
| What can the substitute not prove? | Determines required contract, integration, sandbox, or end-to-end tests. |

An in-memory store does not prove SQL constraints or transaction behavior. A local emulator does not automatically prove provider quotas, ordering, timeouts, or authentication. State the fidelity gap.

## Seam Strategies

### In-process behavior

Keep cohesive policy behind the module contract. Do not add a seam merely because private functions exist. Add an internal seam only when behavior genuinely varies or a difficult dependency must be selected at an enabling point.

### Local resource under application control

Prefer a real local implementation or high-fidelity stand-in when practical. Inject the owned resource, transaction, clock, or configured operation at construction when it is stable across calls; avoid making every caller pass dependencies that do not vary per operation.

Test module behavior against the local resource, then cover provider-specific semantics with integration tests.

### Owned remote capability

When an out-of-process collaborator is a purposeful application dependency, define the required contract in application language. Keep transport, serialization, authentication, retry, and telemetry in an adapter. Use a deterministic test interactor or fake for application scenarios and a contract suite against the real transport adapter.

Do not call every internal HTTP client a port. Load `hexagonal-architecture` when the project explicitly adopts that model.

### Third-party capability

Put a narrow anti-corruption adapter around the provider. Keep provider types and error codes from spreading through the module's contract. Use deterministic fakes for application policy, then close the fidelity gap with provider sandbox, recorded-contract, or integration tests where available. Prefer behavior fakes to interaction-heavy mocks.

### Nondeterministic capability

Treat time, randomness, identifiers, environment, and scheduling as dependencies only where control changes observable behavior. Select them once in composition when possible. Do not force callers to supply them on every call solely for test access.

## Safe Migration

1. **Fix the review target.** Name the behavior being preserved and the callers in scope. Do not combine unrelated feature changes with the deepening.
2. **Establish safety.** Use existing behavior tests. If behavior is untested, load `finding-seams` only as needed, then `characterisation-tests` and mutation-test the paths that will move.
3. **Define the target contract.** Specify observable behavior, errors, effects, performance, and compatibility. Test it through representative caller scenarios.
4. **Move one decision at a time.** Pull duplicated policy, ordering, mapping, or recovery behind the target contract in small known-good slices.
5. **Use a temporary compatibility facade only when required.** State which consumers need it and the exact removal condition. Do not count the facade itself as architectural depth.
6. **Retire redundancy after equivalence is proven.** Remove old modules and their implementation-shaped tests only when the new behavior surface covers the same risk and mutation testing confirms protection. Keep distinct adapter contract and algorithm tests that still add evidence.
7. **Enforce the new ownership.** Use `structure-codebase` for exports, imports, package roles, and physical moves. Block new bypass imports before removing the last legacy path.
8. **Record a durable decision when warranted.** Use the project's ADR mechanism for a long-lived seam, compatibility constraint, or rejected alternative—not for an ephemeral cleanup preference.

## Verification

- Caller setup, sequencing, and provider knowledge decreased.
- Duplicated policy has one explicit owner.
- The new contract exposes no private collaborator graph.
- Failure, consistency, authorization, and lifecycle semantics remain correct.
- Compatibility paths are temporary and measurable.
- Behavior tests survive internal restructuring.
- Contract/integration tests cover the known fidelity gaps.
- Dependency and package rules prevent the old leakage from returning.
- Performance and operability are measured where the new module changes either.
