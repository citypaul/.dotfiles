# Source Notes

Load this when checking the rationale behind hexagonal architecture guidance, especially port and public interface naming.

## Canonical Architecture

- Alistair Cockburn, "Hexagonal Architecture" (2005): https://alistair.cockburn.us/hexagonal-architecture
  - A port is a purposeful conversation at the application boundary.
  - The port protocol comes from the purpose of the conversation, not from the external device.
  - Multiple adapters can fit the same port.
  - "How many ports?" is contextual; neither one port per tiny operation nor two giant ports is usually best.
- Alistair Cockburn & Juan Manuel Garrido de Paz, "Hexagonal Architecture Explained", Updated 1st ed. (2025): https://alistaircockburn.com/hexarch%20v1.1b%20DIFFS%2020250420-1012%20paper%2Bepub.docx.pdf
  - The "For + verb-ing" intention name applies to driving AND driven ports. The book's canonical driven ports are `ForGettingTaxRates` (Ch 1.1 "Copy this code"; Ch 3.1) and BlueZone's `ForObtainingRates`, `ForStoringTickets`, `ForPaying` (Ch 3.3 "The BlueZone example"). Repositories are actors behind ports, not port names. This skill's role-noun driven ports (`OrderRepository`, `PaymentGateway`) are a documented deviation the pattern permits.
  - Naming is a recommendation, not a requirement: the pattern does not legislate port names (Ch 2.4 "What is required, optional, and outside the pattern").
  - Driving/driven = primary/secondary; these are the only adjective pairs that apply to all of actor, adapter, and port. Inbound/outbound suits ports, adapters, and folders; API/SPI suits ports only (Ch 2.1 Glossary + "The difficulty of naming" sidebar).
  - An "interactor" is an actor or its adapter, whichever touches the port; some actors (tests, sibling apps, program-to-program callers) need no adapter (Ch 2.1; Ch 6.3 "Comments on the original article").
  - The pattern is symmetric; the implementation is asymmetric — who knows whom produces provided vs required interfaces (Ch 5.3 "Is the pattern symmetric or asymmetric?"). The asymmetry that matters is inside/outside, not left/right (Ch 6.2, original 2005 article, "Nature of the Solution").
  - App boundary heuristic: an external system is one whose interface your team can't change; boundaries also sit at team-authority edges (Ch 4.4 "Where do I put the 'app' boundary?").
  - A driven port represents a conversation with an external system, never a domain concept (Ch 4.3 "What is a port?", Juan's note).
  - A port without a test driver or test double at it is indistinguishable from any interface line drawn anywhere; tests make the boundary real and act as the leak detector (Ch 4.3; Ch 5.7 "DDD's anti-corruption layers"; Ch 6.4 "Tests or no tests?"; Ch 1.4 benefits).
  - The pattern defines exactly two zones (inside/outside) and says nothing about internal structure — unlike Clean/Onion, which add required layers (Ch 2.4; Ch 4.6 "How do I structure the inside of my app?"; Ch 5.5 "Layered, onion, clean, hexagonal").
  - The pattern does not nest; the boundary belongs at the technology/team edge (Ch 5.8 "What about nested hexagons?"; Ch 6.4).
  - The configurator is the fifth element, with three shapes: constructor injection, setter/for-configuring function (allows live swap; hazard of a constructed-but-unconfigured app), or dependency lookup via a broker. "Configurable Receiver" (Dan North's name) supersedes the earlier "Configurable Dependency" (Ch 2.3 "The 5th element"; Ch 3.1 variants; Ch 6.5 "Configurable Receiver").
  - Strong conformance means a driven port is expressed in application language, not SQL/HTTP/vendor language (Ch 1.1; Ch 2.4 sidebar "Weak versus strong conformance").
  - Folder tips (explicitly not pattern requirements): keep driving-port and driven-port definition folders visibly separate, named for each port's purpose; adapters live outside the app space; Inbound/Outbound are endorsed folder names; create the folders before writing code (Ch 4.8 "Where do I put my files?"; Ch 4.9 "What is the development sequence?", step 0).
  - Greenfield sequence: test-to-test, real-to-test, test-to-real, real-to-real; the architecture is complete once one driving port and one driven port with a test double exist (Ch 4.9; Ch 5.2 "How does this relate to Walking Skeleton?").
  - Cockburn describes two schools for driving port interfaces (declare-and-use the interface, or use the class directly), but his named examples use explicit interfaces such as `ForCalculatingTaxes` and `ForGettingTaxRates` (Ch 1.1, updated-edition discussion).
  - For this skill, prefer explicit driving interfaces because they make the application boundary reviewable and consistent.
- Herberto Graca, "DDD, Hexagonal, Onion, Clean, CQRS..." (2017): https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/
  - Ports belong inside the application/business logic; adapters belong outside.
  - Ports should fit the application core needs, not mimic tool APIs.
- Robert C. Martin, "The Clean Architecture Dependency Rule" excerpt: https://www.informit.com/articles/article.aspx?p=2832399
  - Source dependencies point inward.
  - Inner code must not mention names or data formats from outer layers.
  - Boundary data should be in the form most convenient for the inner layer.

## Naming Ports and Interfaces

- Cockburn names ports by the purpose/capability of the conversation, for example `ForCalculatingTaxes` and `ForGettingTaxRates` — on both the driving and driven sides. Our role-noun driven-port names are a deliberate deviation; see the "Hexagonal Architecture Explained" entry above.
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

## Observability and Cross-Cutting Concerns

- Pete Hodgson, "Domain-Oriented Observability" (martinfowler.com): https://martinfowler.com/articles/domain-oriented-observability.html
  - The Domain Probe: a collaborator with "a high-level instrumentation API that is oriented around domain semantics," so domain code announces facts in domain vocabulary while the probe's implementation owns log/metric/analytics plumbing → Tier 2 in `cross-cutting-concerns.md`.
  - The announcement/event-based alternative (domain events consumed by observability monitors) and its trade-offs (max decoupling, more infrastructure, less explicit) → Tier 2's events-subscriber preference.
  - Testing through the probe (spy/fake the probe, test the adapter's translation separately) → `testing-hex-arch.md` fake-probe section.
  - Warning against AOP-style instrumentation ("impedance mismatch" with domain-level observability boundaries) → why decorators are bounded to Tier 3.
- Gabriel Anhaia, "A Domain Logger Port" (dev.to): https://dev.to/gabrielanhaia/a-domain-logger-port-decoupling-from-psr-3-without-losing-context-fmm
  - Severity-free, domain-owned port ("no `debug`, no `notice`... those are operator-facing severities"); severity mapping is the adapter's decision → Tier 2's severity-free rule and generic-Logger-port ban.
  - RecordingLogger fake asserting emitted domain events like saved entities → fake-probe example.
- Freeman & Pryce, *Growing Object-Oriented Software, Guided by Tests*, ch. 20 "Listening to the Tests," §"Logging Is a Feature": https://www.informit.com/store/growing-object-oriented-software-guided-by-tests-9780321503626
  - Support logging (operators/support rely on it) is a feature — test-driven through a notification-style role interface; diagnostic logging is developer scaffolding, not test-driven, and shouldn't accumulate in domain code → the tier-organizing test and Tier 4's exemption.
- Mark Seemann, "Keeping cross-cutting concerns out of application code" (2024): https://blog.ploeh.dk/2024/09/02/keeping-cross-cutting-concerns-out-of-application-code/
  - Decorate ports at the composition root instead of injecting infrastructure concerns; injected concerns make "your real application code eventually disappear in 'infrastructure code'" → Tier 3's decorator option; its port-visibility limit is the Tier 2 criterion.
- Brandur Leach, "Canonical log lines": https://brandur.org/canonical-log-lines
  - One wide event per request, assembled by middleware at the edge → Tier 3's wide-event placement (content guidance lives in the `observability` skill).
- Cockburn & Garrido de Paz, "Hexagonal Architecture Explained" (see the Canonical Architecture entry above) + Garrido de Paz's recipient/repository driven-actor taxonomy: https://jmgarridopaz.github.io/content/hexagonalarchitecture.html
  - The book is silent on logging; but a telemetry backend is a textbook **recipient** driven actor — external, tell-and-forget, like the pager in the "for notifying" examples — so an intention-named probe port is consistent with the pattern, while a technology-shaped `log(level, msg)` port is not.

## Testing and Use Cases

- Valentina Cupac/Jemuovic, "TDD and Hexagonal Architecture - Unit Testing Use Cases": https://optivem.com/tdd-and-hexagonal-architecture-unit-testing-use-cases/
  - Use cases represent actor goals against a black-box application.
  - Use case tests should describe business behavior, not internal implementation.
