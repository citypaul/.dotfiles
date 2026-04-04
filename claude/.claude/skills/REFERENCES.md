# Architectural Skill References

Authoritative sources used to develop the DDD and hexagonal architecture skills. Each entry documents what was taken from the source and where it appears in our skills.

---

## Domain-Driven Design

### Eric Evans — "Domain-Driven Design: Tackling Complexity in the Heart of Software" (2003) — [DDD Reference (free PDF)](https://www.domainlanguage.com/ddd/reference/)
- **Ubiquitous language** → DDD skill: "Core Principle" section + glossary enforcement rules
- **Entities, value objects, aggregates** → DDD skill: "Building Blocks" section
- **Repositories as collection-like interfaces** → DDD skill: "Repository Pattern" section
- **Domain services** (logic spanning aggregates, stateless, expressed in domain language) → DDD skill: "Domain Services" section + `resources/domain-services.md`
- **Bounded contexts** → DDD skill: "Bounded Contexts" section
- **"Always-valid" entities** (invariants enforced at all times) → DDD skill: "Always-valid principle" in Entities + `resources/aggregate-design.md`

### Vaughn Vernon — ["Implementing Domain-Driven Design"](https://www.informit.com/store/implementing-domain-driven-design-9780321834577) (2013)
- **Aggregate design rules** (small aggregates, reference by ID, one per transaction) → DDD skill: "Aggregates" section + `resources/aggregate-design.md`
- **Domain services vs application services distinction** → DDD skill: "Domain Services" comparison table
- **Always-valid entities** (never allow temporary invalid states) → `resources/aggregate-design.md`
- **When to split vs combine aggregates** → `resources/aggregate-design.md`

### Martin Fowler — [martinfowler.com](https://martinfowler.com)
- **Anemic domain model anti-pattern** → DDD skill: "Anti-Patterns" section
- **CQRS pattern** (separating read and write models) → Hex arch skill: "Reads vs Writes (CQRS-lite)" section + `resources/cqrs-lite.md`
- **Repository pattern** (collection-like semantics) → DDD skill: "Repository Pattern"

### Khalil Stemmler — [khalilstemmler.com](https://khalilstemmler.com)
- **TypeScript-specific DDD patterns** (branded types, discriminated unions, schema-first) → DDD skill: "Branded Types", "Make Illegal States Unrepresentable"
- **Value objects as plain types with factory functions** (functional approach) → DDD skill: "Value Objects" section
- **Module-based composition roots** (no DI container, validated at 150K LOC) → Hex arch skill: "Dependency Injection" composition root example
- **Per-layer testing strategy** → DDD `resources/testing-by-layer.md` + Hex arch `resources/testing-hex-arch.md`

### Microsoft — [.NET Architecture Guidance](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/)
- **Domain layer contents** (entities, value objects, aggregates, domain services — NOT read models) → DDD skill: "Where Does This Code Belong?" decision framework
- **Always-valid entities principle** → DDD skill: Entities section + `resources/aggregate-design.md`
- **Testing by layer prescription** (unit for domain, integration for adapters) → DDD `resources/testing-by-layer.md`
- **Purity is necessary but not sufficient for domain placement** → DDD skill: "Where Does This Code Belong?" purity test

### Scott Wlaschin — "Domain Modeling Made Functional" (2018) + [fsharpforfunandprofit.com](https://fsharpforfunandprofit.com/ddd/)
- **"Making Illegal States Unrepresentable"** — encode business rules in the type system using discriminated unions → DDD skill: "Make Illegal States Unrepresentable" section + exhaustive switch pattern
- **Workflows as functions** whose input is a command and output is events → DDD `resources/domain-events.md`: the functional approach
- **Validate at boundaries, trust inside** — parse/validate at the outer boundary, then domain functions trust their types → Aligns with typescript-strict skill "schemas at trust boundaries"

### Jeremie Chassaing — ["Functional Event Sourcing Decider"](https://thinkbeforecoding.com/post/2021/12/17/functional-event-sourcing-decider) (2021)
- **Decider pattern** (`decide(command, state) → events[]`, `evolve(state, event) → state`) — the standard functional approach to domain events → DDD `resources/domain-events.md`: "The Decider Pattern"

### Vladimir Khorikov — [Enterprise Craftsmanship](https://enterprisecraftsmanship.com)
- **Domain events add complexity** — "If all consumers reside within the same database transaction, domain events add very little value" → DDD `resources/domain-events.md`: "When to Avoid Domain Events"
- **Explicit returns over indirection** — prefer returning results from domain functions over event-based coordination when possible

### Greg Young — CQRS and Event Sourcing
- **CQRS is not event sourcing** — they are orthogonal concerns → Hex arch skill: CQRS-lite section
- **CQRS is not a top-level architecture** — apply selectively to specific bounded contexts, not the whole system
- **"Current state is a left fold of previous events"** — functional model for event sourcing → DDD `resources/domain-events.md`: Decider pattern's `evolve` function

### Udi Dahan — [Clarified CQRS](https://udidahan.com/2009/12/09/clarified-cqrs/)
- **CQRS-lite is sufficient** — separating reads from writes doesn't require separate databases, async messaging, or event sourcing → Hex arch `resources/cqrs-lite.md`

### Lev Gorodinski — ["Domain Services vs Application Services"](https://gorodinski.com/blog/2012/04/14/services-in-domain-driven-design-ddd/)
- **Clear distinction** between domain services (business rules, domain types only) and application services (orchestration, infrastructure coordination) → DDD skill: "Domain Services" comparison table + `resources/domain-services.md`

---

## Hexagonal Architecture

### Alistair Cockburn — ["Hexagonal Architecture"](https://alistair.cockburn.us/hexagonal-architecture/) (2005)
- **Core concept** (application as hexagon, ports on edges, adapters outside) → Hex arch skill: "Core Concept" section + diagram
- **Primary (driving) vs secondary (driven) ports/adapters** → Hex arch skill: driving/driven distinction in diagram and throughout
- **"Configurable Dependency"** (Cockburn/Meszaros) — the hexagon declares needs via ports, a startup configurer wires concrete adapters → Hex arch skill: composition root pattern
- **Port granularity** (Cockburn prefers 2-4 ports per hexagon, named by business purpose) → Hex arch skill: "Port design principles"
- **The swappability test** (swap an adapter, domain doesn't change) → Hex arch `resources/testing-hex-arch.md`: "The Swappability Test"

### Thomas Pierrain — "Outside-In Diamond TDD" + hexagonal architecture talks
- **"A good adapter is a pretty dumb adapter"** — no business logic in adapters → Hex arch skill: "Adapters" section key principle
- **Driving vs driven asymmetry** (driving adapters call ports, driven adapters implement ports) → Hex arch skill: "Core Concept" section

### Herberto Graca — ["DDD, Hexagonal, Onion, Clean, CQRS… How I put it all together"](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
- **Unification of architectural patterns** showing hex arch as the structural container, DDD as the domain model → Both skills: cross-references between hex arch and DDD
- **Primary/secondary adapter naming** → Hex arch skill: diagram and terminology
- **Application layer as use case orchestration** → Hex arch skill: composition root pattern

### Netflix Tech Blog — ["Ready for changes with Hexagonal Architecture"](https://netflixtechblog.com/ready-for-changes-with-hexagonal-architecture-b315ec967749) (2020)
- **Practical validation at scale** — swapping a data source adapter in 2 hours → Hex arch skill: swappability as the ultimate test of correct boundaries
- **Port design by business purpose, not technology** → Hex arch skill: "Port design principles"

### Mark Seemann — "Dependency Injection in .NET" + [blog.ploeh.dk](https://blog.ploeh.dk)
- **"Functional architecture is ports and adapters"** — maximizing pure functions and pushing impure code to the edges naturally produces hex arch → Hex arch skill: the fundamental structural principle
- **"Impureim sandwich"** (impure/pure/impure) — gather data at the boundary, call pure function, act on the result → Hex arch skill: "Dependency Injection" section, driving adapter pattern
- **"Dependency rejection"** — eliminate injected abstractions entirely by passing only values to pure functions (distinct from parameter injection) → Hex arch skill: the ideal for domain functions that take only domain types
- **Composition root pattern** (wire dependencies at the entry point, nowhere else) → Hex arch skill: composition root example
- **Against DI containers in TypeScript** — function parameters are sufficient → Hex arch skill: "No DI container needed"
- **Wrong/right DI comparison** — Service Locator and internal construction are anti-patterns; constructor/parameter injection makes preconditions explicit → Hex arch skill: DI wrong/right example

---

### Valentina Jemuović (née Cupac) — [Optivem Journal](https://journal.optivem.com), [Tech Excellence](https://techexcellence.io)
- **Use Case Driven Design (UCDD)** — model system behavior through use cases (the hexagon API) first, write tests coupled to use cases as executable requirements, then let domain structure emerge through refactoring → Both skills: use case as primary test boundary
- **Primary test boundary is the use case, not individual layers** — test by calling use case handlers with faked driven ports. "TDD: Test the API, NOT the World" → Both testing resources: "Primary Test Boundary: The Use Case"
- **Fakes over mocks** — in-memory implementations that maintain state, not call-sequence verification. "Fake data, not behavior. Test behavior, not calls." → Both testing resources: "Fakes, Not Mocks" section
- **Use case tests exercise the full business path** (domain entities + services + orchestration together) → DDD `resources/testing-by-layer.md`: opening example showing single test exercising multiple concerns
- **Domain unit tests as complement, not primary strategy** — complex pure rules tested directly, simple logic covered through use cases → Both testing resources: "Domain Unit Tests: A Complement" section
- **Narrow integration tests for driven adapters as secondary concern** → Both testing resources: adapter test sections
- **"Unit tests passed. The bug shipped anyway."** — the gap between isolated tests passing and features working → Testing strategy framing in both skills
- **"Clean Code is Useless Without Tests"** — you cannot refactor toward clean code without tests protecting you → Aligns with TDD skill's non-negotiable testing-first approach
- Key articles:
  - ["TDD: Test the API, NOT the World"](https://journal.optivem.com/p/tdd-test-the-api-not-the-world)
  - ["Unit Testing Use Cases or Domain?"](https://journal.optivem.com/p/unit-testing-use-cases-or-domain)
  - ["Hexagonal Architecture: Do NOT Mock Everything"](https://journal.optivem.com/p/hexagonal-architecture-do-not-mock-everything)
  - ["Unit Tests Passed. The Bug Shipped Anyway."](https://journal.optivem.com/p/unit-tests-passed-the-bug-shipped-anyway)
  - ["Clean Code is Useless Without Tests"](https://journal.optivem.com/p/clean-code-is-useless-without-tests)

---

## API and Interface Design

### Addy Osmani — [agent-skills/api-and-interface-design](https://github.com/addyosmani/agent-skills/blob/main/skills/api-and-interface-design/SKILL.md)
- **Original skill** adapted and extended for this codebase → API design skill: foundation for contract-first, error semantics, REST conventions, naming patterns
- Modified: `interface` → `type` with `readonly`, TypeScript patterns deferred to `typescript-strict` skill

### Hyrum Wright — [Hyrum's Law](https://www.hyrumslaw.com/)
- **"All observable behaviors will be depended on by somebody"** → API design skill: "Core Principles" section, design implications for what to expose

### Joshua Bloch — ["How to Design a Good API and Why it Matters"](https://www.youtube.com/watch?v=aAb7hSCtvGw) (2006, Google Tech Talk)
- **"When in doubt, leave it out"** — APIs should be as small as possible but no smaller → API design skill: contract-first development, intentional exposure
- **"APIs should be easy to use and hard to misuse"** → API design skill: overall design philosophy

### RFC 9457 — [Problem Details for HTTP APIs](https://www.rfc-editor.org/rfc/rfc9457) (2023, IETF)
- **Standard error format** (`type`, `title`, `status`, `detail`, `instance`) → API design skill: "Consistent Error Semantics" section
- **Extension members** for forward-compatible error evolution → API design skill: validation error example with `errors` array
- **Security considerations (§5)** — error responses as information leak vectors → API design skill: security warnings on error design
- Updated from RFC 7807 (2016) with registry of common problem types and multi-problem guidance

### RFC 8594 — [The Sunset HTTP Header Field](https://www.rfc-editor.org/rfc/rfc8594) (2019, IETF)
- **Standard deprecation signaling** — programmatic detection of upcoming endpoint removal → `resources/api-evolution.md`: "Deprecation Signals"

### RFC 6585 — [Additional HTTP Status Codes](https://www.rfc-editor.org/rfc/rfc6585) (2012, IETF)
- **429 Too Many Requests** — proper status code for rate limiting → API design skill: "Rate Limiting" section

### IETF Draft — [RateLimit Header Fields for HTTP](https://datatracker.ietf.org/doc/draft-ietf-httpapi-ratelimit-headers/)
- **Standard rate limit headers** (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) → API design skill: "Rate Limiting" section

### Brandur Leach (ex-Stripe) — [brandur.org](https://brandur.org/)
- **Idempotency keys** — definitive implementation guide for safe retries → API design skill: "Idempotency" section
- **API versioning at Stripe** — date-based version pinning, additive evolution → `resources/api-evolution.md`: "Date-Based Version Pinning"
- Key articles:
  - ["Idempotency Keys: How PayPal and Stripe Prevent Duplicate Payment"](https://brandur.org/idempotency-keys)

### OWASP — [API Security Top 10](https://owasp.org/API-Security/) (2023)
- **BOLA (#1)** — object-level authorization on every endpoint → `resources/api-security.md`: all 10 items covered with code examples
- **Mass assignment (#3)** — schema validation prevents accepting unauthorized fields → Aligns with `typescript-strict` skill's boundary validation

### Google — [API Design Guide](https://cloud.google.com/apis/design)
- **Resource-oriented design** — model as resource hierarchy with standard methods → API design skill: REST conventions
- **Standard error model** — `code`, `message`, `details` → Influenced error semantics section

### Microsoft — [REST API Guidelines](https://github.com/microsoft/api-guidelines)
- **Consistency across a large portfolio** — more valuable than optimizing any single API → API design skill: naming conventions table
- **Long-running operations pattern** — for async API operations

### Zalando — [RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/)
- **MUST/SHOULD/MAY classification** — makes guidelines actionable and auditable → API design skill: verification checklist approach
- **RFC 7807/9457 mandate** — standard error format across all services → API design skill: RFC 9457 section

### Phil Sturgeon — [apisyouwonthate.com](https://apisyouwonthate.com/)
- **"API Versioning Has No Right Answer"** — analysis of versioning tradeoffs → `resources/api-evolution.md`: versioning decision framework
- *Build APIs You Won't Hate* (2015) — practical, opinionated API design
- Key articles:
  - ["API Versioning Has No Right Answer"](https://apisyouwonthate.com/blog/api-versioning-has-no-right-answer)

### Arnaud Lauret ("The API Handyman") — [apihandyman.io](https://apihandyman.io/)
- *The Design of Web APIs* (Manning, 2019) — consumer-first design methodology
- **"Errors should be actionable"** — consumer knows what went wrong, why, and what to do → API design skill: error design philosophy

### Jon Postel — Robustness Principle (RFC 761)
- **"Be conservative in what you send, be liberal in what you accept"** → `resources/api-evolution.md`: foundation for additive API evolution

### Pact — [Consumer-Driven Contract Testing](https://pact.io/)
- **Consumer defines expectations, provider verifies** → `resources/api-evolution.md`: know what will break before you break it

### RFC 9205 (BCP 56) — [Building Protocols with HTTP](https://www.rfc-editor.org/rfc/rfc9205) (2022, IETF)
- **The cardinal rule** — don't redefine HTTP semantics → `resources/http-fundamentals.md`: core principle
- **URI design and discovery** — don't hardcode paths, use links and well-known URIs → `resources/http-fundamentals.md` + API design skill: "URI Ownership"
- **HTTP caching** — explicit freshness, Cache-Control directives, ETags, Vary → `resources/http-fundamentals.md`: "HTTP Caching" + API design skill: "HTTP Caching" section
- **Browser security for APIs** — security headers even for non-browser APIs → `resources/http-fundamentals.md` + `resources/api-security.md`: "Browser Security Headers"
- **Status code discipline** — don't map errors 1:1, use general codes → `resources/http-fundamentals.md`: "Status Code Discipline"
- **Content negotiation** — register distinct media types → `resources/http-fundamentals.md`: "Content Negotiation"

### RFC 8820 (BCP 190) — [URI Design and Ownership](https://www.rfc-editor.org/rfc/rfc8820) (2020, IETF)
- **Server authority controls its URL space** — don't hardcode URI paths in specs → API design skill: "URI Ownership" + `resources/http-fundamentals.md`

### RFC 8725 (BCP 225) — [JWT Best Current Practices](https://www.rfc-editor.org/rfc/rfc8725) (2020, IETF)
- **Algorithm allowlisting** — never let the token header dictate the algorithm → `resources/auth-security.md`: "Algorithm Allowlisting"
- **Claim validation** — validate iss, sub, aud, exp on every JWT → `resources/auth-security.md`: "Claim Validation"
- **Explicit typing** — use `typ` header to prevent cross-JWT confusion → `resources/auth-security.md`: "Explicit Typing"
- **Input sanitization** — kid as injection vector, jku/x5u as SSRF vector → `resources/auth-security.md`: "Input Sanitization"
- **Compression oracle** — don't compress before encryption → `resources/auth-security.md`: "Encoding and Compression"

### RFC 9700 (BCP 240) — [OAuth 2.0 Security Best Current Practice](https://www.rfc-editor.org/rfc/rfc9700) (2025, IETF)
- **Grant type selection** — Authorization Code + PKCE for all clients, no Implicit or ROPC → `resources/auth-security.md`: "Grant Type Selection"
- **PKCE enforcement** — mandatory for public clients, recommended for all → `resources/auth-security.md`: "PKCE"
- **Redirect URI validation** — exact string matching only → `resources/auth-security.md`: "Redirect URI Validation"
- **Token handling** — sender-constraining, audience restriction, no query params → `resources/auth-security.md`: "Token Handling"
- **CSRF and mix-up defenses** → `resources/auth-security.md`: "CSRF Defense" and "Mix-Up Attack Defense"

### RFC 9325 (BCP 195) — [TLS Recommendations](https://www.rfc-editor.org/rfc/rfc9325) (2022, IETF) + RFC 8996 — [Deprecating TLS 1.0/1.1](https://www.rfc-editor.org/rfc/rfc8996) (2021)
- **TLS 1.2 minimum, TLS 1.3 preferred** → `resources/api-security.md`: "Transport Security"

### RFC 6648 (BCP 178) — [Deprecating the "X-" Prefix](https://www.rfc-editor.org/rfc/rfc6648) (2012, IETF)
- **Stop using X- prefixed headers** → API design skill: Resource Naming table

### RFC 8941 — [Structured Fields for HTTP](https://www.rfc-editor.org/rfc/rfc8941) (2021, IETF)
- **Recommended format for new HTTP header fields** → `resources/http-fundamentals.md`: "Header Design"

### RFC 6302 (BCP 162) — [Logging Recommendations for Internet-Facing Servers](https://www.rfc-editor.org/rfc/rfc6302) (2011, IETF)
- **What to log for internet-facing servers** — source/destination addresses and ports, timestamps, transport protocol → Twelve-factor skill: Factor XI (Logs)

---

## Cross-Cutting Patterns

### Dave Farley — "Modern Software Engineering" (2022)
- **Test behavior, not implementation** → Testing skill: "Core Principle"
- **Test properties** (8 properties of good tests) → Test design reviewer skill

### Kent Beck — "Test-Driven Development: By Example" (2002)
- **RED-GREEN-REFACTOR cycle** (original formulation) → TDD skill: core workflow foundation
- **Tests as documentation of behavior** → Testing skill: test naming guidance

### Eran Boudjnah — RED-GREEN-MUTATE-REFACTOR reordering
- **Mutation testing before refactoring** → TDD skill: cycle ordering. Insight: verify test strength *before* restructuring code, so you refactor with genuine confidence. Pointed out on LinkedIn that the original RED-GREEN-REFACTOR-MUTATE order means refactoring with unverified test effectiveness.

### Gary Bernhardt — ["Boundaries"](https://www.destroyallsoftware.com/talks/boundaries) (2012)
- **Functional core, imperative shell** — pure domain logic surrounded by impure adapters → Hex arch skill: the fundamental structural principle
- **Testing pure core with unit tests, shell with integration tests** → Both testing-by-layer resources
