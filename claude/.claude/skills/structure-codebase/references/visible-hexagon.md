# Visible Hexagonal Backends

Use this reference when a backend explicitly adopts ports and adapters. The objective is not to draw a hexagon in the filesystem; it is to make the real inside/outside test wall immediately visible and mechanically true.

## Contents

1. Boundary semantics
2. Monorepo target
3. Single-package target
4. Featureful interiors
5. Ports and adapters
6. Testing boundary
7. DDD and read models
8. Earned exceptions

## Boundary Semantics

| Role | Meaning | May know about |
|------|---------|----------------|
| Domain policy | Pure business rules and business state transitions | Domain language and provider-free libraries |
| Application policy | Provider-free orchestration and decisions through owned ports | Domain policy and port contracts |
| Driving port | Application capability offered to an actor | Application/domain types |
| Driven port | Capability the application requires from an actor | Application/domain types |
| Driving adapter | Translates an external trigger into a driving-port call | Transport/framework and inside public API |
| Driven adapter | Implements a driven port using a concrete technology | Provider SDK and inside public contract |
| Test interactor | Drives or substitutes at a port | Test framework and inside public contract |
| Composition root | Selects concrete players and owns their lifecycle | All production roles for that executable |

“Inside is pure” needs precision. Domain computation should be pure. Application orchestration may call injected ports, so it can describe effects, but it performs no concrete I/O and remains runnable in-process with test interactors. Enforce provider independence, not a blanket ban on useful computation libraries.

Ports are inside because the application owns their protocols. Adapters and test actors are outside because they conform to those protocols.

## Monorepo Target

Use grouping directories for visual meaning and leaf packages for enforcement:

```text
packages/
└── ordering/                              # capability grouping directory
    ├── hexagon/                           # INSIDE grouping directory
    │   ├── domain/                        # workspace package
    │   │   ├── package.json
    │   │   └── src/
    │   │       ├── orders/
    │   │       ├── credit-approval/
    │   │       └── allocation/
    │   └── application/                   # workspace package
    │       ├── package.json
    │       └── src/
    │           ├── approve-order/
    │           ├── authorize-credit/
    │           ├── allocate-stock/
    │           └── ports/
    │               ├── driving/
    │               └── driven/
    ├── adapters/                          # OUTSIDE grouping directory
    │   ├── driving/
    │   │   ├── http/                      # workspace package
    │   │   ├── kafka/                     # workspace package
    │   │   └── reconciliation-cli/        # workspace package
    │   └── driven/
    │       ├── event-store-postgres/      # workspace package
    │       ├── payments-adyen/             # workspace package
    │       └── carrier-api/               # workspace package
    └── testing/
        ├── application-test-adapters/      # reusable fakes
        └── event-store-contract/           # adapter contract suite
```

`ordering/`, `hexagon/`, `adapters/`, `driving/`, `driven/`, and `testing/` are grouping directories. The leaves containing `package.json` are the enforceable packages. Keep existing package names and public exports stable during a physical reparenting when possible.

Separate `domain` and `application` packages only when their dependency direction and different purity obligations matter. A cohesive alternative is valid:

```text
ordering/
└── hexagon/
    └── order-management/                  # one inside workspace package
        └── src/
            ├── orders/
            ├── approve-order/
            ├── allocate-stock/
            └── ports/
```

Do not split every use case into a package. Packages enforce boundaries; folders organize cohesion.

## Single-Package Target

When a project is deliberately one package, use paths plus automated import rules:

```text
src/
├── hexagon/                               # INSIDE
│   ├── orders/
│   │   ├── model/
│   │   ├── approve-order/
│   │   └── ports/
│   │       ├── driving/
│   │       └── driven/
│   └── allocation/
├── adapters/                              # OUTSIDE
│   ├── driving/
│   │   ├── http/
│   │   └── kafka/
│   └── driven/
│       ├── postgres/
│       └── adyen/
├── testing/                               # OUTSIDE test interactors
└── composition/                           # executable wiring
```

The package manifest may necessarily include provider SDKs. Therefore `src/hexagon` is only honest when lint or architecture tests prevent inside source from importing those dependencies or outward directories. If this protection cannot be added, do not claim the folder is a protected boundary.

## Featureful Interiors

Choose inside modules from domain language and change cohesion:

- Nouns for stable concepts and policies: `orders`, `allocation`, `credit-limit`.
- Verbs for actor goals and orchestration: `approve-order`, `allocate-stock`, `arrange-shipment`.
- Local technical subfolders only after the purpose is clear: `approve-order/ports`, `orders/model`.
- Shared inside folders only for genuinely cross-feature concepts with a stable owner.

Avoid this flat interior:

```text
hexagon/
├── commands.ts
├── events.ts
├── errors.ts
├── ports.ts
├── services.ts
├── types.ts
└── use-cases.ts
```

Split by behavior first, then by file responsibility inside that behavior when needed.

## Ports and Adapters

Name ports for purposeful application conversations. A port must represent an external actor boundary, not an internal abstraction introduced for test mocking.

Prefer colocating a port with the policy that owns it:

```text
approve-order/
├── approve-order.ts
└── ports/
    ├── driving/
    │   └── for-approving-orders.ts
    └── driven/
        ├── order-repository.ts
        └── credit-authorizer.ts
```

Use package-level `ports/driving` and `ports/driven` when several features genuinely share the same conversation. Keep the two directions visibly distinct.

Do not place provider names or types in ports. `PaymentGateway` or `ForAuthorizingCredit` can be stable; `StripeClientPort`, `SqlOrderReader`, and SDK-shaped method signatures are not.

Driving adapters parse, authenticate at the protocol edge, translate, call, and respond. Driven adapters translate between provider representations and inside types. Neither owns business policy.

## Testing Boundary

Tests make a port real:

- Drive each driving port through an in-process test actor.
- Give each driven port a fake or test implementation.
- Run behavioral contract suites against interchangeable driven adapters where semantic equivalence matters.
- Keep reusable fakes and contract suites outside the production hexagon under `testing/`.
- Keep focused tests for domain/application behavior colocated inside the package they verify.
- Prevent production runtime source and runtime dependencies from importing `testing` packages. Colocated test files may use them through explicit dev dependencies.

Do not call a fake an adapter when it touches the port directly without translation; it is still an outside test interactor and belongs on the outside side of the physical boundary.

## DDD and Read Models

Bounded context and hexagon are separate axes. A context may own a hexagon; a hexagon may contain several cohesive modules that are not separate contexts.

Use a bounded context when language and model authority change. Do not create one per aggregate, table, route, or directory.

Classify read-side code by responsibility:

- Pure folds or projection functions over domain events are inside-eligible application/read-model policy.
- Database-specific projection writers and query implementations are driven adapters.
- Product presentation DTOs may belong to the consuming product surface even when the pure projection remains capability-owned.
- Shared event parsing/replay behavior needs one explicit owner rather than duplication between projections.

Record disputed ownership in an architecture decision instead of hiding it in an ambiguous `projections/` or `shared/` folder indefinitely.

## Earned Exceptions

Keep these outside a hexagon unless real provider-independent policy emerges:

- Provider-specific integration libraries.
- CRDT or protocol engines such as a Yjs implementation.
- Database migrations and generated clients.
- Operational automation and restore/rotation tools.
- Vocabulary-only IDs and error types with no application behavior.
- Simple CRUD resources with no meaningful policy.

If extraction leaves too little inside to justify a maintained test wall, remove the ceremonial hexagon and use an honest shallow or feature-first structure.
