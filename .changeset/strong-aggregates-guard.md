---
"@paulhammond/dotfiles": minor
---

Strengthen DDD aggregate design guidance with invariant-first approach. Add 'Relationship-Driven Aggregates' anti-pattern, 'Design From Invariants, Not Relationships' section with litmus test and code examples, 'Aggregates Serve Commands, Not Queries' section connecting CQRS thinking to aggregate boundary decisions, 'Enforcing Boundaries in TypeScript' section with three concrete patterns (accept child IDs not objects, create children through the root, expose ReadonlyArray), lifecycle identity as a boundary discovery heuristic, and data locality / cross-aggregate eventual consistency principles. Add two checklist items for invariant-justified boundaries and no query-only properties in aggregates.
