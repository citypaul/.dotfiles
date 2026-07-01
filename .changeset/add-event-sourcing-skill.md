---
"@paulhammond/dotfiles": minor
---

Add the `event-sourcing` skill: a functional-TypeScript guide to persisting state as an append-only log of events and rebuilding it by folding them (the Decider), positioned as the top rung of the complexity ladder rather than a default.

Builds on the existing `domain-driven-design` (Decider), `hexagonal-architecture` (event store as a driven port, CQRS-lite), `typescript-strict`, and `testing` skills. The main SKILL.md covers when to use it (and when not), the Decider write model, the command-handler loop, the event store port, events-as-data, projections, and behaviour-driven testing. Eight deep-dive resources plus source notes cover the decision framework, event modelling (EventStorming), rehydration and decider composition, the event store and Postgres storage, projections and read models, event versioning (tolerant reader/upcasting), testing event-sourced systems, and production concerns (snapshots, sagas, delivery guarantees, GDPR crypto-shredding). Grounded in primary sources — Young, Fowler, Chassaing, Wlaschin, Brandolini, Verraes, Dudycz — recorded in `skills/REFERENCES.md`. The `domain-driven-design` and `hexagonal-architecture` skills now cross-link into it at their event-sourcing decision points (the domain-events complexity ladder and the CQRS-lite upgrade path).
