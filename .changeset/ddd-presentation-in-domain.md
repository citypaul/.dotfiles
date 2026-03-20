---
"@paulhammond/dotfiles": minor
---

Restructure DDD and hexagonal architecture skills with decision frameworks, resources, and references

**DDD skill restructure** based on gap analysis against Evans, Vernon, Fowler, Stemmler, Wlaschin, Khorikov, Microsoft:
- "Where Does This Code Belong?" decision framework (purity is necessary but not sufficient)
- Domain services (business logic spanning aggregates) with comparison table vs use cases
- Always-valid entities principle
- Exhaustive switch pattern for discriminated unions (Wlaschin, Pocock, TypeScript Handbook)
- Domain Events building block with when-to-use/avoid guidance (Khorikov, Chassaing)
- Value object equality as definitional characteristic, Currency type, Zod/schema note
- Glossary file format example restored
- Branded Types generalized with factory functions (entity IDs + value objects like EmailAddress)
- Specifications (predicate functions) as named building block
- Bounded Contexts expanded with ACL, context mapping patterns
- Per-layer testing strategy with property-based testing guidance
- Error modeling guidance (discriminated union results vs exceptions, propagation through layers)
- Interface vs type rationale for repository ports
- Use case placement resolved to domain/ as clear default
- Resources: `domain-services.md`, `testing-by-layer.md`, `aggregate-design.md`, `domain-events.md`, `bounded-contexts.md`, `error-modeling.md`

**Hex arch skill restructure** based on Cockburn, Pierrain, Graca, Netflix, Seemann:
- Driving (left) vs driven (right) adapter distinction with visual diagram
- CQRS-lite (reads bypass repositories, query functions JOIN freely)
- Composition root / thin delivery layer pattern
- Wrong/right DI comparison (Seemann: dependency rejection, not internal construction)
- Per-layer testing strategy with swappability test
- Anti-patterns with code examples (business logic in adapters, bypass adapters, technology-shaped ports)
- Cross-cutting concerns (auth, logging, transactions, error formatting — where each lives)
- Use case naming convention (business language, not pattern suffixes)
- Full stack worked example (one feature through every layer with tests and file locations)
- Event-driven driving adapter example (SQS consumer, same thin-glue pattern)
- Adapter error handling patterns (constraint violations, infrastructure failures)
- Incremental adoption guide (strangler fig, step-by-step extraction)
- Mutable fakes acknowledged as deliberate testing-only exception
- Resources: `cqrs-lite.md`, `testing-hex-arch.md`, `worked-example.md`, `cross-cutting-concerns.md`, `incremental-adoption.md`

**New: REFERENCES.md** — authoritative sources with specific attributions. Added Wlaschin, Chassaing (Decider), Khorikov, Greg Young, Udi Dahan, Cockburn's "Configurable Dependency", Seemann's dependency rejection and impureim sandwich.
