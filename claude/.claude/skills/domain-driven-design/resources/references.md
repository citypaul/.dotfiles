# Focused References

These sources support the DDD guidance shipped with this skill. The source repository keeps broader attribution separately; standalone installations need only this focused map.

- Eric Evans, [*Domain-Driven Design Reference*](https://www.domainlanguage.com/ddd/reference/): ubiquitous language, entities, value objects, aggregates, repositories, domain services, and bounded contexts.
- Vaughn Vernon, [*Implementing Domain-Driven Design*](https://www.informit.com/store/implementing-domain-driven-design-9780321834577): small aggregate design, reference-by-ID, consistency boundaries, and the distinction between domain and application services.
- Alistair Cockburn, [“Hexagonal Architecture”](https://alistair.cockburn.us/hexagonal-architecture): ports as application-shaped conversations and adapters outside the application boundary. DDD does not imply this architecture.
- Herberto Graça, [“DDD, Hexagonal, Onion, Clean, CQRS…”](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/): application use cases as orchestration, domain policy as business rules, and ports owned on the inside that consumes them.
- Mark Seemann, [“Dependency rejection”](https://blog.ploeh.dk/2017/02/02/dependency-rejection/): keep pure domain decisions on values and move effectful orchestration to an application boundary rather than injecting infrastructure into domain code.
- Gary Bernhardt, [“Boundaries”](https://www.destroyallsoftware.com/talks/boundaries): functional core and imperative shell as a practical test for domain purity.
- Valentina Jemuović, [“Unit Testing Use Cases or Domain?”](https://journal.optivem.com/p/unit-testing-use-cases-or-domain) and [“TDD and Hexagonal Architecture — Unit Testing Use Cases”](https://optivem.com/tdd-and-hexagonal-architecture-unit-testing-use-cases/): use-case-oriented behavioral tests with focused domain tests for complex pure rules.
