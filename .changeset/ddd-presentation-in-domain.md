---
"@paulhammond/dotfiles": minor
---

Restructure DDD and hexagonal architecture skills with decision frameworks, deep-dive resources, and authoritative references

**DDD skill (6 resources)** based on Evans, Vernon, Fowler, Stemmler, Wlaschin, Khorikov, Chassaing, Microsoft:
- "Where Does This Code Belong?" decision framework (purity is necessary but not sufficient)
- Model evolution as first-class principle ("Resisting Model Evolution" anti-pattern)
- Domain services with comparison table vs use cases
- Always-valid entities principle
- Make Illegal States Unrepresentable: boolean-to-union + exhaustive switch with `never`
- Domain Events: Decider pattern, in-process dispatch, outbox pattern, process managers
- Value object equality, Currency type, Zod bridging, reconstitution from persistence
- Glossary supports multiple bounded contexts
- Branded type factories with validation-then-brand pattern
- Specifications (predicate functions) as named building block
- Bounded Contexts: ACL, context mapping, comprehensive discovery methodology (language test, signal strength, workflow mapping)
- Error modeling (result types for business outcomes, exceptions for invariant violations, factory-vs-schema boundary)
- Property-based testing with fast-check
- Optimistic locking with version fields
- Interface vs type rationale for repository ports
- Use case placement resolved to domain/ (no ambiguity)
- Resource loading heuristics ("Load when..." table)
- Resources: `aggregate-design.md`, `domain-services.md`, `testing-by-layer.md`, `domain-events.md`, `bounded-contexts.md`, `error-modeling.md`

**Hex arch skill (5 resources)** based on Cockburn, Pierrain, Graca, Netflix, Seemann, Valentina Jemuović:
- Driving (left) vs driven (right) adapter distinction with visual diagram
- CQRS-lite (reads bypass repositories, query functions JOIN freely)
- DI via impureim sandwich (Seemann), wrong/right comparison, composition roots
- Event-driven driving adapters (SQS consumer) + event publishing port
- Adapter error handling (domain-specific errors for constraint violations)
- Cross-cutting concerns (auth vs authz, logging, transactions, error formatting)
- Anti-patterns with code examples (5 patterns, all wrong/right)
- Use case naming convention (business language, not pattern suffixes)
- Full stack worked example (one feature through every layer with tests and file map)
- Incremental adoption guide (strangler fig, step-by-step extraction)
- File organization accurately labels use cases as orchestration
- Mutable fakes acknowledged as deliberate testing-only exception
- createTestDb helper (fresh DB per test, no shared state)
- Inline Valentina Jemuović attribution in testing resources
- Resource loading heuristics ("Load when..." table)
- Resources: `cqrs-lite.md`, `testing-hex-arch.md`, `worked-example.md`, `cross-cutting-concerns.md`, `incremental-adoption.md`

**New: REFERENCES.md** — 15+ authoritative sources with clickable URLs and bidirectional traceability. Sources: Evans, Vernon, Fowler, Wlaschin, Chassaing, Khorikov, Greg Young, Udi Dahan, Stemmler, Gorodinski, Microsoft, Cockburn, Pierrain, Graca, Netflix, Seemann, Valentina Jemuović (5 article URLs), Farley, Beck, Bernhardt.

**README** — dedicated showcase sections for hex arch and DDD with code examples, matching the format of testing, TypeScript, TDD sections.
