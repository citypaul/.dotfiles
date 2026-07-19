---
"@citypaul/dotfiles": minor
---

Add bff-design skill for the backend-for-frontend pattern itself

Companion to bff-entry-points: where that skill protects the BFF's boundary,
this one owns the pattern-level decisions — whether a system needs a BFF and
how many (adoption signals, one-experience-one-BFF granularity, frontend-team
ownership, honest deployable costs incl. the modular-monolith option), the
shape-don't-decide rule with the duplication push-down ladder, upstream
aggregation with partial-failure contracts and resilience budgets (deadline
propagation, one retry owner per edge, bulkheads, identity-keyed caching),
mediating user identity toward upstream services (RFC 8693 token exchange,
confused-deputy prevention, phantom-token layering, revocation propagation),
and the alternatives (shared gateway, GraphQL federation, token-mediating
backend, direct SPA→API, meta-framework server as BFF). Four deep-dive
references grounded in primary sources (Newman/Calçado/SoundCloud lineage,
Azure Architecture Center, IETF drafts and RFCs, Google SRE, AWS Builders
Library, Netflix, OWASP).

Mutual routing added between bff-design, bff-entry-points, structure-codebase,
and api-design (including the single-consumer versioning nuance), plus
registration in CLAUDE.md and the README skills catalog.
