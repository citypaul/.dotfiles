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
- Branded Types generalized (entity IDs + value objects like EmailAddress)
- Bounded Contexts expanded with ACL, context mapping patterns
- Per-layer testing strategy
- Resources: `domain-services.md`, `testing-by-layer.md`, `aggregate-design.md`, `domain-events.md`, `bounded-contexts.md`

**Hex arch skill restructure** based on Cockburn, Pierrain, Graca, Netflix, Seemann:
- Driving (left) vs driven (right) adapter distinction with visual diagram
- CQRS-lite (reads bypass repositories, query functions JOIN freely)
- Composition root / thin delivery layer pattern
- Wrong/right DI comparison (Seemann: dependency rejection, not internal construction)
- Per-layer testing strategy with swappability test
- Anti-patterns (domain depending on infrastructure, business logic in adapters, port proliferation)
- Resources: `cqrs-lite.md`, `testing-hex-arch.md`

**New: REFERENCES.md** — authoritative sources with specific attributions. Added Wlaschin, Chassaing (Decider), Khorikov, Greg Young, Udi Dahan, Cockburn's "Configurable Dependency", Seemann's dependency rejection and impureim sandwich.
