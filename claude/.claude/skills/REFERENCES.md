# Architectural Skill References

Authoritative sources used to develop the DDD and hexagonal architecture skills. Each entry documents what was taken from the source and where it appears in our skills.

---

## Domain-Driven Design

### Eric Evans — "Domain-Driven Design: Tackling Complexity in the Heart of Software" (2003)
- **Ubiquitous language** → DDD skill: "Core Principle" section + glossary enforcement rules
- **Entities, value objects, aggregates** → DDD skill: "Building Blocks" section
- **Repositories as collection-like interfaces** → DDD skill: "Repository Pattern" section
- **Domain services** (logic spanning aggregates, stateless, expressed in domain language) → DDD skill: "Domain Services" section + `resources/domain-services.md`
- **Bounded contexts** → DDD skill: "Bounded Contexts" section
- **"Always-valid" entities** (invariants enforced at all times) → DDD skill: "Always-valid principle" in Entities + `resources/aggregate-design.md`

### Vaughn Vernon — "Implementing Domain-Driven Design" (2013)
- **Aggregate design rules** (small aggregates, reference by ID, one per transaction) → DDD skill: "Aggregates" section + `resources/aggregate-design.md`
- **Domain services vs application services distinction** → DDD skill: "Domain Services" comparison table
- **Always-valid entities** (never allow temporary invalid states) → `resources/aggregate-design.md`
- **When to split vs combine aggregates** → `resources/aggregate-design.md`

### Martin Fowler — martinfowler.com
- **Anemic domain model anti-pattern** → DDD skill: "Anti-Patterns" section
- **CQRS pattern** (separating read and write models) → Hex arch skill: "Reads vs Writes (CQRS-lite)" section + `resources/cqrs-lite.md`
- **Repository pattern** (collection-like semantics) → DDD skill: "Repository Pattern"

### Khalil Stemmler — khalilstemmler.com
- **TypeScript-specific DDD patterns** (branded types, discriminated unions, schema-first) → DDD skill: "Branded Types", "Make Illegal States Unrepresentable"
- **Value objects as plain types with factory functions** (functional approach) → DDD skill: "Value Objects" section
- **Module-based composition roots** (no DI container, validated at 150K LOC) → Hex arch skill: "Dependency Injection" composition root example
- **Per-layer testing strategy** → DDD `resources/testing-by-layer.md` + Hex arch `resources/testing-hex-arch.md`

### Microsoft — .NET Architecture Guidance (docs.microsoft.com)
- **Domain layer contents** (entities, value objects, aggregates, domain services — NOT read models) → DDD skill: "Where Does This Code Belong?" decision framework
- **Always-valid entities principle** → DDD skill: Entities section + `resources/aggregate-design.md`
- **Testing by layer prescription** (unit for domain, integration for adapters) → DDD `resources/testing-by-layer.md`
- **Purity is necessary but not sufficient for domain placement** → DDD skill: "Where Does This Code Belong?" purity test

### Scott Wlaschin — "Domain Modeling Made Functional" (2018) + fsharpforfunandprofit.com
- **"Making Illegal States Unrepresentable"** — encode business rules in the type system using discriminated unions → DDD skill: "Make Illegal States Unrepresentable" section + exhaustive switch pattern
- **Workflows as functions** whose input is a command and output is events → DDD `resources/domain-events.md`: the functional approach
- **Validate at boundaries, trust inside** — parse/validate at the outer boundary, then domain functions trust their types → Aligns with typescript-strict skill "schemas at trust boundaries"

### Jeremie Chassaing — "Functional Event Sourcing Decider" (thinkbeforecoding.com, 2021)
- **Decider pattern** (`decide(command, state) → events[]`, `evolve(state, event) → state`) — the standard functional approach to domain events → DDD `resources/domain-events.md`: "The Decider Pattern"

### Vladimir Khorikov — Enterprise Craftsmanship (enterprisecraftsmanship.com)
- **Domain events add complexity** — "If all consumers reside within the same database transaction, domain events add very little value" → DDD `resources/domain-events.md`: "When to Avoid Domain Events"
- **Explicit returns over indirection** — prefer returning results from domain functions over event-based coordination when possible

### Greg Young — CQRS and Event Sourcing
- **CQRS is not event sourcing** — they are orthogonal concerns → Hex arch skill: CQRS-lite section
- **CQRS is not a top-level architecture** — apply selectively to specific bounded contexts, not the whole system
- **"Current state is a left fold of previous events"** — functional model for event sourcing → DDD `resources/domain-events.md`: Decider pattern's `evolve` function

### Udi Dahan — Clarified CQRS (udidahan.com)
- **CQRS-lite is sufficient** — separating reads from writes doesn't require separate databases, async messaging, or event sourcing → Hex arch `resources/cqrs-lite.md`

### Lev Gorodinski — "Domain Services vs Application Services" (gorodinski.com)
- **Clear distinction** between domain services (business rules, domain types only) and application services (orchestration, infrastructure coordination) → DDD skill: "Domain Services" comparison table + `resources/domain-services.md`

---

## Hexagonal Architecture

### Alistair Cockburn — "Hexagonal Architecture" (alistair.cockburn.us, 2005)
- **Core concept** (application as hexagon, ports on edges, adapters outside) → Hex arch skill: "Core Concept" section + diagram
- **Primary (driving) vs secondary (driven) ports/adapters** → Hex arch skill: driving/driven distinction in diagram and throughout
- **"Configurable Dependency"** (Cockburn/Meszaros) — the hexagon declares needs via ports, a startup configurer wires concrete adapters → Hex arch skill: composition root pattern
- **Port granularity** (Cockburn prefers 2-4 ports per hexagon, named by business purpose) → Hex arch skill: "Port design principles"
- **The swappability test** (swap an adapter, domain doesn't change) → Hex arch `resources/testing-hex-arch.md`: "The Swappability Test"

### Thomas Pierrain — "Outside-In Diamond TDD" + hexagonal architecture talks
- **"A good adapter is a pretty dumb adapter"** — no business logic in adapters → Hex arch skill: "Adapters" section key principle
- **Driving vs driven asymmetry** (driving adapters call ports, driven adapters implement ports) → Hex arch skill: "Core Concept" section

### Herberto Graca — "DDD, Hexagonal, Onion, Clean, CQRS… How I put it all together" (herbertograca.com)
- **Unification of architectural patterns** showing hex arch as the structural container, DDD as the domain model → Both skills: cross-references between hex arch and DDD
- **Primary/secondary adapter naming** → Hex arch skill: diagram and terminology
- **Application layer as use case orchestration** → Hex arch skill: composition root pattern

### Netflix Tech Blog — "Ready for changes with Hexagonal Architecture" (2020)
- **Practical validation at scale** — swapping a data source adapter in 2 hours → Hex arch skill: swappability as the ultimate test of correct boundaries
- **Port design by business purpose, not technology** → Hex arch skill: "Port design principles"

### Mark Seemann — "Dependency Injection in .NET" + blog (blog.ploeh.dk)
- **"Functional architecture is ports and adapters"** — maximizing pure functions and pushing impure code to the edges naturally produces hex arch → Hex arch skill: the fundamental structural principle
- **"Dependency rejection"** — in FP, gather impure data at the boundary, pass to pure functions, act on the result (the "impureim sandwich": impure/pure/impure) → Hex arch skill: "Dependency Injection" section
- **Composition root pattern** (wire dependencies at the entry point, nowhere else) → Hex arch skill: composition root example
- **Against DI containers in TypeScript** — function parameters are sufficient → Hex arch skill: "No DI container needed"
- **Wrong/right DI comparison** — Service Locator and internal construction are anti-patterns; constructor/parameter injection makes preconditions explicit → Hex arch skill: DI wrong/right example

---

### Valentina Jemuović (née Cupac) — Optivem Journal (journal.optivem.com), Tech Excellence community (techexcellence.io)
- **Use Case Driven Design (UCDD)** — model system behavior through use cases (the hexagon API) first, write tests coupled to use cases as executable requirements, then let domain structure emerge through refactoring → Both skills: use case as primary test boundary
- **Primary test boundary is the use case, not individual layers** — test by calling use case handlers with faked driven ports. "TDD: Test the API, NOT the World" → Both testing resources: "Primary Test Boundary: The Use Case"
- **Fakes over mocks** — in-memory implementations that maintain state, not call-sequence verification. "Fake data, not behavior. Test behavior, not calls." → Both testing resources: "Fakes, Not Mocks" section
- **Use case tests exercise the full business path** (domain entities + services + orchestration together) → DDD `resources/testing-by-layer.md`: opening example showing single test exercising multiple concerns
- **Domain unit tests as complement, not primary strategy** — complex pure rules tested directly, simple logic covered through use cases → Both testing resources: "Domain Unit Tests: A Complement" section
- **Narrow integration tests for driven adapters as secondary concern** → Both testing resources: adapter test sections
- **"Unit tests passed. The bug shipped anyway."** — the gap between isolated tests passing and features working → Testing strategy framing in both skills
- **"Clean Code is Useless Without Tests"** — you cannot refactor toward clean code without tests protecting you → Aligns with TDD skill's non-negotiable testing-first approach
- Key articles: "TDD: Test the API, NOT the World", "Unit Testing Use Cases or Domain?", "Hexagonal Architecture: Do NOT Mock Everything", "Unit Tests Passed. The Bug Shipped Anyway.", "Clean Code is Useless Without Tests"

---

## Cross-Cutting Patterns

### Dave Farley — "Modern Software Engineering" (2022)
- **Test behavior, not implementation** → Testing skill: "Core Principle"
- **Test properties** (8 properties of good tests) → Test design reviewer skill

### Kent Beck — "Test-Driven Development: By Example" (2002)
- **RED-GREEN-REFACTOR cycle** → TDD skill: core workflow
- **Tests as documentation of behavior** → Testing skill: test naming guidance

### Gary Bernhardt — "Boundaries" (destroyallsoftware.com, 2012)
- **Functional core, imperative shell** — pure domain logic surrounded by impure adapters → Hex arch skill: the fundamental structural principle
- **Testing pure core with unit tests, shell with integration tests** → Both testing-by-layer resources
