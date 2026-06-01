# Source Notes

Load this when checking the rationale behind hexagonal architecture guidance, especially port and public interface naming.

## Canonical Architecture

- Alistair Cockburn, "Hexagonal Architecture" (2005): https://alistair.cockburn.us/hexagonal-architecture
  - A port is a purposeful conversation at the application boundary.
  - The port protocol comes from the purpose of the conversation, not from the external device.
  - Multiple adapters can fit the same port.
  - "How many ports?" is contextual; neither one port per tiny operation nor two giant ports is usually best.
- Alistair Cockburn, "Hexagonal Architecture Explained" updates (2025): https://alistaircockburn.com/hexarch%20v1.1b%20DIFFS%2020250420-1012%20paper%2Bepub.docx.pdf
  - Driving/driven and primary/secondary apply to actors, adapters, and ports.
  - Inbound/outbound can be useful folder names, but they are less universal as conceptual labels.
  - Strong conformance means a driven port is expressed in application language, not SQL/HTTP/vendor language.
  - Cockburn describes two schools for driving port interfaces, but his named examples use explicit interfaces such as `ForCalculatingTaxes` and `ForGettingTaxRates`.
  - For this skill, prefer explicit driving interfaces because they make the application boundary reviewable and consistent.
- Herberto Graca, "DDD, Hexagonal, Onion, Clean, CQRS..." (2017): https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/
  - Ports belong inside the application/business logic; adapters belong outside.
  - Ports should fit the application core needs, not mimic tool APIs.
- Robert C. Martin, "The Clean Architecture Dependency Rule" excerpt: https://www.informit.com/articles/article.aspx?p=2832399
  - Source dependencies point inward.
  - Inner code must not mention names or data formats from outer layers.
  - Boundary data should be in the form most convenient for the inner layer.

## Naming Ports and Interfaces

- Cockburn names ports by the purpose/capability of the conversation, for example `ForCalculatingTaxes` and `ForGettingTaxRates`.
- Martin Fowler, "Role Interface": https://martinfowler.com/bliki/RoleInterface.html
  - Prefer role interfaces: small interfaces seen from the client's role, aligned with Interface Segregation.
  - Avoid header interfaces that mirror every public method of a class.
- Growing Object-Oriented Software, Guided by Tests notes: https://conn.dev/books/growing-object-oriented-software.html
  - Interfaces name object roles and related responsibilities.
  - `Thing` plus `ThingImpl` is a smell; the interface should be general/domain language and the implementation should say what is specific about it.
- TypeScript contributor guidelines: https://github.com/microsoft/TypeScript/wiki/Coding-guidelines
  - Use PascalCase for type names, no `I` prefix for interfaces, and whole words where possible.
  - The page is for TypeScript's own codebase, not a universal mandate; use it as supporting evidence for TypeScript style.
- Google TypeScript Style Guide: https://google.github.io/styleguide/tsguide.html
  - Do not mark interfaces specially with `I...` or `...Interface` unless the environment requires it.
  - Name an interface for why it exists.

## Testing and Use Cases

- Valentina Cupac/Jemuovic, "TDD and Hexagonal Architecture - Unit Testing Use Cases": https://optivem.com/tdd-and-hexagonal-architecture-unit-testing-use-cases/
  - Use cases represent actor goals against a black-box application.
  - Use case tests should describe business behavior, not internal implementation.
