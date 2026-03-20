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
- **TypeScript-specific DDD patterns** (branded types, discriminated unions, schema-first) → DDD skill: "Branded Entity IDs", "Make Illegal States Unrepresentable"
- **Value objects as plain types with factory functions** (functional approach) → DDD skill: "Value Objects" section
- **Module-based composition roots** (no DI container, validated at 150K LOC) → Hex arch skill: "Dependency Injection" composition root example
- **Per-layer testing strategy** → DDD `resources/testing-by-layer.md` + Hex arch `resources/testing-hex-arch.md`

### Microsoft — .NET Architecture Guidance (docs.microsoft.com)
- **Domain layer contents** (entities, value objects, aggregates, domain services — NOT read models) → DDD skill: "Where Does This Code Belong?" decision framework
- **Always-valid entities principle** → DDD skill: Entities section + `resources/aggregate-design.md`
- **Testing by layer prescription** (unit for domain, integration for adapters) → DDD `resources/testing-by-layer.md`
- **Purity is necessary but not sufficient for domain placement** → DDD skill: "Where Does This Code Belong?" purity test

### Lev Gorodinski — "Domain Services vs Application Services" (gorodinski.com)
- **Clear distinction** between domain services (business rules, domain types only) and application services (orchestration, infrastructure coordination) → DDD skill: "Domain Services" comparison table + `resources/domain-services.md`

---

## Hexagonal Architecture

### Alistair Cockburn — "Hexagonal Architecture" (alistair.cockburn.us, 2005)
- **Core concept** (application as hexagon, ports on edges, adapters outside) → Hex arch skill: "Core Concept" section + diagram
- **Primary (driving) vs secondary (driven) ports/adapters** → Hex arch skill: driving/driven distinction in diagram and throughout
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
- **FP naturally produces hex arch** (pure functions with injected dependencies) → Hex arch skill: factory functions over classes, parameter injection
- **Composition root pattern** (wire dependencies at the entry point, nowhere else) → Hex arch skill: "Dependency Injection" section
- **Against DI containers in TypeScript** — function parameters are sufficient → Hex arch skill: "No DI container needed"

---

### Valentina Cupac (Jemuovic) — Optivem Journal (journal.optivem.com), Tech Excellence community
- **Primary test boundary is the use case, not individual layers** — test by calling use case handlers with faked driven ports → Both testing resources: "Primary Test Boundary: The Use Case"
- **Fakes over mocks** — in-memory implementations that maintain state, not call-sequence verification. "Fake data, not behavior. Test behavior, not calls." → Both testing resources: "Fakes, Not Mocks" section
- **Use case tests exercise the full business path** (domain entities + services + orchestration together) → DDD `resources/testing-by-layer.md`: opening example showing single test exercising multiple concerns
- **Domain unit tests as complement, not primary strategy** — complex pure rules tested directly, simple logic covered through use cases → Both testing resources: "Domain Unit Tests: A Complement" section
- **Narrow integration tests for driven adapters as secondary concern** → Both testing resources: adapter test sections
- **"Unit tests passed. The bug shipped anyway."** — the gap between isolated tests passing and features working → Testing strategy framing in both skills
- Key articles: "TDD: Test the API, NOT the World", "Modern Hexagonal Architecture Testing for Backend", "Hexagonal Architecture: Do NOT Mock Everything", "Unit Tests Passed. The Bug Shipped Anyway."

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
